# Cost Analysis: Week of Mar 16-21, 2026

**Generated:** 2026-03-21 12:00 ADT  
**Scope:** Infrastructure, API, and token costs  
**Status:** ✅ All systems stable

---

## Executive Summary

- **Gateway:** ✅ Stable — 144 cron executions this week, no restarts
- **Memory Management:** ✅ Compressed and stable (109 daily logs, ~3.5KB MEMORY.md)
- **Project Activity:** ✅ CoinUsUp (3 commits/2w), cost-tracker system fully operational
- **Cost Drivers:** Anthropic API (Haiku primary), Vercel hosting (CoinUsUp/Even Us Up), Supabase (backend)
- **Trend:** 📊 Costs stable week-over-week; no trending increase detected

---

## Infrastructure Health

### LaunchAgents Status
| Agent | Status | Purpose |
|-------|--------|---------|
| com.alfred.dashboard-nextjs | ✅ Running | Command Center UI |
| com.alfred.session-size-guard | ✅ Running | Context monitor |
| com.alfred.failsafe-ping | ⚠️ DOWN | Recovery monitor (low priority) |
| ai.openclaw.gateway | ✅ Running | Core gateway |
| com.alfred.weather-alerts | ✅ Running | Weather monitoring |
| com.alfred.job-tracker | ✅ Running | Job scheduler |

**Action:** Restart com.alfred.failsafe-ping (optional, low impact)

---

## API Cost Drivers (This Week)

### 1. Anthropic API (Haiku primary tier)
- **Usage Pattern:** Light — context well under 60% in most sessions
- **Model Distribution:** ~80% Haiku, 15% LOCAL (ollama), 5% Sonnet
- **Estimated Cost:** <$0.50/week (Haiku tokens are $0.00016/1K input, $0.0008/1K output)
- **Trend:** Stable

### 2. Hosting (Vercel + Supabase)
- **CoinUsUp:** Vercel Pro ($20/mo) + Supabase free tier
- **Even Us Up:** Vercel Pro ($20/mo) + Supabase free tier
- **Combined:** ~$40/month hosting (split across 2 apps)
- **Status:** ✅ Sustainable

### 3. Tools & Subscriptions
- **Cursor AI:** ~$15/month (bundled 1/3 share from cost tracker)
- **GitHub Pro:** Included (corporate)
- **Other:** Misc tooling (~$10/month estimated)

---

## Cost Breakdown (Estimated Monthly Run Rate)

| Category | Monthly | Notes |
|----------|---------|-------|
| Anthropic API (Haiku) | $1–2 | Light usage, context efficient |
| Vercel Hosting | $40 | Pro tier for 2 apps |
| Supabase (free) | $0 | Using free tier |
| Cursor AI (share) | $5 | 1/3 allocation |
| Misc Tools | $10 | ChatGPT, Slack, etc. |
| **TOTAL** | **$56–57** | Very lean |

---

## Opportunities for Optimization

### ✅ Already Optimized
- Haiku as primary model (cheapest Anthropic tier suitable for reasoning)
- LOCAL (ollama) for status checks and light tasks ($0)
- Context compression automation (60%+ threshold triggers checkpoint)
- Cron job batching (reducing redundant API calls)

### 🔧 Quick Wins (No Risk)

1. **Monitor Vercel overage** (Mar–Apr)
   - CoinUsUp and Even Us Up on Pro ($20 each)
   - If traffic is light, downgrade to Hobby tier ($0/month with 100GB/month bandwidth)
   - Risk: None (instant rollback); Savings: $40/month

2. **Supabase:** Consider upgrading to **Pro ($25/mo)** if scaling to >100K monthly active users
   - Free tier supports current load indefinitely
   - No urgency

3. **Cursor AI:** Currently splitting 1/3 share ($5/mo)
   - If Joe isn't using it, can drop entire subscription
   - Savings: $15/mo; Risk: Minimal (can add back anytime)

---

## Cron Job Health

**Last Week:** 144 executions (all clean)  
**Known Issues:** 
- None this week (previous week had 6 auto-disables due to Discord routing; all re-enabled)

**Status:** ✅ Stable

---

## Recommendations for Next Quarter

1. **Evaluate Vercel tier** in April — check traffic metrics. If <50GB/month, downgrade to Hobby ($0).
2. **Monthly cost review** — add automated cost-tracker sync for Stripe revenue (Phase 2) to correlate dev spend with income.
3. **Watch Supabase growth** — if CoinUsUp/Even Us Up exceed 50K monthly rows, plan Pro upgrade.
4. **Consider self-hosted Ollama for higher-volume tasks** — LOCAL model is free and improving; reduces Anthropic API spend further.

---

## Conclusion

**Cost posture is healthy.** Week-over-week stability maintained. No urgent changes needed. Suggested optimizations are low-risk and could save $40–50/month if executed.

---

*Next review: 2026-03-28*
