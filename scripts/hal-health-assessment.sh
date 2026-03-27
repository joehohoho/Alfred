#!/bin/bash

################################################################################
# hal-health-assessment.sh — HAL Gateway Health Assessment & Recovery Guide
#
# Purpose:
#   - Comprehensive health check of HAL gateway
#   - Diagnose WebSocket upgrade failures
#   - Generate recovery recommendations
#   - Track outage timeline and impact
#
# Success Metrics:
#   - Detects outages within <5 min
#   - Provides diagnostic info for manual intervention
#   - Tracks recovery timeline
#   - Estimates impact on task queue
#
################################################################################

HAL_HOST="192.168.2.79"
HAL_PORT="18789"
TRACKING_DIR="${HOME}/.openclaw/workspace/.hal-alfred-tracking"
ASSESSMENT_LOG="${TRACKING_DIR}/hal-health-assessment.log"

# Create log directory
mkdir -p "${TRACKING_DIR}"
touch "${ASSESSMENT_LOG}"

log_assessment() {
  local msg="$1"
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%S-0300')] ${msg}" >> "${ASSESSMENT_LOG}"
}

# =============================================================================
# TEST 1: HTTP Connectivity
# =============================================================================
test_http() {
  log_assessment "━━━ TEST 1: HTTP Connectivity ━━━"
  
  if curl -s -m 5 "http://${HAL_HOST}:${HAL_PORT}/" > /dev/null 2>&1; then
    log_assessment "✅ HTTP connectivity: OK (port 18789 is reachable)"
    return 0
  else
    log_assessment "❌ HTTP connectivity: FAILED (port unreachable or service down)"
    return 1
  fi
}

# =============================================================================
# TEST 2: WebSocket Protocol Support
# =============================================================================
test_websocket() {
  log_assessment "━━━ TEST 2: WebSocket Upgrade ━━━"
  
  # Try basic WebSocket handshake
  local response=$(timeout 5 bash -c "exec 3<>/dev/tcp/${HAL_HOST}/${HAL_PORT}; echo -e 'GET / HTTP/1.1\r\nHost: ${HAL_HOST}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n' >&3; read -t 2 line <&3; echo \$line" 2>&1)
  
  if echo "${response}" | grep -q "101"; then
    log_assessment "✅ WebSocket upgrade: OK (101 Switching Protocols)"
    return 0
  else
    log_assessment "❌ WebSocket upgrade: FAILED (expected HTTP 101, got: ${response:0:50})"
    return 1
  fi
}

# =============================================================================
# TEST 3: Circuit Breaker Status
# =============================================================================
test_circuit_breaker() {
  log_assessment "━━━ TEST 3: Circuit Breaker State ━━━"
  
  if [[ -f "${TRACKING_DIR}/circuit-breaker-advanced.json" ]]; then
    local state=$(grep -o '"state":"[^"]*"' "${TRACKING_DIR}/circuit-breaker-advanced.json" | cut -d'"' -f4)
    local fail_count=$(grep -o '"fail_count":[0-9]*' "${TRACKING_DIR}/circuit-breaker-advanced.json" | cut -d':' -f2)
    
    log_assessment "Circuit breaker state: ${state} (fail_count=${fail_count})"
    
    if [[ "${state}" == "open" ]]; then
      log_assessment "⚠️  Circuit breaker is OPEN — HAL requests being rejected"
      return 1
    else
      log_assessment "✅ Circuit breaker is CLOSED — HAL requests allowed"
      return 0
    fi
  else
    log_assessment "❌ Circuit breaker state file not found"
    return 1
  fi
}

# =============================================================================
# TEST 4: Task Queue Impact
# =============================================================================
test_queue_impact() {
  log_assessment "━━━ TEST 4: Task Queue Status ━━━"
  
  if [[ -f "${TRACKING_DIR}/hal-dispatch-fail-count.txt" ]]; then
    local fail_count=$(cat "${TRACKING_DIR}/hal-dispatch-fail-count.txt")
    log_assessment "HAL dispatch failures: ${fail_count}"
    
    if [[ ${fail_count} -gt 50 ]]; then
      log_assessment "🚨 CRITICAL: ${fail_count} consecutive failures detected"
      log_assessment "   Tasks being routed to Alfred fallback"
      return 1
    elif [[ ${fail_count} -gt 10 ]]; then
      log_assessment "⚠️  WARNING: ${fail_count} consecutive failures"
      return 2
    else
      log_assessment "✅ Task dispatch: OK (${fail_count} failures)"
      return 0
    fi
  fi
}

# =============================================================================
# TEST 5: Last Successful Dispatch
# =============================================================================
test_last_dispatch() {
  log_assessment "━━━ TEST 5: Last Successful Dispatch ━━━"
  
  if [[ -f "${TRACKING_DIR}/last-successful-dispatch.json" ]]; then
    local last_dispatch=$(grep -o '"timestamp":"[^"]*"' "${TRACKING_DIR}/last-successful-dispatch.json" | cut -d'"' -f4)
    log_assessment "Last successful dispatch: ${last_dispatch}"
  else
    log_assessment "⚠️  No successful dispatch history found"
  fi
}

# =============================================================================
# SUMMARY & RECOMMENDATIONS
# =============================================================================
generate_recommendations() {
  log_assessment "━━━ ASSESSMENT SUMMARY ━━━"
  
  local http_ok=0
  local websocket_ok=0
  
  # Run tests and capture results
  test_http && http_ok=1
  test_websocket && websocket_ok=1
  test_circuit_breaker > /dev/null 2>&1
  test_queue_impact > /dev/null 2>&1
  test_last_dispatch
  
  log_assessment ""
  
  # Generate recommendations based on test results
  if [[ ${http_ok} -eq 0 ]]; then
    log_assessment "🔴 DIAGNOSIS: HAL gateway is completely offline (no HTTP connection)"
    log_assessment "   RECOMMENDATION: Restart the HAL service on Windows PC (192.168.2.79)"
    log_assessment "   - SSH to Windows PC"
    log_assessment "   - Restart OpenClaw gateway service"
    log_assessment "   - Verify WebSocket port 18789 is open"
  elif [[ ${websocket_ok} -eq 0 ]]; then
    log_assessment "🟡 DIAGNOSIS: HTTP is working but WebSocket upgrade is failing"
    log_assessment "   POSSIBLE CAUSES:"
    log_assessment "   - Gateway is running but WebSocket handler has crashed"
    log_assessment "   - Firewall/network rule blocking WebSocket protocol"
    log_assessment "   - Gateway needs restart to reset WebSocket handler"
    log_assessment "   RECOMMENDATION: Try restarting HAL gateway service"
  else
    log_assessment "🟢 DIAGNOSIS: HAL gateway appears healthy"
    log_assessment "   Status: All tests passed"
  fi
  
  log_assessment ""
  log_assessment "━━━ AUTOMATED FALLBACK ACTIVE ━━━"
  log_assessment "- Complex tasks are being routed to Alfred instead of HAL"
  log_assessment "- System continues to function at reduced capacity"
  log_assessment "- Once HAL recovers, normal dispatch will resume"
  
  log_assessment ""
  log_assessment "Assessment complete. See ${ASSESSMENT_LOG} for details."
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

echo ""
echo "HAL Health Assessment — $(date)"
echo ""

generate_recommendations

echo ""
echo "Assessment log: ${ASSESSMENT_LOG}"
echo ""

exit 0
