#!/bin/bash
# voice-output.sh — Convert text to speech and play
# Usage: ./voice-output.sh "Your text here"
# Requires: TTS tool configured in OpenClaw

if [ -z "$1" ]; then
    echo "Usage: $0 \"Your text\""
    exit 1
fi

TEXT="$1"
TEMP_AUDIO="/tmp/tts_output.mp3"

echo "🎤 Converting to speech..."
# In OpenClaw context, use the tts tool
# This script is a wrapper reference; actual playback happens via OpenClaw tts tool

# If running standalone with ffmpeg/espeak:
# echo "$TEXT" | espeak -f - -w "$TEMP_AUDIO" 2>/dev/null

# Better: Use OpenClaw tts tool (integrates with ElevenLabs or local TTS)
# See: sessions_send or tts tool in main session

echo "📢 To generate audio in OpenClaw, use:"
echo "  tts(text=\"$TEXT\")"
echo ""
echo "Then play the returned MEDIA: path"
