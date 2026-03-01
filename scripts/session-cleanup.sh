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

SESSIONS_DIR="$HOME/.openclaw/agents/main/sessions"
SESSIONS_JSON="$SESSIONS_DIR/sessions.json"
LOG="$HOME/.openclaw/logs/session-cleanup.log"
NOTIFY_URL="http://localhost:3001/api/notifications"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

notify() {
  local title="$1" message="$2"
  curl -s -X POST "$NOTIFY_URL" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"system\",\"title\":\"$title\",\"message\":\"$message\"}" \
    > /dev/null 2>&1 || true
}

if [[ ! -f "$SESSIONS_JSON" ]]; then
  log "SKIP: sessions.json not found"
  exit 0
fi

# Run cleanup in Python for safe JSON manipulation
python3 << 'PY'
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
    print(line)
    with open(LOG_PATH, "a") as f:
        f.write(line + "\n")

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
    ":card:",          # card-specific sessions
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

# Restart gateway if main session was reset
if echo "$CLEANUP_OUTPUT" | grep -q "FLAG:MAIN_RESET"; then
  log "Restarting gateway after main session reset..."
  pkill -f openclaw-gateway 2>/dev/null || true
  sleep 2
  nohup openclaw-gateway > /dev/null 2>&1 &
  sleep 2
  log "Gateway restarted (PID $(pgrep -f openclaw-gateway | head -1))"
  notify "Session Auto-Reset" "Main session was at 85%+ context. Auto-reset and gateway restarted."
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
with open(auth_file) as f:
    data = json.load(f)
profiles = data.get("profiles", {})
for name, profile in profiles.items():
    if "codex" in name.lower() and "expires" in profile:
        exp = profile["expires"] / 1000
        remaining_h = (exp - time.time()) / 3600
        if remaining_h < 48:
            cooldown_key = f"{cooldown_file}.codex"
            last = 0
            if os.path.exists(cooldown_key):
                try: last = float(open(cooldown_key).read())
                except: pass
            if time.time() - last > 43200:
                print(f"ALERT:Codex OAuth token expires in {remaining_h:.0f}h")
                with open(cooldown_key, "w") as cf:
                    cf.write(str(time.time()))
            break
PYCHECK
  )
  if [[ "$CODEX_ALERT" == ALERT:* ]]; then
    MSG="${CODEX_ALERT#ALERT:}"
    log "$MSG"
    notify "Codex Token Expiring" "$MSG. Refresh via: openclaw models auth login --provider openai-codex"
  fi
fi
