#!/bin/bash
# Cron Health Check — Verify critical cron jobs executed recently

set -e

WORKSPACE="$HOME/.openclaw/workspace"
HOURS_BACK=${1:-24}  # Check last 24 hours by default

echo "=== Cron Job Health Check (last $HOURS_BACK hours) ==="
echo ""

# Check git for commits (proxy for nightly-git-commit running)
echo "📝 Git Commits:"
COMMIT_COUNT=$(git -C "$WORKSPACE" log --oneline --since="${HOURS_BACK} hours ago" | wc -l)
if [[ $COMMIT_COUNT -gt 0 ]]; then
    echo "  ✅ $COMMIT_COUNT commit(s) in last $HOURS_BACK hours"
    git -C "$WORKSPACE" log --oneline --since="${HOURS_BACK} hours ago" | head -3 | sed 's/^/     /'
else
    echo "  ⚠️  No commits in last $HOURS_BACK hours (nightly-git-commit may have failed)"
fi
echo ""

# Check Ollama is responding (proxy for keeper-alive running)
echo "🔧 Ollama Health:"
if timeout 2 curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "  ✅ Ollama responding"
else
    echo "  ❌ Ollama not responding (may be dead)"
fi
echo ""

# Check LaunchAgents running
echo "🚀 LaunchAgents:"
# Persistent agents (should have an active PID — numeric first column)
PERSISTENT_AGENTS=("com.openclaw.imsg-responder" "com.alfred.dashboard-nextjs" "com.cloudflare.tunnel")
# One-shot/keepalive agents: just check they are registered (any entry in launchctl list) and not exited with error
ONESHOT_AGENTS=("com.ollama.keepalive")
FAILED=0

for agent in "${PERSISTENT_AGENTS[@]}"; do
    if launchctl list | grep -qE "^[0-9]+[[:space:]].*$agent"; then
        echo "  ✅ $agent running"
    else
        # Check if registered at all
        if launchctl list | grep -q "$agent"; then
            EXIT_CODE=$(launchctl list | grep "$agent" | awk '{print $2}')
            echo "  ⚠️  $agent registered but not running (last exit: $EXIT_CODE)"
            FAILED=$((FAILED+1))
        else
            echo "  ❌ $agent NOT registered"
            FAILED=$((FAILED+1))
        fi
    fi
done

for agent in "${ONESHOT_AGENTS[@]}"; do
    if launchctl list | grep -q "$agent"; then
        EXIT_CODE=$(launchctl list | grep "$agent" | awk '{print $2}')
        if [[ "$EXIT_CODE" == "0" || "$EXIT_CODE" == "-" ]]; then
            echo "  ✅ $agent registered (last exit: $EXIT_CODE — OK for keepalive)"
        else
            echo "  ⚠️  $agent last exit code: $EXIT_CODE (may have failed)"
            FAILED=$((FAILED+1))
        fi
    else
        echo "  ❌ $agent NOT registered"
        FAILED=$((FAILED+1))
    fi
done
echo ""

if [[ $FAILED -gt 0 ]]; then
    echo "⚠️  $FAILED agent(s) need attention — attempting recovery on persistent agents..."
    for agent in "${PERSISTENT_AGENTS[@]}"; do
        if ! launchctl list | grep -qE "^[0-9]+[[:space:]].*$agent"; then
            echo "   → Restarting $agent..."
            launchctl start "$agent" 2>&1 || echo "     (restart failed)"
        fi
    done
fi

echo "=== Check Complete ==="
