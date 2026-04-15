#!/bin/bash
# validate-read-path.sh — Guardrail to prevent directory read errors
# Call this before using the read tool with a user-provided path
# Usage: validate-read-path.sh <path> && read_tool_call

set -euo pipefail

path="$1"

if [[ -z "$path" ]]; then
  echo "ERROR: path required"
  exit 1
fi

# Check path exists
if [[ ! -e "$path" ]]; then
  echo "ERROR: path does not exist: $path"
  exit 1
fi

# Check it's NOT a directory
if [[ -d "$path" ]]; then
  echo "ERROR: path is a directory, not a file: $path"
  exit 1
fi

# Check it's readable
if [[ ! -r "$path" ]]; then
  echo "ERROR: path is not readable: $path"
  exit 1
fi

# All good
exit 0
