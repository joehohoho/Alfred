#!/bin/bash
# discord-channel-map.sh - Map friendly Discord channel names to real IDs
# Usage: bash discord-channel-map.sh resolve "channel_name"
# Or:    bash discord-channel-map.sh list

# JSON mapping stored inline
CHANNEL_MAP='{
  "dailyconfig": "1476598143016505446",
  "evening-routine": "1476571891043926036",
  "hal-completions": "1476450612634976400",
  "alfred-hal-sync": "1476641676821794958",
  "system-health": "1476592867865657599",
  "general": "1476590410557034546",
  "maintenance": "1484566371412213934"
}'

resolve_discord_channel() {
    local channel_name="$1"
    
    if [[ -z "$channel_name" ]]; then
        echo "ERROR: No channel name provided" >&2
        return 1
    fi
    
    # Remove leading # if present
    channel_name="${channel_name#\#}"
    
    local result
    result=$(echo "$CHANNEL_MAP" | jq -r ".\"$channel_name\" // empty" 2>/dev/null)
    
    if [[ -n "$result" && "$result" != "null" ]]; then
        echo "$result"
        return 0
    else
        echo "ERROR: Unknown channel '$channel_name'" >&2
        return 1
    fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    action="$1"
    if [[ "$action" == "resolve" ]]; then
        resolve_discord_channel "$2"
    elif [[ "$action" == "list" ]]; then
        echo "Discord Channel Mapping:"
        echo "$CHANNEL_MAP" | jq -r 'to_entries[] | "  \(.key | length as $len | @text) → \(.value)"' | \
            awk '{printf "  %-20s %s\n", $1, $2}'
    else
        echo "Usage: $0 {resolve|list} [channel_name]"
        exit 1
    fi
fi
