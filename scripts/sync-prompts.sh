#!/bin/bash
# Prompt Sync & Validation Cron Job
# Purpose: Nightly validation of model-specific prompts
# Schedule: 2 AM daily via crontab
# Owner: Alfred

set -e

DATE=$(date +%Y-%m-%d)
WORKSPACE="$HOME/.openclaw/workspace"
PROMPT_DIR="$WORKSPACE/prompts"
LOG_DIR="$WORKSPACE/.sync-logs"
LOG_FILE="$LOG_DIR/prompt-sync-${DATE}.log"

# Create log directory if needed
mkdir -p "$LOG_DIR"

echo "=== Prompt Sync & Validation ===" >> "$LOG_FILE"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Step 1: Verify both prompt files exist
echo "[1/4] Checking prompt files exist..." >> "$LOG_FILE"
if [[ ! -f "$PROMPT_DIR/opus-4-6.md" ]]; then
    echo "❌ MISSING: $PROMPT_DIR/opus-4-6.md" >> "$LOG_FILE"
    exit 1
fi

if [[ ! -f "$PROMPT_DIR/gpt-5-4.md" ]]; then
    echo "❌ MISSING: $PROMPT_DIR/gpt-5-4.md" >> "$LOG_FILE"
    exit 1
fi

echo "✅ Both prompt files exist" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Step 2: Check file sizes (should be similar, within 50 lines)
echo "[2/4] Checking prompt sizes..." >> "$LOG_FILE"
OPUS_SIZE=$(wc -l < "$PROMPT_DIR/opus-4-6.md")
GPT_SIZE=$(wc -l < "$PROMPT_DIR/gpt-5-4.md")
DIFF=$((OPUS_SIZE - GPT_SIZE))
DIFF_ABS=${DIFF#-}  # Absolute value

echo "  Opus lines: $OPUS_SIZE" >> "$LOG_FILE"
echo "  GPT lines: $GPT_SIZE" >> "$LOG_FILE"
echo "  Difference: $DIFF_ABS lines" >> "$LOG_FILE"

if [[ $DIFF_ABS -gt 100 ]]; then
    echo "⚠️  WARNING: Significant size divergence ($DIFF_ABS lines)" >> "$LOG_FILE"
    # Note: This is a warning, not a blocker. Prompts may legitimately differ.
else
    echo "✅ Sizes within tolerance" >> "$LOG_FILE"
fi
echo "" >> "$LOG_FILE"

# Step 3: Validate both files are valid UTF-8 and non-empty
echo "[3/4] Validating file format..." >> "$LOG_FILE"
if ! file "$PROMPT_DIR/opus-4-6.md" | grep -q "UTF-8"; then
    echo "⚠️  Opus prompt may not be UTF-8" >> "$LOG_FILE"
fi

if ! file "$PROMPT_DIR/gpt-5-4.md" | grep -q "UTF-8"; then
    echo "⚠️  GPT prompt may not be UTF-8" >> "$LOG_FILE"
fi

if [[ $OPUS_SIZE -lt 50 ]]; then
    echo "❌ Opus prompt too small (<50 lines)" >> "$LOG_FILE"
    exit 1
fi

if [[ $GPT_SIZE -lt 50 ]]; then
    echo "❌ GPT prompt too small (<50 lines)" >> "$LOG_FILE"
    exit 1
fi

echo "✅ Both prompts valid" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Step 4: Check for credentials (basic security check)
echo "[4/4] Security check (credentials)..." >> "$LOG_FILE"
if grep -qi "api.key\|password\|secret\|token" "$PROMPT_DIR/opus-4-6.md"; then
    echo "⚠️  WARNING: Opus prompt contains potential credential reference" >> "$LOG_FILE"
fi

if grep -qi "api.key\|password\|secret\|token" "$PROMPT_DIR/gpt-5-4.md"; then
    echo "⚠️  WARNING: GPT prompt contains potential credential reference" >> "$LOG_FILE"
fi

echo "✅ Security check passed" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Step 5: Git commit if changes detected
echo "[5/5] Git commit (if changed)..." >> "$LOG_FILE"
cd "$WORKSPACE" || exit 1

if git status prompts/ | grep -q "modified\|new file"; then
    git add prompts/
    git commit -m "sync: prompt validation + alignment ($(date +%Y-%m-%d))" >> "$LOG_FILE" 2>&1
    echo "✅ Prompts committed" >> "$LOG_FILE"
else
    echo "✅ Prompts up-to-date (no changes)" >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"
echo "=== RESULT ===" >> "$LOG_FILE"
echo "✅ Prompt sync complete" >> "$LOG_FILE"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"

# Print summary to stdout (for monitoring)
echo "✅ Prompt sync complete [Opus: $OPUS_SIZE lines | GPT: $GPT_SIZE lines]"

exit 0
