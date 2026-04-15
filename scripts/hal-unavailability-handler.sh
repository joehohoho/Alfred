#!/bin/bash
# HAL Unavailability Handler — graceful degradation
# Called when HAL is detected down but Alfred can continue

WORKSPACE="$HOME/.openclaw/workspace"
DISPATCH_LOG="$WORKSPACE/.hal-alfred-tracking/alfred-dispatched.json"

# Mark HAL as unavailable in dispatch log
jq '.hal_available = false' "$DISPATCH_LOG" > "$DISPATCH_LOG.tmp" && mv "$DISPATCH_LOG.tmp" "$DISPATCH_LOG"

# Log graceful degradation
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] HAL unavailable — switching to Alfred-only dispatch mode" >> "$WORKSPACE/.hal-alfred-tracking/dispatch-degradation.log"

# Future: route normally-HAL tasks to Alfred with priority boost
echo "✅ Graceful degradation activated"
