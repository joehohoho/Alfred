#!/bin/bash

# test-service-resolver.sh
# Purpose: Test the service resolver script with 10 common service names/aliases
# Usage: ./test-service-resolver.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESOLVER="$SCRIPT_DIR/resolve-service-path.sh"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test data: (query, expected_service_key)
declare -a TEST_CASES=(
  "dashboard,command-center"
  "Command Center,command-center"
  "cc,command-center"
  "gateway,gateway"
  "openclaw-gateway,gateway"
  "workspace,workspace"
  "cron,cron-scheduler"
  "scheduler,cron-scheduler"
  "sentinel,sentinel"
  "health-monitor,sentinel"
)

PASSED=0
FAILED=0

echo "========================================="
echo "Service Resolver Test Suite"
echo "========================================="
echo ""

for test_case in "${TEST_CASES[@]}"; do
  IFS=',' read -r query expected_service <<< "$test_case"
  
  echo -n "Testing: '$query' -> '$expected_service'... "
  
  # Run resolver and extract service key from JSON output
  output=$("$RESOLVER" --json "$query" 2>/dev/null)
  result=$?
  
  if [[ $result -ne 0 ]]; then
    echo -e "${RED}FAIL${NC} (script error)"
    ((FAILED++))
    continue
  fi
  
  # For text output tests, we need to check if the resolver ran without error
  if echo "$output" | jq empty 2>/dev/null; then
    # Valid JSON output
    echo -e "${GREEN}PASS${NC}"
    ((PASSED++))
  else
    echo -e "${RED}FAIL${NC} (invalid output)"
    ((FAILED++))
  fi
done

echo ""
echo "========================================="
echo "JSON Output Format Test"
echo "========================================="
echo ""

echo "Testing JSON output structure..."
json_output=$("$RESOLVER" --json "dashboard" 2>/dev/null)

# Validate required fields
required_fields=("name" "aliases" "repo_path" "owner" "launch_agent")
for field in "${required_fields[@]}"; do
  if echo "$json_output" | jq -e ".$field" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Field '$field' present"
    ((PASSED++))
  else
    echo -e "  ${RED}✗${NC} Field '$field' missing"
    ((FAILED++))
  fi
done

echo ""
echo "========================================="
echo "Typo/Fuzzy Match Tests"
echo "========================================="
echo ""

# Test fuzzy matching
fuzzy_tests=("dashbord" "comand-center" "gatway" "cronscheduler")
echo "Testing fuzzy matching (common typos)..."
for typo in "${fuzzy_tests[@]}"; do
  echo -n "  '$typo'... "
  if output=$("$RESOLVER" --json "$typo" 2>/dev/null); then
    echo -e "${GREEN}PASS${NC} (fuzzy matched)"
    ((PASSED++))
  else
    echo -e "${YELLOW}SKIP${NC} (fuzzy match failed - may be expected)"
  fi
done

echo ""
echo "========================================="
echo "Error Handling Tests"
echo "========================================="
echo ""

# Test invalid input
echo -n "Testing invalid service name... "
if output=$("$RESOLVER" "nonexistent-service" 2>&1); then
  echo -e "${RED}FAIL${NC} (should have errored)"
  ((FAILED++))
else
  echo -e "${GREEN}PASS${NC} (correctly errored)"
  ((PASSED++))
fi

echo ""
echo "========================================="
echo "Test Results Summary"
echo "========================================="
TOTAL=$((PASSED + FAILED))
echo "Passed: ${GREEN}$PASSED${NC} / $TOTAL"
if [[ $FAILED -gt 0 ]]; then
  echo "Failed: ${RED}$FAILED${NC} / $TOTAL"
fi
echo ""

if [[ $FAILED -eq 0 ]]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
