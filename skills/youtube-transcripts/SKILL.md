---
name: youtube-transcripts
description: Retrieve text transcripts from YouTube videos by URL or video ID. Useful for extracting and analyzing video content, summaries, quotes, and captions. Use when needing to: (1) Extract full transcript from a YouTube video, (2) Analyze or search video content without watching, (3) Convert video to text for further processing, or (4) Pull transcripts for research, documentation, or content repurposing.
---

# YouTube Transcripts

Fetch complete transcripts from YouTube videos without needing the YouTube API key. Works with public videos that have captions available.

## Quick Start

### Fetch transcript as plain text

```bash
./scripts/fetch_transcript.py "https://www.youtube.com/watch?v=v0kklCoPCQU"
```

### Fetch transcript as JSON (with timestamps)

```bash
./scripts/fetch_transcript.py "v0kklCoPCQU" --format json
```

### Supported input formats

- Full URL: `https://www.youtube.com/watch?v=v0kklCoPCQU`
- Short URL: `https://youtu.be/v0kklCoPCQU`
- Shorts: `https://www.youtube.com/shorts/v0kklCoPCQU`
- Video ID only: `v0kklCoPCQU`

## Output Formats

### Text (default)

Plain text transcript, one caption per line:

```
This is the first caption text
This is the second caption text
```

### JSON

Structured transcript with timestamps and duration:

```json
[
  {
    "text": "Caption text here",
    "start": 0.5,
    "duration": 5.2
  },
  ...
]
```

## Setup

### Automatic setup (recommended)

```bash
./scripts/setup.sh
```

This script handles virtual environment creation and dependency installation. It prefers `pipx` for isolated environments but falls back to `venv` if needed.

### Manual setup

```bash
# Option 1: Using pipx (isolated, global)
pipx install youtube-transcript-api

# Option 2: Using venv (project-local)
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Common Patterns

See `references/EXAMPLES.md` for detailed usage patterns, batch processing, error handling, and real-world use cases.

Quick reference:

- **Search transcript**: `./scripts/fetch_transcript.py "ID" | grep "keyword"`
- **Save to file**: `./scripts/fetch_transcript.py "ID" > transcript.txt`
- **Parse with jq**: `./scripts/fetch_transcript.py "ID" --format json | jq '.[] | .text'`
- **Batch fetch**: Loop with delays to avoid rate limiting

## Limitations

- **Captions required**: Video must have captions/transcripts available
- **Language**: Defaults to English; auto-falls back to available languages
- **No API key needed**: Uses public caption data (no authentication required)
- **Rate limits**: YouTube may throttle repeated requests; add delays between calls if fetching many videos

## Error Handling

- **"Invalid YouTube URL"** → Check that the URL or ID is correct
- **"Failed to fetch transcript"** → Video may not have captions or captions may be disabled
- **Module not found** → Run `pip install youtube-transcript-api`
