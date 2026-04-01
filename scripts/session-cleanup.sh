#!/bin/bash
# session-cleanup.sh
# Runs via LaunchAgent every 30 min. Prevents session bloat & monitors health.
#
# Actions:
#   1. Remove corrupted sessions (URL-based keys)
#   2. Remove one-shot sessions older than 2h (idle, chat, card, system, hal, cron:run, subagent)
#   3. Remove stale channel sessions older than 48h (slack, discord, imessage)
#   4. Remove stale cron base sessions older than 24h
#   5. Reset main session if JSONL file exceeds 500KB
#   6. Cap total session count at 40 — prune oldest
#   7. Clean orphaned JSONL files (on disk but not in sessions.json)
#   8. Check HAL remote gateway health — alert if unreachable
#   9. Check Codex OAuth token expiry — alert if < 2 days remaining
#
# Safe: only touches sessions.json + JSONL files. Backs up main session before reset.

set -euo pipefail

# LOCKFILE GUARD: Prevent parallel execution (race condition on sessions.json)
LOCKFILE="/tmp/session-cleanup.lock"
MAX_LOCK_AGE=300  # 5 minutes

if [[ -f "$LOCKFILE" ]]; then
  LOCK_AGE=$(( $(date +%s) - $(stat -f%m "$LOCKFILE" 2>/dev/null || echo 0) ))
  if [[ "$LOCK_AGE" -lt "$MAX_LOCK_AGE" ]]; then
    echo "Another cleanup is running (lock age: ${LOCK_AGE}s). Exiting." >> /dev/null
    exit 0
  fi
  # Lock is stale, proceed with cleanup
fi
touch "$LOCKFILE"
trap "rm -f $LOCKFILE" EXIT

SESSIONS_DIR="$HOME/.openclaw/agents/main/sessions"
SESSIONS_JSON="$SESSIONS_DIR/sessions.json"
LOG="$HOME/.openclaw/logs/session-cleanup.log"
NOTIFY_URL="http://localhost:3001/api/notifications"
HAL_LAST_ALERT_FILE="/tmp/session-cleanup-alerts"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

LAST_CLEANUP_NOTIFY="/tmp/cleanup-last-notify.json"
notify() {
  local title="$1" message="$2"
  # Dedup: same title within 2 hours is suppressed
  local now=$(date +%s)
  if [[ -f "$LAST_CLEANUP_NOTIFY" ]]; then
    local prev_title prev_time
    prev_title=$(python3 -c "import json; print(json.load(open('$LAST_CLEANUP_NOTIFY')).get('title',''))" 2>/dev/null || echo "")
    prev_time=$(python3 -c "import json; print(json.load(open('$LAST_CLEANUP_NOTIFY')).get('at',0))" 2>/dev/null || echo "0")
    if [[ "$prev_title" == "$title" && $((now - prev_time)) -lt 7200 ]]; then
      log "Notification suppressed (duplicate within 2h): $title"
      return 0
    fi
  fi
  curl -s -X POST "$NOTIFY_URL" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"system\",\"title\":\"$title\",\"message\":\"$message\"}" \
    > /dev/null 2>&1 || true
  python3 -c "import json; json.dump({'title':'$title','at':$now}, open('$LAST_CLEANUP_NOTIFY','w'))" 2>/dev/null || true
}

if [[ ! -f "$SESSIONS_JSON" ]]; then
  log "SKIP: sessions.json not found"
  exit 0
fi

# Run cleanup in Python for safe JSON manipulation
# Redirect stdout to log to avoid duplicate output
python3 >> "$LOG" 2>&1 << 'PY'
import json, os, time, sys, shutil, glob
from pathlib import Path
from datetime import datetime

SESSIONS_DIR = Path(os.path.expanduser("~/.openclaw/agents/main/sessions"))
SESSIONS_JSON = SESSIONS_DIR / "sessions.json"
LOG_PATH = Path(os.path.expanduser("~/.openclaw/logs/session-cleanup.log"))

