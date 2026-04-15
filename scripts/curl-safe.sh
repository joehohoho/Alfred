#!/bin/bash
# curl-safe.sh
# Wrapper around curl with consistent timeout, retry, and error handling
# Usage: curl_safe <url> [options...]
# Returns JSON on success, empty object {} on failure (safe for jq piping)

set -euo pipefail

URL="${1:-}"
TIMEOUT="${CURL_TIMEOUT:-5}"
RETRIES="${CURL_RETRIES:-2}"
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-3}"

if [[ -z "$URL" ]]; then
  echo '{"error":"curl_safe: no URL provided"}' >&2
  exit 1
fi

# Attempt curl with retry logic
ATTEMPT=0
while [[ $ATTEMPT -le $RETRIES ]]; do
  ATTEMPT=$((ATTEMPT + 1))
  
  RESPONSE=$(curl -s \
    --max-time "$TIMEOUT" \
    --connect-timeout "$CONNECT_TIMEOUT" \
    --retry 1 \
    --retry-delay 1 \
    "$URL" 2>/dev/null || true)
  
  # Check if response looks valid (not empty, contains JSON-like structure)
  if [[ -n "$RESPONSE" ]] && echo "$RESPONSE" | jq . > /dev/null 2>&1; then
    echo "$RESPONSE"
    exit 0
  fi
  
  if [[ $ATTEMPT -lt $((RETRIES + 1)) ]]; then
    sleep 1
  fi
done

# All retries exhausted: return safe default
echo '{"error":"connection_timeout","url":"'"$URL"'"}'
exit 0
