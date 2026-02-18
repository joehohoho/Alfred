#!/bin/bash
# ollama-guard.sh - Universal guard for any task using ollama/LOCAL models
# 
# Usage as library (source it):
#   source scripts/ollama-guard.sh
#   ollama_health_check || exit 1  # Check before doing anything
#   ollama_wait_until_ready        # Block until ollama is healthy
#   ollama_status                  # Get human-readable status
#
# Usage as wrapper (run task only if healthy):
#   ollama-guard.sh [--wait] [--timeout N] command [args...]
#
# Exit codes:
#   0 = Task succeeded or ollama healthy
#   1 = Ollama overwhelmed (task deferred)
#   2 = Ollama unreachable (task aborted)
#   3 = Task execution failed (if wrapping)

set -e

OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"
TIMEOUT=3
THRESHOLD_MS=1000

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# LIBRARY FUNCTIONS (can be sourced)
# ============================================================================

ollama_health_check() {
    # Silent health check - returns exit code only
    # 0 = healthy, 1 = overwhelmed, 2 = unreachable
    
    if ! timeout 2 curl -s "${OLLAMA_URL}/api/tags" > /dev/null 2>&1; then
        return 2  # unreachable
    fi
    
    START_TIME=$(date +%s%N)
    if timeout $TIMEOUT curl -s "${OLLAMA_URL}/api/tags" > /dev/null 2>&1; then
        END_TIME=$(date +%s%N)
        RESPONSE_TIME_MS=$(( (END_TIME - START_TIME) / 1000000 ))
        
        if [ $RESPONSE_TIME_MS -gt $THRESHOLD_MS ]; then
            return 1  # overwhelmed
        fi
        return 0  # healthy
    fi
    
    return 2  # timeout/unreachable
}

ollama_status() {
    # Human-readable status output
    
    if ! timeout 2 curl -s "${OLLAMA_URL}/api/tags" > /dev/null 2>&1; then
        echo -e "${RED}❌ UNREACHABLE${NC}: ollama not responding"
        return 2
    fi
    
    START_TIME=$(date +%s%N)
    if timeout $TIMEOUT curl -s "${OLLAMA_URL}/api/tags" > /dev/null 2>&1; then
        END_TIME=$(date +%s%N)
        RESPONSE_TIME_MS=$(( (END_TIME - START_TIME) / 1000000 ))
        
        if [ $RESPONSE_TIME_MS -gt $THRESHOLD_MS ]; then
            echo -e "${YELLOW}⏳ OVERWHELMED${NC}: response ${RESPONSE_TIME_MS}ms (threshold ${THRESHOLD_MS}ms)"
            return 1
        fi
        
        # Get model count
        MODEL_COUNT=$(curl -s "${OLLAMA_URL}/api/tags" | grep -o '"name"' | wc -l)
        echo -e "${GREEN}✅ HEALTHY${NC}: response ${RESPONSE_TIME_MS}ms, ${MODEL_COUNT} models"
        return 0
    fi
    
    echo -e "${RED}❌ TIMEOUT${NC}: no response within ${TIMEOUT}s"
    return 2
}

ollama_wait_until_ready() {
    # Block until ollama is healthy (with timeout)
    # Usage: ollama_wait_until_ready [max_wait_seconds]
    
    local MAX_WAIT=${1:-60}
    local ELAPSED=0
    local CHECK_INTERVAL=2
    
    echo -e "${BLUE}⏳ Waiting for ollama to be ready (max ${MAX_WAIT}s)...${NC}"
    
    while [ $ELAPSED -lt $MAX_WAIT ]; do
        if ollama_health_check >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Ollama ready${NC}"
            return 0
        fi
        
        ELAPSED=$((ELAPSED + CHECK_INTERVAL))
        echo -n "."
        sleep $CHECK_INTERVAL
    done
    
    echo ""
    echo -e "${RED}❌ Ollama not ready after ${MAX_WAIT}s${NC}"
    return 2
}

ollama_get_response_time() {
    # Returns response time in milliseconds (or -1 if unreachable)
    
    if ! timeout 2 curl -s "${OLLAMA_URL}/api/tags" > /dev/null 2>&1; then
        echo "-1"
        return 2
    fi
    
    START_TIME=$(date +%s%N)
    if timeout $TIMEOUT curl -s "${OLLAMA_URL}/api/tags" > /dev/null 2>&1; then
        END_TIME=$(date +%s%N)
        RESPONSE_TIME_MS=$(( (END_TIME - START_TIME) / 1000000 ))
        echo "$RESPONSE_TIME_MS"
        return 0
    fi
    
    echo "-1"
    return 2
}

# ============================================================================
# WRAPPER MODE (run command only if ollama healthy)
# ============================================================================

if [ -n "$1" ]; then
    # Script is being run as wrapper, not sourced
    WAIT_MODE=false
    TIMEOUT_OVERRIDE=""
    COMMAND_ARGS=()
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --wait)
                WAIT_MODE=true
                shift
                ;;
            --timeout)
                TIMEOUT_OVERRIDE="$2"
                shift 2
                ;;
            *)
                COMMAND_ARGS+=("$1")
                shift
                ;;
        esac
    done
    
    if [ $WAIT_MODE = true ]; then
        # Wait until ollama is ready, then run command
        if ollama_wait_until_ready "${TIMEOUT_OVERRIDE:-60}"; then
            exec "${COMMAND_ARGS[@]}"
        else
            exit 2
        fi
    else
        # Check once, defer if not ready, run if ready
        if ollama_health_check >/dev/null 2>&1; then
            exec "${COMMAND_ARGS[@]}"
        else
            echo -e "${YELLOW}⏳ Ollama overwhelmed - task deferred${NC}"
            exit 1
        fi
    fi
fi