# Thresholds
ONE_SHOT_MAX_AGE_H = 2           # Remove one-shot sessions after 2h
CHANNEL_MAX_AGE_H = 48           # Remove channel sessions after 48h idle
CRON_BASE_MAX_AGE_H = 24         # Remove cron base sessions after 24h
MAX_TOTAL_SESSIONS = 40          # Hard cap on session count
MAIN_SESSION_MAX_KB = 500        # Reset main session if JSONL > 500KB

def log(msg):
    line = f"[{datetime.now().strftime('%Y-%m-%dT%H:%M:%S')}] {msg}"
    print(line)  # Print to stdout; shell redirect handles file writing

def get_age_h(entry, sessions_dir):
    """Get session age in hours from updatedAt or file mtime."""
    now = time.time()
    updated_at = entry.get("updatedAt", 0)
    if updated_at > 0:
        return (now * 1000 - updated_at) / (1000 * 3600)
    sid = entry.get("sessionId", "")
    fpath = sessions_dir / f"{sid}.jsonl"
    if fpath.exists():
        return (now - fpath.stat().st_mtime) / 3600
    return 999

# Load sessions
with open(SESSIONS_JSON) as f:
    data = json.load(f)

original_count = len(data)
to_remove = []
actions = []

# --- 1. Remove corrupted sessions (URL-based keys) ---
for key in list(data.keys()):
    if "https://" in key or "http://" in key:
        to_remove.append(key)
        actions.append(f"corrupted:{key[:60]}")

# --- 2. Remove old one-shot sessions ---
# These are sessions created for a single operation that should not persist
ONE_SHOT_PATTERNS = [
    ":idle:",          # idle dispatches
    ":chat-",          # chat sessions
    ":system:",        # system event sessions
    ":hal:maintenance:", # HAL maintenance
    ":subagent:",      # subagent sessions
]

for key in list(data.keys()):
    if key in to_remove:
        continue
    # Cron run sessions: agent:main:cron:{id}:run:{runId}
    is_cron_run = ":cron:" in key and ":run:" in key
    is_one_shot = any(p in key for p in ONE_SHOT_PATTERNS)
    if not (is_one_shot or is_cron_run):
        continue
    age_h = get_age_h(data[key], SESSIONS_DIR)
    if age_h > ONE_SHOT_MAX_AGE_H:
        to_remove.append(key)
        actions.append(f"oneshot({age_h:.0f}h):{key[:60]}")

# --- 2b. Remove stale card sessions (8h TTL) ---
# Card sessions need longer than the 2h one-shot TTL because card work can last
# up to 6h before stale detection triggers. Proactive cleanup also happens in
# Command Center when cards move to done/review/rejected.
CARD_MAX_AGE_H = 8

for key in list(data.keys()):
    if key in to_remove:
        continue
    if ":card:" in key:
        age_h = get_age_h(data[key], SESSIONS_DIR)
        if age_h > CARD_MAX_AGE_H:
            to_remove.append(key)
            actions.append(f"card({age_h:.0f}h):{key[:60]}")

# --- 3. Remove bloated sessions (file size > 200KB) ---
# Any session with a JSONL file over 200KB is consuming too much context
# This catches Discord/Slack channels that accumulate unbounded chat history
BLOAT_MAX_KB = 200

for key in list(data.keys()):
    if key in to_remove:
        continue
    if key == "agent:main:main":
        continue  # Main session handled separately
    sid = data[key].get("sessionId", "")
    if sid:
        fpath = SESSIONS_DIR / f"{sid}.jsonl"
        if fpath.exists():
            size_kb = fpath.stat().st_size / 1024
            if size_kb > BLOAT_MAX_KB:
                to_remove.append(key)
                actions.append(f"bloated({size_kb:.0f}KB):{key[:60]}")

# --- 4. Remove stale channel sessions ---
# Slack, Discord, iMessage sessions that haven't been used in 48h
CHANNEL_PATTERNS = [":slack:", ":discord:", ":imessage:"]

