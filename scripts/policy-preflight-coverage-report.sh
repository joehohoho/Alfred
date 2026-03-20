#!/bin/bash
# policy-preflight-coverage-report.sh
# Reports which expected automation entrypoints have NOT invoked policy-preflight recently.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$(dirname "$SCRIPT_DIR")"
TRACK_DIR="$WORKSPACE/tracking"
EXPECTED_FILE="$WORKSPACE/config/policy-preflight-expected-entrypoints.txt"
COVERAGE_JSONL="$TRACK_DIR/policy-preflight-coverage.jsonl"
HOURS="${1:-24}"

if ! [[ "$HOURS" =~ ^[0-9]+$ ]]; then
  echo "Usage: $0 [hours]" >&2
  exit 2
fi

if [[ ! -f "$EXPECTED_FILE" ]]; then
  echo "Missing expected entrypoint file: $EXPECTED_FILE" >&2
  exit 1
fi

python3 - "$EXPECTED_FILE" "$COVERAGE_JSONL" "$HOURS" <<'PY'
import json, sys, time
expected_path, coverage_path, hours = sys.argv[1], sys.argv[2], int(sys.argv[3])
cutoff = int(time.time()) - hours * 3600
expected = []
with open(expected_path, 'r') as f:
    for line in f:
        s = line.strip()
        if s and not s.startswith('#'):
            expected.append(s)

last_seen = {}
try:
    with open(coverage_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            script = obj.get('script')
            ts = int(obj.get('ts', 0))
            if not script:
                continue
            if script not in last_seen or ts > last_seen[script]:
                last_seen[script] = ts
except FileNotFoundError:
    pass

covered_recent = []
missing_recent = []
for script in expected:
    ts = last_seen.get(script)
    if ts and ts >= cutoff:
        covered_recent.append((script, ts))
    else:
        missing_recent.append((script, ts))

print(f"Policy Preflight Coverage Report ({hours}h)")
print(f"Expected entrypoints: {len(expected)}")
print(f"Covered in window: {len(covered_recent)}")
print(f"Missing in window: {len(missing_recent)}")
print("")

if missing_recent:
    print("Missing / non-compliant entrypoints:")
    for script, ts in missing_recent:
        if ts:
            age_h = int((int(time.time()) - ts) / 3600)
            print(f"- {script} (last seen {age_h}h ago)")
        else:
            print(f"- {script} (never seen)")
else:
    print("No missing entrypoints in this window.")
PY
