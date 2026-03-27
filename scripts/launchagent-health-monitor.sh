#!/bin/bash

################################################################################
# launchagent-health-monitor.sh — Comprehensive LaunchAgent Health Check
#
# Purpose:
#   - Monitor all 24+ LaunchAgents (OpenClaw infrastructure)
#   - Track restart counts and failure patterns
#   - Alert on critical service failures
#   - Generate health reports for dashboard
#
# ROI: Catch infrastructure outages in <5 min instead of 2-4 hours
#
################################################################################

TRACKING_DIR="${HOME}/.openclaw/workspace/.hal-alfred-tracking"
HEALTH_STATE_FILE="${TRACKING_DIR}/launchagent-health.json"
RESTART_LOG="${TRACKING_DIR}/launchagent-restarts.log"

# Create tracking directory if needed
mkdir -p "${TRACKING_DIR}"
touch "${RESTART_LOG}"

# Get all agents and build health report
check_timestamp=$(date -u '+%Y-%m-%dT%H:%M:%S%z')

# Temp file for JSON building
TEMP_JSON=$(mktemp)
{
  echo "{"
  echo "  \"timestamp\": \"${check_timestamp}\","
  echo "  \"agents\": ["
} > "${TEMP_JSON}"

healthy_count=0
failed_count=0
critical_down=0
first=1

launchctl list 2>/dev/null | awk 'NR>1 {print $1, $NF}' | sort -k2 | while read -r status agent; do
  [[ -z "${agent}" ]] && continue
  
  # Determine health status
  if [[ "${status}" == "-" ]]; then
    health="DOWN"
    failed_count=$((failed_count + 1))
    
    # Alert on critical agents
    case "${agent}" in
      "ai.openclaw.gateway"|"com.alfred.work-executor"|"com.alfred.hal-idle-dispatch"|"com.alfred.session-cleanup")
        critical_down=$((critical_down + 1))
        echo "[$(date -u '+%Y-%m-%dT%H:%M:%S-0300')] ALERT: Critical agent ${agent} is down" >> "${RESTART_LOG}"
        ;;
    esac
  else
    health="RUNNING"
    healthy_count=$((healthy_count + 1))
  fi
  
  # Append to JSON (handle comma)
  {
    if [[ ${first} -eq 0 ]]; then
      echo ","
    fi
    printf '    {"name": "%s", "status": "%s", "exit_code": "%s"}' "${agent}" "${health}" "${status}"
  } >> "${TEMP_JSON}"
  
  first=0
done

{
  echo ""
  echo "  ],"
  echo "  \"summary\": {"
  
  total_agents=$(launchctl list 2>/dev/null | awk 'NR>1' | wc -l)
  echo "    \"total_agents\": ${total_agents},"
  echo "    \"healthy\": ${healthy_count},"
  echo "    \"failed\": ${failed_count},"
  echo "    \"critical_down\": ${critical_down}"
  echo "  }"
  echo "}"
} >> "${TEMP_JSON}"

# Atomic write
mv "${TEMP_JSON}" "${HEALTH_STATE_FILE}" 2>/dev/null || true

# Log summary
total_agents=$(launchctl list 2>/dev/null | awk 'NR>1' | wc -l)
echo "[$(date -u '+%Y-%m-%dT%H:%M:%S-0300')] Health: ${total_agents} agents, ${healthy_count} healthy, ${failed_count} failed, ${critical_down} critical down" >> "${RESTART_LOG}"

exit 0
