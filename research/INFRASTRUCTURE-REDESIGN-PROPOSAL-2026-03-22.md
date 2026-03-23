# Infrastructure Redesign Proposal — Autonomous Self-Healing System
**Status:** Design Phase (Ready for Implementation)  
**Target:** Reduce infrastructure overhead from 8-12h/week to <2h/week  
**Approach:** Unified state management + 24/7 health monitoring + autonomous recovery + Command Center visibility

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    COMMAND CENTER (React)                   │
│         [New Tab] Infrastructure Health & Alerts            │
└────────────────────────────┬────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼──────┐   ┌───────▼────────┐   ┌─────▼─────┐
    │  State    │   │   Metrics      │   │  Alerts   │
    │  Cache    │   │   Store        │   │  &        │
    │  (JSON)   │   │   (JSON append)│   │  Events   │
    └────┬──────┘   └────┬───────────┘   └─────┬─────┘
         │               │                      │
         └───────────────┼──────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼─────────┐ ┌──▼────────┐ ┌───▼──────────┐
    │   Health     │ │ Delivery  │ │  Automatic   │
    │   Monitor    │ │ Validator │ │  Recovery    │
    │   (Daemon)   │ │ (Cron)    │ │  (Cron)      │
    └──────────────┘ └───────────┘ └──────────────┘
         │
    ┌────▼─────────────────────────────┐
    │   LaunchAgents + Cron System      │
    │   (Gateway, Ollama, imsg, etc.)   │
    └───────────────────────────────────┘
