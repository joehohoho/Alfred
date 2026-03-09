# OpenClaw Weekly Maintenance Snapshot
- Generated: 2026-03-09T11:05:04Z
- Host: Macmini

## 1) LaunchAgent health
- ✅ com.ollama.keepalive (pid/status=-)
- ❌ com.openclaw.imsg-responder (not loaded) — attempting restart
- ✅ com.alfred.dashboard-nextjs (pid/status=15320)
- ❌ com.cloudflare.tunnel (not loaded) — attempting restart
- ❌ ai.openclaw.gateway (not loaded) — attempting restart
- ✅ com.alfred.market-signal-lab (pid/status=576)

## 2) Gateway error digest
- No tool call found: 0
- timed out: 0
- device signature expired: 0

## 3) Log sizes (top 10)
- failsafe.log (1.6M)
- job-tracker.log (513K)
- command-center.log (423K)
- cloudflare-tunnel.log (342K)
- market-signal-lab.log (201K)
- hal-idle-dispatch.log (197K)
- gateway.log (184K)
- session-cleanup.log (86K)
- gateway-watchdog.log (73K)
- session-watchdog.log (34K)

## 4) Git snapshot
- Branch: main
- Uncommitted changes: 10 file(s)
  - 8398935 [idle:workspace-check] ACTIVE-TASK verified accurate, framework doc exists, tracking state files updated
  - d3b3b2b Alfred: Evaluate Rural Contractor Invoice Kit (Score 5.0/10) — lacks trades domain expertise, geographic TAM constrained, below promotion threshold
  - e9b5765 [idle:review-memory] Mar 6-8 hygiene pass: dedup fixed, crons restarted, approval bottleneck identified, passive income strategy synthesized

## 5) Summary
Issues:
  - LaunchAgent not loaded: com.openclaw.imsg-responder
  - LaunchAgent not loaded: com.cloudflare.tunnel
  - LaunchAgent not loaded: ai.openclaw.gateway
Actions taken:
  - Restarted com.openclaw.imsg-responder
  - Restarted com.cloudflare.tunnel
  - Restarted ai.openclaw.gateway
