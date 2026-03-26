# Cron Delivery Configuration Guide

## Problem Identified (2026-03-26)

Multiple cron jobs were failing with `Unknown target` errors when attempting to post to Discord:
- `Error: Unknown target "dailyconfig" for Discord`
- `Error: Unknown target "C0AEE0PLKB4" for Discord`

**Root cause:** Jobs were configured with:
1. **Slack channel IDs** (e.g., `C0AEE0PLKB4`) instead of Discord channel IDs — Slack is deprecated
2. **Friendly channel names** (e.g., `"dailyconfig"`) instead of numeric Discord IDs
3. **Workaround:** Changed delivery mode to `"none"` to silence errors (not a real fix)

## Solution Implemented

### 1. Discord Channel ID Mapping
Created `scripts/discord-channel-map.sh` to centralize Discord channel references:

```bash
bash scripts/discord-channel-map.sh list       # Show all channel mappings
bash scripts/discord-channel-map.sh resolve "dailyconfig"  # Get channel ID
```

**Current mappings:**
- `dailyconfig` → `1476598143016505446`
- `evening-routine` → `1476571891043926036`
- `hal-completions` → `1476450612634976400`
- `system-health` → `1476592867865657599`
- `general` → `1476590410557034546`
- `maintenance` → `1484566371412213934`

### 2. Cron Delivery Auditor
Created `scripts/cron-delivery-fixer.sh` to diagnose all cron delivery channels:

```bash
bash scripts/cron-delivery-fixer.sh --check   # Report issues only
bash scripts/cron-delivery-fixer.sh --fix     # Fix issues (future)
```

## How to Fix Broken Cron Jobs

### Manual Process (for now)

1. Identify broken jobs (run the auditor above)
2. For each broken job in `~/.openclaw/cron/jobs.json`:
   - Replace `delivery.to: "C0AEE0PLKB4"` with the numeric Discord channel ID
   - Example: `delivery.to: "1476598143016505446"` (for #dailyconfig)
   - Remove `delivery.mode: "none"` workaround if present
   - Set appropriate `delivery.mode`: `"announce"` (post to channel) or `"webhook"` (POST request)

3. Restart cron:
   ```bash
   cron action=list    # Verify new config
   ```

### Configuration Template

```json
{
  "id": "job-id",
  "name": "Job Name",
  "enabled": true,
  "delivery": {
    "mode": "announce",           // or "webhook", or "none"
    "channel": "discord",          // always "discord"
    "to": "1476598143016505446",   // numeric Discord channel ID
    "bestEffort": true             // try 3x before giving up
  }
}
```

## Known Issues

- **6 cron jobs with Slack channel IDs:** These need channel ID updates
- **1 webhook job:** Uses localhost URL (not Discord format) — correct for webhook delivery
- **Jobs auto-disabled:** Were disabled due to repeated failures; need re-enabling after channel fix

## Prevention

For future cron jobs:
1. Always use **numeric Discord channel IDs** (18-20 digits)
2. Use `scripts/discord-channel-map.sh resolve "channel_name"` to look up IDs
3. Test delivery with a test job before enabling in production
4. Run `cron-delivery-fixer.sh --check` weekly to catch regressions

## Testing

Once fixes are applied:
```bash
# Verify cron syntax is valid
cron action=list

# Run a test job with announce delivery
cron action=run jobId="test-discord-announce"
```
