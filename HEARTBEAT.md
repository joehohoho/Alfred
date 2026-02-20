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
- **60-65%** → Update ACTIVE-TASK.md + LAST-SESSION.md (lightweight state capture)
- **65-70%** → All of above + update NOW.md checkpoint + append to memory/YYYY-MM-DD.md
- **70-75%** → All of above + compress non-essential context, switch to lighter models
- **75-80%** → All of above + aggressive compression
- **>80%** → CRITICAL - emergency compression (full checkpoint + session split)

**KEY FIX (2026-02-20):** Session Checkpoint cron now runs every 20 min and triggers state capture at 60%+. Three files persist task state across context death: ACTIVE-TASK.md (write-ahead task log), LAST-SESSION.md (session bridge), NOW.md (emergency lifeboat). All loaded on next session start.

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
**Run:** Daily (automated via Daily Config & Memory Review cron at 7 AM)
**Action:** Run `bash ~/.openclaw/workspace/scripts/agents-size-guard.sh`
**Alert thresholds:**
- **<85% (17,000 chars)** → ✅ Safe, no action
- **85-95% (17,000-19,000)** → ⚠️ WARNING: Plan extraction of largest section to satellite file
- **>95% (19,000 chars)** → 🚨 CRITICAL: Extract sections immediately (system crash risk)
**Auto-notification:** Script sends Command Center notification at warning/critical levels

**Satellite files (already extracted):**
- `GIT-CONFIG.md` — Git commit email configuration
- `GROUP-CHAT-GUIDELINES.md` — Group chat behavior rules

**Current status:** 15,710/20,000 chars (78.6%) — Safe ✅

---

### Check 4: System Reliability Audit ⚙️ (NEW - 2026-02-18)
**Run:** Once per day (morning preferred)
**Model:** LOCAL
**Action:** Verify infrastructure health
**Checks:**
- LaunchAgents running: com.ollama.keepalive, com.openclaw.imsg-responder, com.alfred.dashboard-nextjs, com.cloudflare.tunnel
  - Command: `launchctl list | grep com. | wc -l` (should be 4+)
  - Verify each can restart on failure (check plist for `<key>KeepAlive</key><true/>`)
- Cron jobs executed in last 24h (check git log, log file)
- Ollama health (response time <1000ms, models loaded/unloaded properly)
- Memory usage (if >70% context, alert)

**Alert threshold:**
- Any LaunchAgent not running → RESTART and log incident
- Cron job failed/missing → Flag for immediate investigation
- Ollama slow → Check system load, restart if needed
- Memory >70% → Emergency checkpoint

**Status:** ✅ Implemented. Replaces old Check 4. Part of "reliability is autonomy" principle.

---

### Check 5: Model Continuity Verification 🔄 (NEW - 2026-02-18)
**Run:** When switching between model tiers (LOCAL→Haiku→Sonnet→Opus)
**Action:** Verify context handoff is clean
**Checkpoint format:**
```
## Model Context Handoff [timestamp]
**FROM:** [previous_model] | **TO:** [new_model]
**Why:** [escalation reason]
**Context Preserved:**
- Task state: [current objective]
- Key decisions: [relevant prior conclusions]
- Memory references: [MEMORY.md sections loaded]
- Unknown unknowns: [what wasn't loaded]
```
**Where:** Write to memory/NOW.md before generation from new model
**Purpose:** Ensures continuity across substrate switches. Identity persists through model changes.

**Status:** ✅ Implemented. Part of "river is not the banks" principle from Moltbook essay.

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