```

---

## 1. UNIFIED STATE CACHE (Solves P2, P3)

### Purpose
Single source of truth for all working state. Replaces fragmented MEMORY.md, ACTIVE-TASK.md, LAST-SESSION.md, NOW.md.

### Schema (JSON)
```json
{
  "state_version": "1.0",
  "last_updated": "2026-03-22T16:01:00Z",
  "session_id": "agent:main:main",
  
  "active_work": {
    "current_task": {
      "card_id": "task_1774182651318_79b657e0",
      "title": "Review Lane Auto-Approval UX",
      "objective": "Audit finding: add approve/reject buttons to notifications",
      "status": "review",
      "progress": "Phase 1 complete — research documented",
      "next_step": "Awaiting Joe approval for Phase 2 implementation",
      "started_at": "2026-03-22T10:00:00Z",
      "context_snapshot": {
        "model": "haiku",
        "tokens_used": 12450,
        "context_pct": 33
      }
    },
    "blocked_by": [
      {
        "type": "approval",
        "description": "Joe approval on 5 review cards before next assignment"
      }
    ]
  },
  
  "pending_decisions": [
    {
      "id": "notif_1774074714389_b7b2118c",
      "question": "Approve CoinUsUp recurring donations card for Done?",
      "status": "waiting",
      "created": "2026-03-21T06:31:00Z",
      "escalation_at": "2026-03-25T06:31:00Z"
    }
  ],
  
  "session_checkpoint": {
    "last_checkpoint": "2026-03-22T15:18:00Z",
    "context_at_checkpoint": 85,
    "reason": "Gateway auto-restart triggered",
    "recovery_steps": [
      "Load ACTIVE-TASK.md",
      "Resume from current_task.next_step"
    ]
  },
  
  "memory_references": {
    "loaded_files": [
      "MEMORY.md",
      "AGENTS.md",
      "memory/2026-03-22.md"
    ],
    "long_term_decisions": [
      "memory/DECISIONS-AND-RECOMMENDATIONS.md"
    ]
  }
}
```

### Location & Updates
- **File:** `~/.openclaw/workspace/state/working-state.json`
- **Write triggers:** After every major work session (task completion, decision point, session end)
- **Read on startup:** Automatic — session auto-resumes from last checkpoint
- **Merge logic:** If session crashes mid-work, checkpoint contains last good state; resumed session can pick up from `next_step`

### Retirement of Old System
- **MEMORY.md:** Becomes strategic memory only (decisions, patterns, learnings) — NOT working state
- **ACTIVE-TASK.md:** Deprecated for state tracking; kept as human-readable log file
- **LAST-SESSION.md:** Auto-generated from working-state.json on session end
- **NOW.md:** Auto-generated on context overflow (emergency lifeboat)
- **Daily logs:** Keep for audit trail, not state recovery

---

## 2. METRICS STORE (Solves P4)

### Purpose
Lightweight append-only log of all infrastructure events. Enables early-warning detection, incident correlation, and root-cause analysis.

### Schema (JSON Lines)
```json
{"timestamp": "2026-03-22T16:01:15Z", "event_type": "cron_execution", "job_id": "evening-routine", "status": "success", "duration_ms": 1250, "delivery_channel": "discord"}
{"timestamp": "2026-03-22T16:01:45Z", "event_type": "launchagent_health", "agent": "com.ollama.keepalive", "status": "running", "uptime_hours": 72.5}
{"timestamp": "2026-03-22T16:02:10Z", "event_type": "context_threshold", "threshold": 60, "actual_pct": 62, "action": "checkpoint_written"}
{"timestamp": "2026-03-22T16:05:33Z", "event_type": "model_failure", "model": "codex", "error": "CODEX_QUOTA", "fallback_to": "haiku", "attempt": 1}
{"timestamp": "2026-03-22T16:15:22Z", "event_type": "cron_failure", "job_id": "daily-config", "error": "Unknown Channel", "consecutive_failures": 2, "auto_disable_risk": "medium"}
```

### Location & Cleanup
- **File:** `~/.openclaw/workspace/state/metrics.jsonl` (append-only)
- **Rotation:** Archive to `metrics-YYYY-MM-DD.jsonl` daily at 00:00 AST
- **Retention:** Keep 90 days of rolling metrics in main file
- **Query:** Health dashboard queries last 24h, 7d, 30d aggregations

---

## 3. HEALTH MONITOR DAEMON (Solves P1, P5)

### Purpose
24/7 background process checking system health. Runs every 5 minutes.

### Checks Performed
```
Every 5 min:
├─ LaunchAgent Status (5 critical)
│  ├─ com.openclaw.gateway
│  ├─ com.ollama.keepalive
│  ├─ com.alfred.imsg-responder
│  ├─ com.alfred.dashboard-nextjs
│  └─ com.cloudflare.tunnel
│
├─ Context Usage (main session)
│  ├─ Current %
│  ├─ Trend (is it rising?)
│  └─ ETA to 80% threshold
│
├─ Cron Job Health
│  ├─ Last execution time (all active jobs)
│  ├─ Failure count in last 24h
│  └─ Auto-disable risk assessment
│
└─ Model Availability
   ├─ LOCAL (ollama) response time
   ├─ Codex quota status
   └─ Subscription quota burn rate
```

### Autonomous Actions (Auto-Fix, No Notification)
```
IF launchagent_status == "dead" AND agent IN [gateway, ollama, tunnel]:
  → launchctl start <agent>
  → log incident to metrics.jsonl
  → if 3+ restarts in 24h, escalate to "warning"

IF context_pct >= 70:
  → Trigger checkpoint_write (to working-state.json)
  → Alert level = "info"

IF cron_job.consecutive_failures >= 3:
  → Disable job
  → Create incident record
  → Alert level = "warning" (notify Joe)

IF model == "codex" AND quota_status == "exhausted":
  → Log fallback event
  → No action (routing already handles fallback)
```

### Escalation Logic
```
Alert Level 1 (Auto-fix only, no notification):
  - LaunchAgent auto-restarted
  - Context checkpoint triggered
  - Model fallback executed

Alert Level 2 (Notify Joe, auto-fix optional):
  - 3+ LaunchAgent restarts in 24h
  - Cron job will auto-disable on next failure
  - Context approaching critical (75%+)
  - Metrics anomaly (e.g., 10x failure spike)

