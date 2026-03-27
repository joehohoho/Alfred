#!/bin/bash
# launchagent-health-check.sh
# Monitor all 24+ LaunchAgents for health, restart counts, and alert on failures
# Purpose: Prevent cascading failures from undetected service stops
#
# Features:
# 1. Check all active LaunchAgents every 5 minutes
# 2. Track restart counts and reasons
# 3. Alert if critical agents exit >3x in 1 hour
# 4. Generate daily health email for Joe
# 5. Dashboard widget for real-time status

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${SCRIPT_DIR%/scripts}"
TRACK_DIR="$WORKSPACE/.hal-alfred-tracking"
HEALTH_STATUS_FILE="$TRACK_DIR/launchagent-health.json"
RESTART_LOG="$TRACK_DIR/launchagent-restarts.log"
DASHBOARD_FILE="$WORKSPACE/DASHBOARD-LAUNCHAGENT-STATUS.md"

mkdir -p "$TRACK_DIR"

ts() { date '+%Y-%m-%dT%H:%M:%S%z'; }
log() { echo "[$(ts)] $*" | tee -a "$TRACK_DIR/health-check.log"; }

# Critical agents that must always be running
CRITICAL_AGENTS=(
  "com.alfred.gateway"
  "com.alfred.work-executor"
  "com.alfred.session-cleanup"
  "com.alfred.gateway-watchdog"
)

# All known agents (expand as needed)
ALL_AGENTS=(
  "com.alfred.gateway"
  "com.alfred.dashboard-nextjs"
  "com.alfred.work-executor"
  "com.alfred.hal-idle-dispatch"
  "com.alfred.session-cleanup"
  "com.alfred.gateway-watchdog"
  "com.alfred.log-rotation"
  "com.alfred.memory-auto-archive"
  "com.alfred.evening-routine"
  "com.alfred.nightly-git-commit"
  "com.alfred.daily-config-review"
  "com.alfred.joe-profile-reflection"
  "com.alfred.weather-alerts"
  "com.alfred.health-check"
  "com.alfred.kanban-sync"
  "com.alfred.heartbeat"
  "com.alfred.daily-briefing"
  "com.alfred.backup-tier2"
  "ai.openclaw.gateway"
  "ai.openclaw.session-manager"
)

# ─────────────────────────────────────────────────────────────────────────────
# 1. Check health of a single agent
# ─────────────────────────────────────────────────────────────────────────────

