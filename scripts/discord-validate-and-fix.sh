#!/bin/bash
# discord-validate-and-fix.sh
# Validates and auto-fixes Discord channel references in message tool calls
# Run this before executing any code that might post to Discord
# Usage: source this script, then call validate_discord_reference "dailyconfig"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load channel mapping
if [[ ! -f "$SCRIPT_DIR/discord-channel-map.sh" ]]; then
    echo "ERROR: discord-channel-map.sh not found" >&2
    exit 1
fi
source "$SCRIPT_DIR/discord-channel-map.sh"

# Function to validate and fix a Discord channel reference
# Input: channel name, ID, or # prefixed name
# Output: numeric channel ID, or error
validate_discord_reference() {
    local ref="$1"
    
    if [[ -z "$ref" ]]; then
        echo "ERROR: No channel reference provided" >&2
        return 1
    fi
    
    # If already a numeric ID, validate it exists
    if [[ "$ref" =~ ^[0-9]+$ ]]; then
        # For now, just return it. Full validation would require Discord API
        echo "$ref"
        return 0
    fi
    
    # Remove leading # if present
    ref="${ref#\#}"
    
    # Try to resolve friendly name
    local result
    result=$(resolve_discord_channel "$ref" 2>/dev/null || echo "")
    
    if [[ -n "$result" && "$result" != "null" ]]; then
        echo "$result"
        return 0
    else
        echo "ERROR: Unknown Discord channel: $ref" >&2
        echo "Available channels:" >&2
        bash "$SCRIPT_DIR/discord-channel-map.sh" list >&2
        return 1
    fi
}

# Function to validate a message tool call
# Checks that the 'to' parameter is a valid channel ID
validate_message_call() {
    local to_param="$1"
    
    if [[ -z "$to_param" ]]; then
        echo "ERROR: No 'to' parameter provided" >&2
        return 1
    fi
    
    # Try to convert/validate
    local validated
    validated=$(validate_discord_reference "$to_param" 2>/dev/null || echo "INVALID")
    
    if [[ "$validated" == "INVALID" ]]; then
        echo "ERROR: Invalid Discord channel reference in message tool call: $to_param" >&2
        return 1
    fi
    
    echo "$validated"
    return 0
}

# Export functions for use in subshells
export -f validate_discord_reference
export -f validate_message_call
export -f resolve_discord_channel
export CHANNEL_MAP
