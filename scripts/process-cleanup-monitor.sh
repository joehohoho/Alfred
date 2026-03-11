#!/bin/bash
# process-cleanup-monitor.sh
# Monitors for zombie node/python processes and cleans them up (C4)

set -euo pipefail

TRACK_DIR="${1:-.hal-alfred-tracking}"
PROCESS_LOG="$TRACK_DIR/process-cleanup.log"

mkdir -p "$TRACK_DIR"

log() {
  echo "[$(date '+%Y-%m-%dT%H:%M:%S%z')] $*" | tee -a "$PROCESS_LOG"
}

# Find zombie node processes (likely from hal-dispatch-ws.js timeouts)
ZOMBIES=$(ps aux | grep -i "node" | grep -i "dispatch" | grep -v grep | awk '{print $2}' || true)

if [[ -n "$ZOMBIES" ]]; then
  for pid in $ZOMBIES; do
    # Check if process is actually a zombie
    if ps -p "$pid" >/dev/null 2>&1; then
      # Try SIGTERM first
      if kill -0 "$pid" 2>/dev/null; then
        log "WARN: Found stale node process $pid, attempting graceful kill"
        kill -15 "$pid" 2>/dev/null || true
        
        # Wait 2 sec, then SIGKILL if still alive
        sleep 2
        if kill -0 "$pid" 2>/dev/null; then
          log "WARN: Process $pid did not respond to SIGTERM, using SIGKILL"
          kill -9 "$pid" 2>/dev/null || true
        fi
      fi
    fi
  done
fi

# Find stale python processes (mal-dispatch-ws or queue processors)
PYTHON_PROCS=$(ps aux | grep -i "python" | grep -E "dispatch|queue" | grep -v grep | awk '{print $2}' || true)

if [[ -n "$PYTHON_PROCS" ]]; then
  for pid in $PYTHON_PROCS; do
    # Check if process is running >30 min (likely stuck)
    RUNTIME=$(($(date +%s) - $(stat -f%B /proc/$pid 2>/dev/null || stat -c%Y /proc/$pid 2>/dev/null || echo 0)))
    
    if (( RUNTIME > 1800 )); then
      log "WARN: Found long-running python process $pid (runtime: ${RUNTIME}s), terminating"
      kill -15 "$pid" 2>/dev/null || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
fi

log "Process cleanup check complete"
