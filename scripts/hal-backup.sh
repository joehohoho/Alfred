#!/usr/bin/env bash
set -euo pipefail

HAL_DIR="$HOME/.openclaw/agents/hal"
BACKUP_ROOT="$HOME/.openclaw/backups/hal"
STAMP="$(date +%F-%H%M%S)"
ARCHIVE="$BACKUP_ROOT/hal-state-$STAMP.tar.gz"
LATEST_LINK="$BACKUP_ROOT/latest.tar.gz"

mkdir -p "$BACKUP_ROOT"

if [[ ! -d "$HAL_DIR" ]]; then
  echo "HAL agent dir not found: $HAL_DIR"
  exit 1
fi

# Archive HAL agent state + HAL helper scripts
# Excludes transient lock/pid/tmp files to avoid noisy backups.
tar \
  --exclude='*.lock' \
  --exclude='*.pid' \
  --exclude='tmp' \
  -czf "$ARCHIVE" \
  -C "$HOME" \
  ".openclaw/agents/hal" \
  ".openclaw/workspace/scripts/hal-idle-check.sh" \
  ".openclaw/workspace/scripts/hal-idle-dispatch-cron.sh" \
  ".openclaw/workspace/scripts/hal-session-cleanup.sh" \
  ".openclaw/workspace/scripts/hal-alfred-dispatch.sh"

ln -sfn "$(basename "$ARCHIVE")" "$LATEST_LINK"

# Keep last 30 archives
ls -1t "$BACKUP_ROOT"/hal-state-*.tar.gz 2>/dev/null | tail -n +31 | xargs -r rm -f

SIZE=$(du -h "$ARCHIVE" | awk '{print $1}')
echo "HAL backup created: $ARCHIVE ($SIZE)"
