#!/usr/bin/env bash
# Safe memory file reader — prevents directory reads and provides helper functions
set -euo pipefail

MEMORY_DIR="$HOME/.openclaw/workspace/memory"

usage() {
  cat <<EOF
Usage: $0 [COMMAND] [OPTIONS]
  latest      Show latest daily memory file (today or most recent)
  get DATE    Get specific date (YYYY-MM-DD)
  list        List all daily memory files
  index       Show memory/INDEX.md
  today       Get today's memory file (must exist)
  append TEXT Append text to today's memory
  
Examples:
  $0 latest
  $0 get 2026-04-15
  $0 append "[idle:improve-self] Fixed memory reader"
EOF
}

latest_file() {
  # Return most recent YYYY-MM-DD.md file
  local file
  file=$(ls -1 "$MEMORY_DIR"/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].md 2>/dev/null | sort -r | head -1 || echo "")
  if [[ -z "$file" ]]; then
    echo "No memory files found" >&2
    return 1
  fi
  echo "$file"
}

today_file() {
  local date
  date=$(TZ=America/Moncton date +%F)
  echo "$MEMORY_DIR/${date}.md"
}

cmd="${1:-latest}"

case "$cmd" in
  latest)
    latest_file
    ;;
  get)
    if [[ -z "${2:-}" ]]; then
      echo "Error: get requires DATE (YYYY-MM-DD)" >&2
      exit 1
    fi
    file="$MEMORY_DIR/${2}.md"
    if [[ ! -f "$file" ]]; then
      echo "Error: File not found: $file" >&2
      exit 1
    fi
    echo "$file"
    ;;
  list)
    ls -1 "$MEMORY_DIR"/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].md 2>/dev/null | sort -r || echo "No memory files found"
    ;;
  index)
    echo "$MEMORY_DIR/INDEX.md"
    ;;
  today)
    file=$(today_file)
    if [[ ! -f "$file" ]]; then
      echo "Error: Today's memory file does not exist. Run ensure-daily-memory.sh first." >&2
      exit 1
    fi
    echo "$file"
    ;;
  append)
    if [[ -z "${2:-}" ]]; then
      echo "Error: append requires TEXT" >&2
      exit 1
    fi
    file=$(today_file)
    # Ensure file exists
    bash "$HOME/.openclaw/workspace/scripts/ensure-daily-memory.sh" > /dev/null 2>&1 || true
    echo "" >> "$file"
    echo "${2}" >> "$file"
    echo "Appended to: $file"
    ;;
  *)
    usage
    exit 1
    ;;
esac
