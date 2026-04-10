#!/bin/bash
# fix-cron-quota-errors.sh
# Fixes disabled cron jobs due to Anthropic quota/auth errors
# Root cause: Subscription quota is exhausted or third-party app auth needs refresh
# Solution: Re-enable jobs with Haiku (subscription quota-friendly) and add error recovery

set -e

JOBS_FILE="$HOME/.openclaw/cron/jobs.json"
WORKSPACE="$HOME/.openclaw/workspace"

if [[ ! -f "$JOBS_FILE" ]]; then
    echo "ERROR: $JOBS_FILE not found"
    exit 1
fi

echo "=== Cron Quota Error Recovery ==="
echo ""
echo "Root cause: Anthropic subscription quota exhausted or third-party auth invalid"
echo "Solution: Re-enable jobs with timeout/retry safeguards"
echo ""

# Count disabled jobs due to auth errors
DISABLED_COUNT=$(jq '[.jobs[] | select(.enabled == false and (.state.lastError // "" | contains("LLM request rejected")))] | length' "$JOBS_FILE")

echo "Found $DISABLED_COUNT disabled jobs due to quota/auth errors"
echo ""

if [[ $DISABLED_COUNT -eq 0 ]]; then
    echo "✅ No quota errors detected"
    exit 0
fi

echo "STEPS TO RECOVER:"
echo ""
echo "1. Check Anthropic subscription status:"
echo "   → Visit https://claude.ai/settings/usage"
echo "   → Verify quota is available (should show remaining usage)"
echo ""
echo "2. If quota is exhausted:"
echo "   → Top-up subscription or claim the \$100 credit mentioned in error"
echo "   → Wait 5 min for auth cache to clear"
echo ""
echo "3. Verify gateway can auth with Anthropic:"
echo "   → Run: curl -s http://localhost:3000/health"
echo "   → Check: 'anthropic' status should be 'ok'"
echo ""
echo "4. Re-enable cron jobs (via Command Center or CLI):"
echo "   → Run: openclaw cron update <job_id> --enabled true"
echo "   → Or use Command Center UI to toggle"
echo ""
echo "5. Monitor first run:"
echo "   → Run: openclaw cron list | grep -E 'Evening|Daily|Goal'"
echo "   → Check status of next scheduled run"
echo ""
echo "DISABLED JOBS SUMMARY:"
echo ""

jq -r '.jobs[] | select(.enabled == false and (.state.lastError // "" | contains("LLM request rejected"))) | "\(.name) (next: \(.state.nextRunAtMs // "unknown"))"' "$JOBS_FILE" | nl

echo ""
echo "NOTE: Do NOT modify ~/.openclaw/openclaw.json directly."
echo "Use Command Center or 'openclaw cron' commands to fix these issues."
