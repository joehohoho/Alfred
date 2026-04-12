# HAL/Alfred Dispatch Observability — Phase 1: Backend Data Pipeline

**Card ID:** task_1776010476429_666607ed  
**Status:** IN_PROGRESS  
**Estimated Duration:** 3-4 hours  
**Start Time:** 2026-04-12 13:14 ADT

---

## Phase 1 Objectives (MVP)

### 1. Backend Data Pipeline `/api/dispatch-observability`

Aggregate data from:
- **Kanban queue depth** (todo/in_progress/review columns)
- **Pending ACKs** (HAL task completions awaiting acknowledgment)
- **Retry queue** (failed dispatch attempts)
- **HAL health** (last heartbeat, connection status, error rate)
- **Fallback events** (model fallback cascades, cost implications)
- **Token spend** (cost per task, cost per model tier, budget burn rate)

**Response shape:**
```json
{
  "timestamp": "2026-04-12T13:14:00Z",
  "queue_depth": {
    "todo": 3,
    "in_progress": 1,
    "review": 5,
    "blocked": 2
  },
  "pending_acks": {
    "count": 2,
    "oldest_age_seconds": 450,
    "at_risk": false
  },
  "retry_queue": {
    "count": 1,
    "oldest_age_seconds": 120,
    "by_reason": { "timeout": 1 }
  },
  "hal_health": {
    "last_heartbeat": "2026-04-12T13:12:00Z",
    "status": "healthy",
    "error_rate_24h": 0.05,
    "connection_established": true
  },
  "fallback_events": {
    "last_24h": 3,
    "by_model": { "codex": 2, "haiku": 1 },
    "cost_impact_usd": 0.15
  },
  "token_spend": {
    "session_cost_usd": 0.42,
    "cost_per_task_avg": 0.021,
    "burn_rate_hourly": 0.35,
    "budget_remaining_usd": 49.58
  },
  "anomalies": []
}
```

### 2. Anomaly Detection (6 Rules)

**Rule 1: Idle Backlog**
- Condition: `todo + in_progress > 8 AND no in_progress movement for >30 min`
- Alert: "Backlog pile-up detected; check for stuck tasks"
- Severity: WARN

**Rule 2: Fallback Spiral**
- Condition: `fallback_events.last_24h > 5 OR fallback_events.last_1h > 2`
- Alert: "High fallback rate; model degradation or context bloat suspected"
- Severity: ERROR

**Rule 3: Budget Alert**
- Condition: `token_spend.burn_rate_hourly * 24 > daily_budget`
- Alert: "Daily burn rate exceeds budget threshold"
- Severity: ERROR

**Rule 4: ACK Timeout**
- Condition: `pending_acks.oldest_age_seconds > 300 (5 min)`
- Alert: "HAL task ACK pending >5 min; check HAL health"
- Severity: WARN

**Rule 5: Retry Queue Stuck**
- Condition: `retry_queue.count > 0 AND oldest_age_seconds > 600 (10 min)`
- Alert: "Retry queue stalled; investigate dispatch failures"
- Severity: ERROR

**Rule 6: HAL Connection Lost**
- Condition: `hal_health.status != "healthy" OR hal_health.last_heartbeat > 5 min old`
- Alert: "HAL offline or unresponsive"
- Severity: CRITICAL

---

## Implementation Checklist

### Data Sources (Integration Points)

- [ ] **Kanban API:** GET `/api/kanban/cards?status=all` → extract queue depth
- [ ] **ACK Tracker:** Read `.hal-alfred-tracking/pending-acks.json` → extract pending count + ages
- [ ] **Retry Queue:** Read `.hal-alfred-tracking/retry-queue.json` (if exists) or fallback to empty
- [ ] **HAL Health:** Check HAL WebSocket connection status + last heartbeat timestamp (from sentinel state or direct check)
- [ ] **Fallback Log:** Parse `~/.openclaw/logs/fallback-events.jsonl` (last 24h entries)
- [ ] **Token Spend:** Aggregate from current session context + recent session logs (last 24h cost)

### Endpoint Implementation

- [ ] **GET `/api/dispatch-observability`** — Returns full snapshot with anomaly detection results
- [ ] **GET `/api/dispatch-observability/anomalies`** — Returns only anomalies detected (for dashboard widget)
- [ ] **GET `/api/dispatch-observability/health`** — Quick health check (HAL + queue only, <100ms)

### Anomaly Detection Logic

- [ ] Implement 6-rule detection engine
- [ ] Classify severity: INFO, WARN, ERROR, CRITICAL
- [ ] Include remediation hints in each anomaly

---

## Deliverables (Phase 1 - MVP)

1. **`api/dispatch-observability.ts`** (Express endpoint + data aggregation)
2. **`api/anomalies.ts`** (6-rule anomaly detection engine)
3. **`types/dispatch-observability.ts`** (TypeScript types for all data structures)
4. **`tests/dispatch-observability.test.ts`** (Unit tests for aggregation + anomalies)
5. **`PHASE-1-IMPLEMENTATION.md`** (Technical implementation notes)

---

## Success Criteria

- ✅ Endpoint responds within 200ms
- ✅ All 6 anomaly rules trigger correctly on test data
- ✅ Fallback spike event detected correctly
- ✅ Budget burn rate calculation accurate
- ✅ ACK timeout detection working (5-min threshold)
- ✅ 100% test coverage for critical paths

---

## Known Constraints

- HAL WebSocket connection check must not block endpoint response (async health check)
- Retry queue may not exist yet (graceful fallback to empty array)
- Fallback log format may vary (parse carefully)
- Budget limits TBD (use conservative default: $50/day)

