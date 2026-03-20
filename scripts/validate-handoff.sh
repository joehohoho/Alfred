#!/bin/bash
# validate-handoff.sh — Validate handoff contract against schema before dispatch to HAL
# Usage: bash scripts/validate-handoff.sh <card_id>
# Exit code: 0 = valid, 1 = invalid

set -e

WORKSPACE="$HOME/.openclaw/workspace"
SCHEMA_FILE="$WORKSPACE/schemas/handoff.json"
CARD_ID="$1"
HANDOFF_FILE="$WORKSPACE/goals/handoffs/${CARD_ID}.json"

if [[ -z "$CARD_ID" ]]; then
  echo "❌ Usage: bash scripts/validate-handoff.sh <card_id>"
  echo "   Example: bash scripts/validate-handoff.sh card_001"
  exit 1
fi

if [[ ! -f "$HANDOFF_FILE" ]]; then
  echo "❌ Handoff file not found: $HANDOFF_FILE"
  echo "   Create one using: cp goals/handoffs/TEMPLATE.json $HANDOFF_FILE"
  exit 1
fi

if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "❌ Schema file not found: $SCHEMA_FILE"
  exit 1
fi

# Validate JSON schema using jq
echo "🔍 Validating handoff schema for $CARD_ID..."

# First, check if JSON is valid
if ! jq empty "$HANDOFF_FILE" 2>/dev/null; then
  echo "❌ Invalid JSON in $HANDOFF_FILE"
  exit 1
fi

# Check required fields
echo "  → Checking required fields..."
for field in task_id objective constraints deliverables validation_command owner deadline review_gate completion_evidence; do
  if ! jq -e ".$field" "$HANDOFF_FILE" >/dev/null 2>&1; then
    echo "❌ Missing required field: $field"
    exit 1
  fi
done

# Validate task_id format
task_id=$(jq -r '.task_id' "$HANDOFF_FILE")
if ! [[ "$task_id" =~ ^card_[0-9]+$ ]]; then
  echo "❌ Invalid task_id format: $task_id (expected: card_XXX)"
  exit 1
fi

if [[ "$task_id" != "$CARD_ID" ]]; then
  echo "❌ Task ID mismatch: file has '$task_id', argument is '$CARD_ID'"
  exit 1
fi

