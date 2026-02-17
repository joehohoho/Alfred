# YouTube Transcripts Examples

## Basic Usage

### Fetch transcript from a URL

```bash
./scripts/fetch_transcript.py "https://www.youtube.com/watch?v=v0kklCoPCQU"
```

Output:
```
5 Tips to Make OpenClaw 10X Better (EASY)
Welcome to the channel
In this video I'll show you...
[...full transcript...]
```

### Fetch with timestamps

```bash
./scripts/fetch_transcript.py "v0kklCoPCQU" --format json
```

Output:
```json
[
  {
    "text": "5 Tips to Make OpenClaw 10X Better (EASY)",
    "start": 0.0,
    "duration": 2.5
  },
  {
    "text": "Welcome to the channel",
    "start": 2.5,
    "duration": 3.2
  }
]
```

## Real-World Patterns

### Extract and search for keywords

```bash
./scripts/fetch_transcript.py "v0kklCoPCQU" | grep -i "skill\|automation\|improvement"
```

### Save transcript to a file

```bash
./scripts/fetch_transcript.py "v0kklCoPCQU" > transcript.txt
```

### Extract speaker segments (assuming speakers are marked)

```bash
./scripts/fetch_transcript.py "v0kklCoPCQU" | head -100
```

### Find all timestamps with JSON output

```bash
./scripts/fetch_transcript.py "v0kklCoPCQU" --format json | \
  python3 -c "import sys, json; \
  data = json.load(sys.stdin); \
  [print(f'{int(x[\"start\"])}s: {x[\"text\"]}') for x in data]"
```

### Batch process multiple videos

```bash
for vid in "v0kklCoPCQU" "TbdAgINKrds" "ryhzpLe9O_U"; do
  echo "=== Video: $vid ==="
  ./scripts/fetch_transcript.py "$vid" | head -50
  echo ""
done
```

### Find transcript length

```bash
./scripts/fetch_transcript.py "v0kklCoPCQU" | wc -w
# Output: word count
```

### Extract unique words (requires additional tools)

```bash
./scripts/fetch_transcript.py "v0kklCoPCQU" | \
  tr ' ' '\n' | tr '[:upper:]' '[:lower:]' | sort -u > words.txt
```

## Use Cases for OpenClaw

### 1. Analyze OpenClaw tutorial videos for patterns

```python
# Within an OpenClaw agent:
# Fetch transcripts from multiple OpenClaw tutorial videos
# Search for repeated advice or techniques
# Compile recommendations for improvement
```

### 2. Extract code snippets from video transcripts

```python
# Fetch transcript
# Search for code blocks or technical patterns
# Validate that code is properly explained
```

### 3. Build a knowledge base from YouTube content

```python
# Batch fetch 10+ OpenClaw tutorial videos
# Parse transcripts for actionable tips
# Index by topic/skill for quick lookup
```

### 4. Content repurposing

```python
# Fetch video transcript
# Convert to blog post format
# Identify key takeaways
# Generate social media snippets
```

## Error Scenarios

### Video not found

```
ERROR: Failed to fetch transcript: ...
```

Solution: Verify video ID is correct and video is public.

### No captions available

```
ERROR: Failed to fetch transcript: Could not retrieve a transcript...
```

Solution: Check if video has captions enabled on YouTube.

### Rate limiting

If fetching many videos quickly, YouTube may throttle requests. Solution: Add delays between calls:

```bash
for vid in video1 video2 video3; do
  ./scripts/fetch_transcript.py "$vid"
  sleep 2  # 2-second delay
done
```
