#!/bin/bash
# Phase 2.A: Chunked Code Review for job-tracker
# Reduces review time: 240s (full) → 60s (diffs) → 15s (cached)

set -e

REPO_DIR="${1:-$HOME/job-tracker}"
CACHE_FILE="/Users/hopenclaw/.openclaw/workspace/memory/code-review-cache.json"
REVIEW_SCRIPT_TEMP="/tmp/review-job-tracker-prompt.txt"

# Ensure repo exists
if [ ! -d "$REPO_DIR" ]; then
  echo "Error: Repository not found at $REPO_DIR"
  exit 1
fi

# Initialize cache if missing
if [ ! -f "$CACHE_FILE" ]; then
  echo '{"lastGitHash":"","lastReviewTime":0,"cacheHits":0,"totalRuns":0}' > "$CACHE_FILE"
fi

# Get current git hash (short version for quick comparison)
CURRENT_HASH=$(cd "$REPO_DIR" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Read cached hash
LAST_HASH=$(cd "$REPO_DIR" && git rev-parse --short HEAD~1 2>/dev/null || echo "")
CACHED_HASH=$(jq -r '.lastGitHash // ""' "$CACHE_FILE" 2>/dev/null || echo "")

# Increment run counter
TOTAL_RUNS=$(jq -r '.totalRuns // 0' "$CACHE_FILE" 2>/dev/null || echo "0")
TOTAL_RUNS=$((TOTAL_RUNS + 1))

# Check cache: if code hasn't changed since last review, skip
if [ "$CACHED_HASH" = "$CURRENT_HASH" ] && [ -n "$CACHED_HASH" ]; then
  # Cache hit - return cached result
  CACHE_HITS=$(jq -r '.cacheHits // 0' "$CACHE_FILE" 2>/dev/null || echo "0")
  CACHE_HITS=$((CACHE_HITS + 1))
  
  # Update cache metadata
  CACHE_TIMESTAMP=$(date +%s000)
  jq ".lastGitHash=\"$CURRENT_HASH\" | .cacheHits=$CACHE_HITS | .totalRuns=$TOTAL_RUNS | .lastReviewTime=$CACHE_TIMESTAMP" "$CACHE_FILE" > "$CACHE_FILE.tmp" && mv "$CACHE_FILE.tmp" "$CACHE_FILE"
  
  echo "✓ CODE REVIEW: CACHE HIT (no changes since last review)"
  echo "Git hash: $CURRENT_HASH (unchanged)"
  echo "Cache stats: $CACHE_HITS hits / $TOTAL_RUNS total runs"
  echo ""
  echo "No review needed. Code is stable from last review."
  exit 0
fi

# Cache miss - generate review prompt from diffs
echo "Generating review prompt (checking for changes)..."

# Get diff between current and previous commit (only changed files)
DIFF_FILES=$(cd "$REPO_DIR" && git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")

if [ -z "$DIFF_FILES" ]; then
  # No changed files detected, but hash is different - do full scan
  REVIEW_SCOPE="FULL CODEBASE SCAN (initial or force review)"
  FILE_LIST=$(cd "$REPO_DIR" && find src tests -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | head -20 || echo "")
else
  # Only review changed files (much faster)
  REVIEW_SCOPE="DELTA REVIEW (changed files only)"
  FILE_LIST="$DIFF_FILES"
fi

# Build the prompt
cat > "$REVIEW_SCRIPT_TEMP" << EOF
Code Review Request for: job-tracker
Review Type: $REVIEW_SCOPE
Current Commit: $CURRENT_HASH
Previous Commit: $LAST_HASH

Files to Review:
$FILE_LIST

Instructions:
1. Review the above files for:
   - Code quality & maintainability
   - Performance bottlenecks
   - Security vulnerabilities
   - Test coverage gaps
   - Architecture issues
2. Provide concise findings (max 5 bullet points)
3. Only suggest HIGH-CONFIDENCE changes (won't break anything)
4. Format as: [FINDING]: [description]

BEGIN CODE REVIEW:
EOF

# Get code content for changed files only
cd "$REPO_DIR"
for FILE in $FILE_LIST; do
  if [ -f "$FILE" ]; then
    # Get last 100 lines of each file to keep token count low
    echo ""
    echo "--- $FILE (last 100 lines) ---"
    tail -100 "$FILE" 2>/dev/null || echo "(file not readable)"
  fi
done >> "$REVIEW_SCRIPT_TEMP"

# Count prompt size to estimate review time
PROMPT_LINES=$(wc -l < "$REVIEW_SCRIPT_TEMP")
PROMPT_CHARS=$(wc -c < "$REVIEW_SCRIPT_TEMP")

# Output for inference engine
echo "CODE_REVIEW_PROMPT_SIZE: $PROMPT_CHARS bytes, $PROMPT_LINES lines"
echo "REVIEW_TYPE: $REVIEW_SCOPE"
cat "$REVIEW_SCRIPT_TEMP"

# Update cache with new hash
CACHE_TIMESTAMP=$(date +%s000)
jq ".lastGitHash=\"$CURRENT_HASH\" | .totalRuns=$TOTAL_RUNS | .lastReviewTime=$CACHE_TIMESTAMP" "$CACHE_FILE" > "$CACHE_FILE.tmp" && mv "$CACHE_FILE.tmp" "$CACHE_FILE"

# Cleanup
rm -f "$REVIEW_SCRIPT_TEMP"

echo ""
echo "Cache updated: $CURRENT_HASH"
echo "Ready for LLM processing (estimated 60-90s)"
