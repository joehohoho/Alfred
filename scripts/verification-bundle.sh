#!/bin/bash
# verification-bundle.sh
# Build post-change evidence bundle for auditability.
#
# Usage:
#   bash scripts/verification-bundle.sh [--label "name"] [--cmd "custom command"]

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
OUT_ROOT="$WORKSPACE/tracking/verification"
mkdir -p "$OUT_ROOT"

label=""
custom_cmd=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --label)
      label="${2:-}"; shift ;;
    --cmd)
      custom_cmd="${2:-}"; shift ;;
  esac
  shift
done

ts="$(date +%Y%m%d_%H%M%S)"
out="$OUT_ROOT/$ts"
mkdir -p "$out"

if [[ -n "$label" ]]; then
  echo "$label" > "$out/label.txt"
fi

{
  echo "generated_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "generated_at_local=$(date '+%Y-%m-%d %H:%M %Z')"
  echo "host=$(hostname)"
} > "$out/meta.txt"

# 1) OpenClaw status
if command -v openclaw >/dev/null 2>&1; then
  openclaw status > "$out/openclaw-status.txt" 2>&1 || true
else
  echo "openclaw command unavailable" > "$out/openclaw-status.txt"
fi

# 2) Cron preflight
if [[ -x "$WORKSPACE/scripts/cron-preflight-validator.sh" ]]; then
  bash "$WORKSPACE/scripts/cron-preflight-validator.sh" --all > "$out/cron-preflight.txt" 2>&1 || true
else
  echo "cron-preflight-validator.sh missing" > "$out/cron-preflight.txt"
fi

# 3) LaunchAgents snapshot
launchctl list > "$out/launchctl-list.txt" 2>&1 || true

# 4) Optional custom verification
if [[ -n "$custom_cmd" ]]; then
  {
    echo "COMMAND: $custom_cmd"
    echo "---"
    bash -lc "$custom_cmd"
  } > "$out/custom-command.txt" 2>&1 || true
fi

# 5) Summary
{
  echo "Verification bundle created: $out"
  echo "Contents:"
  ls -1 "$out"
} > "$out/SUMMARY.txt"

echo "$out"
