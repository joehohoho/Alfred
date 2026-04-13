# HAL/Alfred Dispatch Observability Panel - Specification

**Card:** task_1776063776962_b8004ba1  
**Created:** 2026-04-13 04:02 ADT  
**Status:** In Progress

## Problem Statement

The system dispatches tasks to HAL (idle) and Alfred (kanban) but lacks unified visibility into:

1. **Dispatch Backlog** — How many tasks are queued vs dispatched?
2. **Retry Queue Depth** — How many failed tasks are retrying? How long are they waiting?
3. **Pending ACKs** — How old are incomplete ACKs from HAL? Are tasks stalling?
4. **Fallback Reasons** — When HAL can't take work, why? (Token budget, rate limit, connectivity)
5. **Silent Degradation** — Is HAL idle while backlog exists? Is Alfred overloaded with fallbacks?
6. **Token/Model Gates** — How much of the token budget remains? Which model tier is routing?

**Current State:**
- Dispatch log exists: `.hal-alfred-tracking/dispatch.jsonl` (542 entries)
- Data structure: `{timestamp, task_id, route, dispatch_result, dispatch_type, task}`
- Retry queue exists: `.hal-retry-queue/` (1 log file, no structured state)
- Pending ACKs: `.hal-notify-ack/` (empty)
- Dispatch results seen: `dispatched_proactive`, `dispatched_to_hal`, `hal_dispatch_failed`, `handled_by_alfred`

**Goal:**
Build a single observability panel accessible via Command Center (`/dispatch-observability`) that aggregates all this data and surfaces actionable insights.

---

## Component Design

### 1. Backend API Endpoint (`/api/dispatch/observability`)

**Reads:**
- `~/.openclaw/workspace/.hal-alfred-tracking/dispatch.jsonl` (last 1000 entries)
- `~/.openclaw/workspace/.hal-retry-queue/retry-queue.log` (parse for pending tasks)
- `~/.openclaw/workspace/.hal-alfred-tracking/alfred-dispatched.json` (current assigned tasks)
- `~/.openclaw/workspace/.hal-alfred-tracking/collapse-state.json` (circuit breaker state)
- Model/token budget from OpenClaw gateway config

**Returns JSON:**
```json
{
  "timestamp": "2026-04-13T04:02:00Z",
  
  "dispatch_summary": {
    "total_dispatched": 542,
    "dispatched_to_hal": 540,
    "dispatched_to_alfred": 0,
    "hal_failures": 1,
    "handled_by_alfred": 1,
    
    "last_hal_dispatch": {
      "timestamp": "2026-04-13T04:02:00Z",
      "task_id": "proactive_1776063053",
      "result": "dispatched_proactive"
    }
  },
  
  "queue_status": {
    "kanban_todo_count": 3,
    "kanban_in_progress_count": 5,
    "retry_queue_count": 2,
    "pending_ack_count": 0,
    "total_debt": 10,
    
    "retry_queue": [
      {
        "task_id": "proactive_1776050000",
        "first_attempt": "2026-04-12T22:00:00Z",
        "last_attempt": "2026-04-13T03:50:00Z",
        "attempts": 3,
        "age_minutes": 122,
        "reason": "HAL websocket timeout"
      }
    ]
  },
  
  "pending_acks": {
    "count": 0,
    "oldest_age_minutes": null,
    "tasks": []
  },
  
  "fallback_events": {
    "last_24h_count": 1,
    "reasons": {
      "rate_limit": 0,
      "token_budget_exhausted": 0,
      "connectivity": 1,
      "circuit_breaker": 0,
      "unknown": 0
    },
    "recent_events": [
      {
        "timestamp": "2026-04-13T03:45:00Z",
        "reason": "connectivity",
        "detail": "HAL websocket unreachable",
        "task_id": "proactive_1776050000"
      }
    ]
  },
  
  "anomalies": [
    {
      "type": "hal_idle_with_backlog",
      "severity": "warning",
      "message": "HAL has not dispatched in 15 min but 10 tasks await",
      "last_dispatch": "2026-04-13T03:47:00Z",
      "backlog_size": 10
    },
    {
      "type": "alfred_overload",
      "severity": "info",
      "message": "Alfred handling 1 fallback task (expected < 5)",
      "current_fallback_count": 1,
      "threshold": 5
    },
    {
      "type": "pending_acks_aging",
      "severity": "none",
      "message": "No aging ACKs",
      "oldest_ack_age_minutes": null
    }
  ],
  
  "token_and_gates": {
    "current_model": "haiku-4-5",
    "token_budget": {
      "daily_limit": 500000,
      "used_today": 127543,
      "remaining": 372457,
      "percent_used": 25.5
    },
    "active_gates": [
      {
        "gate": "rate_limit",
        "status": "ok",
        "detail": "50 of 100 req/min available"
      }
    ],
    "model_tier_distribution": {
      "haiku": 450,
      "sonnet": 75,
      "opus": 2,
      "codex": 15
    }
  },
  
  "health_score": {
    "overall": 92,
    "dispatch_efficiency": 99.6,
    "queue_health": 85,
    "fallback_rate": 0.2,
    "anomaly_count": 1,
    "recommendation": "System healthy. Monitor 15-min dispatch lapse."
  }
}
```

