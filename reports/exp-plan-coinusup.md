# CoinUsUp Monetization Experiment
**Project:** CoinUsUp  
**Experiment:** Onboarding Paywall + Premium Tier Test  
**Duration:** 4 weeks (2026-03-19 → 2026-04-16)  
**Owner:** Joe  
**Goal:** Validate willingness-to-pay + measure conversion funnel

---

## Hypothesis

Users who reach the "alerts" feature will accept a $9.99/mo paywall if positioned as premium functionality. At least 5% of signups will convert to paid in week 1.

---

## Experiment Design

### Phase 1: Baseline (Week 1, Mar 19–25)
**Objective:** Measure current funnel with NO paywall

**Setup:**
1. Track signup flow (form → email verification → app login → first feature access)
2. Measure: signups, DAU, feature usage (which features used most?)
3. Tool: analytics or manual counts if small user base

**Success criteria:**
- Baseline: ≥10 new signups this week
- First feature accessed within 24h of signup: ≥60%

**What not to change:** Don't add paywall yet; just observe

---

### Phase 2: Paywall Soft Launch (Week 2–3, Mar 26–Apr 08)
**Objective:** Introduce paywall at alerts feature; measure conversion + friction

**Setup:**
1. After 3 free alerts, show modal: "Upgrade to Premium for unlimited alerts – $9.99/mo, 7-day free trial"
2. Track:
   - % of users who see paywall (should be ≥50% of DAU)
   - % who click "upgrade" (target: ≥5% of viewers)
   - % who enter payment info (target: ≥2% of viewers)
   - % who complete purchase (target: ≥1% of viewers)
3. Collect qualitative feedback: Ask 3–5 users via email "What would make you upgrade?"

**Paywall messaging:**
- **Headline:** "Unlimited alerts. Real-time updates."
- **Copy:** "Get instant notifications for price movements. Premium members never miss a trade."
- **CTA:** "Try free for 7 days"

**Success criteria:**
- ≥50 users see paywall
- ≥5% convert to trial
- ≥2% complete transaction
- ≥3 useful feedback responses

---

### Phase 3: Pricing/Positioning Test (Week 4, Apr 09–16)
**Objective:** Refine messaging based on feedback; optimize conversion

**Setup:**
1. A/B test two headlines (randomize 50/50):
   - A: "Unlimited alerts. Real-time updates."
   - B: "Never miss a trade. Premium alerts + analytics."
2. Measure: conversion rate per variant
3. Winner becomes control for next iteration

**Success criteria:**
- Cumulative paid users: ≥5 (across all phases)
- Identify messaging variant with +10% higher conversion
- Document 1 key friction point to fix (e.g., "users confused by trial mechanics")

---

## Implementation Checklist

**Before launch (by Mar 25):**
- [ ] Analytics setup (or decide on manual tracking method)
- [ ] Paywall modal copy + design finalized
- [ ] Payment processor tested (Stripe, etc.)
- [ ] 7-day trial logic verified
- [ ] Support email set up for early payer inquiries

**During Phase 2 (Mar 26–Apr 08):**
- [ ] Daily: Monitor conversion funnel (3–5 min check)
- [ ] Twice weekly: Gather user feedback (email 1–2 users: "What would make you upgrade?")
- [ ] Note blockers (e.g., payment errors, confusing flow)

**End of week 3 (Apr 08):**
- [ ] Synthesize feedback + qualitative insights
- [ ] Design Phase 3 A/B test variants

**End of experiment (Apr 16):**
- [ ] Compile results: conversion rates, revenue, qualitative learnings
- [ ] Decide: ship paywall as default, iterate, or pause monetization

---

## Success Metrics (Target)

| Metric | Target | Owner Notes |
|---|---|---|
| **Week 1 signups** | ≥10 | Baseline; seed growth may be organic or from existing network |
| **% users reaching paywall** | ≥50% DAU | Paywall at alerts feature; if <50%, alerts not valued yet |
| **Paywall conversion (trial)** | ≥5% | If <5%, messaging or value prop needs work |
| **Trial → paid conversion** | ≥2% | Indicates real value; if >5%, pricing may be too low |
| **Cumulative paid users (EOE)** | ≥5 | Validate demand exists; gives Joe 1–2 paying users to iterate with |
| **Qualitative insight** | ≥3 feedback responses | "What would make you upgrade?" → refine messaging |

---

## Rollback / Pivot

**If conversion <1%:** Paywall may be too aggressive. Options:
1. Lower price to $4.99/mo (attract more trials)
2. Move paywall to different feature (alerts not valued; try analytics instead)
3. Offer annual plan at discount ($89/year vs. $119/year monthly) to surface higher-value users

**If conversion >5%:** Pricing may be too low. Options:
1. Raise to $14.99/mo (test elasticity)
2. Introduce annual plan ($99/year) for committed users
3. Add premium feature tier ($29.99/mo) for power users

**If low signup velocity (<5/week):** Growth is limiting; pause monetization, focus on acquisition loop first

---

## Weekly Check-in Format (Fri, 2 PM AST)

```
CoinUsUp Paywall Experiment — Week [N]

Conversions:
- Signups: [#]
- Paywall views: [#]
- Trial starts: [#]
- Paid subscribers: [#]
- Conversion rate: [%]

Qualitative:
- User feedback theme: [1–2 sentences]
- Key friction: [1–2 sentences]

Next week:
- [ ] [Action item]
```

---

## Post-Experiment Actions

**Win:** ≥5 paid users, >2% conversion  
→ Ship paywall as default feature; plan Phase 2 (premium tiers, annual pricing)

**Partial success:** 2–4 paid users, 1–2% conversion  
→ Iterate messaging, extend trial period, test lower price point

**No traction:** <2 paid users, <1% conversion  
→ Pause monetization; focus on acquisition loop or feature value first; revisit in Q2

---

## Related Docs

- Metrics dashboard: `metrics-dashboard-template.md` (track CoinUsUp DAU, paid users, MRR)
- Portfolio snapshot: `passive-income-portfolio-snapshot-2026-03-19.md` (context)
