# Idle Activity Discord Posting Guide

## Problem

Idle activities that try to post to Discord with friendly channel names fail:
```
message failed: Unknown target "dailyconfig" for Discord.
Hint: <channelId|user:ID|channel:ID>
```

## Root Cause

The OpenClaw `message` tool's Discord backend **only accepts numeric channel IDs**, not friendly names like `"dailyconfig"` or `"#general"`.

## Solution

When idle activities post to Discord, **always use numeric channel IDs**:

### Verified Channel ID Mapping
| Channel | ID |
|---------|-----|
| #dailyconfig | 1476598143016505446 |
| #general | 1476571891043926036 |
| #alerts | 1476592867865657599 |
| #devops | 1484566371412213934 |

### Correct Format (in idle activity instructions)
```json
{
  "action": "send",
  "channel": "discord",
  "to": "1476598143016505446",
  "message": "Your message here"
}
```

### INCORRECT Formats (will fail)
- ❌ `"to": "dailyconfig"` — friendly name
- ❌ `"to": "#dailyconfig"` — friendly name with #
- ❌ `"target": "dailyconfig"` — wrong parameter name (use `to`)

## For Script Developers

If you're building shell scripts for idle activities:

```bash
# Load channel IDs
source ~/.openclaw/workspace/scripts/channel-ids.sh

# Use the environment variables
CHANNEL_ID="$DISCORD_DAILYCONFIG"  # 1476598143016505446

# Or resolve a friendly name to ID
CHANNEL_ID=$(bash ~/.openclaw/workspace/scripts/channel-ids.sh resolve "dailyconfig")

# Then call message tool with numeric ID
message action=send channel=discord to="$CHANNEL_ID" message="Your message"
```

## Testing

Verify your Discord channel IDs are correct:
```bash
bash ~/.openclaw/workspace/scripts/fix-idle-discord-posts.sh
```

This displays the verified mapping and tests resolution.
