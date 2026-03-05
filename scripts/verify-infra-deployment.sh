#!/bin/bash
# verify-infra-deployment.sh - Verify all infrastructure improvements are deployed correctly
# Usage: bash verify-infra-deployment.sh

set -uo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
PASS=0
FAIL=0

echo "=== HAL Infrastructure Deployment Verification ==="
echo ""

# ─── Check LaunchAgents ────────────────────────────────────────────────────

verify_launchagent() {
  local agent=$1
  local expected_status=$2  # "loaded" or "unloaded"
  
  if launchctl list | grep -q "$agent"; then
    if [[ "$expected_status" == "loaded" ]]; then
      echo "✅ $agent: LOADED"
      ((PASS++))
    else
      echo "❌ $agent: LOADED (expected unloaded)"
      ((FAIL++))
    fi
  else
    if [[ "$expected_status" == "unloaded" ]]; then
      echo "✅ $agent: UNLOADED"
      ((PASS++))
    else
      echo "❌ $agent: UNLOADED (expected loaded)"
      ((FAIL++))
    fi
  fi
}

echo "LaunchAgents:"
verify_launchagent "com.alfred.hal-retry-queue" "loaded"
verify_launchagent "com.alfred.overnight-scheduler" "loaded"
verify_launchagent "com.alfred.log-rotation" "unloaded"

echo ""

# ─── Check Scripts Exist & Executable ────────────────────────────────────────

verify_script() {
  local script=$1
  
  if [[ ! -f "$WORKSPACE/scripts/$script" ]]; then
    echo "❌ $script: NOT FOUND"
    ((FAIL++))
    return 1
  fi
  
  if [[ ! -x "$WORKSPACE/scripts/$script" ]]; then
    echo "❌ $script: NOT EXECUTABLE"
    ((FAIL++))
    return 1
  fi
  
  echo "✅ $script: EXISTS & EXECUTABLE"
  ((PASS++))
}

echo "Scripts:"
verify_script "hal-retry-queue.sh"
verify_script "overnight-scheduler.sh"
verify_script "hal-lease-monitor-enhanced.sh"

echo ""

# ─── Check Directories ────────────────────────────────────────────────────────

verify_directory() {
  local dir=$1
  
  if [[ -d "$dir" ]]; then
    echo "✅ $dir: EXISTS"
    ((PASS++))
  else
    echo "❌ $dir: NOT FOUND"
    ((FAIL++))
  fi
}

echo "Directories:"
verify_directory "$WORKSPACE/.hal-retry-queue"
verify_directory "$WORKSPACE/logs"

echo ""

# ─── Check Queue File Format ────────────────────────────────────────────────────

if [[ -f "$WORKSPACE/.hal-retry-queue/queue.jsonl" ]]; then
  if jq -e . < "$WORKSPACE/.hal-retry-queue/queue.jsonl" >/dev/null 2>&1 || [[ ! -s "$WORKSPACE/.hal-retry-queue/queue.jsonl" ]]; then
    echo "✅ Queue file: VALID JSON"
    ((PASS++))
  else
    echo "❌ Queue file: INVALID JSON"
    ((FAIL++))
  fi
else
  echo "✅ Queue file: NOT EXISTS (fresh state, OK)"
  ((PASS++))
fi

echo ""

# ─── Check Documentation ────────────────────────────────────────────────────────

verify_file() {
  local file=$1
  
  if [[ -f "$file" ]]; then
    echo "✅ $(basename $file): EXISTS"
    ((PASS++))
  else
    echo "❌ $(basename $file): NOT FOUND"
    ((FAIL++))
  fi
}

echo "Documentation:"
verify_file "$WORKSPACE/HAL-INFRA-IMPROVEMENTS.md"

echo ""

# ─── Quick Functionality Test ────────────────────────────────────────────────────

echo "Functionality Tests:"

# Test retry queue help
if bash "$WORKSPACE/scripts/hal-retry-queue.sh" --help >/dev/null 2>&1; then
  echo "✅ hal-retry-queue.sh: HELP WORKS"
  ((PASS++))
elif bash "$WORKSPACE/scripts/hal-retry-queue.sh" 2>&1 | grep -q "Usage"; then
  echo "✅ hal-retry-queue.sh: USAGE WORKS"
  ((PASS++))
else
  echo "⚠️  hal-retry-queue.sh: NO USAGE (may be normal)"
fi

# Test status command
if bash "$WORKSPACE/scripts/hal-retry-queue.sh" --status >/dev/null 2>&1; then
  echo "✅ hal-retry-queue.sh --status: WORKS"
  ((PASS++))
else
  echo "❌ hal-retry-queue.sh --status: FAILED"
  ((FAIL++))
fi

echo ""

# ─── Summary ────────────────────────────────────────────────────────────────────

TOTAL=$((PASS + FAIL))
PERCENT=$(( PASS * 100 / TOTAL ))

echo "=== Verification Summary ==="
echo "Passed: $PASS/$TOTAL ($PERCENT%)"

if [[ $FAIL -eq 0 ]]; then
  echo "✅ All checks passed — infrastructure deployment is complete"
  exit 0
else
  echo "❌ $FAIL check(s) failed — see above for details"
  exit 1
fi
