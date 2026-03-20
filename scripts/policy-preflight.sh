#!/bin/bash
# policy-preflight.sh
# Shared policy-as-code guardrail checks for cron/automation entrypoints.
#
# Enforces (or audits) these checks:
# 1) quiet-hours direct-user notification gate (mode: no_direct_dm)
# 2) external-action approval gate
# 3) forbidden-file write denylist
# 4) duplicate-task dedup window
# 5) coverage ledger (which scripts invoked preflight)
#
# Usage examples:
#   bash scripts/policy-preflight.sh --script daily-inquiry.sh --action notify --external 1 --target-class direct_user --priority normal --dedup-key daily-inquiry:2026-03-19 --dedup-window-sec 86400
#   bash scripts/policy-preflight.sh --script hal-slack-notify.sh --action notify --external 1 --target-class shared_channel --priority normal
#   bash scripts/policy-preflight.sh --script my-script.sh --action file_write --write-path "$HOME/.openclaw/openclaw.json"

set -euo pipefail

SCRIPT_NAME=""
ACTION="generic"
EXTERNAL="0"
APPROVED="0"
TARGET_CLASS="internal_system"   # direct_user | shared_channel | internal_system
PRIORITY="normal"                 # normal | critical
WRITE_PATH=""
DEDUP_KEY=""
DEDUP_WINDOW_SEC=0
AUDIT_ONLY="0"
QUIET_HOURS_MODE="no_direct_dm"
FORCE_QUIET_HOURS=""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$(dirname "$SCRIPT_DIR")"
TRACK_DIR="$WORKSPACE/tracking"
POLICY_LOG="$TRACK_DIR/policy-preflight.log"
POLICY_JSONL="$TRACK_DIR/policy-preflight.jsonl"
COVERAGE_JSONL="$TRACK_DIR/policy-preflight-coverage.jsonl"
DEDUP_JSONL="$TRACK_DIR/policy-preflight-dedup.jsonl"

mkdir -p "$TRACK_DIR"
touch "$POLICY_LOG" "$POLICY_JSONL" "$COVERAGE_JSONL" "$DEDUP_JSONL"

FORBIDDEN_PATHS=(
  "$HOME/.openclaw/openclaw.json"
  "$HOME/.openclaw/cron/jobs.json"
  "/etc/hosts"
)

log_line() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" >> "$POLICY_LOG"
}

usage() {
  cat <<'EOF'
Usage: policy-preflight.sh --script <name> [options]

Required:
  --script <name>

Options:
  --action <generic|notify|file_write|dispatch>
  --external <0|1>
  --approved <0|1>
  --target-class <direct_user|shared_channel|internal_system>
  --priority <normal|critical>
  --write-path <path>
  --dedup-key <key>
  --dedup-window-sec <seconds>
  --audit-only <0|1>
  --quiet-hours-mode <no_direct_dm>
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --script) SCRIPT_NAME="${2:-}"; shift 2 ;;
    --action) ACTION="${2:-generic}"; shift 2 ;;
    --external) EXTERNAL="${2:-0}"; shift 2 ;;
    --approved) APPROVED="${2:-0}"; shift 2 ;;
    --target-class) TARGET_CLASS="${2:-internal_system}"; shift 2 ;;
    --priority) PRIORITY="${2:-normal}"; shift 2 ;;
    --write-path) WRITE_PATH="${2:-}"; shift 2 ;;
    --dedup-key) DEDUP_KEY="${2:-}"; shift 2 ;;
    --dedup-window-sec) DEDUP_WINDOW_SEC="${2:-0}"; shift 2 ;;
    --audit-only) AUDIT_ONLY="${2:-0}"; shift 2 ;;
    --quiet-hours-mode) QUIET_HOURS_MODE="${2:-no_direct_dm}"; shift 2 ;;
    --force-quiet-hours) FORCE_QUIET_HOURS="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ -z "$SCRIPT_NAME" ]]; then
  echo "ERROR: --script is required" >&2
  usage
  exit 2
fi

if ! [[ "$DEDUP_WINDOW_SEC" =~ ^[0-9]+$ ]]; then
  echo "ERROR: --dedup-window-sec must be a non-negative integer" >&2
  exit 2
fi

# Coverage ledger: record every invocation.
python3 - "$COVERAGE_JSONL" "$SCRIPT_NAME" "$ACTION" <<'PY'
import json, os, sys, time
path, script_name, action = sys.argv[1:4]
entry = {
    "ts": int(time.time()),
    "iso": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    "script": script_name,
    "action": action,
    "policyVersion": "2026-03-19.v1"
}
with open(path, "a") as f:
    f.write(json.dumps(entry) + "\n")
PY