Alert Level 3 (Require Joe approval):
  - Security-related failure
  - Gateway health critical
  - Multiple core systems degraded
```

### Implementation
- **Language:** Bash + jq (lightweight, no dependencies)
- **Schedule:** Every 5 minutes via LaunchAgent (new: com.alfred.health-monitor)
- **Output:** Metrics append to metrics.jsonl + alert to Command Center
- **Idempotent:** Safe to run multiple times; won't duplicate actions

---

## 4. DELIVERY VALIDATOR (Solves P1 — Prevention)

### Purpose
Prevents cron job creation with invalid Discord/Slack channel IDs. Runs before job is saved.

### Validation Rules
```bash
VALIDATE_DELIVERY() {
  local mode="$1"      # "announce", "webhook", "none"
  local channel="$2"   # "discord" or "slack"
  local to="$3"        # channel ID

  if [[ "$mode" != "announce" ]]; then
    return 0  # Only validate announce mode
  fi

  if [[ -z "$to" ]]; then
    ERROR "delivery.to is empty — implicit routing not allowed"
    return 1
  fi

  # Validate Discord channel ID (numeric string, 18-19 digits)
  if [[ "$channel" == "discord" ]]; then
    if ! [[ "$to" =~ ^[0-9]{18,19}$ ]]; then
      ERROR "Invalid Discord channel ID: $to (must be 18-19 digit numeric)"
      return 1
    fi
  fi

  # Validate Slack channel ID (C + alphanumeric)
  if [[ "$channel" == "slack" ]]; then
    if ! [[ "$to" =~ ^C[A-Z0-9]{8,}$ ]]; then
      ERROR "Invalid Slack channel ID: $to (must be C... format)"
      return 1
    fi
  fi

  # Test reachability: attempt to send test message
  TEST_MESSAGE="[VALIDATION] Cron job delivery test for job $job_id"
  if ! MESSAGE_SEND "$channel" "$to" "$TEST_MESSAGE" 2>/dev/null; then
    WARN "delivery.to channel is unreachable — job will likely fail on execution"
    return 1
  fi

  return 0
}
```

### Integration Points
- **On cron job creation:** Always validate before saving
- **On cron job update:** Validate new delivery config
- **Pre-execution:** 60 min before scheduled run, test reachability and alert if failed

---

## 5. AUTOMATIC RECOVERY ENGINE (Solves P1, P2, P3)

### Purpose
Detects common failure patterns and fixes them autonomously.

### Recovery Procedures

#### Procedure 1: Re-Enable Auto-Disabled Cron Job
```bash
RECOVER_CRON_JOB() {
  local job_id="$1"
  
  # Check if job is disabled
  if ! cron list --id "$job_id" | grep -q "enabled.*false"; then
    return 0  # Job is already enabled
  fi
  
  # Validate delivery config (use VALIDATE_DELIVERY from above)
  local delivery_config=$(cron list --id "$job_id" | jq '.delivery')
  VALIDATE_DELIVERY \
    "$(echo $delivery_config | jq -r '.mode')" \
    "$(echo $delivery_config | jq -r '.channel')" \
    "$(echo $delivery_config | jq -r '.to')" \
    || {
      LOG "ERROR: Cannot re-enable job $job_id — delivery config invalid"
      return 1
    }
  
  # Re-enable job
  cron update --id "$job_id" --patch '{"enabled": true}'
  
  # Reset failure counter
  cron update --id "$job_id" --patch '{"_meta": {"consecutive_failures": 0}}'
  
  LOG "INFO: Re-enabled cron job $job_id after fixing delivery config"
  METRICS_APPEND "cron_recovery" "auto_re_enabled" "$job_id"
}
```

#### Procedure 2: Recover From Context Collapse
```bash
RECOVER_FROM_CONTEXT_COLLAPSE() {
  # This runs automatically on session startup if recovery is needed
  
  # Load working-state.json
  STATE=$(cat ~/.openclaw/workspace/state/working-state.json)
  
  # Extract last_checkpoint and recovery_steps
  CHECKPOINT=$(echo "$STATE" | jq -r '.session_checkpoint.last_checkpoint')
  NEXT_STEP=$(echo "$STATE" | jq -r '.active_work.current_task.next_step')
  TASK_ID=$(echo "$STATE" | jq -r '.active_work.current_task.card_id')
  
  # Log recovery to metrics
  METRICS_APPEND "session_recovery" "auto_resumed_from_collapse" "$TASK_ID"
  
  # Notify Joe (async) that session resumed
  ALERT_LEVEL=1 \
  ALERT_TEXT="Session auto-recovered from context collapse at $CHECKPOINT. Resumed task: $TASK_ID. Next step: $NEXT_STEP"
  
  # Return task state to session
  echo "$STATE" | jq -r '.active_work.current_task'
}
```

#### Procedure 3: Restart Dead LaunchAgent
```bash
RECOVER_LAUNCHAGENT() {
  local agent="$1"
  
  # Check if agent is running
  if launchctl list | grep -q "$agent"; then
    # Agent is in launchctl, but might be dead; check actual process
    local pid=$(launchctl list | grep "$agent" | awk '{print $1}')
    if [[ -z "$pid" || "$pid" == "-" ]]; then
      # Agent is registered but not running
      LOG "INFO: Restarting LaunchAgent $agent (pid=$pid)"
      launchctl start "$agent"
      METRICS_APPEND "launchagent_recovery" "auto_restarted" "$agent"
      return 0
    fi
  fi
  
  return 0  # Agent is healthy
}
```

---

## 6. COMMAND CENTER INTEGRATION

### New Dashboard Tab: "Infrastructure Health"

#### Tab 1: System Status (Real-Time)
```
┌──────────────────────────────────────────────────────┐
│ INFRASTRUCTURE HEALTH                                │
├──────────────────────────────────────────────────────┤
│                                                      │
│ 🟢 Gateway                 [Last check: 2s ago]     │
│ 🟢 Ollama                  [Uptime: 72h 45m]       │
│ 🟢 iMessage Responder      [Last msg: 5m ago]      │
│ 🟢 Dashboard               [Response: 45ms]        │
│ 🟢 Tunnel                  [Connected]             │
│                                                      │
│ Context Usage:             [█████░░░░] 62%         │
│ Est. Checkpoint at:        70% (in ~45 min)        │
│                                                      │
│ Cron Health:               [4/6 jobs healthy]      │
│   ⚠️  Daily Config & Memory Review (1 failure)     │
│       [Retry] [Details] [Auto-recovery: BLOCKED]   │
│                                                      │
│ Model Status:                                        │
│   ✅ Haiku: OK (quota: 78%)                         │
│   ⚠️  Codex: QUOTA_EXHAUSTED                        │
│   ✅ Sonnet: OK (quota: 62%)                        │
│   ✅ LOCAL: OK (response: 2.3s)                     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### Tab 2: Metrics & Trends (24h/7d/30d)
```
Cron Job Success Rate (7d):
  ├─ Evening Routine:        100%
  ├─ Daily Config:           71% (⚠️ trending down)
  ├─ Nightly Git Commit:     89%
  └─ Daily Inquiry:          95%

LaunchAgent Restart Rate (30d):
  ├─ Gateway:              0 restarts
  ├─ Ollama:               2 restarts (avg 15d apart)
  ├─ iMessage Responder:   1 restart
  ├─ Dashboard:            3 restarts (⚠️ degrading)
  └─ Tunnel:               0 restarts

Context Overflow Incidents (30d):
  ├─ Total: 3 incidents
  ├─ Avg recovery time: 8 min
  ├─ Last incident: 2026-03-22 15:18
  └─ Trend: Stable
```

