# Discord Channel Routing Guide

## Error Pattern (2026-04-04)
```
[tools] message failed: Unknown target "dailyconfig" for Discord
Hint: <channelId|user:ID|channel:ID>
```

## Root Cause
When isolated agents spawned by cron jobs call the `message` tool, they use friendly channel names like `"dailyconfig"` instead of numeric Discord channel IDs.

## Solution

### For Cron Job Payloads
If your cron job payload includes a `message` call, use numeric channel IDs:

**WRONG:**
```bash
message(action=send, channel=discord, to="dailyconfig", message="...")
```

**CORRECT:**
```bash
message(action=send, channel=discord, to="1476598143016505446", message="...")
```

### For Shell Scripts
Source the channel ID mapping at the top of your script:
```bash
source ~/.openclaw/workspace/scripts/channel-ids.sh
message(action=send, channel=discord, to="$DISCORD_DAILYCONFIG", message="...")
```

### For Cron Job Output Delivery
If you want the cron job OUTPUT posted to Discord (recommended approach):

1. **Let the cron job delivery system handle it** — set `delivery.mode="announce"` and `delivery.to="<numeric-id>"` in the job JSON (NOT in the payload)
2. **Agent should NOT call message independently** — just output normal text, the job will post it
3. **Example:**
   ```json
   {
     "name": "My Job",
     "sessionTarget": "isolated",
     "payload": { "kind": "agentTurn", "message": "Do work and output results" },
     "delivery": {
       "mode": "announce",
       "channel": "discord",
       "to": "1476598143016505446",
       "bestEffort": true
     }
   }
   ```

## Discord Channel IDs (Verified)
- `#dailyconfig`: `1476598143016505446`
- `#general`: `1476571891043926036`
- `#alerts`: `1476592867865657599`
- `#devops`: `1484566371412213934`

See `channel-ids.sh` for shell-friendly exports.

## Related Scripts
- `cron-preflight-validator.sh` — Validates cron job delivery configs
- `fix-cron-delivery-routing.sh` — Checks for and reports issues