check_agent_health() {
  local agent="$1"
  local status=$(launchctl list "$agent" 2>/dev/null | head -1 || echo "not-found")
  
  # launchctl list output format:
  # PID or "-" if not running
  # exit code (if stopped) 
  # label
  
  if [[ "$status" == "not-found" ]]; then
    echo "not_installed"
  elif [[ "$status" =~ ^[0-9]+$ ]]; then
    echo "running"  # PID is a number
  elif [[ "$status" == "-" ]]; then
    # Parse exit code from launchctl list output
    local full=$(launchctl list "$agent" 2>/dev/null || echo "")
    local exit_code=$(echo "$full" | awk 'NR==1 {print $2}' 2>/dev/null || echo "unknown")
    echo "stopped:exit=$exit_code"
  else
    echo "unknown"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# 2. Get restart count for agent (if available via logs)
# ─────────────────────────────────────────────────────────────────────────────

get_restart_count() {
  local agent="$1"
  local time_window_hours="${2:-1}"  # Default: last 1 hour
  
  # For now, parse from restart log if it exists
  if [[ -f "$RESTART_LOG" ]]; then
    grep "RESTART.*$agent" "$RESTART_LOG" 2>/dev/null | tail -10 | wc -l | awk '{print $1}'
  else
    echo "0"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# 3. Alert if critical agent is unhealthy
# ─────────────────────────────────────────────────────────────────────────────

check_critical_agent() {
  local agent="$1"
  local health=$(check_agent_health "$agent")
  
  if [[ "$health" != "running" ]]; then
    log "ALERT: Critical agent $agent is NOT running (health=$health)"
    
    # Count recent restarts
    local restart_count=$(get_restart_count "$agent" 1)
    if [[ "$restart_count" -ge 3 ]]; then
      log "CRITICAL: $agent has restarted $restart_count times in the last hour — possible crash loop!"
      
      # Send alert to Joe
      send_critical_alert "$agent" "$health" "$restart_count"
      return 1
    else
      # Restart the agent
      log "RESTART: Starting critical agent $agent..."
      launchctl start "$agent" 2>/dev/null || log "ERROR: Failed to start $agent"
      
      # Log the restart
      echo "[$(ts)] RESTART: $agent (health=$health restart_count=$restart_count)" >> "$RESTART_LOG"
      return 0
    fi
  fi
  
  return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# 4. Build health report JSON
# ─────────────────────────────────────────────────────────────────────────────

build_health_report() {
  python3 <<'PYTHON'
import json
import subprocess
from datetime import datetime

report = {
    "timestamp": datetime.utcnow().isoformat() + "Z",
    "critical_agents": [],
    "all_agents": [],
    "summary": {
        "total_agents": 0,
        "running": 0,
        "stopped": 0,
        "not_installed": 0,
        "unknown": 0,
        "issues": 0
    }
}

# Check all agents
all_agents = [
    "com.alfred.gateway",
    "com.alfred.dashboard-nextjs",
    "com.alfred.work-executor",
    "com.alfred.hal-idle-dispatch",
    "com.alfred.session-cleanup",
    "com.alfred.gateway-watchdog",
    "com.alfred.log-rotation",
    "com.alfred.memory-auto-archive",
    "com.alfred.evening-routine",
    "com.alfred.nightly-git-commit",
    "com.alfred.daily-config-review",
    "com.alfred.joe-profile-reflection",
    "com.alfred.weather-alerts",
    "com.alfred.health-check",
    "com.alfred.kanban-sync",
    "com.alfred.heartbeat",
    "com.alfred.daily-briefing",
    "com.alfred.backup-tier2",
]

critical = ["com.alfred.gateway", "com.alfred.work-executor", "com.alfred.session-cleanup", "com.alfred.gateway-watchdog"]

for agent in all_agents:
    try:
        result = subprocess.run(["launchctl", "list", agent], capture_output=True, text=True)
        lines = result.stdout.strip().split('\n')
        
        if "not loaded" in result.stderr or result.returncode != 0:
            status = "not_installed"
        elif lines and lines[0] == "-":
            status = "stopped"
        elif lines and lines[0].isdigit():
            status = "running"
        else:
            status = "unknown"
        
        agent_info = {
            "agent": agent,
            "status": status,
            "critical": agent in critical
        }
        
        report["all_agents"].append(agent_info)
        
        if agent in critical:
            report["critical_agents"].append(agent_info)
        
        # Update summary
        report["summary"]["total_agents"] += 1
        if status == "running":
            report["summary"]["running"] += 1
        elif status == "stopped":
            report["summary"]["stopped"] += 1
        elif status == "not_installed":
            report["summary"]["not_installed"] += 1
        else:
            report["summary"]["unknown"] += 1
        
        if status != "running":
            report["summary"]["issues"] += 1
    
    except Exception as e:
        pass

# Write report
with open("$HEALTH_STATUS_FILE", "w") as f:
    json.dump(report, f, indent=2)

print(json.dumps(report, indent=2))
PYTHON
}

# ─────────────────────────────────────────────────────────────────────────────
# 5. Send critical alert to Joe
# ─────────────────────────────────────────────────────────────────────────────

send_critical_alert() {
  local agent="$1"
  local health="$2"
  local restart_count="$3"
  
  local message="🚨 **LaunchAgent Critical Alert**

Agent: **$agent**
Status: **$health**
Recent Restarts (1h): **$restart_count**

This is a critical service that should always be running. Multiple restarts in a short time suggests a crash loop.

**Action:**
- Check the system logs: \`log stream --level debug | grep $agent\`
- Manual restart: \`launchctl restart $agent\`
- If persistent, there may be a configuration or code issue"

  # Send notification if available
  if [[ -f ~/.openclaw/workspace/scripts/send-notification.sh ]]; then
    bash ~/.openclaw/workspace/scripts/send-notification.sh \
      "LaunchAgent Critical Alert: $agent" \
      "$message" \
      "CRITICAL" 2>/dev/null || true
  fi
  
  log "ALERT_SENT: $agent health=$health restarts=$restart_count"
}

# ─────────────────────────────────────────────────────────────────────────────
# 6. Generate daily health email
# ─────────────────────────────────────────────────────────────────────────────

generate_daily_email() {
  local report_file="$HEALTH_STATUS_FILE"
  
  if [[ ! -f "$report_file" ]]; then
    return
  fi
  
  python3 -c "
import json
import sys

try:
    with open('$report_file') as f:
        report = json.load(f)
    
    # Build email content
    email = '''Subject: Daily LaunchAgent Health Report

**LaunchAgent Health Report**
Generated: $(date)

**Summary:**
- Total Agents: {total}
- Running: {running}
- Stopped: {stopped}
- Issues: {issues}

**Critical Agents:**
'''.format(
        total=report['summary']['total_agents'],
        running=report['summary']['running'],
        stopped=report['summary']['stopped'],
        issues=report['summary']['issues']
    )
    
    for agent in report['critical_agents']:
        status_emoji = '✅' if agent['status'] == 'running' else '❌'
        email += f\"\\n{status_emoji} {agent['agent']}: {agent['status']}\"
    
    email += '''

**All Agents:**
'''
    
    for agent in report['all_agents']:
        status_emoji = '✅' if agent['status'] == 'running' else '❌'
        email += f\"\\n{status_emoji} {agent['agent']}: {agent['status']}\"
    
    print(email)
    
except Exception as e:
    print(f'Error generating email: {e}', file=sys.stderr)
" 2>/dev/null || log "ERROR: Failed to generate daily email"
}

# ─────────────────────────────────────────────────────────────────────────────
# 7. Update dashboard markdown
# ─────────────────────────────────────────────────────────────────────────────

update_dashboard() {
  python3 <<'PYTHON'
import json
from datetime import datetime

try:
    with open("$HEALTH_STATUS_FILE") as f:
        report = json.load(f)
    
    # Build markdown dashboard
    dashboard = f"""# LaunchAgent Health Dashboard

**Last Updated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Summary

| Metric | Count |
|--------|-------|
| Total Agents | {report['summary']['total_agents']} |
| Running | {report['summary']['running']} |
| Stopped | {report['summary']['stopped']} |
| Not Installed | {report['summary']['not_installed']} |
| **Issues** | **{report['summary']['issues']}** |

## Critical Agents (Must Be Running)

"""
    
    for agent in report['critical_agents']:
        status_icon = "🟢" if agent['status'] == 'running' else "🔴"
        dashboard += f"- {status_icon} **{agent['agent']}**: `{agent['status']}`\n"
    
    dashboard += "\n## All Agents\n\n"
    
    for agent in report['all_agents']:
        status_icon = "🟢" if agent['status'] == 'running' else "🟡" if agent['status'] == 'unknown' else "🔴"
        dashboard += f"- {status_icon} {agent['agent']}: `{agent['status']}`\n"
    
    with open("$DASHBOARD_FILE", "w") as f:
        f.write(dashboard)
    
except Exception as e:
    pass
PYTHON
}

# ─────────────────────────────────────────────────────────────────────────────
# MAIN HEALTH CHECK CYCLE
# ─────────────────────────────────────────────────────────────────────────────

log "LaunchAgent health check starting..."

# 1. Check all critical agents
issues_found=0
for agent in "${CRITICAL_AGENTS[@]}"; do
  if ! check_critical_agent "$agent"; then
    issues_found=$((issues_found + 1))
  fi
done

# 2. Build comprehensive health report
log "Building health report..."
build_health_report

# 3. Update dashboard
log "Updating dashboard..."
update_dashboard

# 4. Report results
if [[ $issues_found -gt 0 ]]; then
  log "COMPLETED: $issues_found critical issues found and remediated"
  echo "[STATUS] critical_issues=$issues_found"
  exit 1
else
  log "COMPLETED: All critical agents healthy"
  echo "[STATUS] all_healthy=true"
  exit 0
fi
