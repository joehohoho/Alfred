# OpenClaw Weekly Maintenance Snapshot
- Generated: 2026-03-23T11:05:05Z
- Host: Macmini

## 1) LaunchAgent health
- ✅ com.ollama.keepalive (pid/status=-)
- ❌ com.openclaw.imsg-responder (not loaded) — attempting restart
- ✅ com.alfred.dashboard-nextjs (pid/status=87032)
- ❌ com.cloudflare.tunnel (not loaded) — attempting restart
- ✅ ai.openclaw.gateway (pid/status=95490)
- ✅ com.alfred.market-signal-lab (pid/status=589)

## 2) Gateway error digest
- No tool call found: 0
- timed out: 0
- device signature expired: 0

## 3) Log sizes (top 10)
- gateway.log (5.0M)
- command-center.log (1.8M)
- job-tracker.log (1.5M)
- hal-idle-dispatch.log (526K)
- cloudflare-tunnel.log (504K)
- session-cleanup.log (240K)
- market-signal-lab.log (217K)
- alfred-work-executor.log (198K)
- gateway-watchdog.log (173K)
- backup-tier2.log (51K)

## 4) Git snapshot
- Branch: main
- Uncommitted changes: 9 file(s)
  - ad06ea8 nightly: Update workspace (       7 files changed: .hal-alfred-tracking/hal-dispatch-fail-count.txt,.hal-alfred-tracking/proactive-pool-index.txt,CoinUsUp,Expense_Sharing,MEMORY.md,MEMORY.md.bridge-backup,memory/.codex-expiry-state.json)
  - ed026b7 Reflection 2026-03-23: CRITICAL escalation — duplicate question crisis unresolved (Mar 20-22), infrastructure reliability degrading
  - 4c9bb46 Evening routine: CoinUsUp research findings + continuity updates (LAST-SESSION, NOW, daily log)

## 5) Summary
Issues:
  - LaunchAgent not loaded: com.openclaw.imsg-responder
  - LaunchAgent not loaded: com.cloudflare.tunnel
Actions taken:
  - Restarted com.openclaw.imsg-responder
  - Restarted com.cloudflare.tunnel
