# HAL ↔ Alfred Quota Collision Prevention

**Problem:** Both Alfred and HAL now use the same Anthropic subscription quota. How do we prevent them from starving each other?

**Solution:** Three-layer safeguard system (hard gates → monitoring → escalation).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ Anthropic Subscription Quota (Monthly Pool)             │
│ e.g., 1M tokens/month = ~$20                            │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ↓                           ↓
   ┌──────────────┐           ┌──────────────┐
   │ Alfred       │           │ HAL          │
   │ (Main Agent) │           │ (Subagent)   │
   │              │           │              │
   │ • Daily      │           │ • Overnight  │
   │ • Analysis   │           │ • Code work  │
   │ • Complex    │           │ • Proactive  │
   │   decisions  │           │ • Batch jobs │
   └──────────────┘           └──────────────┘
```

**Key fact:** Both sessions share the same quota pool. Concurrent high usage can cause collisions.

---

## 1. Hard Quota Gates (Prevent Collisions)

**Applied BEFORE spawning HAL**, these reject spawn requests if quotas are dangerously high.

### Gate 1: Alfred Context Limit
```
IF Alfred.context_usage > 75%:
  REJECT HAL spawn
  REASON: Alfred is close to context death; spawning HAL now risks both sessions
  ACTION: Wait for Alfred to compress context (via checkpoint cron)
```

**Why 75%?** Leaves headroom for Alfred to recover. If Alfred hits 80%+ while HAL is running, both could lose state.

**Check:** `session_status` → context_usage_pct

### Gate 2: Subscription Quota Limit
```
IF Subscription.consumed > 85%:
  REJECT HAL spawn
  REASON: Monthly quota nearly exhausted; HAL spawn could burn last tokens
  ACTION: Wait for quota reset or reduce HAL complexity
```

**Why 85%?** Leaves 15% buffer for Alfred's essential work (decision-making, security analysis). If Alfred needs to work and quota is at 95%, she has nowhere to go.

**Check:** `curl http://localhost:3000/status | jq '.usage.consumed_pct'`

### Gate 3: Codex Rate Limit (Known Issue)
```
IF Codex.timeouts_in_last_hour > 2:
  DOWNGRADE: Don't use Codex for HAL tasks
  FALLBACK: Use Haiku instead
  REASON: Codex is rate-limited at 500k TPM shared; repeated timeouts mean it's saturated
```

**Why?** Codex timeout cascades can deadlock the gateway. Better to detect early and use Haiku.

---

## 2. Model Selection Awareness (Reduce Quota Burn)

When gates pass, HAL's model is chosen intelligently:

### Quota-Aware Routing

```
IF Subscription.consumed >= 70%:
  "Austerity mode" — aggressively use LOCAL/Codex
  
  Model tiers:
  - Code tasks → Codex (free, rate-limited)
  - General tasks → LOCAL (free, local-only)
  
ELSE:
  Normal routing (LOCAL → Codex → Haiku → Sonnet → Opus)
```

**Example:**
- Quota at 65% → HAL spawn with Sonnet (normal)
- Quota at 75% → HAL spawn with Haiku (cheaper)
- Quota at 80% → HAL spawn rejected (gate 2)

---

## 3. Monitoring & Alerts (Detect Trends)

**Daily monitoring** (7 AM cron):
```bash
bash scripts/quota-monitor.sh
```

Checks:
- Subscription consumption rate (tokens/day)
- Alfred context growth (session size trend)
- HAL task count + avg model tier used
- Projection: Will quota hit 95% before reset?

**Alert if:**
- Consumption accelerates >10% day-over-day → Notify Joe
- Alfred context growing >5% per session → Optimize memory
- HAL avg model tier drifting toward Sonnet/Opus → Use LOCAL more

---

## 4. Concurrent Execution Safety

**Scenario A: Alfred and HAL both running simultaneously**

| Time | Alfred | HAL | Gateway | Risk |
|------|--------|-----|---------|------|
| 14:00 | Working (40% context) | Spawned (Haiku) | Routing both | LOW |
| 14:15 | Working (60% context) | Running (Haiku) | Routing both | MEDIUM |
| 14:30 | Checkpoint triggered | Still running | Auto-compress Alfred | SAFE (checkpoint prevents collision) |
| 14:45 | Compressed (20% context) | Complete | Finish | OK |

**Gate prevents collision:** If Alfred hits 75%+, HAL spawn is rejected.

**Checkpoint prevents cascade:** Session checkpoint cron (every 20 min) auto-saves Alfred state at 60%+, preventing context death while HAL is running.

---

## 5. Recovery Procedures

### If Quota Hits 95%

