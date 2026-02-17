#!/bin/bash
# Setup script for YouTube Transcripts skill

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

echo "Setting up YouTube Transcripts skill..."

# Try pipx first (preferred for isolated environments)
if command -v pipx &> /dev/null; then
    echo "Installing via pipx (recommended)..."
    pipx install youtube-transcript-api
    exit 0
fi

# Try pip with venv
if command -v python3 &> /dev/null; then
    echo "Installing via venv..."
    VENV_DIR="$SKILL_DIR/.venv"
    
    if [ ! -d "$VENV_DIR" ]; then
        python3 -m venv "$VENV_DIR"
    fi
    
    source "$VENV_DIR/bin/activate"
    pip install -r "$SKILL_DIR/requirements.txt"
    
    echo "✓ Setup complete! Activate venv with: source $VENV_DIR/bin/activate"
    exit 0
fi

echo "ERROR: Neither pipx nor python3 found"
exit 1
