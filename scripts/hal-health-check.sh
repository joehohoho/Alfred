#!/bin/bash
# hal-health-check.sh
# Checks if HAL's Ollama process is actually running and responsive (not just reachable)
# Risk C2: HAL process hung (gateway reachable but Ollama dead)

set -euo pipefail

HAL_IP="${1:-192.168.2.79}"
HAL_PORT="${2:-18789}"

# Step 1: Can we reach the gateway?
if ! curl -s --max-time 3 "http://$HAL_IP:$HAL_PORT/status" >/dev/null 2>&1; then
  echo "GATEWAY_DOWN"
  exit 1
fi

# Step 2: Can we get a meaningful response from the status endpoint?
STATUS=$(curl -s --max-time 3 "http://$HAL_IP:$HAL_PORT/status" 2>/dev/null || echo "{}")

if ! echo "$STATUS" | python3 -c "
import sys, json
try:
  data = json.load(sys.stdin)
  # HAL's status should have certain expected fields
  assert 'version' in data or 'status' in data, 'Missing expected status fields'
  print('OK')
except:
  print('INVALID')
" 2>/dev/null | grep -q "OK"; then
  echo "GATEWAY_INVALID_RESPONSE"
  exit 1
fi

# Step 3: Try a lightweight API call to ensure Ollama is responsive
# (Don't do actual inference, just check connectivity)
if ! curl -s --max-time 5 -X POST "http://$HAL_IP:$HAL_PORT/api/tags" \
  -H "Content-Type: application/json" \
  -d '{}' | grep -q '"models"'; then
  echo "OLLAMA_UNRESPONSIVE"
  exit 1
fi

echo "HEALTHY"
exit 0
