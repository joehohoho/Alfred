# OpenClaw Weekly Maintenance Snapshot
- Generated: 2026-03-02T12:05:04Z
- Host: Macmini

## 1) LaunchAgent health
- ✅ com.ollama.keepalive (pid/status=-)
- ❌ com.openclaw.imsg-responder (not loaded) — attempting restart
- ✅ com.alfred.dashboard-nextjs (pid/status=64715)
- ❌ com.cloudflare.tunnel (not loaded) — attempting restart
- ✅ ai.openclaw.gateway (pid/status=72998)
- ✅ com.alfred.market-signal-lab (pid/status=576)

## 2) Gateway error digest
- No tool call found: 0
- timed out: 0
- device signature expired: 0

## 3) Log sizes (top 10)
- gateway.log (3.4M)
- job-tracker.log (2.7M)
- failsafe.log (578K)
- cloudflare-tunnel.log (305K)
- command-center.log (207K)
- market-signal-lab.log (201K)
- hal-idle-dispatch.log (47K)
- gateway-watchdog.log (44K)
- session-watchdog.log (34K)
- legal-bill-ai.log (29K)

## 4) Git snapshot
- Branch: main
- Uncommitted changes: 9 file(s)
  - f1f025c Harden recovery + reduce resource waste from safeguard scripts
  - 39604b0 Add circuit breaker checks to all gateway restart paths + safe recovery script
  - 7847b1d memory: add Kanban Review auto-move rule + NOW.md checkpoint

## 5) Summary
Issues:
  - LaunchAgent not loaded: com.openclaw.imsg-responder
  - LaunchAgent not loaded: com.cloudflare.tunnel
Actions taken:
  - Restarted com.openclaw.imsg-responder
  - Restarted com.cloudflare.tunnel
