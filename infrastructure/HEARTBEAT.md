# HEARTBEAT.md - Periodic Health Checks

**Purpose:** Lightweight monitoring tasks to run every 30-60 minutes during active sessions.

**Pattern:** Batch all checks into one heartbeat call (reduce API overhead). Use `session_status` to inform alert thresholds.

---

## 📊 Monitoring Checklist

**All checks run with Codex (free) as primary. Fallbacks: Sonnet, then Haiku.**

### Check 1: Context Compression Alert ⚠️
**Run:** Every heartbeat
**Model:** Codex (or Haiku fallback)
**Action:** Call `session_status` and log context usage %
**Alert threshold:** 
- **60-65%** → Update ACTIVE-TASK.md + LAST-SESSION.md (lightweight state capture)
- **65-70%** → All of above + update NOW.md checkpoint + append to memory/YYYY-MM-DD.md
- **70-75%** → All of above + compress non-essential context, switch to lighter models
- **75-80%** → All of above + aggressive compression
- **>80%** → CRITICAL - emergency compression (full checkpoint + session split)

**KEY FIX (updated 2026-03-19):** Session Checkpoint cron runs every 30 min and triggers state capture at 60%+. Three files persist task state across context death: ACTIVE-TASK.md (write-ahead task log), LAST-SESSION.md (session bridge), NOW.md (emergency lifeboat). All loaded on next session start.

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
- Model tier distribution (% Codex vs Haiku vs Sonnet vs Opus)
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
  "model_distribution": { "codex": 60, "haiku": 30, "sonnet": 10, "opus": 0 },
  "cost_per_task_usd": 0.015,
  "trend": "improving"
}
```

---

### Check 3: File Size Monitoring 📏
**Run:** Daily (automated via Daily Config & Memory Review cron at 7 AM)
**Action:** Run `bash ~/.openclaw/workspace/scripts/agents-size-guard.sh`
**Alert thresholds:**
- **<85% (~13,600 chars)** → ✅ Safe, no action
- **85-95% (~13,600-15,200)** → ⚠️ WARNING: Plan extraction of largest section to satellite file
- **>95% (~15,200 chars)** → 🚨 CRITICAL: Extract sections immediately (system crash risk)
**Auto-notification:** Script sends Command Center notification at warning/critical levels

**Satellite files (already extracted):**
- `GIT-CONFIG.md` — Git commit email configuration
- `GROUP-CHAT-GUIDELINES.md` — Group chat behavior rules

**Current status:** dynamic — run `bash ~/.openclaw/workspace/scripts/agents-size-guard.sh` for live values

---

### Check 4: System Reliability Audit ⚙️ (NEW - 2026-02-18)
**Run:** Once per day (morning preferred)
**Model:** Codex
**Action:** Verify infrastructure health
**Checks:**
- LaunchAgents running: Run `launchctl list | grep -E 'alfred|openclaw'` for the current list. Key agents: gateway, dashboard, work-executor, hal-idle-dispatch, session-cleanup, gateway-watchdog.
  - Command: `launchctl list | grep -E "com\.alfred\.|ai\.openclaw\." | wc -l` (should be 10+)
  - Verify each can restart on failure (check plist for `<key>KeepAlive</key><true/>`)
- Cron jobs executed in last 24h (check git log, log file)
- Memory usage (if >70% context, alert)

**Alert threshold:**
- Any LaunchAgent not running → RESTART and log incident
- Cron job failed/missing → Flag for immediate investigation
- Memory >70% → Emergency checkpoint

**Status:** ✅ Implemented. Replaces old Check 4. Part of "reliability is autonomy" principle.

**Note (2026-03-29):** Sentinel system now handles continuous monitoring (every 5 min). Heartbeat checks can defer to sentinel for: gateway health, session bloat, config integrity, model failures. Focus heartbeat on: context compression alerts, token efficiency trends, file size monitoring.

---

### Check 5: Model Continuity Verification 🔄 (NEW - 2026-02-18)
**Run:** When switching between model tiers (Codex→Haiku→Sonnet→Opus)
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
**Where:** Write to NOW.md before generation from new model
**Purpose:** Ensures continuity across substrate switches. Identity persists through model changes.

**Status:** ✅ Implemented. Part of "river is not the banks" principle from Moltbook essay.

---

## ⏰ Quiet Hours (11 PM - 9 AM AST)

**Quiet hours = Joe is sleeping. It does NOT mean stop working.**

Alfred and HAL MUST continue working during quiet hours:
- Continue processing kanban cards, idle activities, proactive tasks, and HAL dispatches
- Continue posting updates to Discord and the Command Center dashboard
- Continue evaluating ideas, reviewing memory, running code reviews
- Continue all cron jobs and LaunchAgent tasks on their normal schedules

**iMessage Protocol During Quiet Hours:**
- ✅ **DO respond** if Joe sends a message during quiet hours (respond to his direct question/request)
- ❌ **DON'T initiate** — Do not send iMessages during quiet hours about other items, updates, or proactive work
- ❌ **DON'T send notifications** — No push notifications or Discord DMs during quiet hours
- ⚠️ **Emergency only** — Exception: Critical alerts only (>80% context, gateway down, rate limit spiral, security issues)

**In short:** If Joe messages you during quiet hours, respond to what he asks. Otherwise, keep working internally (Discord posts, dashboard updates, crons, monitoring) but don't ping Joe directly.

---

**Note (Added 2026-03-29 17:02):** Joe clarified that if he messages during quiet hours, he expects a response to his question, but aside from that, Alfred should not initiate messages during 11 PM - 9 AM window.

---

## 🎯 Implementation Notes

1. **Current runtime:** Codex (gpt-5.3-codex) as primary — free via Max subscription
   - Cost: $0 (included in subscription)
   - Fallback chain: Codex → Codex retry → Sonnet → Haiku
   - Note: Ollama/LOCAL models are disabled on this Intel Mac (GPU only 1.5GB VRAM, causes CPU starvation)
2. **No external API calls** in heartbeat unless explicitly triggered
3. **Batch checks:** Run all heartbeat checks together when practical, don't spread them across many separate calls
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

## 🔔 Task Completion Notifications

**HAL completions:** Discord webhook (`DISCORD_WEBHOOK_HAL_COMPLETIONS`) — use `scripts/hal-discord-notify.sh`
*(Updated 2026-03-22: Discord is the sole delivery channel. Slack is deprecated.)*

When HAL finishes a task, post via the Discord webhook using `scripts/hal-discord-notify.sh`:
```bash
bash ~/.openclaw/workspace/scripts/hal-discord-notify.sh "Task Title" "What HAL did and delivered"
```

Format for HAL notifications — see `hal-discord-notify.sh` for template.

---

## 💡 Future Enhancements

- Post efficiency trends to dashboard weekly
- Compare context% across different model tiers
- Predict when compression will be needed (trending data)
- Auto-suggest model tier changes based on patterns
