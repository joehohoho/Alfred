#!/bin/bash
# cleanup-read-errors.sh — Monitor and report repeated EISDIR errors
# Run every 30 minutes to prevent log spam and alert if pattern continues
#
# Purpose: Detect when agents keep trying to read directories and escalate
# to Alfred with specific paths causing the issue

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
GATEWAY_ERR="/var/log/openclaw/gateway.err.log"

if [[ ! -f "$GATEWAY_ERR" ]]; then
  # Try alternate path
  GATEWAY_ERR="$HOME/.openclaw/logs/gateway.err.log"
fi

if [[ ! -f "$GATEWAY_ERR" ]]; then
  echo "Gateway error log not found"
  exit 1
fi

# Get last 100 lines and find all EISDIR errors
errors=$(tail -100 "$GATEWAY_ERR" | grep "read failed: EISDIR" || true)

if [[ -z "$errors" ]]; then
  exit 0
fi

# Extract unique paths from errors
paths=$(echo "$errors" | grep -oP '(?<=path":")[^"]+' | sort | uniq)

count=$(echo "$errors" | wc -l)

if [[ $count -gt 3 ]]; then
  echo "[ALERT] EISDIR errors detected in gateway.err.log: $count occurrences"
  echo "Paths involved:"
  echo "$paths" | while read -r p; do
    echo "  - $p"
  done
  echo ""
  echo "Recent errors:"
  echo "$errors" | tail -3
  exit 1
else
  # Low volume, ignore
  exit 0
fi
