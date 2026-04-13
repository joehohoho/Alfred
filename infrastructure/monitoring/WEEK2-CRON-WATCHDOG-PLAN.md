# Week 2: Cron Watchdog Implementation Plan

**Date:** 2026-03-27 Evening (Friday)  
**Objective:** Auto-detect when critical crons disable and send one-click restart alerts  
**Effort Estimate:** 1.5 hours  
**ROI:** Saves 1.5-2 hours/week on manual cron restart monitoring  

---

## Problem Statement

**Current State:**
- Critical cron jobs periodically disable themselves (5+ incidents in past 2 weeks)
- No automated detection — Joe discovers them manually or via periodic review
- Manual fix: SSH → `crontab -e` → remove comment marker → save
- Time lost: 15-30 min per incident + 2-4 incidents per month = 1.5-2 hours/week

**Previous Incidents (from MEMORY.md):**
- Evening Routine — disabled Mar 12
- Daily Inquiry — disabled Mar 12, re-enabled, disabled Mar 15
- Daily Config & Memory Review — disabled Mar 12
- Joe Profile Reflection — disabled Mar 15-27
- Plus: nightly-git-commit timeout issues

**Root Causes:**
1. Cron jobs encounter errors (e.g., bad channel IDs in Slack delivery)
2. Cron scheduler disables the job to prevent spam
3. No notification of the disable event

---

## Solution: Cron Watchdog System

### Architecture

Three components working together:

#### 1. **Cron Job Monitor Script** (`scripts/cron-watchdog.js`)
- Runs every 5 minutes (faster detection than health monitor)
- Reads system crontab and Alfred's crontab files
- Detects new disabled jobs (commented out with `# ` prefix)
- Compares to previous state
- Records state in `memory/cron-state.json`
- Alerts on change

**What It Does:**
```
Read system crontabs → Compare to last known state → Detect changes → Log alert
```

#### 2. **Alert Handler** (`scripts/cron-watchdog-alert.sh`)
- Triggered by cron-watchdog.js when disabled job detected
- Posts to Discord with:
  - Job name + schedule
  - Why it was disabled (error history)
  - One-click restart command
  - Clear instructions for Joe

#### 3. **LaunchAgent Service** (`com.alfred.cron-watchdog`)
- Runs the monitor script every 5 minutes continuously
- Persists across restarts
- Allows manual wake via Command Center

### Implementation Tasks

| Task | Effort | Status |
|------|--------|--------|
| Create cron-watchdog.js | 0.6h | TBD |
| Create cron-watchdog-alert.sh | 0.3h | TBD |
| Create LaunchAgent plist | 0.2h | TBD |
| Test end-to-end | 0.3h | TBD |
| **TOTAL** | **1.4h** | TBD |

---

## Technical Design

### Cron State File Format (`memory/cron-state.json`)
```json
{
  "timestamp": "2026-03-27T23:50:00Z",
  "checkCount": 1,
  "crontabs": {
    "system": [
      {
        "id": "health-monitor",
        "schedule": "*/15 * * * *",
        "command": "bash ~/.openclaw/workspace/scripts/health-monitor-cron.sh",
        "enabled": true,
        "source": "/etc/cron.d/com.alfred.health-monitor"
      }
    ],
    "user": [
      {
        "id": "daily-inquiry",
        "schedule": "0 8 * * *",
        "command": "curl -s http://localhost:18788/api/cron/daily-inquiry",
        "enabled": false,
        "source": "user crontab",
        "disabledAt": "2026-03-15T14:30:00Z",
        "disabledBy": "cron scheduler (error limit exceeded)"
      }
    ]
  },
  "alerts": [
    {
      "timestamp": "2026-03-15T14:30:05Z",
      "severity": "CRITICAL",
      "jobId": "daily-inquiry",
      "action": "DISABLED",
      "reason": "Error rate exceeded (>3 failures in 24h)"
    }
  ]
}
```

