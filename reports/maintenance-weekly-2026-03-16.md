# OpenClaw Weekly Maintenance Snapshot
- Generated: 2026-03-16T11:05:00Z
- Host: Macmini

## 1) LaunchAgent health
- ✅ com.ollama.keepalive (pid/status=-)
- ❌ com.openclaw.imsg-responder (not loaded) — attempting restart
- ✅ com.alfred.dashboard-nextjs (pid/status=37348)
- ✅ com.cloudflare.tunnel (pid/status=52943)
- ✅ ai.openclaw.gateway (pid/status=50229)
- ✅ com.alfred.market-signal-lab (pid/status=576)

## 2) Gateway error digest
- No tool call found: 0
- timed out: 0
- device signature expired: 0

## 3) Log sizes (top 10)
- alfred-work-executor.log (13M)
- job-tracker.log (3.6M)
- failsafe.log (3.3M)
- command-center.log (1.8M)
- gateway.log (1.6M)
- cloudflare-tunnel.log (395K)
- hal-idle-dispatch.log (349K)
- market-signal-lab.log (212K)
- gateway-watchdog.log (165K)
- session-cleanup.log (144K)

## 4) Git snapshot
- Branch: main
- Uncommitted changes: 10 file(s)
  - 75cd6ba idea_evaluation: Even Us Up Growth Audit scored 7.4/10 (evaluated status)
  - 16df3a7 idle(improve-self): audit cron jobs; document 6 auto-disabled jobs + Discord channel routing fix
  - ce0fce0 idle:review-memory — identified cron auto-disable as recurring (Mar 10/12/15), updated NOW.md tracking

## 5) Summary
Issues:
  - LaunchAgent not loaded: com.openclaw.imsg-responder
Actions taken:
  - Restarted com.openclaw.imsg-responder