NOW_EPOCH=$(date +%s)
MONCTON_HOUR=$(TZ=America/Moncton date +%H)
IS_QUIET_HOURS=0
if (( 10#$MONCTON_HOUR >= 23 || 10#$MONCTON_HOUR < 9 )); then
  IS_QUIET_HOURS=1
fi
if [[ -n "$FORCE_QUIET_HOURS" ]]; then
  if [[ "$FORCE_QUIET_HOURS" == "1" || "$FORCE_QUIET_HOURS" == "true" ]]; then
    IS_QUIET_HOURS=1
  else
    IS_QUIET_HOURS=0
  fi
fi

FAIL_REASONS=()
WARN_REASONS=()

# Rule 1: quiet-hours direct DM gate (allow shared channels/internal systems).
if [[ "$QUIET_HOURS_MODE" == "no_direct_dm" && "$ACTION" == "notify" && "$IS_QUIET_HOURS" == "1" ]]; then
  if [[ "$TARGET_CLASS" == "direct_user" && "$PRIORITY" != "critical" ]]; then
    FAIL_REASONS+=("quiet_hours_direct_notification_blocked")
  fi
fi

# Rule 2: external-action gate.
if [[ "$EXTERNAL" == "1" && "$APPROVED" != "1" ]]; then
  # Hard fail for autonomous dispatches that could contact third parties.
  if [[ "$ACTION" == "dispatch" ]]; then
    FAIL_REASONS+=("external_action_requires_approval")
  else
    WARN_REASONS+=("external_action_without_explicit_approval")
  fi
fi

# Rule 3: forbidden-file write denylist.
if [[ "$ACTION" == "file_write" && -n "$WRITE_PATH" ]]; then
  for denied in "${FORBIDDEN_PATHS[@]}"; do
    if [[ "$WRITE_PATH" == "$denied" ]]; then
      FAIL_REASONS+=("forbidden_file_write:$WRITE_PATH")
      break
    fi
  done
fi

# Rule 4: dedup key window.
if [[ -n "$DEDUP_KEY" && "$DEDUP_WINDOW_SEC" -gt 0 ]]; then
  DUP_FOUND=$(python3 - "$DEDUP_JSONL" "$DEDUP_KEY" "$NOW_EPOCH" "$DEDUP_WINDOW_SEC" <<'PY'
import json, sys
path, key, now_s, window_s = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
min_ts = now_s - window_s
found = False
try:
    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            if obj.get("dedupKey") == key and int(obj.get("ts", 0)) >= min_ts and obj.get("result") == "allow":
                found = True
except FileNotFoundError:
    pass
print("1" if found else "0")
PY
)
  if [[ "$DUP_FOUND" == "1" ]]; then
    FAIL_REASONS+=("dedup_window_hit:$DEDUP_KEY")
  fi
fi

RESULT="allow"
if [[ ${#FAIL_REASONS[@]} -gt 0 ]]; then
  RESULT="block"
fi

# Always append structured event.
FAIL_REASONS_JOINED="${FAIL_REASONS[*]-}"
WARN_REASONS_JOINED="${WARN_REASONS[*]-}"

python3 - "$POLICY_JSONL" "$SCRIPT_NAME" "$ACTION" "$RESULT" "$EXTERNAL" "$TARGET_CLASS" "$PRIORITY" "$IS_QUIET_HOURS" "$AUDIT_ONLY" "$DEDUP_KEY" "$NOW_EPOCH" "$WRITE_PATH" "$FAIL_REASONS_JOINED" "$WARN_REASONS_JOINED" <<'PY'
import json, sys, time
(path, script_name, action, result, external, target_class, priority,
 is_quiet, audit_only, dedup_key, now_epoch, write_path, fail_reasons, warn_reasons) = sys.argv[1:15]
entry = {
    "ts": int(now_epoch),
    "iso": time.strftime("%Y-%m-%dT%H:%M:%S%z", time.localtime(int(now_epoch))),
    "script": script_name,
    "action": action,
    "result": result,
    "external": external == "1",
    "targetClass": target_class,
    "priority": priority,
    "isQuietHours": is_quiet == "1",
    "auditOnly": audit_only == "1",
    "dedupKey": dedup_key or None,
    "writePath": write_path or None,
    "failReasons": [x for x in (fail_reasons or "").split() if x],
    "warnReasons": [x for x in (warn_reasons or "").split() if x],
    "policyVersion": "2026-03-19.v1"
}
with open(path, "a") as f:
    f.write(json.dumps(entry) + "\n")
PY

# If allow and dedup key present, record in dedup ledger.
if [[ "$RESULT" == "allow" && -n "$DEDUP_KEY" ]]; then
  python3 - "$DEDUP_JSONL" "$DEDUP_KEY" "$NOW_EPOCH" "$SCRIPT_NAME" "$ACTION" <<'PY'
import json, sys, time
path, dedup_key, now_epoch, script_name, action = sys.argv[1:6]
entry = {
    "ts": int(now_epoch),
    "iso": time.strftime("%Y-%m-%dT%H:%M:%S%z", time.localtime(int(now_epoch))),
    "dedupKey": dedup_key,
    "script": script_name,
    "action": action,
    "result": "allow"
}
with open(path, "a") as f:
    f.write(json.dumps(entry) + "\n")
PY
fi

if [[ ${#WARN_REASONS[@]} -gt 0 ]]; then
  log_line "WARN script=$SCRIPT_NAME action=$ACTION warnings=${WARN_REASONS_JOINED}"
fi

if [[ "$RESULT" == "block" ]]; then
  log_line "BLOCK script=$SCRIPT_NAME action=$ACTION reasons=${FAIL_REASONS_JOINED} audit_only=$AUDIT_ONLY"
  if [[ "$AUDIT_ONLY" == "1" ]]; then
    echo "POLICY_PREFLIGHT_AUDIT_BLOCK: ${FAIL_REASONS_JOINED}" >&2
    exit 0
  fi
  echo "POLICY_PREFLIGHT_BLOCK: ${FAIL_REASONS_JOINED}" >&2
  exit 42
fi

echo "POLICY_PREFLIGHT_ALLOW"
exit 0
