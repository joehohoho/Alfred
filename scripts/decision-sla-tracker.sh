#!/bin/bash
# decision-sla-tracker.sh — Track SLA for decision packets + trigger escalations
# Purpose: Monitor approval/scope decisions, escalate at 20h/40h, auto-apply at 24h/48h
# Called by: cron job every 15 minutes
# Usage: decision-sla-tracker.sh [--check|--escalate|--auto-apply]

set -e

STATE_DIR="$HOME/.openclaw/workspace/.hal-alfred-tracking"
DECISION_SLA_FILE="$STATE_DIR/decision-sla-state.json"
NOTIFICATION_WEBHOOK="https://discord.com/api/webhooks/1476590430803202279/Np1MtEaUHs69JtS6_le54RCGzd0Jv0zkQMd-9zTBaoger20HuzHsh1T6ii-N8tdJxMVo"

mkdir -p "$STATE_DIR"

# Initialize or load state
if [[ ! -f "$DECISION_SLA_FILE" ]]; then
    echo '{"decisions": [], "escalations": []}' > "$DECISION_SLA_FILE"
fi

# Python script for SLA checking + escalation logic
python3 - <<'PYEOF'
import json
import sys
from datetime import datetime, timedelta

state_file = sys.argv[1] if len(sys.argv) > 1 else "/tmp/decision-sla-state.json"

# Load current state
try:
    with open(state_file) as f:
        state = json.load(f)
except:
    state = {"decisions": [], "escalations": []}

now = datetime.now()

# Check all active decisions
escalations_needed = []
auto_applies_due = []

for decision in state.get("decisions", []):
    created = datetime.fromisoformat(decision["created"])
    dec_type = decision["type"]  # "approval" or "scope"
    decision_id = decision["id"]
    title = decision["title"]
    
    # Calculate time elapsed
    elapsed = (now - created).total_seconds() / 3600  # hours
    
    if dec_type == "approval":
        escalation_threshold = 20  # hours
        final_deadline = 24  # hours
        default_action = decision.get("default_action", "approve")
    else:  # scope
        escalation_threshold = 40  # hours
        final_deadline = 48  # hours
        default_action = decision.get("default_action", "apply_default")
    
    # Check if escalation is due (and not already escalated)
    if elapsed >= escalation_threshold and not decision.get("escalated", False):
        escalations_needed.append({
            "id": decision_id,
            "title": title,
            "type": dec_type,
            "elapsed_hours": elapsed,
            "action": "send_escalation"
        })
        decision["escalated"] = True  # Mark as escalated
        
    # Check if auto-apply is due
    if elapsed >= final_deadline and not decision.get("auto_applied", False):
        auto_applies_due.append({
            "id": decision_id,
            "title": title,
            "type": dec_type,
            "elapsed_hours": elapsed,
            "action": default_action
        })
        decision["auto_applied"] = True  # Mark as auto-applied

# Save updated state
with open(state_file, 'w') as f:
    json.dump(state, f, indent=2)

# Output escalations
if escalations_needed:
    print(f"ESCALATIONS_NEEDED: {len(escalations_needed)}")
    for esc in escalations_needed:
        print(f"  - {esc['id']}: {esc['title']} ({esc['type']}) @ {esc['elapsed_hours']:.1f}h")

# Output auto-applies
if auto_applies_due:
    print(f"AUTO_APPLIES_DUE: {len(auto_applies_due)}")
    for aa in auto_applies_due:
        print(f"  - {aa['id']}: {aa['title']} ({aa['type']}) @ {aa['elapsed_hours']:.1f}h -> {aa['action']}")

PYEOF

if [ $? -eq 0 ]; then
    echo "SLA check complete"
else
    echo "ERROR: SLA check failed" >&2
    exit 1
fi
