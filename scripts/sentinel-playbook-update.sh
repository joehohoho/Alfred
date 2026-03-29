#!/bin/bash
# sentinel-playbook-update.sh — Alfred/HAL call this after fixing a sentinel-diagnosed issue
#
# Updates the sentinel playbook so the sentinel can apply the fix automatically next time.
#
# Usage: sentinel-playbook-update.sh <component> <description> [fix-script-name]
#
# Examples:
#   sentinel-playbook-update.sh hal "Reset HAL gateway allowedOrigins to wildcard" "fix-hal-origins.sh"
#   sentinel-playbook-update.sh idle_loop "Re-enabled idle loop cron that was auto-disabled"
#   sentinel-playbook-update.sh gateway "Cleared bloated session causing gateway timeout"

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
PLAYBOOK="$WORKSPACE/.hal-alfred-tracking/sentinel-playbook.json"
AUDIT="$WORKSPACE/scripts/audit-log.sh"

COMPONENT="${1:?Usage: sentinel-playbook-update.sh <component> <description> [fix-script]}"
DESCRIPTION="${2:?Description required}"
FIX_SCRIPT="${3:-}"

python3 -c "
import json, os, time

playbook_file = '$PLAYBOOK'
component = '$COMPONENT'
description = '''$DESCRIPTION'''
fix_script = '$FIX_SCRIPT'

# Load or create playbook
playbook = {}
if os.path.exists(playbook_file):
    try:
        with open(playbook_file) as f:
            playbook = json.load(f)
    except:
        playbook = {}

# Add the new fix entry
fixes = playbook.setdefault(component, [])

entry = {
    'description': description,
    'fix_script': fix_script,
    'success': True,
    'addedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    'addedBy': 'agent',
}

# Check for duplicate
existing = [f for f in fixes if f.get('description') == description]
if not existing:
    fixes.append(entry)
    # Keep last 10 fixes per component
    playbook[component] = fixes[-10:]

    with open(playbook_file, 'w') as f:
        json.dump(playbook, f, indent=2)
    print(f'Added fix for {component}: {description}')
else:
    print(f'Fix already in playbook: {description}')
" 2>/dev/null

bash "$AUDIT" info "sentinel-playbook" "New fix learned for $COMPONENT" --detail "$DESCRIPTION" 2>/dev/null || true

echo "Playbook updated. Sentinel will try this fix automatically next time."
