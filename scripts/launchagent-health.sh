#!/bin/bash
# LaunchAgent Health Check — Verify all 4 critical services are running

AGENTS=(
    "com.ollama.keepalive"
    "com.openclaw.imsg-responder"
    "com.alfred.dashboard-nextjs"
    "com.cloudflare.tunnel"
)

echo "=== LaunchAgent Health Check ==="
echo "Timestamp: $(date)"
echo ""

HEALTHY=0
FAILED=0

for agent in "${AGENTS[@]}"; do
    STATUS=$(launchctl list | grep "$agent" | awk '{print $1}')
    
    if [[ -z "$STATUS" ]]; then
        echo "❌ $agent: NOT LOADED"
        FAILED=$((FAILED+1))
    elif [[ "$STATUS" == "-" ]]; then
        echo "⚠️  $agent: LOADED BUT NOT RUNNING (exit code -1)"
        FAILED=$((FAILED+1))
    elif [[ "$STATUS" =~ ^[0-9]+$ ]] && [[ "$STATUS" == "0" ]]; then
        echo "✅ $agent: RUNNING"
        HEALTHY=$((HEALTHY+1))
    else
        echo "⚠️  $agent: EXIT CODE $STATUS (may be normal if one-shot job)"
        HEALTHY=$((HEALTHY+1))
    fi
done

echo ""
echo "Summary: $HEALTHY healthy, $FAILED failed"

if [[ $FAILED -gt 0 ]]; then
    echo ""
    echo "Attempting recovery for failed agents..."
    for agent in "${AGENTS[@]}"; do
        STATUS=$(launchctl list | grep "$agent" | awk '{print $1}')
        if [[ -z "$STATUS" ]] || [[ "$STATUS" == "-" ]]; then
            echo "  → Restarting $agent..."
            launchctl start "$agent" 2>&1 || echo "    (Failed to start — may require manual intervention)"
        fi
    done
fi

exit $FAILED
