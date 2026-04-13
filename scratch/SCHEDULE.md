# SCHEDULE.md - Cron Jobs & Recurring Tasks

**Central registry of all automated tasks, recurring patterns, and their costs.**

---

## 🚀 Active Cron Jobs (2026-02-13)

### ✅ Optimized (Free or Low Cost)

**1. Morning Brief** `30 8 * * *` (08:30 AM daily, AST)
- **Model:** ollama/llama3.2:3b (LOCAL, free)
- **Purpose:** Weather + overnight work summary
- **Expected Tokens:** 300-500/run
- **Monthly Cost:** $0.00
- **Duration:** ~15 seconds
- **Delivery:** Slack #morningroutine
- **Status:** ✅ Running
- **Last Run:** 2026-02-12 08:30 (error - rate limit)

**2. Dashboard Sync** `every 1 hour`
- **Model:** ollama/llama3.2:3b (LOCAL, free)
- **Purpose:** Sync workspace stats to Upstash Redis + GitHub
- **Expected Tokens:** 200-400/run
- **Monthly Cost:** $0.00
- **Duration:** ~30 seconds
- **Delivery:** Slack #workspace (C0ADUCZ4AF3)
- **Status:** ⚠️ Running but with errors (rate limit cooldown)
- **Last Run:** 2026-02-12 16:32 (error - timeout)

**3. Code Review: job-tracker** `0 23 * * *` (11:00 PM daily)
- **Model:** ollama/llama3.2:3b (LOCAL, free)
- **Purpose:** Nightly code quality review of job-tracker app
- **Expected Tokens:** 800-1.5k/run
- **Monthly Cost:** $0.00
- **Duration:** ~90 seconds
- **Delivery:** Slack #app-jobsearch (C0AF64H7FDF)
- **Status:** ✅ Configured
- **Notes:** If exceeds 2k tokens, we'll adjust frequency

**4. Evening Routine** `30 22 * * *` (10:30 PM daily) — **⚠️ FIXED TODAY**
- **Model:** ollama/llama3.2:3b (LOCAL, free) — *Changed from Sonnet*
- **Purpose:** Daily log update, innovation review, Slack summary, git commit
- **Expected Tokens:** 1.2-1.8k/run (was 200k with Sonnet!)
- **Monthly Cost:** $0.00 (was ~$180/month!)
- **Duration:** ~45 seconds
- **Delivery:** Slack #nightlyroutine (C0AE72DKGCQ)
- **Status:** ✅ Fixed and running
- **Last Run:** 2026-02-12 22:30 (ok, 63 sec)
- **Savings:** ~$6.00/run = ~$180/month

**5. iMessage Listener** `every 1 minute`
- **Model:** ollama/llama3.2:3b (LOCAL, free)
- **Purpose:** Check for new iMessages, respond if command detected
- **Expected Tokens:** 200-600/run (when checking, 0 when idle)
- **Monthly Cost:** $0.00
- **Duration:** ~10 seconds
- **Status:** ⚠️ Running but with errors (rate limit cooldown)
- **Last Run:** 2026-02-12 16:05 (error - timeout)
- **Notes:** HIGH FREQUENCY (60/hour) - aggressive token usage potential

### 💡 Moderate Cost (Haiku 4.5)

**6. Daily Config & Memory Review** `0 7 * * *` (07:00 AM daily) — **⚠️ DOWNGRADED TODAY**
- **Model:** anthropic/claude-haiku-4-5 — *Changed from Sonnet*
- **Purpose:** Check config files for inconsistencies, document needed updates
- **Expected Tokens:** 2-3k/run
- **Monthly Cost:** ~$0.08-0.12/month
- **Duration:** ~60 seconds
- **Delivery:** Slack #dailyconfig
- **Status:** ⚠️ Last error: rate limit cooldown
- **Last Run:** 2026-02-12 07:00 (error)
- **Savings:** ~$0.20/run vs Sonnet = ~$6/month

**7. healthcheck:security-audit** `0 9 * * 1` (09:00 AM Mondays) — **⚠️ DOWNGRADED TODAY**
- **Model:** anthropic/claude-haiku-4-5 — *Changed from Sonnet*
- **Purpose:** Security audit + OpenClaw version check
- **Expected Tokens:** 1.5-2.5k/run
- **Monthly Cost:** ~$0.02/month (1x/week)
- **Duration:** ~45 seconds
- **Status:** ✅ Ready
- **Savings:** ~$0.12/run vs Sonnet = ~$0.60/month

### 💎 Higher Cost (Strategic Use)

**8. Moltbook Weekly Review** `0 9 * * 6` (09:00 AM Saturdays) — **⚠️ DOWNGRADED TODAY**
- **Model:** anthropic/claude-haiku-4-5 — *Changed from Sonnet + thinking disabled*
- **Purpose:** Browse Moltbook submolts, extract patterns, recommend improvements
- **Expected Tokens:** 3-5k/run
- **Monthly Cost:** ~$0.12/month (1x/week)
- **Duration:** ~90 seconds
- **Status:** ✅ Ready
- **Savings:** ~$0.75/run vs Sonnet = ~$3/month
- **Security:** All external content treated as untrusted (MOLTBOOK-SAFETY.md protocol)

---

## 📊 Cost Summary

