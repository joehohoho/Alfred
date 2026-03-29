#!/bin/bash
# validate-session-files.sh — Proactively validate and repair OpenClaw session JSONL files
# Prevents malformed line corruption that causes repeated gateway repairs
# Usage: ./validate-session-files.sh [--repair] [--verbose]

set -euo pipefail

SESSIONS_DIR="${HOME}/.openclaw/agents/main/sessions"
VERBOSE=${VERBOSE:-0}
DRY_RUN=1  # Default: report issues without modifying
REPAIRED=0
ERRORS=0
TOTAL_SESSIONS=0

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repair)
      DRY_RUN=0
      ;;
    --verbose|-v)
      VERBOSE=1
      ;;
    *)
      echo "Usage: $0 [--repair] [--verbose]"
      exit 1
      ;;
  esac
  shift
done

if [[ ! -d "$SESSIONS_DIR" ]]; then
  echo "❌ Sessions directory not found: $SESSIONS_DIR"
  exit 1
fi

echo "🔍 Scanning $SESSIONS_DIR for malformed session files..."
[[ $DRY_RUN -eq 1 ]] && echo "   (DRY RUN — no changes will be made)"
echo ""

# Iterate over all session JSONL files
for session_file in "$SESSIONS_DIR"/*.jsonl; do
  [[ -f "$session_file" ]] || continue
  
  TOTAL_SESSIONS=$((TOTAL_SESSIONS + 1))
  session_id=$(basename "$session_file" .jsonl)
  bad_lines=0
  temp_file=$(mktemp)
  
  # Validate each line is valid JSON
  while IFS= read -r line; do
    # Skip empty lines
    [[ -z "$line" ]] && continue
    
    # Try to parse as JSON
    if ! echo "$line" | jq . >/dev/null 2>&1; then
      bad_lines=$((bad_lines + 1))
      [[ $VERBOSE -eq 1 ]] && echo "  ❌ Invalid JSON in $session_id: ${line:0:80}..."
    else
      # Write valid line to temp file
      echo "$line" >> "$temp_file"
    fi
  done < "$session_file"
  
  # If issues found, report and optionally fix
  if [[ $bad_lines -gt 0 ]]; then
    ERRORS=$((ERRORS + 1))
    echo "⚠️  $session_id — $bad_lines malformed line(s)"
    
    if [[ $DRY_RUN -eq 0 ]]; then
      # Backup original
      cp "$session_file" "${session_file}.backup.$(date +%s)"
      # Replace with cleaned version
      mv "$temp_file" "$session_file"
      REPAIRED=$((REPAIRED + 1))
      echo "   ✅ Repaired and backed up"
    fi
  else
    [[ $VERBOSE -eq 1 ]] && echo "✅ $session_id — clean"
  fi
  
  rm -f "$temp_file"
done

echo ""
echo "📊 Summary"
echo "───────────────────"
echo "Sessions scanned: $TOTAL_SESSIONS"
echo "Sessions with errors: $ERRORS"
if [[ $DRY_RUN -eq 0 ]]; then
  echo "Sessions repaired: $REPAIRED"
fi
echo ""

if [[ $DRY_RUN -eq 1 ]] && [[ $ERRORS -gt 0 ]]; then
  echo "💡 To repair issues, run: $0 --repair"
  exit 1
elif [[ $ERRORS -eq 0 ]]; then
  echo "✅ All session files are valid"
  exit 0
else
  exit $ERRORS
fi
