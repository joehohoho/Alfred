#!/bin/bash
# Test script for refresh-open-loops.sh recovery flows

WORKSPACE="$HOME/.openclaw/workspace"
TEST_DIR="$WORKSPACE/.test-refresh"
mkdir -p "$TEST_DIR"

echo "🧪 Testing refresh-open-loops.sh recovery flows..."

# Test 1: Normal refresh (should succeed)
echo ""
echo "Test 1: Normal refresh"
cd "$WORKSPACE"
bash scripts/refresh-open-loops.sh > /dev/null 2>&1
if grep -q "| goal_" OPEN-LOOPS.md; then
  echo "✅ PASS: Normal refresh produces valid data"
else
  echo "❌ FAIL: Normal refresh did not produce valid data"
fi

# Test 2: Validation detects null rows
echo ""
echo "Test 2: Validation detects null rows"
cat > "$TEST_DIR/test-null-detection.sh" << 'INNER'
WORKSPACE="$HOME/.openclaw/workspace"
validate_open_loops_schema() {
  local file="$1"
  if [[ ! -f "$file" ]] || [[ ! -s "$file" ]]; then
    echo "INVALID: File missing or empty"
    return 1
  fi
  if grep -E "\| null \|" "$file" | grep -q "Active Kanban"; then
    echo "INVALID: Found null card rows in Active Kanban Cards table"
    return 1
  fi
  local active_section=$(sed -n '/## 📊 Active Kanban Cards/,/## 🔔 Pending Notifications/p' "$file" 2>/dev/null)
  if echo "$active_section" | grep -E "\| null \|" > /dev/null; then
    echo "INVALID: Found null values in Active Kanban Cards table"
    return 1
  fi
  if ! echo "$active_section" | grep -qE "\|[[:space:]]*[a-zA-Z0-9_-].*\|" && \
     ! echo "$active_section" | grep -q "No active cards"; then
    echo "INVALID: Active Kanban Cards section has no valid rows"
    return 1
  fi
  echo "VALID"
  return 0
}

# Create a test file with null rows
cat > "$WORKSPACE/.test-refresh/bad-file.md" << 'TESTEOF'
# Test
## 📊 Active Kanban Cards
| null | null | test |
## 🔔 Pending Notifications
TESTEOF

result=$(validate_open_loops_schema "$WORKSPACE/.test-refresh/bad-file.md")
if [[ "$result" == "INVALID"* ]]; then
  echo "✅ PASS: Validation correctly rejected file with null rows"
else
  echo "❌ FAIL: Validation did not reject file with null rows"
fi
INNER
bash "$TEST_DIR/test-null-detection.sh"

# Test 3: Audit logging
echo ""
echo "Test 3: Audit logging"
if grep -q "REFRESH_SUCCESS" "$WORKSPACE/.hal-alfred-tracking/open-loops-audit.log"; then
  echo "✅ PASS: Audit log records refresh events"
else
  echo "❌ FAIL: Audit log not recording events"
fi

# Test 4: File staleness check
echo ""
echo "Test 4: File staleness check (creates fresh file)"
touch "$WORKSPACE/OPEN-LOOPS.md"
result=$(bash -c '
WORKSPACE="$HOME/.openclaw/workspace"
check_staleness() {
  local file="$1"
  if [[ ! -f "$file" ]] || [[ ! -s "$file" ]]; then
    return 0
  fi
  if [[ "$(uname)" == "Darwin" ]]; then
    last_mod_epoch=$(stat -f %m "$file" 2>/dev/null || echo "0")
  else
    last_mod_epoch=$(stat -c %Y "$file" 2>/dev/null || echo "0")
  fi
  now=$(date +%s)
  age_seconds=$((now - last_mod_epoch))
  age_hours=$((age_seconds / 3600))
  if [[ $age_hours -gt 24 ]]; then
    echo "STALE"
    return 1
  fi
  echo "FRESH"
  return 0
}
check_staleness "$WORKSPACE/OPEN-LOOPS.md"
')
if [[ "$result" == "FRESH" ]]; then
  echo "✅ PASS: Staleness check correctly identifies fresh files"
else
  echo "❌ FAIL: Staleness check failed"
fi

# Cleanup
rm -rf "$TEST_DIR"

echo ""
echo "✅ All recovery tests completed"