for key in list(data.keys()):
    if key in to_remove:
        continue
    if key == "agent:main:main":
        continue
    is_channel = any(p in key for p in CHANNEL_PATTERNS)
    if not is_channel:
        continue
    age_h = get_age_h(data[key], SESSIONS_DIR)
    if age_h > CHANNEL_MAX_AGE_H:
        to_remove.append(key)
        actions.append(f"stale_ch({age_h:.0f}h):{key[:60]}")

# --- 5. Remove stale cron base sessions ---
# Cron base sessions (not :run:) older than 24h
for key in list(data.keys()):
    if key in to_remove:
        continue
    if ":cron:" in key and ":run:" not in key:
        age_h = get_age_h(data[key], SESSIONS_DIR)
        if age_h > CRON_BASE_MAX_AGE_H:
            to_remove.append(key)
            actions.append(f"stale_cron({age_h:.0f}h):{key[:60]}")

# --- 5. Check main session size ---
main_entry = data.get("agent:main:main")
main_reset = False
if main_entry:
    sid = main_entry.get("sessionId", "")
    fpath = SESSIONS_DIR / f"{sid}.jsonl"
    if fpath.exists():
        file_size_kb = fpath.stat().st_size / 1024
        if file_size_kb > MAIN_SESSION_MAX_KB:
            main_reset = True
            actions.append(f"main_reset:file={file_size_kb:.0f}KB")

if main_reset and "agent:main:main" not in to_remove:
    sid = data["agent:main:main"].get("sessionId", "")
    fpath = SESSIONS_DIR / f"{sid}.jsonl"
    if fpath.exists():
        bak = SESSIONS_DIR / f"{sid}.jsonl.auto-bak"
        shutil.copy2(str(fpath), str(bak))
    to_remove.append("agent:main:main")

# --- 6. Delete JSONL files and update sessions.json ---
deleted_files = 0
for key in to_remove:
    if key not in data:
        continue
    sid = data[key].get("sessionId", "")
    if sid:
        fpath = SESSIONS_DIR / f"{sid}.jsonl"
        if fpath.exists():
            os.remove(fpath)
            deleted_files += 1
    del data[key]

# --- 7. Cap total session count (remove oldest first) ---
if len(data) > MAX_TOTAL_SESSIONS:
    sorted_keys = sorted(data.keys(), key=lambda k: data[k].get("updatedAt", 0))
    excess = len(data) - MAX_TOTAL_SESSIONS
    removed_excess = 0
    for key in sorted_keys:
        if removed_excess >= excess:
            break
        if key == "agent:main:main":
            continue  # Never cap-remove main
        sid = data[key].get("sessionId", "")
        if sid:
            fpath = SESSIONS_DIR / f"{sid}.jsonl"
            if fpath.exists():
                os.remove(fpath)
                deleted_files += 1
        del data[key]
        removed_excess += 1
        actions.append(f"cap:{key[:50]}")

# --- 8. Clean orphaned JSONL files ---
now = time.time()
referenced_sids = set()
for entry in data.values():
    sid = entry.get("sessionId", "")
    if sid:
        referenced_sids.add(sid)

orphan_count = 0
orphan_bytes = 0
for f in glob.glob(str(SESSIONS_DIR / "*.jsonl*")):
    basename = os.path.basename(f)
    # Clean old backups (>1 day)
    if ".auto-bak" in basename or ".bak" in basename:
        if (now - os.path.getmtime(f)) > 86400:
            orphan_bytes += os.path.getsize(f)
            os.remove(f)
            orphan_count += 1
        continue
    sid = basename.replace(".jsonl", "")
    if sid not in referenced_sids:
        orphan_bytes += os.path.getsize(f)
        os.remove(f)
        orphan_count += 1

if orphan_count > 0:
    actions.append(f"orphans:{orphan_count} files, {orphan_bytes/1024:.0f}KB")

# Write updated sessions.json
with open(SESSIONS_JSON, "w") as f:
    json.dump(data, f, indent=2)

# Summary
removed = original_count - len(data)
if removed > 0 or main_reset or orphan_count > 0:
    log(f"CLEANED: {removed} sessions removed ({original_count} -> {len(data)}), "
        f"{deleted_files} files deleted, {orphan_count} orphans purged"
        + (", main session RESET" if main_reset else ""))
    for a in actions[:15]:
        log(f"  - {a}")