#### Tab 3: Alert History & Actions
```
Recent Alerts:
  [2026-03-22 16:00] ℹ️  Context at 62% — checkpoint written
  [2026-03-22 15:18] ⚠️  Session auto-recovered from collapse
  [2026-03-21 11:57] ⚠️  Daily Config cron auto-disabled (3 failures)
  [2026-03-21 03:43] ⚠️  Daily Config cron auto-disabled (3 failures)
  [2026-03-20 10:01] 🚨 Codex OAuth token expired

Alert Log (searchable, filterable by severity/date/system)
```

#### Tab 4: Manual Controls
```
CRON JOBS:
  [List all active/disabled jobs]
  [Enable] [Disable] [Test] [View Config] [Delete]

LAUNCHAGENTS:
  [List all agents with status]
  [Start] [Stop] [Restart] [View Logs]

METRICS:
  [Export metrics (JSON)]
  [Clear old logs] [Archive]

STATE RECOVERY:
  [View current working-state.json]
  [Trigger manual checkpoint]
  [Resume from last checkpoint]
  [Clear session state (nuclear)]
```

---

## 7. ALERT ROUTING & ESCALATION

### Alert Types & Notification Rules

| Event | Auto-Fix | Alert Level | Joe Notification | Action |
|-------|----------|-------------|------------------|--------|
| LaunchAgent death | ✅ Restart | 1 | ❌ No | Auto-restart, log |
| Context at 60% | ✅ Checkpoint | 1 | ❌ No | Write state, continue |
| Context at 75% | ✅ Checkpoint | 2 | ⚠️ Yes | State written, context critical |
| Cron failure #1 | ❌ No | 1 | ❌ No | Monitor, log |
| Cron failure #2 | ❌ No | 1 | ❌ No | Monitor, log |
| Cron failure #3 | ✅ Disable | 2 | ⚠️ Yes | Job disabled, delivery validation needed |
| Invalid delivery config | ✅ Prevent | 1 | ❌ No | Block job creation, suggest fix |
| Codex quota exhausted | ❌ Auto-fallback | 1 | ❌ No | Route to Haiku, log |
| 3+ LaunchAgent restarts in 24h | ❌ No | 2 | ⚠️ Yes | Investigate, possible hardware issue |
| Session checkpoint failure | ❌ No | 3 | 🚨 Critical | Manual intervention needed |
| Gateway unreachable | ❌ No | 3 | 🚨 Critical | Manual restart required |

