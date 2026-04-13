# Dispatch Observability API Endpoint

## Overview

New endpoint: **`GET /api/dispatch/observability`**

Returns unified queue metrics, anomalies, token budget, and health score for HAL/Alfred dispatch system.

## Endpoint Details

### URL
```
GET /api/dispatch/observability
```

### Response Status
- **200 OK** — Data successfully aggregated
- **500 Internal Server Error** — Aggregation failed (check logs)

### Response Body

```json
{
  "timestamp": "2026-04-13T07:04:49.310Z",
  
  "dispatch_summary": {
    "total_dispatched": 542,
    "dispatched_to_hal": 540,
    "dispatched_to_alfred": 0,
    "hal_failures": 1,
    "handled_by_alfred": 1,
    "last_hal_dispatch": {
      "timestamp": "2026-04-13T06:50:54Z",
      "task_id": "proactive_1776063053",
      "route": "HAL",
      "dispatch_result": "dispatched_proactive",
      "dispatch_type": "proactive",
      "task": "Infrastructure health check"
    }
  },
  
  "queue_status": {
    "kanban_todo_count": 0,
    "kanban_in_progress_count": 0,
    "retry_queue_count": 0,
    "pending_ack_count": 0,
    "total_debt": 0,
    "oldest_pending_ack_minutes": null,
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
    "last_24h_count": 0,
    "reasons": {
      "rate_limit": 0,
      "token_budget_exhausted": 0,
      "connectivity": 0,
      "circuit_breaker": 0,
      "unknown": 0
    },
    "recent_events": [
      {
        "timestamp": "2026-04-13T03:45:00Z",
        "reason": "connectivity",
        "task_id": "proactive_1776050000",
        "task": "Code review: CoinUsUp"
      }
    ]
  },
  
  "anomalies": [
    {
      "type": "hal_idle_with_backlog",
      "severity": "warning",
      "message": "HAL idle for 15 min but 10 tasks await",
      "last_dispatch": "2026-04-13T03:47:00Z",
      "backlog_size": 10,
      "minutes_idle": 15
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
      "dispatched_proactive": 532,
      "dispatched_to_hal": 540,
      "dispatched_to_alfred": 0,
      "failures": 1
    }
  },
  
  "health_score": {
    "overall": 99.08,
    "dispatch_efficiency": 99.82,
    "queue_health": 100,
    "fallback_rate": 0,
    "anomaly_count": 0,
    "recommendation": "System healthy. Continue monitoring."
  }
}
```

## Field Descriptions

### dispatch_summary
- `total_dispatched` — Total tasks dispatched since tracking began
- `dispatched_to_hal` — Tasks successfully sent to HAL
- `dispatched_to_alfred` — Tasks handled by Alfred (fallback)
- `hal_failures` — Failed HAL dispatch attempts
- `handled_by_alfred` — Explicit Alfred handler invocations
- `last_hal_dispatch` — Most recent successful HAL dispatch with details

### queue_status
- `kanban_todo_count` — Tasks in kanban To-Do column
- `kanban_in_progress_count` — Tasks in kanban In Progress column
- `retry_queue_count` — Failed tasks awaiting retry
- `pending_ack_count` — Tasks awaiting ACK from HAL
- `total_debt` — Sum of all queue backlog
- `oldest_pending_ack_minutes` — Age of oldest pending ACK (null if none)
- `retry_queue[]` — Array of retry tasks with age, attempt count, and reason

### fallback_events
- `last_24h_count` — Number of fallback events in last 24 hours
- `reasons{}` — Breakdown by fallback reason (rate_limit, token_budget_exhausted, connectivity, circuit_breaker, unknown)
- `recent_events[]` — Last 5 fallback events with timestamp and task info

### anomalies[]
Array of detected issues. Each anomaly has:
- `type` — Anomaly classification (e.g., `hal_idle_with_backlog`, `high_retry_backlog`, `pending_acks_aging`, `high_fallback_rate`, `alfred_overload`)
- `severity` — One of: `critical`, `warning`, `info`, `none`
- `message` — Human-readable description
- Additional fields specific to the anomaly type (e.g., `backlog_size`, `minutes_idle`)

### token_and_gates
- `current_model` — Active model tier (e.g., `haiku-4-5`)
- `token_budget` — Daily budget stats (limit, used, remaining, percent)
- `active_gates[]` — List of token/rate limit gates with status
- `model_tier_distribution` — Count of dispatches per model tier

### health_score
- `overall` — 0-100 composite health score
- `dispatch_efficiency` — % of successful dispatches
- `queue_health` — 0-100 queue depth score
- `fallback_rate` — % of tasks falling back to Alfred
- `anomaly_count` — Count of active (non-healthy) anomalies
- `recommendation` — Actionable text recommendation based on health

## Data Sources

The endpoint reads from:

1. **Dispatch Log** — `~/.openclaw/workspace/.hal-alfred-tracking/dispatch.jsonl` (JSONL, last 1000 entries)
2. **Retry Queue** — `~/.openclaw/workspace/.hal-retry-queue/retry-queue.log` (parsed for pending tasks)
3. **Dispatched Tasks** — `~/.openclaw/workspace/.hal-alfred-tracking/alfred-dispatched.json` (currently assigned)
4. **Circuit Breaker** — `~/.openclaw/workspace/.hal-alfred-tracking/collapse-state.json` (HAL state)
5. **Gateway Config** — Token budget and model tier info (from OpenClaw gateway)

## Implementation Details

### Backend Route Handler (Express)

```javascript
// In Command Center backend (e.g., routes/dispatch.js)

app.get('/api/dispatch/observability', async (req, res) => {
  try {
    const { aggregateDispatchObservability } = require('../scripts/dispatch-observability-aggregator');
    const data = aggregateDispatchObservability();
    res.json(data);
  } catch (error) {
    console.error('Dispatch observability error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Frontend Integration

```typescript
// In React component
const response = await fetch('/api/dispatch/observability');
const data = await response.json();
```

## Refresh Interval

- **Frontend auto-refresh:** 30 seconds (configurable toggle in UI)
- **Backend aggregation:** On-demand (reads live files, no caching)
- **Anomaly alerts:** WebSocket push on state change (future enhancement)

## Performance Notes

- Aggregator reads last 1000 dispatch entries (typically < 50 KB)
- Retry queue parsing is linear scan (< 10 KB typical)
- Full aggregation: < 50 ms on typical hardware
- Safe to call every 30 seconds without performance impact

## Error Handling

- Missing files → Graceful defaults (count = 0, empty arrays)
- Parse failures → Logged + graceful degradation (skip that section)
- Gateway unavailable → Use cached token budget if available
- Full aggregation failure → 500 error with message

## Future Enhancements

1. **ACK Tracking** — Full pending ACK details and age tracking
2. **Token Budget Live Feed** — Real-time budget from gateway (current: cached)
3. **WebSocket Alerts** — Push anomalies as they occur
4. **Historical Trends** — Time-series data (dispatch rate, queue depth over time)
5. **Auto-Recovery Suggestions** — Recommend actions based on anomalies
6. **Integration with Sentinel** — Direct hooks for auto-heal triggers

