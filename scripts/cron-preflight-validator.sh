#!/bin/bash
# cron-preflight-validator.sh — Validate cron delivery routing before enabling jobs
#
# Enforces: announce/webhook jobs must have valid delivery.to targets.
# Prevents recurring auto-disable pattern from bad channel IDs.
#
# Usage:
#   cron-preflight-validator.sh                # enabled jobs only
#   cron-preflight-validator.sh --all          # include disabled jobs
#   cron-preflight-validator.sh --job <id|name>
#
# Exit: 0 pass, 1 failures

set -euo pipefail

CRON_API="http://localhost:3001/api/cron"
ALLOWLIST="${CRON_ROUTING_ALLOWLIST:-$HOME/.openclaw/workspace/config/cron-routing-allowlist.json}"
VALIDATE_ALL=false
TARGET_JOB=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --all) VALIDATE_ALL=true ;;
    --job) TARGET_JOB="${2:-}"; shift ;;
  esac
  shift
done

echo "=== Cron Preflight Routing Validator ==="
echo "Allowlist: $ALLOWLIST"

if [[ ! -f "$ALLOWLIST" ]]; then
  echo "ERROR: allowlist not found: $ALLOWLIST" >&2
  exit 1
fi

JOBS_JSON=$(curl -s --max-time 10 "$CRON_API" 2>/dev/null || true)
if [[ -z "$JOBS_JSON" ]]; then
  echo "ERROR: unable to read $CRON_API" >&2
  exit 1
fi

TMP_JSON=$(mktemp)
printf '%s' "$JOBS_JSON" > "$TMP_JSON"

python3 - "$ALLOWLIST" "$VALIDATE_ALL" "$TARGET_JOB" "$TMP_JSON" <<'PY'
import json, sys

allowlist_path = sys.argv[1]
validate_all = sys.argv[2].lower() == 'true'
target_job = sys.argv[3]
jobs_json_path = sys.argv[4]

allow = json.load(open(allowlist_path, 'r', encoding='utf-8'))
known_discord = set(allow.get('discord', []))
known_slack = set(allow.get('slack', []))

jobs = json.load(open(jobs_json_path, 'r', encoding='utf-8')).get('jobs', [])

if target_job:
    jobs = [j for j in jobs if j.get('id') == target_job or j.get('name') == target_job]
    if not jobs:
        print(f"ERROR: job not found: {target_job}")
        sys.exit(1)

fail = 0
ok = 0
skipped = 0

for j in jobs:
    name = j.get('name', '?')
    jid = j.get('id', '?')
    enabled = bool(j.get('enabled', False))
    d = j.get('delivery') or {}
    mode = (d.get('mode') or '').strip()
    to = (d.get('to') or '').strip()

    if not enabled and not validate_all:
        skipped += 1
        continue

    issues = []

    if mode == 'announce':
        channel = (d.get('channel') or '').strip().lower()

        if not channel:
            issues.append('announce mode requires delivery.channel when multiple channels are configured')

        if not to:
            issues.append('announce mode requires delivery.to (missing)')
        elif channel == 'slack':
            if not to.startswith('C'):
                issues.append(f"Slack delivery.to must start with 'C' (got {to!r})")
            elif to not in known_slack:
                issues.append(f'unknown Slack channel id in delivery.to: {to}')
        elif channel == 'discord':
            if not to.isdigit():
                issues.append(f'Discord delivery.to must be numeric channel id (got {to!r})')
            elif to not in known_discord:
                issues.append(f'unknown Discord channel id in delivery.to: {to}')
        elif channel:
            issues.append(f'unsupported announce delivery.channel: {channel!r}')
        else:
            # fallback format checks if channel missing
            if not (to.startswith('C') or to.isdigit()):
                issues.append(f'unrecognized announce delivery.to format: {to!r}')

    elif mode == 'webhook':
        if not to or not (to.startswith('http://') or to.startswith('https://')):
            issues.append(f'webhook mode requires URL in delivery.to (got {to!r})')

    if issues:
        fail += 1
        print(f"❌ [{ 'enabled' if enabled else 'disabled' }] {name} ({jid})")
        print(f"   mode={mode!r} to={to!r}")
        for i in issues:
            print(f"   - {i}")
    else:
        ok += 1
        print(f"✅ [{ 'enabled' if enabled else 'disabled' }] {name}")

print("\n--- Summary ---")
print(f"Passed: {ok}")
print(f"Failed: {fail}")
print(f"Skipped: {skipped}")

sys.exit(1 if fail else 0)
PY