# Validate objective
objective=$(jq -r '.objective' "$HANDOFF_FILE")
if [[ -z "$objective" ]] || [[ ${#objective} -lt 15 ]]; then
  echo "❌ Objective too vague (min 15 chars): '$objective'"
  exit 1
fi

# Validate constraints (at least 1)
constraints_count=$(jq '.constraints | length' "$HANDOFF_FILE")
if [[ $constraints_count -lt 1 ]]; then
  echo "❌ No constraints defined (must have at least 1)"
  exit 1
fi

# Validate deliverables
echo "  → Checking deliverables..."
for section in code tests docs; do
  count=$(jq ".deliverables.$section | length" "$HANDOFF_FILE" 2>/dev/null || echo 0)
  if [[ $count -lt 1 ]]; then
    echo "❌ No items in deliverables.$section (required: at least 1)"
    exit 1
  fi
done

# Validate validation_command
validation_cmd=$(jq -r '.validation_command' "$HANDOFF_FILE")
if [[ -z "$validation_cmd" ]]; then
  echo "❌ No validation command defined"
  exit 1
fi

# Validate success_criteria
success_count=$(jq '.success_criteria | length' "$HANDOFF_FILE" 2>/dev/null || echo 0)
if [[ $success_count -lt 1 ]]; then
  echo "❌ No success criteria defined (must have at least 1)"
  exit 1
fi

# Validate owner
owner=$(jq -r '.owner' "$HANDOFF_FILE")
if ! [[ "$owner" =~ ^(alfred|hal|joe)$ ]]; then
  echo "❌ Invalid owner: $owner (must be alfred, hal, or joe)"
  exit 1
fi

# Validate deadline
deadline=$(jq -r '.deadline' "$HANDOFF_FILE")
if ! [[ "$deadline" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "❌ Invalid deadline format: $deadline (expected: YYYY-MM-DD)"
  exit 1
fi

# Parse deadline and validate it's in the future
deadline_epoch=$(date -j -f "%Y-%m-%d" "$deadline" +%s 2>/dev/null || echo 0)
now_epoch=$(date +%s)
if [[ $deadline_epoch -le $now_epoch ]]; then
  echo "❌ Deadline is in the past: $deadline"
  exit 1
fi

# Validate autonomy_boundaries (required since 2026-03-20)
echo "  → Checking autonomy_boundaries..."
if ! jq -e '.autonomy_boundaries' "$HANDOFF_FILE" >/dev/null 2>&1; then
  echo "❌ Missing required field: autonomy_boundaries"
  echo "   Add: can_decide[], must_escalate[], and optionally time_limit_minutes"
  exit 1
fi
can_decide_count=$(jq '.autonomy_boundaries.can_decide | length' "$HANDOFF_FILE" 2>/dev/null || echo 0)
must_escalate_count=$(jq '.autonomy_boundaries.must_escalate | length' "$HANDOFF_FILE" 2>/dev/null || echo 0)
if [[ $can_decide_count -lt 1 ]]; then
  echo "❌ autonomy_boundaries.can_decide must have at least 1 item"
  exit 1
fi
if [[ $must_escalate_count -lt 1 ]]; then
  echo "❌ autonomy_boundaries.must_escalate must have at least 1 item"
  exit 1
fi

# Validate review_gate (required)
echo "  → Checking review_gate..."
requires_approval=$(jq -r '.review_gate.requires_joe_approval // ""' "$HANDOFF_FILE")
escalation_reason=$(jq -r '.review_gate.escalation_reason // ""' "$HANDOFF_FILE")
escalation_posted_at=$(jq -r '.review_gate.escalation_posted_at // ""' "$HANDOFF_FILE")
if ! [[ "$requires_approval" =~ ^(yes|no)$ ]]; then
  echo "❌ review_gate.requires_joe_approval must be 'yes' or 'no'"
  exit 1
fi
if [[ -z "$escalation_reason" ]]; then
  echo "❌ review_gate.escalation_reason is required"
  exit 1
fi
if [[ "$requires_approval" == "yes" ]] && [[ -z "$escalation_posted_at" ]]; then
  echo "❌ review_gate.escalation_posted_at required when requires_joe_approval=yes"
  exit 1
fi

# Validate completion_evidence (required)
echo "  → Checking completion_evidence..."
validation_commands_count=$(jq '.completion_evidence.validation_commands | length' "$HANDOFF_FILE" 2>/dev/null || echo 0)
expected_result=$(jq -r '.completion_evidence.expected_result // ""' "$HANDOFF_FILE")
actual_result=$(jq -r '.completion_evidence.actual_result // ""' "$HANDOFF_FILE")
exit_code=$(jq -r '.completion_evidence.exit_code // ""' "$HANDOFF_FILE")
not_run_reason=$(jq -r '.completion_evidence.not_run_reason // ""' "$HANDOFF_FILE")
risk_if_not_run=$(jq -r '.completion_evidence.risk_if_not_run // ""' "$HANDOFF_FILE")
if [[ $validation_commands_count -lt 1 ]]; then
  echo "❌ completion_evidence.validation_commands must have at least 1 item"
  exit 1
fi
if [[ -z "$expected_result" || -z "$actual_result" ]]; then
  echo "❌ completion_evidence.expected_result and actual_result are required"
  exit 1
fi
if ! [[ "$exit_code" =~ ^-?[0-9]+$ ]]; then
  echo "❌ completion_evidence.exit_code must be an integer (-1..255)"
  exit 1
fi
if (( exit_code < -1 || exit_code > 255 )); then
  echo "❌ completion_evidence.exit_code out of range (-1..255): $exit_code"
  exit 1
fi
if [[ -z "$not_run_reason" || -z "$risk_if_not_run" ]]; then
  echo "❌ completion_evidence.not_run_reason and risk_if_not_run are required (use n/a when not applicable)"
  exit 1
fi

# Validate estimated_effort if present
if jq -e '.estimated_effort' "$HANDOFF_FILE" >/dev/null 2>&1; then
  hours=$(jq '.estimated_effort.hours' "$HANDOFF_FILE")
  if ! [[ "$hours" =~ ^[0-9]+\.?[0-9]*$ ]] || (( $(echo "$hours < 0.25" | bc -l) )); then
    echo "❌ Invalid estimated hours: $hours (min: 0.25)"
    exit 1
  fi
fi

# Print summary
echo ""
echo "✅ Handoff validation PASSED for $CARD_ID"
echo ""
echo "   📌 Objective: $objective"
echo "   🎯 Owner: $owner"
echo "   📅 Deadline: $deadline"
echo "   ⏱️  Estimated: $(jq -r '.estimated_effort.hours // "N/A"' "$HANDOFF_FILE") hours"
echo "   🔬 Validation: $validation_cmd"
echo "   🧭 Review gate: requires_joe_approval=$requires_approval"
echo "   🧪 Evidence template: commands=$(jq -r '.completion_evidence.validation_commands | length' "$HANDOFF_FILE") exit_code=$(jq -r '.completion_evidence.exit_code' "$HANDOFF_FILE")"
echo ""
echo "   Autonomy:"
echo "     can_decide: $(jq -r '.autonomy_boundaries.can_decide | length' "$HANDOFF_FILE") items | must_escalate: $(jq -r '.autonomy_boundaries.must_escalate | length' "$HANDOFF_FILE") items | time_limit: $(jq -r '.autonomy_boundaries.time_limit_minutes // "none"' "$HANDOFF_FILE")m"
echo "   Deliverables:"
jq -r '.deliverables.code[]' "$HANDOFF_FILE" | sed 's/^/     - code: /'
jq -r '.deliverables.tests[]' "$HANDOFF_FILE" | sed 's/^/     - test: /'
jq -r '.deliverables.docs[]' "$HANDOFF_FILE" | sed 's/^/     - docs: /'
echo ""

exit 0