else:
    log(f"OK: {len(data)} sessions, no cleanup needed")

# Output flags for bash to consume
if main_reset:
    print("FLAG:MAIN_RESET")
PY

CLEANUP_OUTPUT=$(tail -5 "$LOG")

# Audit log for bloated session purges (grep the cleanup log for bloated entries)
if echo "$CLEANUP_OUTPUT" | grep -q "bloated\|CLEANED"; then
  CLEANED_SUMMARY=$(echo "$CLEANUP_OUTPUT" | grep "CLEANED" | head -1 | sed 's/.*CLEANED: //')
  bash "$HOME/.openclaw/workspace/scripts/audit-log.sh" info "session-cleanup" "Sessions cleaned: ${CLEANED_SUMMARY:-see log}"
fi

# Restart gateway if main session was reset (respects circuit breaker)
if echo "$CLEANUP_OUTPUT" | grep -q "FLAG:MAIN_RESET"; then
  CB_FILE="$HOME/.openclaw/workspace/.hal-alfred-tracking/rate-limit-circuit-breaker.json"
  CB_ACTIVE=false
  if [[ -f "$CB_FILE" ]]; then
    CB_TRIPPED=$(python3 -c "import json; print(json.load(open('$CB_FILE')).get('tripped_at',0))" 2>/dev/null || echo "0")
    CB_COOL=$(python3 -c "import json; print(json.load(open('$CB_FILE')).get('cooldown_min',10))" 2>/dev/null || echo "10")
    NOW_CB=$(date +%s)
    if [[ "$CB_TRIPPED" -gt 0 ]] && [[ $(( NOW_CB - CB_TRIPPED )) -lt $(( CB_COOL * 60 )) ]]; then
      CB_ACTIVE=true
    fi
  fi

  bash "$HOME/.openclaw/workspace/scripts/audit-log.sh" warn "session-cleanup" "Main session reset (bloated)" --detail "circuit_breaker=$CB_ACTIVE"
  if [[ "$CB_ACTIVE" == "true" ]]; then
    log "Main session reset but circuit breaker active — skipping restart (cooldown ${CB_COOL}m)"
    notify "Session Auto-Reset" "Main session was at 85%+ context. Reset done, but gateway restart deferred — rate limit cooldown active."
  else
    log "Restarting gateway after main session reset..."
    launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway 2>/dev/null || true
    sleep 3
    log "Gateway restarted (PID $(pgrep -f openclaw-gateway | head -1 || echo 'unknown'))"
    bash "$HOME/.openclaw/workspace/scripts/audit-log.sh" info "session-cleanup" "Gateway restarted after main session reset"
    notify "Session Auto-Reset" "Main session was at 85%+ context. Auto-reset and gateway restarted."
  fi
fi

# --- HAL remote gateway health check ---
HAL_URL="http://192.168.2.79:18789"
HAL_STATUS_FILE="$HOME/.openclaw/workspace/.hal-alfred-tracking/hal-gateway-health.txt"
HAL_LAST_ALERT_FILE="$HOME/.openclaw/workspace/.hal-alfred-tracking/hal-alert-cooldown.txt"

HAL_REACHABLE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$HAL_URL" 2>/dev/null || echo "000")

if [[ "$HAL_REACHABLE" == "000" ]]; then
  LAST_ALERT=0
  [[ -f "$HAL_LAST_ALERT_FILE" ]] && LAST_ALERT=$(cat "$HAL_LAST_ALERT_FILE" 2>/dev/null || echo "0")
  NOW_EPOCH=$(date +%s)
  SINCE_ALERT=$(( NOW_EPOCH - LAST_ALERT ))

  if [[ "$SINCE_ALERT" -gt 7200 ]]; then
    log "ALERT: HAL gateway unreachable at $HAL_URL"
    bash "$HOME/.openclaw/workspace/scripts/audit-log.sh" error "session-cleanup" "HAL gateway unreachable" --detail "url=$HAL_URL" --agent hal
    notify "HAL Gateway Down" "HAL remote gateway at 192.168.2.79:18789 is unreachable. Check if HAL PC is on and gateway is running."
    echo "$NOW_EPOCH" > "$HAL_LAST_ALERT_FILE"
  fi
  echo "down" > "$HAL_STATUS_FILE"