```
1. IMMEDIATE: Only use LOCAL model for all tasks
2. Check usage pattern:
   - Is Alfred burning too much? (context monitoring)
   - Is HAL spawning too many high-tier tasks? (disable spawning)
3. Wait for quota reset (monthly)
4. Post-mortem: Update quotas/limits if pattern repeats
```

### If Alfred Context Hits 75%

```
1. AUTOMATIC: Session checkpoint cron triggers
2. State written to: ACTIVE-TASK.md, LAST-SESSION.md, NOW.md, daily log
3. HAL spawns rejected (gate 1 blocks)
4. Compress context manually if needed:
   bash scripts/session-compress.sh
5. Resume once context < 60%
```

### If Codex Rate Limit Hits

```
1. Codex spawn fails with timeout
2. hal-spawn-model-aware.sh catches failure
3. Fallback: Retry with Haiku
4. Log incident: memory/codex-timeout-YYYY-MM-DD.log
5. Reduce Codex usage if >2 timeouts/hour
```

---

## 6. Configuration & Tuning

**File:** `~/.openclaw/workspace/HAL-QUOTA-CONFIG.json`

```json
{
  "quota_gates": {
    "alfred_context_limit_pct": 75,
    "subscription_quota_limit_pct": 85,
    "codex_timeout_threshold": 2,
    "codex_timeout_window_hours": 1
  },
  "quota_austerity": {
    "enabled_at_pct": 70,
    "prefer_models": ["local", "codex"],
    "skip_models": ["sonnet", "opus"]
  },
  "monitoring": {
    "daily_check_time": "07:00",
    "projection_days_ahead": 7,
    "alert_if_consumption_accel_pct": 10
  }
}
```

**Tuning examples:**
- If HAL spawns too often rejected: Lower `alfred_context_limit_pct` to 70%
- If quota burns too fast: Lower `quota_austerity.enabled_at_pct` to 60%
- If Codex timeouts frequent: Increase `codex_timeout_threshold` to 3

---

## 7. Verification Checklist

Run this to verify no quota collisions will occur:

```bash
#!/bin/bash
# Verify quota safeguards are live

echo "1. Check Alfred context monitoring..."
session_status | jq '.context_usage_pct'
# Expected: < 75%

echo "2. Check subscription quota..."
curl -s http://localhost:3000/status | jq '.usage.consumed_pct'
# Expected: < 85%

echo "3. Check Codex timeout rate..."
grep -c "timeout" ~/.openclaw/workspace/.hal-spawn-logs/* 2>/dev/null | tail -1
# Expected: < 2 in last hour

echo "4. Check HAL-spawn script is installed..."
[[ -x ~/.openclaw/workspace/scripts/hal-spawn-model-aware.sh ]] && echo "✓ PASS" || echo "✗ FAIL"

echo "5. Check quota config is in place..."
[[ -f ~/.openclaw/workspace/HAL-QUOTA-CONFIG.json ]] && echo "✓ PASS" || echo "✗ FAIL"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Quota safeguards verified."
```

---

## 8. Cost Impact

| Scenario | Monthly Cost | Risk |
|----------|--------------|------|
| **Baseline (Alfred only)** | ~$20 | None |
| **+ HAL (normal routing)** | ~$25 | None (gates prevent collision) |
| **+ HAL (heavy usage)** | ~$30 | LOW (gates + quota austerity) |
| **+ HAL (no gates)** | ~$50+ | HIGH (no safeguards) |

**Bottom line:** Safeguards cost nothing and prevent quota burnout.

---

## 9. FAQ

**Q: What if Alfred is working and HAL needs to spawn?**  
A: Gates check Alfred's context. If < 75%, HAL spawns with lower model tier (Haiku instead of Sonnet). Both can coexist.

**Q: Can HAL and Alfred both use Sonnet simultaneously?**  
A: Yes, but only if:
- Alfred context < 75%
- Quota consumed < 85%
- Both using Sonnet briefly is fine; sustained dual-Sonnet is rare

**Q: What if quota hits 95%?**  
A: HAL spawns rejected (gate 2). Alfred continues (essential). Wait for reset.

**Q: Can I raise the context gate from 75% to 80%?**  
A: Risky. 75% is conservative. At 80%, both sessions could hit context death simultaneously. Not recommended.

**Q: How often should I check quota?**  
A: Daily (7 AM cron). Weekly review if consumption rate is fast. Monthly budget reset.

---

## Implementation Status

- ✅ `hal-spawn-model-aware.sh` — Implements gates + model selection
- ✅ `HAL-QUOTA-CONFIG.json` — Configuration (to be created)
- ⏳ `quota-monitor.sh` — Daily monitoring cron (to be created)
- ⏳ `session-compress.sh` — Manual context compression (to be created)

---

**Created:** 2026-03-09  
**Status:** Ready for implementation  
**Joe approval:** Pending
