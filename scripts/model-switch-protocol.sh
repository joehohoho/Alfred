#!/bin/bash
# Model Switch Protocol — Update NOW.md when switching LLM models
# Usage: source this script to set up functions, then call after switching models
# Example: model_switch_checkpoint "haiku-4-5" "sonnet-4-6" "escalating for complex analysis"

NOW_FILE="$HOME/.openclaw/workspace/NOW.md"

# Function to create a model handoff checkpoint
model_switch_checkpoint() {
    local from_model="$1"
    local to_model="$2"
    local reason="$3"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    if [[ -z "$from_model" || -z "$to_model" || -z "$reason" ]]; then
        echo "Usage: model_switch_checkpoint <from_model> <to_model> <reason>"
        return 1
    fi
    
    # Update NOW.md with new checkpoint
    cat > "$NOW_FILE" << EOF
# NOW.md - Current Session Lifeboat

**Purpose:** Emergency checkpoint. If session crashes, this file contains context for restart.

**Status:** Currently using $to_model

---

## Model Context Handoff
**FROM:** $from_model | **TO:** $to_model | **Why:** $reason

**Checkpoint Time:** $timestamp

**Context Preserved:**
- Task state: (Update this with current objective)
- Key decisions: (Update this with recent conclusions)
- Memory references: MEMORY.md, memory/YYYY-MM-DD.md, HEARTBEAT.md
- Unknown unknowns: (Flag any gaps in context)

---

## Recent Work (This Session)
(Summary goes here)

---

## Next Steps
(Outline for next phase)

---

## Context Usage
**Session Time:** (ongoing)
**Tokens Burned:** Moderate
**Context %:** ~35% (estimate)
**Alert Triggers:** None

*This file is auto-overwritten on major events. Treat as ephemeral.*
EOF

    echo "✅ Model switch checkpoint created: $from_model → $to_model"
    echo "   Reason: $reason"
    echo "   Edit NOW.md to complete the task state details"
}

# Function to verify NOW.md exists and is current
verify_checkpoint() {
    if [[ ! -f "$NOW_FILE" ]]; then
        echo "❌ NOW.md missing — creating baseline"
        touch "$NOW_FILE"
        return 1
    fi
    
    MODIFIED=$(stat -f "%Sm" "$NOW_FILE" 2>/dev/null || stat -c "%y" "$NOW_FILE" 2>/dev/null)
    echo "✅ NOW.md exists (last modified: $MODIFIED)"
    return 0
}

# If called directly (not sourced), run verify
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    verify_checkpoint
fi
