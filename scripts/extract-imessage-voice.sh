#!/bin/bash
# extract-imessage-voice.sh
# Extract and transcribe voice messages from iMessage
# Usage: ./extract-imessage-voice.sh [search_phrase]
# Cost: $0 (runs locally via Whisper)

set -e

IMESSAGE_DB="$HOME/Library/Messages/chat.db"
OUTPUT_DIR="/tmp/imessage-audio"
SEARCH_PHRASE="${1:-}"
WHISPER_MODEL="${WHISPER_MODEL:-base}"

mkdir -p "$OUTPUT_DIR"

echo "🔍 Searching iMessage database for voice messages..."

# Check if database exists
if [ ! -f "$IMESSAGE_DB" ]; then
    echo "❌ Error: iMessage database not found at $IMESSAGE_DB"
    exit 1
fi

# Extract voice message metadata
QUERY="SELECT m.rowid, m.date, h.id, a.filename
FROM message m
JOIN handle h ON m.handle_id = h.ROWID
JOIN message_attachment_join maj ON m.ROWID = maj.message_id
JOIN attachment a ON maj.attachment_id = a.ROWID
WHERE a.mime_type LIKE 'audio%'
ORDER BY m.date DESC
LIMIT 20;"

echo "Found voice messages:"
sqlite3 "$IMESSAGE_DB" <<EOF
$QUERY
EOF

# Find and copy audio files from iMessage Attachments
echo ""
echo "📁 Copying audio files..."

find "$HOME/Library/Messages/Attachments" \( -name "*.m4a" -o -name "*.caf" \) 2>/dev/null | while read file; do
    # Only copy recent files (modified in last 7 days, assuming recent messages)
    if [ -f "$file" ] && [ $(( $(date +%s) - $(stat -f %m "$file") )) -lt 604800 ]; then
        cp "$file" "$OUTPUT_DIR/" 2>/dev/null && echo "  ✓ $(basename "$file")"
    fi
done

AUDIO_FILES=$(find "$OUTPUT_DIR" -type f \( -name "*.m4a" -o -name "*.caf" \) 2>/dev/null | wc -l)

if [ "$AUDIO_FILES" -eq 0 ]; then
    echo "❌ No voice messages found in recent attachments"
    exit 1
fi

echo ""
echo "✅ Found $AUDIO_FILES audio file(s)"
echo "📍 Location: $OUTPUT_DIR"
echo ""
echo "🎙️  Transcribing with Whisper (model: $WHISPER_MODEL)..."

# Transcribe with Whisper (find handles both m4a and caf)
find "$OUTPUT_DIR" \( -name "*.m4a" -o -name "*.caf" \) -print0 | xargs -0 -I {} whisper {} --model "$WHISPER_MODEL" --output_dir "$OUTPUT_DIR" --output_format txt 2>/dev/null || true

echo ""
echo "✅ Transcriptions complete!"
echo ""
echo "📝 Results:"
ls -lh "$OUTPUT_DIR"/*.txt 2>/dev/null || echo "No transcriptions yet"

echo ""
echo "💡 Transcription files (by message):"
for txt_file in "$OUTPUT_DIR"/*.txt; do
    if [ -f "$txt_file" ]; then
        echo ""
        echo "📄 $(basename "$txt_file")"
        echo "───────────────────────"
        cat "$txt_file"
    fi
done
