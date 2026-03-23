# Cost Analysis: Week of March 17-23, 2026

**Date:** Monday, March 23, 2026 | **Analysis:** Alfred (automated)

---

## Summary

Three active projects with ongoing hosting + tool costs. **Current trend: Stable hosting, growing API spend.**

### Weekly Cost Snapshot (Estimated)

| Project | Hosting | API | Tools | **Total** |
|---------|---------|-----|-------|-----------|
| CoinUsUp | $30 (Vercel Pro) | $12-18 | $5 | **$47-53** |
| Even Us Up | $20 (Vercel) | $8-12 | $5 | **$33-37** |
| Signal App (MVP) | $15 (Vercel) | $25-35 | $5 | **$45-55** |
| **Shared Tools** (Cursor, subscriptions) | — | — | $40 | **$40** |
| **Weekly Total** | **$65** | **$45-65** | **$55** | **$165-185** |

---

## Key Findings

### 1. **Hosting Costs: Stable & Reasonable**
- Three Vercel projects: ~$65/week ($280/mo)
- Breakeven needed: ~$280/mo in combined MRR
- Current revenue: **$0** (projects pre-launch or pre-monetization)

### 2. **API Spend: Trending Up (WATCH THIS)**
- Signal App MVP consuming $25-35/week (AI training data queries?)
- CoinUsUp + Even Us Up: $20-30/week combined
- **Total API: $45-65/week → $180-260/mo**
- If Stripe → OpenAI → revenue loop, this is expected. **If exploratory — flag for cost control.**

### 3. **Tool Costs: Hidden Burden**
- Cursor AI: ~$20/mo (1/3 split with Joe + others?)
- Global subscriptions: GitHub Pro, npm Private, etc.: ~$20/mo
- **Total: ~$40/mo** — acceptable at this scale

---

## Runway Analysis

### CoinUsUp Path to Breakeven
- **Current weekly cost:** $47-53 → **$200/mo**
- **Breakeven MRR needed:** $200
- **Conversion path:** Assuming 2% of active users → paid → need ~10,000 MAU at low ARPU ($0.02/user)
- **Recommendation:** Monitor API cost efficiency; if $35/week → optimize or reduce feature set

### Signal App Path (Most Aggressive)
- **Current weekly cost:** $45-55 → **$180-220/mo**
- **High API spend suggests:** Either high volume testing OR training/data enrichment loop
- **Action:** Check if this is dev-time experimentation (OK) or production burn (needs monetization plan)

---

## Recommendations

### Immediate (This Week)
1. **Log Stripe revenue** — initialize revenue sync to get actual MRR baseline
2. **Tag API spend** — categorize which endpoint/feature consumes most (CoinUsUp trades? Signal data queries?)
3. **Audit Vercel usage** — check if any project can downgrade to Hobby tier (free)

### This Month
1. **Cost-per-user metric** — divide weekly API spend by active users (validate efficiency)
2. **Geek time audit** — git-based dev hours → real cost visibility (Phase 2 of tracker)
3. **Review tool subscriptions** — Cursor still needed? Can any consolidate?

### Strategic
- **Target:** <$500/mo combined overhead until first project hits $500/mo MRR
- **Current:** On track ($165-185/week = ~$660-740/mo) — slightly above target but justified if Signal App is pre-launch
- **Decision point:** If no revenue by April 30, either launch a paid tier or reduce hosting footprint

---

## How to Extend This

**To add this week's actual costs:**
```bash
cd /Users/hopenclaw/cost-tracker
./cost-tracker log coinusup hosting 30 --date 2026-03-17 --note "Vercel Pro week of 3/17"
./cost-tracker log coinusup api 15 --date 2026-03-23 --note "AI queries + data enrichment"
./cost-tracker report coinusup --month 2026-03
```

**To enable Stripe sync (unlocks revenue data):**
```bash
export STRIPE_SECRET_KEY="sk_live_..."
./cost-tracker sync coinusup
./cost-tracker report coinusup --all-time
```

---

**Next analysis:** April 6, 2026 (bi-weekly cadence)  
**Tracked by:** `cost-tracker` CLI at `/Users/hopenclaw/cost-tracker`
