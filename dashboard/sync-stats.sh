#!/bin/bash
# ⚠️ DEPRECATED (2026-02-09) - Use sync-usage.js instead
# This script is obsolete. Replaced by comprehensive sync-usage.js
# Kept for reference only. Do not schedule via cron.
#
# Dashboard auto-sync: pulls session data and updates stats.json
# Run via cron every 5 minutes

STATS_FILE="$(dirname "$0")/stats.json"
SESSIONS_FILE="$HOME/.openclaw/agents/main/sessions/sessions.json"

# Get current timestamp
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Parse sessions.json for token totals if jq available
# Note: sessions.json is an object keyed by session key, not an array
if command -v jq &> /dev/null && [ -f "$SESSIONS_FILE" ]; then
    # Aggregate tokens from all sessions (object values, not array)
    TOTAL_TOKENS=$(jq '[to_entries[].value.totalTokens // 0] | add // 0' "$SESSIONS_FILE" 2>/dev/null || echo 0)
    SESSION_COUNT=$(jq 'keys | length' "$SESSIONS_FILE" 2>/dev/null || echo 0)
    
    # Get model breakdown (counts sessions with each model)
    OPUS_SESSIONS=$(jq '[to_entries[].value | select(.model == "claude-opus-4-5")] | length' "$SESSIONS_FILE" 2>/dev/null || echo 0)
    SONNET_SESSIONS=$(jq '[to_entries[].value | select(.model | . and test("sonnet"; "i"))] | length' "$SESSIONS_FILE" 2>/dev/null || echo 0)
    HAIKU_SESSIONS=$(jq '[to_entries[].value | select(.model | . and test("haiku"; "i"))] | length' "$SESSIONS_FILE" 2>/dev/null || echo 0)
    LOCAL_SESSIONS=$(jq '[to_entries[].value | select(.model | . and test("llama|ollama"; "i"))] | length' "$SESSIONS_FILE" 2>/dev/null || echo 0)
    
    # Update stats.json with synced data
    if [ -f "$STATS_FILE" ]; then
        jq --arg now "$NOW" \
           --argjson total_tokens "$TOTAL_TOKENS" \
           --argjson session_count "$SESSION_COUNT" \
           --argjson opus "$OPUS_SESSIONS" \
           --argjson sonnet "$SONNET_SESSIONS" \
           --argjson haiku "$HAIKU_SESSIONS" \
           --argjson local "$LOCAL_SESSIONS" \
           '.updatedAt = $now | 
            .today.sessions = $session_count |
            .models.opus.sessions = $opus |
            .models.sonnet.sessions = $sonnet |
            .models.haiku.sessions = $haiku |
            .models.local.sessions = $local |
            .lastSync = $now' \
           "$STATS_FILE" > "${STATS_FILE}.tmp" && mv "${STATS_FILE}.tmp" "$STATS_FILE"
        echo "Synced at $NOW: $SESSION_COUNT sessions, $TOTAL_TOKENS tokens"
    fi
else
    echo "jq not found or sessions file missing - skipping sync"
fi

# Check for Claude Code usage file (if installed)
CLAUDE_USAGE="$HOME/.claude/usage.json"
if [ -f "$CLAUDE_USAGE" ] && [ -f "$STATS_FILE" ]; then
    # Merge Claude Code usage into stats if present
    CLAUDE_TOKENS=$(jq '.totalTokens // 0' "$CLAUDE_USAGE" 2>/dev/null || echo 0)
    if [ "$CLAUDE_TOKENS" -gt 0 ]; then
        jq --argjson ct "$CLAUDE_TOKENS" \
           '.claudeCode.tokens = $ct | .claudeCode.synced = true' \
           "$STATS_FILE" > "${STATS_FILE}.tmp" && mv "${STATS_FILE}.tmp" "$STATS_FILE"
        echo "Claude Code: $CLAUDE_TOKENS tokens synced"
    fi
fi
