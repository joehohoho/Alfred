#!/bin/bash
# discord-channel-resolver.sh - Fix Discord channel references in message tool calls
# This script patches the message tool calls to convert friendly names to numeric IDs

set -e

CHANNEL_MAP='{
  "dailyconfig": "1476943999515496530",
  "config-and-memory-review": "1476943999515496530",
  "evening-routine": "1476571891043926036",
  "hal-completions": "1476450612634976400",
  "alfred-hal-sync": "1476641676821794958",
  "system-health": "1476592867865657599",
  "general": "1476590410557034546",
  "maintenance": "1484566371412213934"
}'

# Function to resolve a friendly channel name to ID
resolve_channel() {
    local name="$1"
    # Remove # if present
    name="${name#\#}"
    
    # Look up in map
    local id
    id=$(echo "$CHANNEL_MAP" | jq -r ".\"$name\" // empty" 2>/dev/null)
    
    if [[ -n "$id" ]]; then
        echo "$id"
        return 0
    else
        # Not found in map, return original (might be numeric already)
        echo "$name"
        return 1
    fi
}

# If called as a function, return the resolver
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [[ $# -eq 0 ]]; then
        echo "Usage: $0 resolve <channel_name>"
        echo "       $0 list"
        exit 1
    fi
    
    action="$1"
    if [[ "$action" == "resolve" ]]; then
        resolve_channel "$2"
    elif [[ "$action" == "list" ]]; then
        echo "Discord Channel Mapping:"
        echo "$CHANNEL_MAP" | jq -r 'to_entries[] | "  \(.key) → \(.value)"'
    else
        echo "Unknown action: $action"
        exit 1
    fi
fi
