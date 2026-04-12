# Cron Registry & Monitoring — Detecting Dead Reminders & Script Drift

**Purpose:** Central registry of all scheduled tasks (crons, LaunchAgents) with automatic detection of dead reminders, missing scripts, and state drift.

**Created:** 2026-04-12  
**Status:** ✅ LIVE

---

## Overview

### Problem Solved

Previously:
- ❌ Cron jobs could fail silently with no tracking
- ❌ No way to detect if a job hadn't run in hours/days
- ❌ Scripts could go missing or become unexecutable without notice
- ❌ New LaunchAgents could be added without registration
- ❌ No centralized audit trail of what should be running vs. what actually is

Now:
- ✅ Single source of truth: `.hal-alfred-tracking/cron-registry.json`
- ✅ Automatic detection of missing/stale crons
- ✅ Script validation (exists, executable, readable)
- ✅ Auto-recovery of common drift scenarios
- ✅ Comprehensive audit logging
- ✅ Discord alerts for critical issues

---

## Files

### 1. **Cron Registry** (Source of Truth)
**Location:** `.hal-alfred-tracking/cron-registry.json`

**What it contains:**
- List of all scheduled tasks (crons + LaunchAgents)
- Schedule info (interval, timing, timezone)
- Backing script path
- Last run time + status
- Failure counts
- Alert thresholds + contact info

**Format:**
```json
{
  "version": "1.0.0",
  "crons": [
    {
      "id": "refresh-open-loops",
      "name": "OPEN-LOOPS.md Refresh",
      "type": "cron",
      "schedule": "0 8 * * *",
      "script": "scripts/refresh-open-loops.sh",
      "lastRun": "2026-04-12T19:48:39Z",
      "lastStatus": "success",
      "consecutiveFailures": 0
    }
  ]
}
```

### 2. **Manifest Checker** (Validation)
**Location:** `scripts/cron-manifest-check.sh`

