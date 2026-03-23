#!/bin/bash
# quiet-hours-outbox-append.sh
#
# Wrapper around outbox library for use in cron jobs and scripts.
# Automatically checks quiet hours and either sends directly or appends to outbox.
#
# Usage:
#   quiet-hours-outbox-append.sh [OPTIONS]
#
# OPTIONS:
#   --type TYPE              : question|alert|update (default: update)
#   --priority PRIORITY      : critical|high|normal|low (default: normal)
#   --title TITLE            : Subject line (required)
#   --message MESSAGE        : Full message text (required)
#   --source SOURCE          : Origin script name (default: unknown)
#   --goal-id ID             : Link to goal (optional)
#   --task-id ID             : Link to task/card (optional)
#   --channel CHANNEL        : command_center|discord|both (default: command_center)
#   --discord-target ID      : Discord channel ID (optional)
#   --dedup-key KEY          : Dedup identifier (default: auto)
#   --dedup-window-hours N   : Dedup lookback window in hours (default: 24)
#   --direct                 : Force direct send (bypass quiet hours)
#   --outbox-only            : Force outbox (bypass quiet hours check)
#   --dry-run                : Print what would happen, don't execute
#
# EXAMPLES:
#
#   # Smart: direct if awake, outbox if sleeping
#   quiet-hours-outbox-append.sh \
#     --type "alert" \
#     --title "CoinUsUp deploy complete" \
#     --message "Version 2.3.1 deployed to production" \
#     --source "deploy-job"
#
#   # Force direct (for critical)
#   quiet-hours-outbox-append.sh \
#     --type "alert" \
#     --priority "critical" \
#     --title "Gateway memory critical" \
#     --message "85% allocated, immediate action needed" \
#     --direct
#
#   # Daily inquiry with 7-day dedup
#   quiet-hours-outbox-append.sh \
#     --type "question" \
#     --priority "normal" \
#     --title "Passive income ideas?" \
#     --message "What passive income ideas suit my current situation?" \
#     --source "daily-inquiry" \
#     --dedup-key "daily-inquiry:passive-income" \
#     --dedup-window-hours 168

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source library
source "$SCRIPT_DIR/outbox-lib.sh"

# Parse arguments
TYPE="update"
PRIORITY="normal"
TITLE=""
MESSAGE=""
SOURCE="unknown"
GOAL_ID=""
TASK_ID=""
CHANNEL="command_center"
DISCORD_TARGET=""
DEDUP_KEY=""
DEDUP_WINDOW_HOURS=24
FORCE_DIRECT=0
FORCE_OUTBOX=0
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type) TYPE="$2"; shift 2 ;;
    --priority) PRIORITY="$2"; shift 2 ;;
    --title) TITLE="$2"; shift 2 ;;
    --message) MESSAGE="$2"; shift 2 ;;
    --source) SOURCE="$2"; shift 2 ;;
    --goal-id) GOAL_ID="$2"; shift 2 ;;
    --task-id) TASK_ID="$2"; shift 2 ;;
    --channel) CHANNEL="$2"; shift 2 ;;
    --discord-target) DISCORD_TARGET="$2"; shift 2 ;;
    --dedup-key) DEDUP_KEY="$2"; shift 2 ;;
    --dedup-window-hours) DEDUP_WINDOW_HOURS="$2"; shift 2 ;;
    --direct) FORCE_DIRECT=1; shift ;;
    --outbox-only) FORCE_OUTBOX=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    *) echo "ERROR: Unknown argument $1" >&2; exit 1 ;;
  esac
done

# Validation
if [[ -z "$TITLE" || -z "$MESSAGE" ]]; then
  echo "ERROR: --title and --message are required" >&2
  exit 1
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Decide: Direct or Outbox
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

use_outbox=0

if [[ $FORCE_DIRECT -eq 1 ]]; then
  # Explicit direct send
  use_outbox=0
elif [[ $FORCE_OUTBOX -eq 1 ]]; then
  # Explicit outbox
  use_outbox=1
elif is_quiet_hours; then
  # During quiet hours: use outbox
  use_outbox=1
else
  # During awake hours: try direct send
  use_outbox=0
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Execute
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if [[ $use_outbox -eq 1 ]]; then
  # Append to outbox
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "DRY-RUN: Would append to outbox:"
    echo "  type=$TYPE"
    echo "  priority=$PRIORITY"
    echo "  title=$TITLE"
    echo "  source=$SOURCE"
    exit 0
  fi

  outbox_append \
    --type "$TYPE" \
    --priority "$PRIORITY" \
    --title "$TITLE" \
    --message "$MESSAGE" \
    --source "$SOURCE" \
    --goal-id "$GOAL_ID" \
    --task-id "$TASK_ID" \
    --channel "$CHANNEL" \
    --discord-target "$DISCORD_TARGET" \
    --dedup-key "$DEDUP_KEY" \
    --dedup-window-hours "$DEDUP_WINDOW_HOURS"

  exit $?
else
  # Send directly via send-notification.sh
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "DRY-RUN: Would send directly:"
    echo "  type=$TYPE"
    echo "  title=$TITLE"
    exit 0
  fi

  # Map our type to notification type
  notif_type="$TYPE"
  if [[ "$TYPE" == "update" ]]; then
    notif_type="update"
  elif [[ "$TYPE" == "alert" ]]; then
    notif_type="alert"
  elif [[ "$TYPE" == "question" ]]; then
    notif_type="question"
  fi

  # Use send-notification.sh for direct delivery
  bash "$SCRIPT_DIR/send-notification.sh" \
    "$notif_type" \
    "$TITLE" \
    "$MESSAGE" \
    "$GOAL_ID" \
    "$TASK_ID" \
    "$SOURCE"

  exit $?
fi
