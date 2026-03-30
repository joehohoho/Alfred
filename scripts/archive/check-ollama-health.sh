#!/bin/bash
# check-ollama-health.sh - Evaluate ollama load and determine if safe to spawn tasks
# Exit codes:
#   0 = HEALTHY (safe to proceed)
#   1 = OVERWHELMED (defer task)
#   2 = UNREACHABLE (critical failure)

set -e

OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"
TIMEOUT=3  # seconds to wait for response
THRESHOLD_MS=1000  # if response takes >1s, consider it under load

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Test connectivity first (quick ping)
if ! timeout 2 curl -s "${OLLAMA_URL}/api/tags" > /dev/null 2>&1; then
    echo -e "${RED}UNREACHABLE${NC}: ollama not responding at ${OLLAMA_URL}"
    exit 2
fi

# Measure response time for a simple model list call
START_TIME=$(date +%s%N)
if timeout $TIMEOUT curl -s "${OLLAMA_URL}/api/tags" > /dev/null 2>&1; then
    END_TIME=$(date +%s%N)
    RESPONSE_TIME_MS=$(( (END_TIME - START_TIME) / 1000000 ))
    
    if [ $RESPONSE_TIME_MS -gt $THRESHOLD_MS ]; then
        echo -e "${YELLOW}OVERWHELMED${NC}: ollama response time ${RESPONSE_TIME_MS}ms (threshold: ${THRESHOLD_MS}ms)"
        exit 1
    else
        echo -e "${GREEN}HEALTHY${NC}: ollama response time ${RESPONSE_TIME_MS}ms"
        exit 0
    fi
else
    echo -e "${RED}TIMEOUT${NC}: ollama not responding within ${TIMEOUT}s"
    exit 2
fi