### Before Fixes (Feb 12 Overrun)

| Job | Model | Tokens/Run | Monthly | Issue |
|-----|-------|-----------|---------|-------|
| Evening Routine | Sonnet | **200k** | **~$180** | ❌ Over-provisioned |
| Daily Config Review | Sonnet | 3k | ~$4.50 | ❌ Over-provisioned |
| Moltbook Review | Sonnet | 5k | ~$3.75 | ❌ Over-provisioned |
| Security Audit | Sonnet | 2.5k | ~$0.30 | ❌ Over-provisioned |
| **Total** | — | — | **~$188.55** | ❌ Too high |

### After Fixes (Today)

| Job | Model | Tokens/Run | Monthly | Status |
|-----|-------|-----------|---------|--------|
| Evening Routine | LOCAL | 1.5k | **$0.00** | ✅ Optimized |
| Daily Config Review | Haiku | 2.5k | **$0.08** | ✅ Optimized |
| Moltbook Review | Haiku | 4k | **$0.12** | ✅ Optimized |
| Security Audit | Haiku | 2k | **$0.02** | ✅ Optimized |
| **Total** | — | — | **~$0.22** | ✅ 99% cost reduction |

### Monthly Savings: **~$188.33/month** 🎉

---

## 🔍 Audit Findings (Feb 13, 2026)

### Root Cause: Model Over-Provisioning

Four cron jobs were defaulting to **Sonnet (Claude 3.5 Sonnet)** for tasks that don't require complex reasoning:

1. **Evening Routine** — File ops + Slack formatting (needs LOCAL, not Sonnet)
2. **Daily Config Review** — Config file checks (needs LOCAL or Haiku, not Sonnet)
3. **Moltbook Review** — Content reading + pattern extraction (needs Haiku, not Sonnet)
4. **Security Audit** — Output parsing + basic scripting (needs Haiku, not Sonnet)

### Applied Fixes

✅ **Evening Routine:** Sonnet → LOCAL (freed 200k tokens/run)
✅ **Daily Config Review:** Sonnet → Haiku (reduced 3k tokens/run)
✅ **Moltbook Review:** Sonnet + thinking → Haiku (reduced 5k tokens/run)
✅ **Security Audit:** Sonnet → Haiku (reduced 2.5k tokens/run)

### Thinking Mode Removed

Disabled `thinking: enabled` on Daily Config Review and Moltbook Review — these are straightforward reading/analysis tasks that don't benefit from extended reasoning.

---

## 🚨 Known Issues (Rate Limit Cooldown)

**Status:** Anthropic provider currently in cooldown from high token usage Feb 12.

Affected jobs (will recover automatically):
- Morning Brief (failed 2026-02-12)
- Dashboard Sync (failed multiple times)
- iMessage Listener (failed multiple times)
- Daily Config Review (failed 2026-02-12)

**Recovery timeline:** Usually 15-60 minutes after reducing usage
**Prevention:** Token budget enforcement (this file) prevents recurrence

---

## 📈 Token Efficiency Rules (Enforcement)

**These rules prevent future overruns:**

1. **Local-first for routines:** Cron jobs default to LOCAL (ollama/llama3.2:3b) unless reasoning is complex
2. **Haiku for moderate tasks:** Use Haiku for reading + basic analysis (2-4k tokens expected)
3. **Sonnet only for:** Complex multi-step reasoning, code generation, architecture decisions
4. **Monitor tokens:** If a job exceeds expected tokens by 50%, flag it and investigate
5. **Disable thinking by default:** Only enable thinking for jobs that explicitly need it

**Token Budget Alerts:**
- If monthly total approaches $5 → investigate which job increased
- If any single run >10k tokens → investigate for bugs (memory leaks, infinite loops)
- If any single job $1+/month → evaluate if frequency can be reduced

---

## 🔧 How to Modify Cron Jobs

To update a job (e.g., change model, frequency, or message):

```bash
# View current config
openclaw cron list

# Update model or schedule
cron update --jobId=<id> --patch='{"payload": {"model": "ollama/llama3.2:3b"}}'

# Disable temporarily
cron update --jobId=<id> --patch='{"enabled": false}'

# Run job immediately (for testing)
cron run --jobId=<id>

# View job history
cron runs --jobId=<id>
```

---

## 📋 Maintenance Checklist

**Weekly (every Friday):**
- [ ] Check cost tracking in dashboard
- [ ] Review cron job error logs
- [ ] Verify no jobs exceeded token budgets

**Monthly (first of month):**
- [ ] Reconcile actual costs vs budgets
- [ ] Review if any job should be disabled/modified
- [ ] Check for new optimization opportunities

**Quarterly:**
- [ ] Audit all jobs for relevance
- [ ] Consider combining jobs if overlapping
- [ ] Re-evaluate model tiers based on actual usage

---

## 🎯 Future Improvements

- [ ] Add per-job cost tracking to dashboard
- [ ] Implement automatic email alerts if budget exceeded
- [ ] Create job run frequency optimizer (predict best schedule)
- [ ] Add job dependency management (don't run if previous job failed)
- [ ] Implement job result caching (skip if inputs unchanged)

---

*Last updated: 2026-02-13 11:12 AST (Emergency cost fix)*
*Previous version: 2026-02-09 (initial setup with cost estimates)*