else
  echo "up" > "$HAL_STATUS_FILE"
fi

# --- Codex OAuth token expiry check ---
AUTH_FILE="$HOME/.openclaw/agents/main/agent/auth-profiles.json"
if [[ -f "$AUTH_FILE" ]]; then
  CODEX_ALERT=$(python3 - "$AUTH_FILE" "$HAL_LAST_ALERT_FILE" << 'PYCHECK'
import json, sys, time, os
auth_file = sys.argv[1]
cooldown_file = sys.argv[2]
state_file = os.path.expanduser("~/.openclaw/workspace/memory/.codex-expiry-state.json")

with open(auth_file) as f:
    data = json.load(f)

profiles = data.get("profiles", {})
usage = data.get("usageStats", {})
last_good = data.get("lastGood", {}).get("openai-codex")


def normalize_expires_ms(v):
    if not isinstance(v, (int, float)):
        return None
    # Some auth stores use seconds; normalize to milliseconds.
    if v < 10_000_000_000:
        v *= 1000
    # Reject implausible values to avoid stale/invalid alerts.
    now_ms = time.time() * 1000
    if v < now_ms - (365 * 24 * 3600 * 1000):
        return None
    if v > now_ms + (3 * 365 * 24 * 3600 * 1000):
        return None
    return float(v)


# Prefer lastGood codex profile when available; otherwise pick most recently used codex profile.
expires_ms = None
if last_good and last_good in profiles and isinstance(profiles[last_good], dict):
    expires_ms = normalize_expires_ms(profiles[last_good].get("expires"))

if expires_ms is None:
    candidates = []
    for name, profile in profiles.items():
        if "codex" in name.lower() and isinstance(profile, dict):
            exp = normalize_expires_ms(profile.get("expires"))
            if exp is None:
                continue
            last_used = 0
            if isinstance(usage.get(name), dict):
                lu = usage[name].get("lastUsed")
                if isinstance(lu, (int, float)):
                    last_used = float(lu)
            candidates.append((last_used, exp))
    if candidates:
        candidates.sort(key=lambda t: (t[0], t[1]), reverse=True)
        expires_ms = candidates[0][1]

if expires_ms is None:
    raise SystemExit(0)

# If token expiry jumped forward (fresh re-auth), reset cooldown and suppress stale alert noise.
prev_exp = 0
if os.path.exists(state_file):
    try:
        with open(state_file) as sf:
            prev_exp = float(json.load(sf).get("last_expires", 0))
    except Exception:
        prev_exp = 0

if expires_ms > prev_exp + 3600 * 1000:
    cooldown_key = f"{cooldown_file}.codex"
    try:
        os.remove(cooldown_key)
    except FileNotFoundError:
        pass

os.makedirs(os.path.dirname(state_file), exist_ok=True)
with open(state_file, "w") as sf:
    json.dump({"last_expires": expires_ms, "updated_at": time.time()}, sf)

exp = expires_ms / 1000
remaining_h = (exp - time.time()) / 3600
if remaining_h < 48:
    cooldown_key = f"{cooldown_file}.codex"
    last = 0
    if os.path.exists(cooldown_key):
        try:
            with open(cooldown_key) as cf:
                last = float(cf.read().strip() or 0)
        except Exception:
            last = 0
    if time.time() - last > 43200:
        print(f"ALERT:Codex OAuth token expires in {remaining_h:.0f}h")
        with open(cooldown_key, "w") as cf:
            cf.write(str(time.time()))
PYCHECK
  )
  if [[ "$CODEX_ALERT" == ALERT:* ]]; then
    MSG="${CODEX_ALERT#ALERT:}"
    log "$MSG"
    notify "Codex Token Expiring" "$MSG. Refresh via: openclaw models auth login --provider openai-codex"
  fi
fi
