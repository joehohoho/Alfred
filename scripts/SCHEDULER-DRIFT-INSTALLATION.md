# Installing the Scheduler Drift Auditor

## Quick Start

The auditor is ready to use:

```bash
bash ~/.openclaw/workspace/scripts/scheduler-drift-auditor.sh
```

## Nightly Automation

To run the auditor automatically every night, add to your crontab:

```bash
crontab -e
```

Add this line:
```cron
0 2 * * * bash ~/.openclaw/workspace/scripts/scheduler-drift-auditor.sh >> ~/.openclaw/logs/scheduler-auditor.log 2>&1
```

This runs the auditor every night at 2 AM AST and logs output.

## LaunchAgent Automation (Alternative)

If you prefer LaunchAgent over cron, create:

**File:** `~/Library/LaunchAgents/com.alfred.scheduler-drift-auditor.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.alfred.scheduler-drift-auditor</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>/Users/hopenclaw/.openclaw/workspace/scripts/scheduler-drift-auditor.sh</string>
  </array>
  <key>StartInterval</key>
  <integer>86400</integer>
  <key>StandardOutPath</key>
  <string>/Users/hopenclaw/.openclaw/logs/scheduler-auditor.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/hopenclaw/.openclaw/logs/scheduler-auditor-error.log</string>
  <key>KeepAlive</key>
  <false/>
</dict>
</plist>
```

Then load it:
```bash
launchctl load ~/Library/LaunchAgents/com.alfred.scheduler-drift-auditor.plist
launchctl start com.alfred.scheduler-drift-auditor
```

## Discord Integration (Optional)

To post audit results to Discord when conflicts are found:

Create a wrapper script: `scripts/scheduler-auditor-with-discord.sh`

```bash
#!/bin/bash
# Run auditor and post to Discord if conflicts found

REPORT=$(bash ~/.openclaw/workspace/scripts/scheduler-drift-auditor.sh 2>&1 | tee /tmp/audit.txt)

if echo "$REPORT" | grep -q "Scheduler drift detected"; then
  # Extract conflict summary
  CONFLICTS=$(echo "$REPORT" | grep -A5 "Conflicts:" | tail -4)
  
  # Post to Discord #infrastructure channel
  curl -X POST -H 'Content-Type: application/json' \
    -d "{\"content\":\"⚠️ **Scheduler Drift Detected**\n\`\`\`\n${CONFLICTS}\n\`\`\`\nFull report: \`~/.openclaw/logs/scheduler-audit-*.json\`\"}" \
    "$DISCORD_WEBHOOK_INFRASTRUCTURE"
fi
```

Make it executable:
```bash
chmod +x ~/.openclaw/workspace/scripts/scheduler-auditor-with-discord.sh
```

Then use this in your crontab instead:
```cron
0 2 * * * bash ~/.openclaw/workspace/scripts/scheduler-auditor-with-discord.sh >> ~/.openclaw/logs/scheduler-auditor.log 2>&1
```

## Configuration

### Allowlist File

By default, the auditor looks for:
```
~/.openclaw/workspace/scheduler-allowlist.json
```

This file marks intentional redundancy. Example:
```json
{
  "intentional_duplicates": [
    {
      "script": "weather-alerts.sh",
      "reason": "Dual monitoring windows by design",
      "approved_by": "Joe",
      "approved_date": "2026-03-25"
    }
  ]
}
```

## Verification

Verify the auditor is installed and working:

```bash
# Should output audit summary
bash ~/.openclaw/workspace/scripts/scheduler-drift-auditor.sh

# Should show recent audit reports
ls -lh ~/.openclaw/logs/scheduler-audit-*.json | tail -5

# Should show execution if running as LaunchAgent
launchctl list | grep scheduler-drift
```

## Troubleshooting

### LaunchAgent Not Starting
```bash
# Check for errors
launchctl list com.alfred.scheduler-drift-auditor

# Check logs
tail -50 ~/.openclaw/logs/scheduler-auditor-error.log
```

### Crontab Not Running
```bash
# Verify crontab entry exists
crontab -l | grep scheduler-drift

# Check mail for cron errors
cat /var/mail/$USER | tail -50
```

### Too Many False Positives
1. Run auditor in verbose mode: `VERBOSE=true bash ~/.openclaw/workspace/scripts/scheduler-drift-auditor.sh`
2. Review output
3. Add intentional jobs to `scheduler-allowlist.json`
4. Re-run to verify

## Next Steps

1. Run the auditor once manually to verify it works
2. Review the generated report in `~/.openclaw/logs/`
3. Fix any real conflicts (e.g., remove the duplicate crontab line)
4. Add intentional overlaps to the allowlist
5. Set up nightly automation (cron or LaunchAgent)
6. (Optional) Add Discord integration for alerts

See `SCHEDULER-DRIFT-AUDITOR-README.md` for full documentation.