### Notification Routing
- **Alert Level 1:** Log to metrics.jsonl only
- **Alert Level 2:** Log + Command Center alert + async Discord notification
- **Alert Level 3:** Log + Command Center alert + Discord notification + iMessage to Joe

---

## 8. IMPLEMENTATION TIMELINE

### Phase 1: Foundation (Week 1 — 15h)
- [x] Design unified state cache schema
- [ ] Create `~/.openclaw/workspace/state/` directory
- [ ] Build working-state.json file handler (create, read, update, merge)
- [ ] Build metrics.jsonl appender + daily rotation
- [ ] Update session startup to load working-state.json automatically
- [ ] Deprecate old checkpoint system (ACTIVE-TASK.md → log file only)

**Deliverable:** Unified state system operational; all new work auto-saves to working-state.json

### Phase 2: Health & Recovery (Week 2 — 20h)
- [ ] Build health-monitor daemon (5-min interval checks)
- [ ] Implement LaunchAgent auto-restart logic
- [ ] Implement cron failure detection + auto-disable
- [ ] Build delivery validator + test message sender
- [ ] Implement context overflow checkpoint trigger
- [ ] Build automatic recovery procedures (re-enable jobs, recover from collapse)
- [ ] Create health-monitor LaunchAgent plist

**Deliverable:** Autonomous health monitoring + auto-recovery operational

### Phase 3: Visibility (Week 3 — 18h)
- [ ] Build Command Center API endpoints (metrics queries, alert retrieval)
- [ ] Build React components for Infrastructure Health tab
- [ ] Wire up real-time updates (WebSocket or polling)
- [ ] Build alert history view + filtering
- [ ] Build manual control panel (restart jobs, LaunchAgents, etc.)
- [ ] Create metrics visualization (trends, success rates, incident timeline)
- [ ] Write runbooks for escalation procedures

