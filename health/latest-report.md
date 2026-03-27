# System Health Report

**Generated:** 3/27/2026, 7:41:25 PM AST
**Status:** CRITICAL

## Summary

| Metric | Value |
|--------|-------|
| Running Agents | 2/21 |
| Down Agents | 5 |
| Critical Down | 2 |
| HAL Status | OFFLINE |
| Gateway Uptime | 7:08PM |
| Health Score | CRITICAL |

## Critical Services

❌ **alfred-work-executor** — disabled
❌ **hal-idle-dispatch** — disabled
✅ **gateway** — running

## HAL Gateway (Remote)

- **Address:** 192.168.2.79:18789
- **Status:** offline
- **Error:** EHOSTUNREACH

## System Resources

- **Memory:** Pages active:                           3751495.
- **Disk Usage:** 38%

## All Services


### ✅ RUNNING (2)

- gateway [PID 30191]
- dashboard-nextjs [PID 94370]

### ❌ ERROR (14)

- watchdog
- log-rotation
- session-cleanup
- alfred-commandline
- nightly-git-commit
- evening-routine
- daily-config-memory-review
- joe-profile-reflection
- workspace-idle-activities
- kanban-auto-promote
- command-center-api
- weather-monitor
- backup-tier1
- backup-tier3

### ⏸ DISABLED (5)

- alfred-work-executor
- hal-idle-dispatch
- hal-backup
- weather-alerts
- backup-tier2
