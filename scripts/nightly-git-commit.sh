#!/bin/bash
# Nightly Git Commit — Auto-commit workspace changes with clear message

set -e

REPO="/Users/hopenclaw/.openclaw/workspace"
cd "$REPO"

# Check if there are changes
if ! git diff --quiet; then
    # Get summary of changes
    CHANGED_FILES=$(git status --short | cut -c4- | tr '\n' ', ' | sed 's/,$//')
    FILE_COUNT=$(git status --short | wc -l)
    
    # Commit with clear message
    git add -A
    git commit -m "nightly: Update workspace ($FILE_COUNT files changed: $CHANGED_FILES)"
    
    echo "✅ Committed $FILE_COUNT file(s): $CHANGED_FILES"
else
    echo "⏭️  No changes to commit"
fi

# Push to remote
git push origin main 2>&1 || echo "⚠️  Push failed (offline or other issue)"
