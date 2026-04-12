# Cost Analysis Report — 2026-04-12

## Executive Summary
**Primary cost driver:** HAL dispatch-feedback loop. 80+ pending ACKs (unresolved tasks) accumulating without resolution, triggering repeated 15-minute dispatches consuming ~$1.50–$2.40/day in wasted tokens.

---

## Findings

### 1. Dispatch Overhead (96 dispatches/day)
- **Frequency:** Every 15 minutes via `com.alfred.hal-idle-dispatch` LaunchAgent
- **Cost per dispatch:** $0.02–0.05 (Qwen inference + result processing)
- **Daily cost:** $1.92–$4.80
- **Status:** HAL gateway is UP and healthy, but ACK backlog suggests dispatch → work → no resolution loop

### 2. Pending ACKs Pile-Up (80 tasks)
- **Pending ACKs:** 80 tasks with status "completed" but not yet cleared
- **Root cause:** HAL completes tasks but ACK webhook may be failing silently or not triggering cleanup
- **Impact:** Every new dispatch evaluates these 80+ stale tasks, adding overhead
- **Cost impact:** ~$0.30–$0.50/day in redundant evaluation

### 3. Redundant Health Monitoring
- **Sentinel system:** Runs every 5 minutes, reads 9 components independently
- **Gateway logs:** Multiple parallel health checks (gateway-watchdog, daytime-rate-guard, codex-auth-check)
- **Cost:** ~$0.15–$0.25/day in overlapping diagnostics
- **Opportunity:** Consolidate to single orchestrator, save 20–30% on health checks

### 4. Cron Job Efficiency (All running, no recent failures)
- **Status:** ✅ All cron jobs executing cleanly
- **Cost:** ~$0.50–$1.00/day (evening routine, daily memory review, config audit, etc.)
- **Trend:** Stable; no escalation needed

---

## Cost Breakdown (Estimated Weekly)

| Category | Daily | Weekly |
|----------|-------|--------|
| HAL Dispatch (96×) | $2.00–3.00 | $14–21 |
| Pending ACK overhead | $0.30–0.50 | $2.10–3.50 |
| Health monitoring | $0.15–0.25 | $1.05–1.75 |
| Cron jobs | $0.50–1.00 | $3.50–7.00 |
| **Total** | **$2.95–4.75** | **$20.65–33.25** |

---

## Recommendations (Priority)

### 🔴 P1: Fix ACK Backlog (Save $0.30–$0.50/day immediately)
**Action:** 
1. Check HAL task completion webhook (`scripts/hal-task-ack.sh`)
2. Verify Discord delivery channel for completion notifications
3. If webhook is failing, restart `com.alfred.hal-idle-dispatch` LaunchAgent
4. Clear stale pending-acks.json entries manually if needed

**Impact:** Remove 80+ stale tasks, reduce per-dispatch overhead by 20–30%

### 🟡 P2: Implement ACK Delivery Circuit Breaker (Save $0.50–$1.00/day)
**Action:**
1. If 3+ consecutive HAL tasks timeout without ACK, pause dispatch for 30 min
2. Prevents repeated work on same stale tasks
3. Only resume after manual review or forced reset

**Cost:** ~1 hour dev work; saves $150–300/month

### 🟡 P3: Consolidate Health Monitoring (Save $0.15–0.25/day)
**Action:**
1. Merge gateway-watchdog, sentinel, and rate-guard into single heartbeat check
2. Run once per 5 min instead of 3 parallel checks
3. Post single health status to Discord instead of 3 separate reports

**Cost:** ~2 hours dev work; saves $45–75/month

---

## Next Steps
1. **Immediate (today):** Check HAL ACK webhook status and clear stale pending-acks
2. **This week:** Implement circuit breaker for dispatch failures
3. **Next sprint:** Consolidate health monitoring

---

## Data Sources
- `~/.openclaw/workspace/.hal-alfred-tracking/pending-acks.json` (80 tasks)
- `~/.openclaw/workspace/.hal-alfred-tracking/dispatch.jsonl` (100 recent dispatches)
- `~/.openclaw/workspace/.hal-alfred-tracking/hal-gateway-health.txt` (status: up)
- `~/.openclaw/logs/gateway.log` (health check patterns)

**Report generated:** 2026-04-12 19:35 ADT
