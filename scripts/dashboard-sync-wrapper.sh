#!/bin/bash
# dashboard-sync-wrapper.sh - Runs dashboard sync without needing an LLM
# Executes sync-data.sh and outputs the result directly.

set -o pipefail

SCRIPT="$HOME/.openclaw/workspace/Alfred-Dashboard/sync-data.sh"

if [ ! -f "$SCRIPT" ]; then
    echo "ERROR: sync-data.sh not found at $SCRIPT"
    exit 1
fi

bash "$SCRIPT" 2>&1
exit $?
