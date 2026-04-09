#!/bin/bash
# state-of-work-compiler.sh — additive continuity compiler
# Produces STATE-OF-WORK.md from existing state sources without modifying them.
# Usage: bash scripts/state-of-work-compiler.sh

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
OUT="$WORKSPACE/STATE-OF-WORK.md"
ACTIVE="$WORKSPACE/ACTIVE-TASK.md"
LAST="$WORKSPACE/LAST-SESSION.md"
OPEN="$WORKSPACE/OPEN-LOOPS.md"
NOWF="$WORKSPACE/NOW.md"
TODAY="$WORKSPACE/memory/$(date '+%Y-%m-%d').md"

extract_first() {
  local pattern="$1" file="$2"
  grep -m1 -E "$pattern" "$file" 2>/dev/null | sed 's/^[-#* ]*//' || true
}

active_status=$(extract_first '^\*\*Status:\*\*|^Status:' "$ACTIVE")
active_title=$(extract_first '^\*\*Title:\*\*|^\*\*Current Task' "$ACTIVE")
next_step=$(awk '/## Next Step/{flag=1;next}/^## /{flag=0}flag' "$ACTIVE" 2>/dev/null | sed '/^$/d' | head -5)
last_summary=$(awk '/## What Happened/{flag=1;next}/^## /{flag=0}flag' "$LAST" 2>/dev/null | sed '/^$/d' | head -8)
pending_notifs=$(awk '/## 🔔 Pending Notifications/{flag=1;next}/^---/{if(flag){exit}}flag' "$OPEN" 2>/dev/null | sed '/^$/d' | head -12)
now_excerpt=$(sed -n '1,40p' "$NOWF" 2>/dev/null || true)

freshness="fresh"
conflicts=()
[[ -z "$active_status" ]] && conflicts+=("ACTIVE-TASK missing status")
[[ ! -f "$LAST" ]] && conflicts+=("LAST-SESSION missing")
[[ ! -f "$OPEN" ]] && conflicts+=("OPEN-LOOPS missing")

if [[ ${#conflicts[@]} -gt 0 ]]; then
  freshness="conflicted"
fi

cat > "$OUT" <<EOF
# State of Work

**Generated:** $(date '+%Y-%m-%d %H:%M:%S %Z')
**Freshness:** $freshness

## Current Active Status
${active_status:-Unknown}

## Current Task Anchor
${active_title:-No clear active task title found}

## Next Best Action
${next_step:-No next step captured}

## Last Session Summary
${last_summary:-No last session summary found}

## Pending Notification Snapshot
${pending_notifs:-No pending notifications snapshot found}

## NOW.md Excerpt
${now_excerpt:-NOW.md missing or empty}
EOF

if [[ ${#conflicts[@]} -gt 0 ]]; then
  {
    echo
    echo "## Conflicts / Gaps"
    for c in "${conflicts[@]}"; do
      echo "- $c"
    done
  } >> "$OUT"
fi

echo "✅ Wrote $OUT"
