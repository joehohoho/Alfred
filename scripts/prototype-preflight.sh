#!/usr/bin/env bash
set -euo pipefail

# Prototype Reliability Pack preflight
# Usage:
#   bash scripts/prototype-preflight.sh legal-bill-ai
#   bash scripts/prototype-preflight.sh all

ROOT="/Users/hopenclaw"
TARGET="${1:-all}"

pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; return 1; }
run() {
  local name="$1"
  local cmd="$2"
  echo "🔎 ${name}"
  if eval "$cmd"; then
    pass "${name}"
  else
    fail "${name}"
  fi
}

check_legal_bill_ai() {
  local dir="$ROOT/LegalBillAI"
  [ -d "$dir" ] || fail "LegalBillAI directory missing: $dir"
  run "LegalBillAI npm install lock check" "cd '$dir' && test -f package-lock.json"
  run "LegalBillAI typecheck/build" "cd '$dir' && npm run -s build"
  run "LegalBillAI health endpoint" "curl -fsS --max-time 4 http://127.0.0.1:8003/api/health >/dev/null"
}

check_hst_gst() {
  run "HST/GST health endpoint" "curl -fsS --max-time 4 http://127.0.0.1:3000/ >/dev/null"
}

case "$TARGET" in
  legal-bill-ai)
    check_legal_bill_ai
    ;;
  hst-gst|hst-gst-calculator)
    check_hst_gst
    ;;
  all)
    check_legal_bill_ai
    check_hst_gst
    ;;
  *)
    echo "Unknown target: $TARGET"
    echo "Expected: legal-bill-ai | hst-gst | all"
    exit 2
    ;;
esac

echo "✅ Prototype preflight complete"
