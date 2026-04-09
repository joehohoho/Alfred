#!/bin/bash
# self-improvement-reality-check.sh — classify implementation state with proof, not optimism
# Usage: bash scripts/self-improvement-reality-check.sh [--json]

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
JSON_MODE="${1:-}"

exists_file() { [[ -f "$1" ]]; }
exists_cmd() { command -v "$1" >/dev/null 2>&1; }
launch_loaded() { launchctl list | grep -q "$1" 2>/dev/null; }
valid_json() { jq -e . >/dev/null 2>&1 < "$1"; }

status_row() {
  local key="$1" label="$2" state="$3" proof="$4"
  if [[ "$JSON_MODE" == "--json" ]]; then
    jq -n --arg key "$key" --arg label "$label" --arg state "$state" --arg proof "$proof" '{key:$key,label:$label,state:$state,proof:$proof}'
  else
    printf '%-28s | %-12s | %s\n' "$label" "$state" "$proof"
  fi
}

rows=()

# Decision guard
if exists_file "$WORKSPACE/scripts/check-decision-guard.sh" && exists_file "$WORKSPACE/DECISION-MEMORY.md"; then
  rows+=("$(status_row decision_guard 'Decision Guard' 'running-ready' 'script + docs present')")
else
  rows+=("$(status_row decision_guard 'Decision Guard' 'missing' 'script and/or docs absent')")
fi

# Open loops
if exists_file "$WORKSPACE/scripts/refresh-open-loops.sh" && exists_file "$WORKSPACE/OPEN-LOOPS.md"; then
  rows+=("$(status_row open_loops 'Open Loops' 'running-ready' 'refresh script + output file present')")
else
  rows+=("$(status_row open_loops 'Open Loops' 'missing' 'refresh script and/or output missing')")
fi

# Continuity compiler target
if exists_file "$WORKSPACE/STATE-OF-WORK.md"; then
  rows+=("$(status_row continuity_compiler 'Continuity Compiler' 'live' 'STATE-OF-WORK.md exists')")
elif exists_file "$WORKSPACE/scripts/state-of-work-compiler.sh"; then
  rows+=("$(status_row continuity_compiler 'Continuity Compiler' 'built' 'compiler script exists, output not generated yet')")
else
  rows+=("$(status_row continuity_compiler 'Continuity Compiler' 'missing' 'no compiler found')")
fi

# Reality matrix target
if exists_file "$WORKSPACE/scripts/self-improvement-reality-check.sh"; then
  rows+=("$(status_row reality_layer 'Reality Verification' 'live' 'reality-check script exists')")
else
  rows+=("$(status_row reality_layer 'Reality Verification' 'missing' 'no verification script')")
fi

# Loop closure system
if exists_file "$WORKSPACE/scripts/self-improvement-loop-closure.sh"; then
  rows+=("$(status_row loop_closure 'Loop Closure System' 'built' 'loop closure script exists')")
else
  rows+=("$(status_row loop_closure 'Loop Closure System' 'missing' 'no loop closure script')")
fi

# Notification discipline
if exists_file "$WORKSPACE/scripts/self-improvement-notification-discipline.sh"; then
  rows+=("$(status_row notification_discipline 'Notification Discipline' 'built' 'notification discipline script exists')")
else
  rows+=("$(status_row notification_discipline 'Notification Discipline' 'missing' 'no notification discipline script')")
fi

# Launch agent health monitor
if exists_file "$WORKSPACE/scripts/launchagent-health-check.sh"; then
  if launch_loaded "com.alfred.launchagent-health-check"; then
    rows+=("$(status_row launchagent_health 'LaunchAgent Health' 'live' 'script present + LaunchAgent loaded')")
  else
    rows+=("$(status_row launchagent_health 'LaunchAgent Health' 'built' 'script present, LaunchAgent not loaded')")
  fi
else
  rows+=("$(status_row launchagent_health 'LaunchAgent Health' 'missing' 'script absent')")
fi

# HAL health monitor
if exists_file "$WORKSPACE/scripts/hal-health-monitor.sh"; then
  if launch_loaded "com.alfred.hal-health-monitor"; then
    rows+=("$(status_row hal_health 'HAL Health Monitor' 'live' 'script present + LaunchAgent loaded')")
  else
    rows+=("$(status_row hal_health 'HAL Health Monitor' 'built' 'script present, LaunchAgent not loaded')")
  fi
else
  rows+=("$(status_row hal_health 'HAL Health Monitor' 'missing' 'script absent')")
fi

if [[ "$JSON_MODE" == "--json" ]]; then
  printf '%s\n' "${rows[@]}" | jq -s .
else
  printf '%-28s | %-12s | %s\n' 'Capability' 'State' 'Proof'
  printf '%s\n' '--------------------------------------------------------------------------------'
  printf '%s\n' "${rows[@]}"
fi
