# HEARTBEAT.md - Periodic Health Checks

**Purpose:** Lightweight monitoring tasks to run every 30-60 minutes during active sessions.

**Pattern:** Batch all checks into one heartbeat call (reduce API overhead). Use `session_status` to inform alert thresholds.

---

## 📊 Monitoring Checklist

**All checks run with LOCAL model (ollama/llama3.2:3b) for $0 cost. Use Haiku fallback if LOCAL unavailable.**

### Check 1: Context Compression Alert ⚠️
**Run:** Every heartbeat
**Model:** LOCAL (or Haiku fallback)
**Action:** Call `session_status` and log context usage %
**Alert threshold:** 
- **65-70%** → Proactive memory capture (spawn LOCAL sub-agent BEFORE emergency)
- **70-75%** → Write checkpoint to NOW.md, create snapshot of current task
- **75-80%** → Switch to lighter models, compress memory
- **>80%** → CRITICAL - trigger emergency compression (full NOW.md checkpoint + session split)

**KEY FIX (2026-02-11):** Run Check 4 (memory capture) at 65% threshold, NOT at 100%. Proactive extraction prevents context death.

**Log format:**
```
timestamp | context% | model | token_cost | status
2026-02-09T00:15:00 | 62% | sonnet | $0.15 | OK
2026-02-09T00:45:00 | 71% | haiku | $0.08 | CHECKPOINT_WRITTEN
```

---

### Check 2: Token Efficiency Trends 📈
**Run:** Every 3 heartbeats (roughly every 90-180 min)
**Action:** Calculate and log efficiency metrics
**Metrics to track:**
- Avg tokens per task (recent 5 tasks)
- Model tier distribution (% LOCAL vs Haiku vs Sonnet vs Opus)
- Cost per completed task
- Trend: increasing/decreasing efficiency

**Log to:** `memory/heartbeat-efficiency.json` (append-only)

**Example entry:**
```json
{
  "timestamp": "2026-02-09T01:00:00",
  "context_pct": 68,
  "recent_tasks": 5,
  "avg_tokens_per_task": 1850,
  "model_distribution": { "local": 60, "haiku": 30, "sonnet": 10, "opus": 0 },
  "cost_per_task_usd": 0.015,
  "trend": "improving"
}
```

---

### Check 3: File Size Monitoring 📏
**Run:** Once per month (add to first heartbeat of month)
**Action:** Check AGENTS.md character count
**Alert threshold:** 
- **>19,800 chars** → Time to split (extract section to satellite file)
- **>20,000 chars** → CRITICAL (system can crash)
**Log to:** `AGENTS-SPLITS.md` growth log

**Command:**
```bash
wc -c /Users/hopenclaw/.openclaw/workspace/AGENTS.md
```

**Expected:** <20,000 chars. If over threshold, read AGENTS-SPLITS.md for escalation plan.

---

### Check 4: Session Continuity (Optional)
**Run:** If session >4 hours
**Action:** Verify memory/INDEX.md is current, MEMORY.md is in sync
**Alert:** If INDEX.md outdated → update from daily log

---

### Check 5: Memory Capture (Deferred) 🧠
**Status:** ✅ **Deferred until 65% context threshold is consistently hit** (Decision: 2026-02-17)
**Original proposal:** Spawn LOCAL sub-agent at 65% context to proactively extract conversation context.
**Decision:** Hold this feature for now. Current sessions rarely hit compression thresholds. If context starts regularly approaching 70%+, revisit and activate. Keep the pattern in AGENTS.md for reference.
**Rationale:** Premature automation adds complexity without solving current problem. Main session at 0-25% context most of the time.
**Reactivation trigger:** If heartbeat logs show >3 sessions/week hitting 65%+ context, implement Check 4 immediately.

---

## ⏰ Quiet Hours Compliance

**Respect USER.md proactive hours: 8:30am - 11pm AST (America/Moncton, UTC-4)**

During quiet hours (11pm - 8:30am):
- Run checks silently (log only, no alerts)
- Emergency alerts only (>80% context = CRITICAL)
- Defer non-urgent notifications until 8:30am
- Continue logging to heartbeat-efficiency.json (silent tracking)

**Exception:** If context >80% during quiet hours, alert immediately (crash prevention).

---

## 🎯 Implementation Notes

1. **Current runtime:** LOCAL (ollama/llama3.2:3b) for maximum cost efficiency
   - Cost: $0 (runs locally on your machine)
   - Speed: Fast (3-second response typical)
   - Tradeoff: Slightly lower reasoning quality vs Haiku, but excellent for status checks
   - Fallback: If LOCAL unavailable, use Haiku (still cheap at $0.0001/1K tokens)
2. **No external API calls** in heartbeat unless explicitly triggered
3. **Batch checks:** Run all 3 together, don't spread across multiple heartbeats
4. **Preserve silence:** Don't spam user; only alert on threshold breaches
5. **Reversible:** If alerts are too noisy, edit thresholds without code changes

---

## 📋 False-Positive Prevention

- **70% threshold too aggressive?** → Increase to 75%
- **Efficiency trend noisy?** → Calculate rolling average (last 10 tasks, not 5)
- **Getting too many checkpoints?** → Require 2 consecutive 70%+ readings before alert

---

## Archive Log Location

Logs stored in:
- `memory/heartbeat-efficiency.json` — Efficiency metrics (append-only)
- `memory/heartbeat-state.json` — Last check timestamps (overwrite OK)
- `NOW.md` — Active checkpoint (when triggered)

**Cleanup:** Archive heartbeat logs older than 30 days to `memory/archive/` to keep recent data hot.

---

## 🔔 Slack Task Notifications

**New (2026-02-11):** Significant task completions notify Slack channel **C0AEE0PLKB4**

Format for each notification:
```
✅ [TASK_NAME]
Brief summary of what was done
Result: [accomplishment summary]
```

Examples:
```
✅ Dashboard Audit & Plan
Audited Alfred-Dashboard project structure and dependencies
Result: Created IMPLEMENTATION-PLAN.md with prioritized updates
```

---

## 💡 Future Enhancements

- Post efficiency trends to dashboard weekly
- Compare context% across different model tiers
- Predict when compression will be needed (trending data)
- Auto-suggest model tier changes based on patterns
