#!/bin/bash
# hal-lease-monitor.sh - Enforce stale in_progress heartbeat/escalation controls
#
# Policy:
#   - >=24h stale: mandatory status comment
#   - >=48h stale: mark at_risk via comment
#   - >=72h stale: escalation comment + Command Center alert
#
# Usage:
#   bash scripts/hal-lease-monitor.sh

set -euo pipefail

DASHBOARD_API="http://localhost:3001/api"
STATE_DIR="$HOME/.openclaw/workspace/state"
STATE_FILE="$STATE_DIR/hal-lease-monitor-state.json"
mkdir -p "$STATE_DIR"

if [[ ! -f "$STATE_FILE" ]]; then
  echo '{}' > "$STATE_FILE"
fi

now_iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
now_epoch=$(date +%s)

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Stale-card monitor starting..."

IN_PROGRESS=$(curl -s "${DASHBOARD_API}/kanban?column=in_progress" 2>/dev/null || echo "[]")

if [[ -z "$IN_PROGRESS" || "$IN_PROGRESS" == "[]" ]]; then
  echo "✅ No in_progress cards"
  exit 0
fi

# Iterate safely via python to avoid shell parsing edge-cases.
python3 - "$IN_PROGRESS" "$STATE_FILE" "$DASHBOARD_API" "$now_iso" "$now_epoch" <<'PY'
import json
import sys
import datetime
import urllib.request

raw = json.loads(sys.argv[1])
if isinstance(raw, dict) and isinstance(raw.get("columns"), dict):
    cards = raw.get("columns", {}).get("in_progress", []) or []
elif isinstance(raw, list):
    cards = raw
else:
    cards = []
state_file = sys.argv[2]
api = sys.argv[3]
now_iso = sys.argv[4]
now_epoch = int(sys.argv[5])

with open(state_file, 'r', encoding='utf-8') as f:
    try:
        state = json.load(f)
    except Exception:
        state = {}


def post_comment(card_id: str, text: str):
    body = json.dumps({"author": "alfred", "text": text}).encode('utf-8')
    req = urllib.request.Request(
        f"{api}/kanban/{card_id}/comments",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    urllib.request.urlopen(req, timeout=10).read()


def post_notification(title: str, message: str, task_id: str):
    payload = {
        "type": "alert",
        "title": title,
        "message": message,
        "taskId": task_id,
        "source": "hal-lease-monitor",
    }
    body = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        f"{api}/notifications",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    urllib.request.urlopen(req, timeout=10).read()


def parse_ts(value: str):
    if not value:
        return None
    value = value.replace('Z', '+00:00')
    try:
        return datetime.datetime.fromisoformat(value)
    except Exception:
        return None


def level_for_age(hours: float):
    if hours >= 72:
        return "72h"
    if hours >= 48:
        return "48h"
    if hours >= 24:
        return "24h"
    return None

for card in cards:
    card_id = card.get("id")
    title = card.get("title", "Untitled")
    updated_at = card.get("updatedAt")
    dt = parse_ts(updated_at)
    if not card_id or not dt:
        continue

    updated_epoch = int(dt.timestamp())
    age_hours = (now_epoch - updated_epoch) / 3600
    level = level_for_age(age_hours)

    prev = state.get(card_id, {})
    prev_level = prev.get("lastLevel")

    if not level:
        # Clear prior state once card is no longer stale.
        if card_id in state:
            del state[card_id]
        print(f"✅ Active: {title} ({age_hours:.1f}h)")
        continue

    if level == prev_level:
        print(f"⏳ Unchanged stale level {level}: {title} ({age_hours:.1f}h)")
        continue

    if level == "24h":
        msg = (
            f"[STALE-24H] No progress update in {age_hours:.1f}h. "
            f"Required status heartbeat: current state, blocker (if any), and next concrete step. "
            f"Timestamp: {now_iso}."
        )
        post_comment(card_id, msg)
        print(f"⚠️  24h heartbeat enforced: {title}")

    elif level == "48h":
        msg = (
            f"[AT-RISK-48H] Card stale for {age_hours:.1f}h. Marked at-risk. "
            f"Required now: blocker classification + recovery plan + ETA. Timestamp: {now_iso}."
        )
        post_comment(card_id, msg)
        print(f"⚠️  48h at-risk enforced: {title}")

    elif level == "72h":
        msg = (
            f"[ESCALATION-72H] Card stale for {age_hours:.1f}h. Escalation triggered. "
            f"Action required: Alfred triage + Joe visibility. Timestamp: {now_iso}."
        )
        post_comment(card_id, msg)
        post_notification(
            title="HAL stale in_progress escalation (72h)",
            message=(
                f"Card '{title}' has been in_progress without update for {age_hours:.1f}h. "
                f"Escalation posted on card. Please triage blocker/owner/next step."
            ),
            task_id=card_id,
        )
        print(f"🚨 72h escalation enforced: {title}")

    state[card_id] = {
        "lastLevel": level,
        "lastActionAt": now_iso,
        "title": title,
    }

with open(state_file, 'w', encoding='utf-8') as f:
    json.dump(state, f, indent=2)

print("✅ Stale-card monitor complete")
PY

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Done."