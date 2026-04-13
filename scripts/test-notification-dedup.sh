#!/bin/bash
# test-notification-dedup.sh
# 
# Comprehensive test suite for notification deduplication system
# Validates: fingerprinting, cooldown windows, evidence escalation, metrics

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$(dirname "$SCRIPT_DIR")"
ENGINE="$SCRIPT_DIR/notification-dedup-engine.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper: Run a test
test_case() {
  local name="$1"
  TESTS_RUN=$((TESTS_RUN + 1))
  echo -e "\n${BLUE}[TEST $TESTS_RUN] $name${NC}"
}

# Helper: Assert condition
assert_true() {
  local condition="$1"
  local message="$2"
  
  if eval "$condition"; then
    echo -e "  ${GREEN}✓ $message${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "  ${RED}✗ $message${NC}"
    echo -e "    Condition: $condition"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# Helper: Assert contains
assert_contains() {
  local text="$1"
  local substring="$2"
  local message="$3"
  
  if [[ "$text" == *"$substring"* ]]; then
    echo -e "  ${GREEN}✓ $message${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "  ${RED}✗ $message${NC}"
    echo -e "    Expected substring: $substring"
    echo -e "    Got: ${text:0:100}..."
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# ============================================================================
# TEST 1: Basic fingerprinting
# ============================================================================
test_case "Fingerprinting recognizes CoinUsUp growth question"

RESULT=$(node "$ENGINE" check \
  --title "What's the one thing that would unlock the next growth phase for CoinUsUp?" \
  --body "Not what you're working on now—what if you changed one thing?" \
  --json)

assert_contains "$RESULT" "coinusup-growth" "Topic recognized as 'coinusup-growth'"
assert_contains "$RESULT" "false" "First occurrence not suppressed"

# ============================================================================
# TEST 2: Cooldown enforcement
# ============================================================================
test_case "Cooldown blocks same topic immediately after"

RESULT=$(node "$ENGINE" check \
  --title "What's the one thing that would unlock the next growth phase for CoinUsUp?" \
  --body "Not what you're working on now—what if you changed one thing?" \
  --json)

assert_contains "$RESULT" "true" "Second occurrence is suppressed"
assert_contains "$RESULT" "cooldown_active" "Reason is cooldown_active"

# ============================================================================
# TEST 3: Different topics not blocked together
# ============================================================================
test_case "Different semantic topics don't interfere"

# Clear any tracking
rm -f "$WORKSPACE/memory/notification-dedup-tracking.json"

# Ask about CoinUsUp
node "$ENGINE" check \
  --title "What's the one thing that would unlock the next growth phase for CoinUsUp?" \
  --body "..." \
  --json > /dev/null

# Immediately ask about Even Us Up (different topic)
RESULT=$(node "$ENGINE" check \
  --title "For Even Us Up, what's the smallest win that would feel like real progress?" \
  --body "What would feel like legitimate traction?" \
  --json)

assert_contains "$RESULT" "false" "Different topic allowed immediately"
assert_contains "$RESULT" "even-us-up" "Topic recognized as 'even-us-up'"

# ============================================================================
# TEST 4: Evidence escalation
# ============================================================================
test_case "Evidence addition escalates question sooner"

# Clear tracking
rm -f "$WORKSPACE/memory/notification-dedup-tracking.json"

# Ask about CoinUsUp
node "$ENGINE" check \
  --title "What's the one thing that would unlock the next growth phase for CoinUsUp?" \
  --body "..." \
  --json > /dev/null

# Try asking immediately (should be suppressed)
RESULT1=$(node "$ENGINE" check \
  --title "What's the one thing that would unlock the next growth phase for CoinUsUp?" \
  --body "..." \
  --json)

assert_contains "$RESULT1" "true" "Immediately after, it's suppressed"

# Add evidence
node "$ENGINE" evidence \
  --topic coinusup-growth \
  --evidence "Joe approved new marketing budget"

# Now try asking again (should be allowed due to 3-day evidence window)
RESULT2=$(node "$ENGINE" check \
  --title "What's the one thing that would unlock the next growth phase for CoinUsUp?" \
  --body "..." \
  --json)

assert_contains "$RESULT2" "false" "After evidence, question allowed again"

# ============================================================================
# TEST 5: Reset functionality
# ============================================================================
test_case "Reset topic clears cooldown"

# Clear tracking
rm -f "$WORKSPACE/memory/notification-dedup-tracking.json"

# Ask twice
node "$ENGINE" check --title "CoinUsUp test" --body "..." --json > /dev/null
RESULT1=$(node "$ENGINE" check --title "CoinUsUp test" --body "..." --json)
assert_contains "$RESULT1" "true" "Second ask is suppressed"

# Reset
node "$ENGINE" reset-topic coinusup-growth

# Ask again (should be allowed)
node "$ENGINE" check --title "CoinUsUp test" --body "..." --json > /dev/null
RESULT2=$(node "$ENGINE" check --title "CoinUsUp test" --body "..." --json)

assert_contains "$RESULT2" "false" "After reset, question allowed again"

# ============================================================================
# TEST 6: Report generation
# ============================================================================
test_case "Report endpoint generates valid JSON"

REPORT=$(node "$ENGINE" report --json)

assert_contains "$REPORT" "schema_version" "Report contains schema_version"
assert_contains "$REPORT" "summary" "Report contains summary"
assert_contains "$REPORT" "topics" "Report contains topics"
assert_contains "$REPORT" "suppressed" "Report contains suppressed array"

# ============================================================================
# TEST 7: No false positives on unrelated text
# ============================================================================
test_case "Questions without semantic matches are allowed"

# Clear tracking
rm -f "$WORKSPACE/memory/notification-dedup-tracking.json"

# Ask a completely unrelated question
RESULT=$(node "$ENGINE" check \
  --title "What's your favorite color?" \
  --body "Just curious what you prefer" \
  --json)

assert_contains "$RESULT" "false" "Unrelated question allowed"
assert_contains "$RESULT" "no_semantic_match" "Reason is no_semantic_match"

# ============================================================================
# TEST 8: Multiple evidence escalations
# ============================================================================
test_case "Multiple evidence additions increase escalation tier"

# Clear tracking
rm -f "$WORKSPACE/memory/notification-dedup-tracking.json"

# Initial question
node "$ENGINE" check --title "CoinUsUp test" --body "..." --json > /dev/null

# Add multiple evidence items
for i in {1..3}; do
  node "$ENGINE" evidence \
    --topic coinusup-growth \
    --evidence "Evidence item $i" > /dev/null
done

REPORT=$(node "$ENGINE" report --json)
TIER=$(echo "$REPORT" | jq '.topics | .[] | select(.topic=="coinusup-growth") | .escalation_tier')

# Should be tier 3 (initial 0 + 3 evidence additions)
assert_true "[[ $TIER -ge 2 ]]" "Escalation tier increased with evidence"

# ============================================================================
# TEST 9: Metric tracking
# ============================================================================
test_case "Metrics accumulate correctly"

# Clear and do known operations
rm -f "$WORKSPACE/memory/notification-dedup-tracking.json"

node "$ENGINE" check --title "Q1" --body "..." --json > /dev/null
node "$ENGINE" check --title "Q1" --body "..." --json > /dev/null  # Suppressed
node "$ENGINE" check --title "Q2" --body "..." --json > /dev/null
node "$ENGINE" check --title "Q2" --body "..." --json > /dev/null  # Suppressed

REPORT=$(node "$ENGINE" report --json)

TOTAL=$(echo "$REPORT" | jq '.summary.total_notifications_checked')
SUPPRESSED=$(echo "$REPORT" | jq '.summary.total_suppressed')

assert_true "[[ $TOTAL -ge 4 ]]" "Total checked >= 4"
assert_true "[[ $SUPPRESSED -ge 2 ]]" "Total suppressed >= 2"

# ============================================================================
# TEST 10: Persistence across runs
# ============================================================================
test_case "Tracking persists between engine invocations"

# Clear and do initial operation
rm -f "$WORKSPACE/memory/notification-dedup-tracking.json"

node "$ENGINE" check --title "Persistence test" --body "..." --json > /dev/null
node "$ENGINE" check --title "Persistence test" --body "..." --json > /dev/null  # Suppressed

# New process, same question
RESULT=$(node "$ENGINE" check --title "Persistence test" --body "..." --json)

assert_contains "$RESULT" "true" "State persisted across invocations"

# ============================================================================
# TEST 11: Pattern matching accuracy
# ============================================================================
test_case "Pattern matching is accurate (no false negatives)"

# Clear
rm -f "$WORKSPACE/memory/notification-dedup-tracking.json"

declare -a EVEN_UP_VARIANTS=(
  "For Even Us Up, what's the smallest win that would feel like real progress?"
  "Even Us Up: how close are we to real traction?"
  "What would make Even Us Up feel successful?"
  "Even Us Up monetization strategy?"
)

for q in "${EVEN_UP_VARIANTS[@]}"; do
  RESULT=$(node "$ENGINE" check --title "$q" --body "..." --json)
  assert_contains "$RESULT" "even-us-up" "Pattern matched: $q"
done

# ============================================================================
# SUMMARY
# ============================================================================
echo -e "\n${BLUE}================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}================================${NC}"
echo "Tests run:    $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
else
  echo -e "Tests failed: ${GREEN}0${NC}"
fi

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}✗ Some tests failed${NC}"
  exit 1
fi
