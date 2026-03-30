# OpenClaw Weekly Maintenance Snapshot
- Generated: 2026-02-25T23:47:27Z
- Host: Macmini

## 1) LaunchAgent health
- ✅ com.ollama.keepalive (status=-)
- ✅ com.openclaw.imsg-responder (status=584)
- ✅ com.alfred.dashboard-nextjs (status=76178)
- ✅ com.cloudflare.tunnel (status=594)

## 2) Recent critical errors (last 24h)
- gateway.err.log:
  - No tool call found: 35
  - timed out: 1246
  - device signature expired: 151

## 3) Log growth (top 10 files)
- /Users/hopenclaw/.openclaw/logs/gateway.log (1.4M)
- /Users/hopenclaw/.openclaw/logs/job-tracker.log (743K)
- /Users/hopenclaw/.openclaw/logs/gateway.err.log (524K)
- /Users/hopenclaw/.openclaw/logs/cloudflare-tunnel.log (217K)
- /Users/hopenclaw/.openclaw/logs/market-signal-lab.log (166K)
- /Users/hopenclaw/.openclaw/logs/command-center.log (39K)
- /Users/hopenclaw/.openclaw/logs/session-watchdog.log (16K)
- /Users/hopenclaw/.openclaw/logs/commands.log (4.9K)
- /Users/hopenclaw/.openclaw/logs/weather-monitor.log (3.0K)
- /Users/hopenclaw/.openclaw/logs/imsg-responder.log (582B)

## 4) Git safety snapshot
- Branch: main
- Working tree changes: 20 file(s)
- Recent commits (3):
  - 0a2ffd7 chore: hourly backup snapshot
  - 4789bee chore: hourly backup checkpoint 2026-02-25 15:00 AST
  - 15974c8 log: daily progress - Phase 1 routing system deployed (4 urgent tasks complete)

## 5) Suggested actions
- Run log rotation: bash /Users/hopenclaw/.openclaw/workspace/scripts/log-rotate.sh
- Run LaunchAgent check: bash /Users/hopenclaw/.openclaw/workspace/scripts/launchagent-health.sh
- Run session watchdog manually if needed: bash /Users/hopenclaw/.openclaw/workspace/scripts/session-watchdog.sh