### 2. Frontend Component (`DispatchObservabilityPanel.tsx`)

**Layout (4-column grid):**

**Column 1: Summary Stats**
- Total dispatched (with trend)
- To HAL vs To Alfred split
- Failures rate
- Last HAL dispatch time

**Column 2: Queue Depth**
- Kanban to-do count
- Kanban in-progress count
- Retry queue depth (with aging breakdown)
- Pending ACKs count

**Column 3: Anomalies & Fallbacks**
- Active anomalies (with severity color)
- Recent fallback reasons (pie chart)
- Last 5 fallback events (timeline)

**Column 4: Token & Gates**
- Daily budget utilization (progress bar)
- Model tier distribution (donut chart)
- Active rate limit gates
- Health score (0-100)

**Expandable Sections:**
- Retry queue deep dive (table: task_id, age, attempts, reason)
- Pending ACKs detail (table: task_id, requested_at, age, command)
- Anomaly timeline (events over last 24h)

### 3. Real-Time Updates

- Auto-refresh every 30 seconds
- WebSocket for anomaly alerts
- Audio alert when HAL dispatch lapse > 15 min
- Color coding: 🟢 Healthy, 🟡 Warning, 🔴 Critical

---

## Implementation Plan

### Phase 1: Backend Data Aggregation (This Session)
- [ ] Create `/api/dispatch/observability` endpoint
- [ ] Parse dispatch.jsonl, retry-queue.log, dispatched.json
- [ ] Detect anomalies (idle HAL, aging ACKs, overload)
- [ ] Calculate health score
- [ ] Add to Command Center backend

### Phase 2: Frontend UI (This Session)
- [ ] Build DispatchObservabilityPanel component
- [ ] Add to Command Center pages (`/dispatch-observability`)
- [ ] Implement real-time refresh + WebSocket alerts
- [ ] Add anomaly notifications

### Phase 3: Monitoring Integration (If Time)
- [ ] Add threshold-based cron alerts (e.g., dispatch lapse > 15 min)
- [ ] Hook into sentinel system for auto-recovery suggestions
- [ ] Add to daily memory briefing

---

## Success Criteria

1. ✅ API endpoint returns clean, actionable data
2. ✅ UI displays all 4 data sources unified
3. ✅ Anomalies detected and highlighted
4. ✅ Real-time refresh functional
5. ✅ Joe can diagnose routing issues in < 1 minute
6. ✅ Identifies silent degradation (HAL idle, Alfred overload)

---

## Files to Create/Modify

- **Create:** `scripts/dispatch-observability-aggregator.js` — Data aggregation logic
- **Create:** `dashboard/components/DispatchObservabilityPanel.tsx` — React component
- **Modify:** Command Center backend — Add `/api/dispatch/observability` endpoint
- **Modify:** COMMAND-CENTER.md — Document new page + endpoint
- **Create:** `.hal-alfred-tracking/DISPATCH-OBSERVABILITY-SPEC.md` — This file

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Dispatch.jsonl parsing fails | Add try/catch + log to audit trail |
| Real-time updates lag | Use 30-sec polling as fallback, not WebSocket |
| Token budget endpoint unavailable | Cache last known value, gray out field |
| Retry queue parsing fails | Skip that section, show error message |

