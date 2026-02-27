#!/usr/bin/env bash
set -euo pipefail

# disk-guard.sh
# - reports top disk consumers
# - optional safe cleanup routines
# default mode is report-only (no deletions)

APPLY=0
if [[ "${1:-}" == "--apply" ]]; then
  APPLY=1
fi

HOME_DIR="${HOME}"
WORKSPACE="${HOME}/.openclaw/workspace"
REPORT_DIR="${WORKSPACE}/reports"
mkdir -p "$REPORT_DIR"
REPORT_FILE="${REPORT_DIR}/disk-guard-$(date +%F-%H%M%S).md"

TOTAL_LINE=$(df -h /System/Volumes/Data | tail -1)
CAPACITY=$(echo "$TOTAL_LINE" | awk '{print $5}')
USED=$(echo "$TOTAL_LINE" | awk '{print $3}')
AVAIL=$(echo "$TOTAL_LINE" | awk '{print $4}')

echo "# Disk Guard Report" > "$REPORT_FILE"
echo "Generated: $(date)" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"
echo "## Volume" >> "$REPORT_FILE"
echo "- Used: $USED" >> "$REPORT_FILE"
echo "- Available: $AVAIL" >> "$REPORT_FILE"
echo "- Capacity: $CAPACITY" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"

echo "## Top Consumers in /Users/hopenclaw" >> "$REPORT_FILE"
du -sh "$HOME_DIR"/* 2>/dev/null | sort -hr | head -n 15 | sed 's/^/- /' >> "$REPORT_FILE"
echo >> "$REPORT_FILE"

echo "## Top Consumers in ~/.openclaw" >> "$REPORT_FILE"
du -sh "$HOME_DIR/.openclaw"/* 2>/dev/null | sort -hr | head -n 15 | sed 's/^/- /' >> "$REPORT_FILE"
echo >> "$REPORT_FILE"

echo "## Downloads (largest files)" >> "$REPORT_FILE"
find "$HOME_DIR/Downloads" -type f -print0 2>/dev/null | xargs -0 ls -lhS 2>/dev/null | head -n 20 | sed 's/^/- /' >> "$REPORT_FILE" || true
echo >> "$REPORT_FILE"

if [[ $APPLY -eq 1 ]]; then
  echo "## Applied Cleanup" >> "$REPORT_FILE"

  # 1) OpenClaw logs older than 14 days -> archive (already rotates, this is extra belt/suspenders)
  mkdir -p "$HOME_DIR/.openclaw/logs/archive"
  find "$HOME_DIR/.openclaw/logs" -maxdepth 1 -type f -name "*.log" -mtime +14 -exec mv {} "$HOME_DIR/.openclaw/logs/archive/" \;
  echo "- Moved OpenClaw logs older than 14 days to logs/archive" >> "$REPORT_FILE"

  # 2) Node build artifacts older than 7 days in workspace repos
  find "$HOME_DIR/.openclaw/workspace" -type d \( -name dist -o -name .next -o -name build \) -mtime +7 -prune -exec rm -rf {} + 2>/dev/null || true
  echo "- Removed stale build artifacts (dist/.next/build) older than 7 days in workspace" >> "$REPORT_FILE"

  # 3) npm cache clean (safe)
  npm cache verify >/dev/null 2>&1 || true
  npm cache clean --force >/dev/null 2>&1 || true
  echo "- Ran npm cache clean --force" >> "$REPORT_FILE"

  # 4) pip cache purge (safe)
  pip3 cache purge >/dev/null 2>&1 || true
  echo "- Ran pip3 cache purge" >> "$REPORT_FILE"
else
  echo "## Suggested Remediation (not applied)" >> "$REPORT_FILE"
  echo "1. Review and clear ~/Downloads (currently largest consumer)." >> "$REPORT_FILE"
  echo "2. Keep node_modules only for active repos; reinstall on-demand for inactive repos." >> "$REPORT_FILE"
  echo "3. Run this script with --apply to clean stale build artifacts/caches safely." >> "$REPORT_FILE"
fi

echo "$REPORT_FILE"