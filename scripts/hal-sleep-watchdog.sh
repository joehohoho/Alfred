#!/bin/bash
# hal-sleep-watchdog.sh — Runs every 5 min. While HAL is sleeping, keeps Ollama models unloaded.
# When HAL is awake, does nothing.
set -euo pipefail

FORCED_IDLE_FILE="$HOME/.openclaw/workspace/.hal-alfred-tracking/hal-forced-idle.json"
HAL_OLLAMA_URL="http://192.168.2.79:11434"

# Check if HAL is sleeping
SLEEPING=$(python3 -c "import json; print(json.load(open('$FORCED_IDLE_FILE')).get('forcedIdle', False))" 2>/dev/null || echo "False")

if [[ "$SLEEPING" != "True" ]]; then
  exit 0  # HAL is awake, do nothing
fi

# HAL is sleeping — unload any loaded models
LOADED=$(curl -s --max-time 5 "$HAL_OLLAMA_URL/api/ps" 2>/dev/null || echo '{"models":[]}')
MODELS=$(echo "$LOADED" | python3 -c "
import json, sys
try:
    for m in json.load(sys.stdin).get('models', []):
        print(m.get('name', ''))
except: pass
" 2>/dev/null)

if [[ -z "$MODELS" ]]; then
  exit 0  # Nothing loaded
fi

# Unload each model
while IFS= read -r model; do
  [[ -z "$model" ]] && continue
  curl -s --max-time 10 -X POST "$HAL_OLLAMA_URL/api/generate" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"$model\",\"prompt\":\"\",\"keep_alive\":0,\"stream\":false}" >/dev/null 2>&1
done <<< "$MODELS"
