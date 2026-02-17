#!/usr/bin/env python3
"""
Fetch YouTube video transcripts.

Usage:
  python fetch_transcript.py <video_url_or_id> [--format json|text]
  
Examples:
  python fetch_transcript.py "https://www.youtube.com/watch?v=v0kklCoPCQU"
  python fetch_transcript.py "v0kklCoPCQU" --format json
"""

import sys
import json
import re
from urllib.parse import urlparse, parse_qs

try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ImportError:
    print("ERROR: youtube-transcript-api not installed. Install with: pip install youtube-transcript-api")
    sys.exit(1)


def extract_video_id(url_or_id):
    """Extract video ID from YouTube URL or return if already an ID."""
    # Already a video ID (11 chars, alphanumeric + underscore/hyphen)
    if re.match(r'^[a-zA-Z0-9_-]{11}$', url_or_id):
        return url_or_id
    
    # Parse URL
    try:
        parsed = urlparse(url_or_id)
        
        # youtube.com/watch?v=...
        if parsed.netloc in ('www.youtube.com', 'youtube.com'):
            video_id = parse_qs(parsed.query).get('v', [None])[0]
            if video_id:
                return video_id
        
        # youtu.be/...
        elif parsed.netloc in ('youtu.be', 'www.youtu.be'):
            return parsed.path.lstrip('/')
        
        # youtube.com/shorts/...
        elif 'shorts' in parsed.path:
            return parsed.path.split('/')[-1]
    except Exception:
        pass
    
    raise ValueError(f"Invalid YouTube URL or video ID: {url_or_id}")


def fetch_transcript(video_id, languages=None):
    """Fetch transcript for a YouTube video."""
    try:
        if languages is None:
            languages = ['en']
        
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
        return transcript
    except Exception as e:
        # Try alternative languages if English not available
        if languages == ['en']:
            try:
                transcript = YouTubeTranscriptApi.get_transcript(video_id)
                return transcript
            except Exception:
                pass
        raise e


def format_text(transcript):
    """Format transcript as plain text."""
    return '\n'.join([entry['text'] for entry in transcript])


def format_json(transcript):
    """Format transcript as JSON."""
    return json.dumps(transcript, indent=2)


def main():
    if len(sys.argv) < 2:
        print("Usage: fetch_transcript.py <video_url_or_id> [--format json|text]")
        sys.exit(1)
    
    video_url_or_id = sys.argv[1]
    format_type = 'text'
    
    # Parse format flag
    if '--format' in sys.argv:
        idx = sys.argv.index('--format')
        if idx + 1 < len(sys.argv):
            format_type = sys.argv[idx + 1]
    
    try:
        # Extract video ID
        video_id = extract_video_id(video_url_or_id)
        
        # Fetch transcript
        transcript = fetch_transcript(video_id)
        
        # Format output
        if format_type == 'json':
            output = format_json(transcript)
        else:
            output = format_text(transcript)
        
        print(output)
        
    except ValueError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Failed to fetch transcript: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
