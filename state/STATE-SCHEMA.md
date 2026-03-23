# Working State Cache Schema

**Version:** 1.0  
**Location:** `~/.openclaw/workspace/state/working-state.json`  
**Purpose:** Single source of truth for all active session state, task progress, and recovery metadata.

---

## File Structure

```json
{
  "state_version": "1.0",
  "last_updated": "2026-03-22T16:08:00Z",
  "session_id": "agent:main:main",
  
  "active_work": {
    "current_task": {
      "card_id": "task_1234567890_xxxxxxxx",
      "title": "Task title",
      "objective": "What the task is trying to achieve",
      "status": "idle|in_progress|review|done",
      "progress": "Current progress description",
      "next_step": "What to do next",
      "started_at": "2026-03-22T10:00:00Z",
      "context_snapshot": {
        "model": "haiku|sonnet|opus|codex|local",
        "tokens_used": 12450,
        "context_pct": 33
      }
    },
    "blocked_by": [
      {
        "type": "approval|decision|external|technical",
        "description": "What's blocking progress",
        "since": "2026-03-22T10:00:00Z"
      }
    ]
  },
  
  "pending_decisions": [
    {
      "id": "notif_1234567890_xxxxxxxx",
      "question": "What decision needs to be made",
      "context": "Why this matters",
      "status": "waiting|escalated",
      "created": "2026-03-21T06:31:00Z",
      "escalation_at": "2026-03-25T06:31:00Z",
      "options": [
        "Option 1",
        "Option 2"
      ],
      "recommendation": "Which option Alfred recommends"
    }
  ],
  
  "session_checkpoint": {
    "last_checkpoint": "2026-03-22T15:18:00Z",
    "context_at_checkpoint": 85,
    "reason": "Gateway auto-restart triggered",
    "recovery_steps": [
      "Step 1 to resume work",
      "Step 2 to resume work"
    ]
  },
  
  "memory_references": {
    "loaded_files": [
      "MEMORY.md",
      "AGENTS.md",
      "memory/2026-03-22.md"
    ],
    "long_term_decisions": [
      "decisions/decision-1.md"
    ]
  }
}
```

---

## Field Definitions

### `state_version` (string)
Schema version. Bump when making breaking changes.

### `last_updated` (ISO 8601 timestamp)
When this state was last written. Updated on every save.

### `session_id` (string)
OpenClaw session identifier. Used to match checkpoint to session context.

### `active_work.current_task` (object)
Current task information. Can be empty if status is IDLE.

**Fields:**
- `card_id`: Kanban card ID (if assigned from board)
- `title`: Human-readable task title
- `objective`: What the task is trying to accomplish
- `status`: One of `idle`, `in_progress`, `review`, `done`
- `progress`: Current progress (1-2 sentences)
- `next_step`: What to do next (used to resume after checkpoint)
- `started_at`: When task started (ISO 8601)
- `context_snapshot.model`: Which model is being used for this task
- `context_snapshot.tokens_used`: Tokens consumed so far
- `context_snapshot.context_pct`: Context usage % at last checkpoint

### `active_work.blocked_by` (array)
What's preventing progress. Can be empty.

**Types:**
- `approval` — Waiting for Joe to approve something
- `decision` — Waiting for Joe to make a decision
- `external` — Waiting for external service (API, user, etc.)
- `technical` — Waiting for technical issue to be resolved

### `pending_decisions` (array)
Decisions waiting on Joe. Auto-populated from Command Center notifications.

### `session_checkpoint` (object)
Recovery metadata from last context overflow or session crash.

- `last_checkpoint`: When checkpoint was written
- `context_at_checkpoint`: Context % when checkpoint was written
- `reason`: Why checkpoint was created (e.g., "Gateway auto-restart triggered")
- `recovery_steps`: Ordered list of steps to resume work

### `memory_references` (object)
Which memory files are loaded in current session. Used to determine what to reload on startup.

---

## Update Triggers

State file is written (atomically) in these scenarios:

1. **Task completion:** When a task moves from in_progress → review/done
2. **Progress update:** Every 30 min during active work (capture current progress)
3. **Decision point:** When a decision is made or escalated
4. **Context checkpoint:** When context usage exceeds 60%
5. **Session end:** When session naturally concludes
6. **Blocking event:** When new blocker appears

---

## Read Triggers

State file is read in these scenarios:

1. **Session startup:** Automatically load to recover state
2. **Manual query:** `jq` commands to extract specific fields
3. **Recovery procedure:** After context collapse to resume work

---

## Atomic Write Pattern

To prevent corruption:

```bash
# 1. Write to temp file
jq . > working-state.json.tmp

# 2. Verify temp file is valid JSON
jq . working-state.json.tmp > /dev/null || {
  rm working-state.json.tmp
  exit 1
}

# 3. Atomic rename
mv working-state.json.tmp working-state.json

# 4. Backup
cp working-state.json backups/working-state-$(date +%s).json
```

---

## Backward Compatibility

Old system files remain in place but are no longer primary sources:

| Old File | New Role | Notes |
|----------|----------|-------|
| MEMORY.md | Strategic memory only | Decisions, patterns, learnings |
| ACTIVE-TASK.md | Human-readable log | Auto-updated but not primary |
| LAST-SESSION.md | Auto-generated | Created from working-state.json on session end |
| NOW.md | Emergency lifeboat | Auto-created on context overflow |
| memory/YYYY-MM-DD.md | Audit trail | Continue appending notes |

---

## Migration Path

1. **Week 1:** Both systems run in parallel
2. **Week 2:** Phase 1 stable, Phase 2 (health monitor) integration begins
3. **Week 3:** Full system operational, old system marked deprecated
4. **Month 2:** Archive old files, keep for historical reference only

---

## Validation Rules

On read:
- If `state_version` is older than current schema, log deprecation warning
- If `session_id` doesn't match current session, don't auto-load (manual recovery only)
- If timestamp is >30 min old, freshness warning (state may be stale)

On write:
- Always use atomic pattern (temp → validate → rename)
- Always create backup before write
- Always log write event to metrics.jsonl