### Alert Dispatch Format
When a job is disabled, alert goes to Discord:
```
🚨 CRON DISABLED: Daily Inquiry
Job: daily-inquiry
Schedule: Every day at 8:00 AM AST
Status: DISABLED

Likely cause: Previous error limit exceeded
Error history available in: ~/.openclaw/workspace/logs/cron-audit.log

Quick Restart (copy & paste):
bash ~/.openclaw/workspace/scripts/cron-enable.sh daily-inquiry

Full Status:
curl http://localhost:3099/health/crons
```

---

## Critical Jobs to Monitor

These are the jobs that most often fail and cause inefficiency:

1. **Evening Routine** (19:00 AST daily)
   - Cron issue pattern: Slack channel not found
   - Fix: Already updated to Discord (Mar 26)

2. **Daily Inquiry** (08:00 AST daily)
   - Cron issue pattern: Duplicate question dedup not working
   - Fix: Needs dedup logic (Week 3)

3. **Daily Config & Memory Review** (07:00 AST daily)
   - Cron issue pattern: Slack delivery timeout
   - Fix: Updated to Discord (Mar 26)

4. **Nightly Git Commit** (23:30 AST daily)
   - Cron issue pattern: Timeout after 5 min
   - Fix: Needs timeout increase or async dispatch

5. **Joe Profile Reflection** (21:00 AST on Fridays)
   - Cron issue pattern: Timeout + Slack routing
   - Fix: Updated to Discord, monitor for timeouts

6. **Weather Alerts** (06:00 & 18:00 AST daily)
   - Cron issue pattern: Rare, but when it fails it's disk space or network
   - Fix: Monitor disk usage in health system

---

## Integration with Health Monitoring (Week 1)

**Note:** The health monitor (Week 1) watches LaunchAgents. The cron watchdog (Week 2) watches cron jobs. They work together:

- **Health Monitor:** Alerts if service goes DOWN (no process)
- **Cron Watchdog:** Alerts if job is DISABLED (cron scheduler disabled it)

Example:
- If health monitor sees `work-executor` is down → trigger restart
- If cron watchdog sees `daily-inquiry` disabled → send alert + enable command

---

## Success Criteria

✅ Cron watchdog running every 5 minutes  
✅ Detects newly disabled jobs within 5 minutes  
✅ Alerts posted to Discord with job details  
✅ Alert includes one-click restart command  
✅ State persisted across restarts  
✅ No false positives on intentionally disabled jobs  

---

## Files to Create

```
scripts/cron-watchdog.js (0.6h)
scripts/cron-watchdog-alert.sh (0.3h)
scripts/cron-enable.sh (helper to re-enable jobs)
Library/LaunchAgents/com.alfred.cron-watchdog.plist (0.2h)
memory/cron-state.json (auto-generated)
memory/cron-audit.log (auto-generated)
logs/cron-watchdog.log (auto-generated)
WEEK2-CRON-WATCHDOG-PROGRESS.md (documentation)
```

---

## Timeline

- **Start:** Now (23:50 ADT, Friday evening)
- **Cron-watchdog.js:** ~30 min
- **Alert handler:** ~15 min
- **LaunchAgent:** ~10 min
- **Testing:** ~15 min
- **Documentation:** ~15 min
- **Finish:** ~24 min later (00:14 ADT, if unblocked)

---

## Post-Implementation Validation

After deployment:
1. Manually disable a cron job: comment it out in crontab
2. Wait up to 5 minutes for watchdog to detect
3. Verify Discord alert received
4. Test one-click restart command
5. Verify job re-enabled in crontab

---

## Week 2 vs. Original Roadmap

| Item | Plan | Actual | Notes |
|------|------|--------|-------|
| Start | Week 2 (Apr 1-7) | Week 1 (now, Mar 27) | Accelerated — HAL is healthy |
| Effort | 1.5h | 1.4h | On track |
| ROI | 1.5-2h/week | 1.5-2h/week | Unchanged |
| Blocker | None | None | Ready to execute |

---

## Ready for Implementation

All prerequisites met:
- ✅ Health monitoring operational (Week 1)
- ✅ HAL diagnostics complete
- ✅ Architecture designed
- ✅ Success criteria defined
- ✅ File structure prepared

**Status:** Ready to start implementation NOW.

---

Generated: 2026-03-27 23:50 ADT  
Next: Implement cron-watchdog.js
