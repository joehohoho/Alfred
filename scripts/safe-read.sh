#!/bin/bash
# safe-read.sh — Defensive wrapper for reading files safely
# Prevents EISDIR errors by validating path is a file before reading
# Usage: safe-read.sh <path> [--limit <lines>] [--offset <line>]

set -e

PATH_TO_READ=""
LIMIT=""
OFFSET=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --limit)
      LIMIT="$2"
      shift 2
      ;;
    --offset)
      OFFSET="$2"
      shift 2
      ;;
    *)
      PATH_TO_READ="$1"
      shift
      ;;
  esac
done

if [[ -z "$PATH_TO_READ" ]]; then
  echo "ERROR: Path required. Usage: safe-read.sh <path> [--limit <lines>] [--offset <line>]" >&2
  exit 1
fi

# Expand tilde
PATH_TO_READ="${PATH_TO_READ/#\~/$HOME}"

# Safety checks
if [[ ! -e "$PATH_TO_READ" ]]; then
  echo "ERROR: Path does not exist: $PATH_TO_READ" >&2
  exit 2
fi

if [[ -d "$PATH_TO_READ" ]]; then
  echo "ERROR: Path is a directory, not a file: $PATH_TO_READ" >&2
  echo "HINT: Did you mean to list files? Try: ls -la '$PATH_TO_READ'" >&2
  exit 3
fi

if [[ ! -r "$PATH_TO_READ" ]]; then
  echo "ERROR: Path is not readable: $PATH_TO_READ" >&2
  exit 4
fi

# Read the file (respecting limit/offset if provided)
if [[ -n "$LIMIT" ]] && [[ -n "$OFFSET" ]]; then
  tail -n +"$OFFSET" "$PATH_TO_READ" | head -n "$LIMIT"
elif [[ -n "$LIMIT" ]]; then
  head -n "$LIMIT" "$PATH_TO_READ"
elif [[ -n "$OFFSET" ]]; then
  tail -n +"$OFFSET" "$PATH_TO_READ"
else
  cat "$PATH_TO_READ"
fi
