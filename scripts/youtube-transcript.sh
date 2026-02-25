#!/bin/bash
set -euo pipefail

WORKSPACE="/Users/hopenclaw/.openclaw/workspace"
VENV="$WORKSPACE/.venvs/youtube-transcripts"
PY="$VENV/bin/python"
SCRIPT="$WORKSPACE/skills/youtube-transcripts/scripts/fetch_transcript.py"

if [[ ! -x "$PY" ]]; then
  echo "Missing venv python at $PY" >&2
  echo "Run setup: python3 -m venv $VENV && $PY -m pip install youtube-transcript-api" >&2
  exit 1
fi

exec "$PY" "$SCRIPT" "$@"