**Deliverable:** Full Command Center visibility + manual controls operational

### Phase 4: Hardening (Week 4 — 12h, concurrent with Phase 3)
- [ ] Test all auto-recovery procedures with simulated failures
- [ ] Load test health monitor (ensure 5-min checks don't impact main work)
- [ ] Test metrics rotation (ensure no data loss)
- [ ] Verify alert routing (Discord, iMessage, Command Center)
- [ ] Monitor for 1 week; tune thresholds based on real incidents
- [ ] Document all procedures in runbooks

**Deliverable:** System tested, hardened, documented; ready for full deployment

---

## 9. BACKWARD COMPATIBILITY

### How Old Systems Are Handled

**MEMORY.md:**
- Keep as strategic memory file (decisions, patterns, learnings)
- Stop using for state recovery
- Manual edits still allowed for documentation

**ACTIVE-TASK.md:**
- Keep as human-readable task log
- Automatically updated (but not primary source)
- sync-pending-questions.sh replaced by state cache queries

**LAST-SESSION.md:**
- Auto-generated from working-state.json on session end
- Stop manual edits
- Becomes purely informational

**Daily logs (memory/YYYY-MM-DD.md):**
- Keep for audit trail + learning
- No state recovery from these
- Continue appending notes manually

### Migration Steps
1. Keep all old files in place (don't delete)
2. Gradually migrate data to working-state.json
3. Run both systems in parallel for 2 weeks
4. Once confident, mark old system as deprecated

---

## 10. RISK MITIGATION

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Unified state file corruption | Atomic writes with temp file + rename; keep daily backups in git |
| Health monitor daemon crashes | LaunchAgent with KeepAlive=true; monitors itself |
| Auto-recovery breaks something | All auto-actions logged; can be audited + rolled back manually |
| Alert fatigue | Carefully tuned thresholds; low initial sensitivity, increase if needed |
| Metrics file grows too large | Daily rotation; old files archived; 90-day retention |

---

## 11. SUCCESS METRICS

**Before:**
- 8-12h/week on infrastructure fixes
- 6+ cron failures per week
- 3+ context collapses per month
- 30-60 min per incident diagnosis

**After (Target):**
- <2h/week on infrastructure maintenance
- 0-1 cron failures per week (preventive)
- 0-1 context collapses per month (auto-recovered)
- <5 min per incident diagnosis (dashboard shows root cause)

**Measurement:** Track in Command Center dashboard (Metrics tab). Calculate weekly efficiency gains.

---

## 12. QUESTIONS FOR JOE BEFORE IMPLEMENTATION

1. **State cache location:** Should working-state.json live in `~/.openclaw/workspace/state/` (new dir) or embedded in existing structure?

2. **Notification preference:** When auto-recovery fixes something (e.g., restart Ollama), should I:
   - ✅ Log it silently to metrics (no notification)?
   - Or notify Joe immediately on Discord?

3. **Escalation threshold:** At what point should I escalate to Joe?
   - Current: Only Level 2+ alerts notify
   - Or should even Level 1 events (LaunchAgent restart) be logged to Discord?

4. **Cron auto-disable:** When a cron job is about to auto-disable (3rd failure), should I:
   - Auto-fix it immediately (if delivery config is invalid)?
   - Or hold and ask Joe first?

5. **Dashboard performance:** Should health checks run:
   - Every 5 minutes (standard heartbeat)?
   - Or faster during high-activity periods?

---

**Ready to implement once you answer these clarifications.**

**Estimated total timeline:** 3 weeks, distributed (can be parallelized).  
**Estimated time savings:** 6-10h/week → 300-500h/year.  
**ROI:** Implementation cost (60h) paid back in ~1 month of operation.
