#!/bin/bash
# voice-input.sh — Record audio and transcribe with Whisper
# Usage: ./voice-input.sh [duration|"continuous"|"until-silence"] [model]
# Examples:
#   ./voice-input.sh              # 10 sec, base model (default)
#   ./voice-input.sh 30           # 30 sec, base model
#   ./voice-input.sh 60 small     # 60 sec, small model (better accuracy)
#   ./voice-input.sh continuous   # Record until you press Ctrl+C
#   ./voice-input.sh until-silence small  # Record until 2 sec of silence

DURATION_ARG=${1:-10}
MODEL=${2:-base}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
AUDIO_FILE="/tmp/voice_${TIMESTAMP}.m4a"
OUTPUT_DIR="/tmp/voice_transcripts"

mkdir -p "$OUTPUT_DIR"

# Handle special duration modes
if [ "$DURATION_ARG" = "continuous" ]; then
    echo "🎙️ Recording (press Ctrl+C to stop)..."
    DURATION=999999  # Effectively unlimited, controlled by Ctrl+C
    FFMPEG_CMD="ffmpeg -f avfoundation -i \":0\" -q:a 9 -acodec libmp4a_aac \"$AUDIO_FILE\" 2>/dev/null"
    eval "$FFMPEG_CMD"
elif [ "$DURATION_ARG" = "until-silence" ]; then
    echo "🎙️ Recording until 2 seconds of silence (press Ctrl+C to force stop)..."
    DURATION=999999
    # Use silencedetect filter to stop on 2 sec of silence
    ffmpeg -f avfoundation -i ":0" -af "silencedetect=n=-50dB:d=2" -q:a 9 -acodec libmp4a_aac "$AUDIO_FILE" 2>/dev/null
else
    DURATION="$DURATION_ARG"
    echo "🎙️ Recording for ${DURATION}s (model: $MODEL)..."
    ffmpeg -f avfoundation -i ":0" -t "$DURATION" -q:a 9 -acodec libmp4a_aac "$AUDIO_FILE" 2>/dev/null
fi

if [ -f "$AUDIO_FILE" ]; then
    FILE_SIZE=$(stat -f%z "$AUDIO_FILE" 2>/dev/null || stat -c%s "$AUDIO_FILE")
    if [ "$FILE_SIZE" -lt 10000 ]; then
        echo "❌ Recording too short or empty (< 10KB)"
        rm "$AUDIO_FILE"
        exit 1
    fi
    
    echo "📝 Transcribing (model: $MODEL)..."
    whisper "$AUDIO_FILE" --model "$MODEL" --output_format txt --output_dir "$OUTPUT_DIR" --device cpu 2>/dev/null
    
    TRANSCRIPT_FILE="${OUTPUT_DIR}/voice_${TIMESTAMP}.txt"
    if [ -f "$TRANSCRIPT_FILE" ]; then
        TRANSCRIPT=$(cat "$TRANSCRIPT_FILE")
        echo "✅ Transcript:"
        echo "$TRANSCRIPT"
        echo ""
        # Copy to clipboard for easy pasting
        echo -n "$TRANSCRIPT" | pbcopy
        echo "📋 Copied to clipboard (ready to paste)"
        rm "$AUDIO_FILE" "$TRANSCRIPT_FILE"
    else
        echo "❌ Transcription failed"
    fi
else
    echo "❌ Recording failed"
fi
