#!/usr/bin/env bash
# recommendations-preflight.sh
# Validates infra recommendations integration for conflicts/duplication + guardrails.

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
CRON_JSON="$(mktemp)"
trap 'rm -f "$CRON_JSON"' EXIT

PASS=0
FAIL=0
warn() { echo "⚠️  $*"; }
ok() { echo "✅ $*"; PASS=$((PASS+1)); }
bad() { echo "❌ $*"; FAIL=$((FAIL+1)); }

echo "=== Recommendations Preflight ==="

echo "[1/6] Core script presence"
for s in \
  "$WORKSPACE/scripts/cron-preflight-validator.sh" \
  "$WORKSPACE/scripts/check-codex-auth.sh" \
  "$WORKSPACE/scripts/send-notification.sh" \
  "$WORKSPACE/scripts/hal-alfred-route.sh" \
  "$WORKSPACE/scripts/hal-alfred-route-auto.sh" \
  "$WORKSPACE/scripts/task-routing-policy.sh"
do
  if [[ -x "$s" || -f "$s" ]]; then ok "Found: $(basename "$s")"; else bad "Missing: $s"; fi
done

echo

echo "[2/6] Cron fetch"
if ! curl -s --max-time 10 "http://localhost:3001/api/cron" > "$CRON_JSON"; then
  bad "Cannot fetch cron API"
else
  ok "Cron API reachable"
fi

echo

echo "[3/6] Duplicate cron-name check"
python3 - "$CRON_JSON" <<'PY'
import json, sys, collections
p=sys.argv[1]
j=json.load(open(p))
jobs=j.get('jobs',[])
name_map=collections.defaultdict(list)
for job in jobs:
    name_map[(job.get('name') or '').strip()].append(job)

dupes=[(k,v) for k,v in name_map.items() if k and len(v)>1]
if not dupes:
    print('OK: no duplicate cron names')
    sys.exit(0)
print('DUPES:')
for name,items in dupes:
    ids=', '.join(i.get('id','?') for i in items)
    print(f'- {name}: {len(items)} jobs ({ids})')
sys.exit(2)
PY
rc=$?
if [[ $rc -eq 0 ]]; then ok "No duplicate cron names"; else warn "Duplicate cron names detected (review recommended)"; fi

echo

echo "[4/6] Delivery routing preflight"
if bash "$WORKSPACE/scripts/cron-preflight-validator.sh" --all >/tmp/reco-cron-preflight.txt 2>&1; then
  ok "Cron preflight passed"
else
  warn "Cron preflight reported issues (see /tmp/reco-cron-preflight.txt)"
fi

echo

echo "[5/6] Routing policy sanity"
ROUTE_JSON=$(bash "$WORKSPACE/scripts/hal-alfred-route-auto.sh" --text "Implement multi-step architecture change across modules with security implications" --json --explain)
if echo "$ROUTE_JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("route") in ("HAL","Alfred"); print("ok")' >/dev/null 2>&1; then
  ok "HAL/Alfred router returns valid JSON decision"
else
  bad "HAL/Alfred router JSON invalid"
fi

echo

echo "[6/7] Notification policy preflight linkage"
if grep -q "policy-preflight.sh" "$WORKSPACE/scripts/send-notification.sh"; then
  ok "send-notification uses policy preflight"
else
  bad "send-notification missing policy preflight link"
fi

echo

echo "[7/7] Phase 2 policy engine sanity"
POLICY_JSON=$(bash "$WORKSPACE/scripts/task-routing-policy.sh" --text "Implement end-to-end multi-step coding refactor across modules" --json)
if echo "$POLICY_JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("must_delegate") is True; assert d.get("thread_required") is True; print("ok")' >/dev/null 2>&1; then
  ok "Phase 2 policy correctly marks complex task as must-delegate"
else
  bad "Phase 2 policy sanity failed (must_delegate/thread_required)"
fi

echo
if [[ $FAIL -gt 0 ]]; then
  echo "Result: $PASS checks passed, $FAIL failed."
  exit 1
fi

echo "Result: all critical checks passed ($PASS)."
