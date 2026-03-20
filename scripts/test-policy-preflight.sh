#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$(dirname "$SCRIPT_DIR")"
PREFLIGHT="$SCRIPT_DIR/policy-preflight.sh"

pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; exit 1; }

# 1) Allow shared/internal notification
bash "$PREFLIGHT" --script test.sh --action notify --external 0 --target-class internal_system --priority normal >/dev/null
pass "allow internal notification"

# 2) Block quiet-hours direct_user normal priority
if bash "$PREFLIGHT" --script test.sh --action notify --external 1 --target-class direct_user --priority normal --force-quiet-hours 1 >/dev/null 2>&1; then
  fail "quiet-hours direct_user should block"
else
  pass "block quiet-hours direct_user"
fi

# 3) Allow quiet-hours direct_user critical priority
bash "$PREFLIGHT" --script test.sh --action notify --external 1 --target-class direct_user --priority critical --force-quiet-hours 1 >/dev/null
pass "allow critical quiet-hours direct_user"

# 4) Block forbidden-file write
if bash "$PREFLIGHT" --script test.sh --action file_write --write-path "$HOME/.openclaw/openclaw.json" >/dev/null 2>&1; then
  fail "forbidden file write should block"
else
  pass "block forbidden file write"
fi

# 5) Block duplicate dedup key in window
bash "$PREFLIGHT" --script test.sh --action notify --target-class internal_system --dedup-key "test:key:1" --dedup-window-sec 60 >/dev/null
if bash "$PREFLIGHT" --script test.sh --action notify --target-class internal_system --dedup-key "test:key:1" --dedup-window-sec 60 >/dev/null 2>&1; then
  fail "dedup duplicate should block"
else
  pass "block duplicate dedup key"
fi

echo "All policy preflight tests passed"
