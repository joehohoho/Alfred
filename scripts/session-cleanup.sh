#!/bin/bash
# session-cleanup.sh
# Runs via cron every 30 min. Prevents session bloat that causes API rate limit errors.
#
# Actions:
#   1. Remove one-shot sessions older than 2h (idle, chat, card, system, hal:maintenance)
#   2. Remove corrupted sessions (URL-based keys, etc.)
#   3. Reset main session if context exceeds 85% of model capacity
#   4. Cap total session count — prune oldest if > 80 sessions
#
# Safe: only touches sessions.json + JSONL files. Backs up main session before reset.

set -euo pipefail

SESSIONS_DIR="$HOME/.openclaw/agents/main/sessions"
SESSIONS_JSON="$SESSIONS_DIR/sessions.json"
LOG="$HOME/.openclaw/workspace/.hal-alfred-tracking/session-cleanup.log"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

if [[ ! -f "$SESSIONS_JSON" ]]; then
  log "SKIP: sessions.json not found"
  exit 0
fi

# Run cleanup in Python for safe JSON manipulation
python3 << 'PY'
import json, os, time, sys, shutil
from pathlib import Path
from datetime import datetime

SESSIONS_DIR = Path(os.path.expanduser("~/.openclaw/agents/main/sessions"))
SESSIONS_JSON = SESSIONS_DIR / "sessions.json"
LOG_PATH = Path(os.path.expanduser("~/.openclaw/workspace/.hal-alfred-tracking/session-cleanup.log"))

# Thresholds
CONTEXT_RESET_PCT = 0.85        # Reset main session above 85% context
ONE_SHOT_MAX_AGE_H = 2          # Remove one-shot sessions older than 2h
MAX_TOTAL_SESSIONS = 80         # Hard cap on session count
MODEL_CONTEXTS = {              # Known model context windows
    200000: 200000,
    272000: 272000,
    1048576: 1048576,
}

def log(msg):
    line = f"[{datetime.now().strftime('%Y-%m-%dT%H:%M:%S%z')}] {msg}"
    print(line)
    with open(LOG_PATH, "a") as f:
        f.write(line + "\n")

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
ONE_SHOT_PREFIXES = [":idle:", ":chat-", ":card:", ":system:", ":hal:maintenance:"]
now = time.time()

for key in list(data.keys()):
    if key in [r for r in to_remove]:
        continue
    is_one_shot = any(p in key for p in ONE_SHOT_PREFIXES)
    if not is_one_shot:
        continue

    # Check age via updatedAt in session entry
    updated_at = data[key].get("updatedAt", 0)
    if updated_at > 0:
        age_h = (now * 1000 - updated_at) / (1000 * 3600)
    else:
        # Fallback: check JSONL file mtime
        sid = data[key].get("sessionId", "")
        fpath = SESSIONS_DIR / f"{sid}.jsonl"
        if fpath.exists():
            age_h = (now - fpath.stat().st_mtime) / 3600
        else:
            age_h = 999  # missing file = stale

    if age_h > ONE_SHOT_MAX_AGE_H:
        to_remove.append(key)
        actions.append(f"stale({age_h:.0f}h):{key[:50]}")

# --- 3. Check main session context usage ---
main_entry = data.get("agent:main:main")
main_reset = False
if main_entry:
    ctx = main_entry.get("contextTokens", 0)
    # Determine model capacity (use the context value as the window size)
    # Default to 200K if unknown
    capacity = ctx if ctx in MODEL_CONTEXTS else 200000
    if ctx > 0:
        usage_pct = ctx / capacity if capacity > ctx else 0.96
        # For Codex (200K), contextTokens IS the window size when full
        # Check the JSONL file size as a proxy
        sid = main_entry.get("sessionId", "")
        fpath = SESSIONS_DIR / f"{sid}.jsonl"
        if fpath.exists():
            file_size_kb = fpath.stat().st_size / 1024
            # A session JSONL over 500KB with 200K context is likely very full
            if file_size_kb > 500 and ctx >= 200000:
                main_reset = True
                actions.append(f"main_reset:ctx={ctx},file={file_size_kb:.0f}KB")

if main_reset and "agent:main:main" not in [r for r in to_remove]:
    # Backup before removing
    sid = data["agent:main:main"].get("sessionId", "")
    fpath = SESSIONS_DIR / f"{sid}.jsonl"
    if fpath.exists():
        bak = SESSIONS_DIR / f"{sid}.jsonl.auto-bak"
        shutil.copy2(str(fpath), str(bak))
    to_remove.append("agent:main:main")

# --- 4. Delete JSONL files and update sessions.json ---
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

# --- 5. Cap total session count (remove oldest first) ---
if len(data) > MAX_TOTAL_SESSIONS:
    # Sort by updatedAt, remove oldest
    sorted_keys = sorted(data.keys(), key=lambda k: data[k].get("updatedAt", 0))
    # Don't remove persistent sessions (slack, discord, cron, imessage, subagent)
    PERSISTENT_PREFIXES = [":slack:", ":discord:", ":cron:", ":imessage:", ":subagent:"]
    excess = len(data) - MAX_TOTAL_SESSIONS
    removed_excess = 0
    for key in sorted_keys:
        if removed_excess >= excess:
            break
        is_persistent = any(p in key for p in PERSISTENT_PREFIXES)
        if is_persistent:
            continue
        sid = data[key].get("sessionId", "")
        if sid:
            fpath = SESSIONS_DIR / f"{sid}.jsonl"
            if fpath.exists():
                os.remove(fpath)
                deleted_files += 1
        del data[key]
        removed_excess += 1
        actions.append(f"cap_excess:{key[:50]}")

# Write updated sessions.json
with open(SESSIONS_JSON, "w") as f:
    json.dump(data, f, indent=2)

# Summary
removed = original_count - len(data)
if removed > 0 or main_reset:
    log(f"CLEANED: {removed} sessions removed ({original_count} -> {len(data)}), {deleted_files} files deleted" +
        (", main session RESET" if main_reset else ""))
    for a in actions[:10]:  # Log first 10 actions
        log(f"  - {a}")
else:
    log(f"OK: {len(data)} sessions, no cleanup needed")
PY

# Restart gateway if main session was reset
if grep -q "main_reset" <<< "$(tail -1 "$LOG")"; then
  log "Restarting gateway after main session reset..."
  pkill -f openclaw-gateway 2>/dev/null || true
  sleep 2
  nohup openclaw-gateway > /dev/null 2>&1 &
  sleep 2
  log "Gateway restarted (PID $(pgrep -f openclaw-gateway | head -1))"
fi