**What it does:**
1. Validates registry JSON syntax
2. Compares registered vs. actual LaunchAgents
3. Detects missing agents (should be running but aren't)
4. Detects extra agents (running but not in registry)
5. Validates backing scripts exist + are executable
6. Checks for stale runs (critical crons not run in >1 hour)
7. Counts consecutive failures

**Usage:**
```bash
# Quick check
bash scripts/cron-manifest-check.sh

# Verbose mode
bash scripts/cron-manifest-check.sh --verbose

# With auto-fix (see recovery script)
bash scripts/cron-manifest-check.sh --fix
```

**Output:**
- ✅ All crons healthy
- ⚠️ Issues found (lists missing agents, stale crons, etc.)

**Audit Log:** `.hal-alfred-tracking/cron-manifest-audit.log`

### 3. **Recovery Script** (Auto-Fix)
**Location:** `scripts/cron-recovery.sh`

**What it fixes automatically:**
1. Restarts missing LaunchAgents
2. Validates + repairs plist files
3. Makes scripts executable if they're not
4. Loads unloaded LaunchAgents

**Usage:**
```bash
# Dry-run (show issues, don't fix)
bash scripts/cron-recovery.sh

# Auto-fix mode
bash scripts/cron-recovery.sh --auto-fix

# Verbose mode
bash scripts/cron-recovery.sh --auto-fix --verbose
```

**Output:**
```
  ✅ Recovered: 2
  ❌ Failed: 1
```

**Audit Log:** `.hal-alfred-tracking/cron-recovery-audit.log`

---

## Monitoring & Alerts

### Alert Types

| Type | Severity | Trigger | Action |
|------|----------|---------|--------|
| Dead Reminder | 🚨 Critical | Critical cron not run in >1 hour | Page immediately + auto-attempt recovery |
| Script Missing | 🚨 Critical | Backing script not found | Fail alert + manual intervention needed |
| Plist Invalid | ⚠️ Warning | LaunchAgent plist is malformed | Backup + alert for review |
| Stale Runs | ⚠️ Warning | Cron hasn't run in >24h | Investigate why |
| Failure Threshold | 🚨 Critical | Cron fails 3+ times | Auto-disable + alert |
| Drift Detected | ⚠️ Warning | Actual state ≠ registry | Sync + alert |

### Alert Delivery

- **Discord:** Via `DISCORD_WEBHOOK_ALERTS` (if configured)
- **Audit Log:** Always logged to `.hal-alfred-tracking/cron-*-audit.log`
- **Local:** Script output when run manually

### Sample Alert
```
🚨 **Cron Manifest Check**: LaunchAgent **com.alfred.daily-inquiry** is missing/not running
⚠️ **Cron Recovery**: Failed to restart LaunchAgent **com.alfred.weather-alerts** (plist may be invalid)
✅ **Cron Recovery**: Restarted missing LaunchAgent **com.alfred.sentinel**
```

---

## Registry Maintenance

### Adding a New Cron

1. **Create the script** at `scripts/my-new-cron.sh`
2. **Make it executable:** `chmod +x scripts/my-new-cron.sh`
3. **Add to registry** (`.hal-alfred-tracking/cron-registry.json`):

```json
{
  "id": "my-new-cron",
  "name": "My New Cron Job",
  "type": "cron",
  "schedule": "0 9 * * *",
  "tz": "America/Moncton",
  "script": "scripts/my-new-cron.sh",
  "description": "What this cron does",
  "expectedRunTime": "1-2 minutes",
  "critical": false,
  "owner": "alfred",
  "notifyOn": ["failure"],
  "lastRun": null,
  "lastStatus": "unknown",
  "errorCount": 0,
  "consecutiveFailures": 0
}
```

4. **Validate:** `bash scripts/cron-manifest-check.sh --verbose`
5. **Commit:** `git add -A && git commit -m "feat: add my-new-cron job"`

### Updating Run Status

When a cron completes, update its entry in the registry:

```bash
# After successful run
jq '.crons[] |= if .id == "refresh-open-loops" then .lastRun = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" | .lastStatus = "success" | .consecutiveFailures = 0 else . end' \
  .hal-alfred-tracking/cron-registry.json > /tmp/registry.json && \
  mv /tmp/registry.json .hal-alfred-tracking/cron-registry.json
```

Or use a helper function in your cron script:

```bash
update_cron_status() {
  local cron_id="$1"
  local status="$2"
  
  jq --arg id "$cron_id" --arg status "$status" \
    '.crons[] |= if .id == $id then .lastRun = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'" | .lastStatus = $status else . end' \
    .hal-alfred-tracking/cron-registry.json > /tmp/registry.json && \
    mv /tmp/registry.json .hal-alfred-tracking/cron-registry.json
}

# Usage in script
update_cron_status "refresh-open-loops" "success"
```

---

## Monitoring Integration

### Sentinel Integration
The `sentinel.sh` script monitors cron health as part of its 9-component check:

```bash
# Runs every 5 minutes
# Checks: registry validity, missing agents, stale runs, failures
bash scripts/sentinel.sh
```

### Manual Checks

**Quick health check:**
```bash
bash scripts/cron-manifest-check.sh
```

**Full diagnostic:**
```bash
bash scripts/cron-manifest-check.sh --verbose
```

**Auto-recovery attempt:**
```bash
bash scripts/cron-recovery.sh --auto-fix --verbose
```

---

## Common Issues & Solutions

### Issue 1: "LaunchAgent not running"

**Diagnosis:**
```bash
bash scripts/cron-manifest-check.sh --verbose
```

**Fix:**
```bash
# Auto-fix
bash scripts/cron-recovery.sh --auto-fix

# Or manual restart
launchctl start com.alfred.my-agent
```

### Issue 2: "Script not found"

**Diagnosis:** Script was deleted or moved

**Fix:**
```bash
# Restore from git
git checkout scripts/my-missing-script.sh

# Or create new one
touch scripts/my-script.sh && chmod +x scripts/my-script.sh
```

### Issue 3: "Plist is invalid"

**Diagnosis:** LaunchAgent plist file is malformed

**Fix:**
```bash
# Check validity
plutil -lint ~/Library/LaunchAgents/com.alfred.my-agent.plist

# If broken, restore from git
git checkout ~/Library/LaunchAgents/com.alfred.my-agent.plist

# Reload
launchctl unload ~/Library/LaunchAgents/com.alfred.my-agent.plist
launchctl load ~/Library/LaunchAgents/com.alfred.my-agent.plist
```

### Issue 4: "Cron stale (not run in >1h)"

**Diagnosis:** Critical cron hasn't run

**Causes:**
- LaunchAgent crashed
- System was asleep during scheduled time
- Script is hanging/blocking
- Plist has wrong schedule

**Fix:**
```bash
# Force run
bash scripts/my-cron-script.sh

# Check for errors in the script
tail -100 ~/.openclaw/logs/my-cron-script.log

# Restart agent
launchctl stop com.alfred.my-agent
launchctl start com.alfred.my-agent

# Monitor next run
bash scripts/cron-manifest-check.sh --verbose
```

---

## Audit Logs

### Log Locations

| Log | Purpose |
|-----|---------|
| `.hal-alfred-tracking/cron-registry.json` | Registry state |
| `.hal-alfred-tracking/cron-manifest-audit.log` | Validation checks |
| `.hal-alfred-tracking/cron-recovery-audit.log` | Auto-fix attempts |
| `.hal-alfred-tracking/sentinel-state.json` | Sentinel component health |

### Viewing Logs

```bash
# Last 20 manifest checks
tail -20 .hal-alfred-tracking/cron-manifest-audit.log

# Last 20 recovery attempts
tail -20 .hal-alfred-tracking/cron-recovery-audit.log

# Search for failures
grep "ERROR\|FAILURE" .hal-alfred-tracking/cron-manifest-audit.log
```

---

## Testing

### Test 1: Validate Registry Format

```bash
jq -e '.crons | length > 0' .hal-alfred-tracking/cron-registry.json && echo "✅ Registry is valid"
```

### Test 2: Run Manifest Check

```bash
bash scripts/cron-manifest-check.sh
# Should output: ✅ All crons healthy
```

### Test 3: Dry-Run Recovery

```bash
bash scripts/cron-recovery.sh --verbose
# Shows issues without fixing
```

### Test 4: Auto-Fix & Verify

```bash
bash scripts/cron-recovery.sh --auto-fix --verbose
bash scripts/cron-manifest-check.sh --verbose
```

---

## Future Enhancements

- [ ] Automatic registry updates from LaunchAgent plists
- [ ] Historical trends (uptime, failure rates over time)
- [ ] Scheduling optimization (redistribute load across time)
- [ ] Integration with external monitoring (Datadog, New Relic)
- [ ] Notification customization per cron
- [ ] Auto-disable repeatedly failing crons with alert

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `bash scripts/cron-manifest-check.sh` | Quick health check |
| `bash scripts/cron-manifest-check.sh --verbose` | Detailed diagnostics |
| `bash scripts/cron-recovery.sh --auto-fix` | Auto-fix common issues |
| `tail -f .hal-alfred-tracking/cron-manifest-audit.log` | Watch for issues |
| `jq '.crons[] \| {id, lastStatus, consecutiveFailures}' .hal-alfred-tracking/cron-registry.json` | View cron statuses |

---

**Status:** ✅ LIVE & OPERATIONAL  
**Last Updated:** 2026-04-12 19:52 ADT  
**Owner:** Alfred
