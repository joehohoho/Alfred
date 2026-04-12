#!/bin/bash
# hal-ollama-unload.sh — Unload all loaded Ollama models on HAL to reclaim RAM.
# Uses keep_alive=0 parameter which tells Ollama to immediately release the model.
# Models will auto-reload on next request (normal Ollama behavior).

set -euo pipefail

HAL_OLLAMA_URL="http://192.168.2.79:11434"
LOG="$HOME/.openclaw/logs/hal-ollama-unload.log"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" >> "$LOG"; echo "$*"; }

# Check if HAL's Ollama is reachable
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$HAL_OLLAMA_URL/api/tags" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" != "200" ]]; then
  log "HAL Ollama unreachable (HTTP $HTTP_CODE) — skipping unload"
  exit 0
fi

# Get list of currently loaded models
LOADED=$(curl -s --max-time 5 "$HAL_OLLAMA_URL/api/ps" 2>/dev/null || echo '{"models":[]}')
LOADED_NAMES=$(echo "$LOADED" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    models = d.get('models', [])
    for m in models:
        print(m.get('name', m.get('model', '')))
except: pass
" 2>/dev/null)

if [[ -z "$LOADED_NAMES" ]]; then
  log "No models currently loaded on HAL — nothing to unload"
  exit 0
fi

# Unload each loaded model by sending generate request with keep_alive=0
UNLOADED_COUNT=0
while IFS= read -r model; do
  [[ -z "$model" ]] && continue
  log "Unloading model: $model"
  # keep_alive=0 releases the model immediately after the (empty) request
  RESPONSE=$(curl -s --max-time 10 -X POST "$HAL_OLLAMA_URL/api/generate" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"$model\",\"prompt\":\"\",\"keep_alive\":0,\"stream\":false}" 2>/dev/null || echo "")
  if [[ -n "$RESPONSE" ]]; then
    UNLOADED_COUNT=$((UNLOADED_COUNT + 1))
  fi
done <<< "$LOADED_NAMES"

log "Unloaded $UNLOADED_COUNT model(s) from HAL's Ollama — RAM reclaimed"
echo "Unloaded $UNLOADED_COUNT model(s)"
