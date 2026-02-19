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
AGENTS=("com.ollama.keepalive" "com.openclaw.imsg-responder" "com.alfred.dashboard-nextjs" "com.cloudflare.tunnel")
FAILED=0
for agent in "${AGENTS[@]}"; do
    if launchctl list | grep -q "^[0-9].*$agent"; then
        echo "  ✅ $agent running"
    else
        echo "  ❌ $agent NOT running"
        FAILED=$((FAILED+1))
    fi
done
echo ""

if [[ $FAILED -gt 0 ]]; then
    echo "⚠️  $FAILED LaunchAgent(s) offline — attempting recovery..."
    for agent in "${AGENTS[@]}"; do
        if ! launchctl list | grep -q "^[0-9].*$agent"; then
            echo "   → Restarting $agent..."
            launchctl start "$agent" 2>&1 || echo "     (restart failed)"
        fi
    done
fi

echo "=== Check Complete ==="
