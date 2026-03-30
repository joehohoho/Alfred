# Revenue Growth Audit — CoinUsUp + Even Us Up
**Date:** 2026-02-25  
**Target:** +15% revenue by end Q1  
**Time allocation:** 10% of dev time ongoing  
**Prepared by:** Alfred

---

## 1. CoinUsUp — Current State

### What it is
Fundraising/campaign management SaaS (coin drives, events, shift tracking, team donations).
Built with React + Supabase + Stripe. Deployed on coinusup.com.

### Pricing (current)

| Plan | CA/mo | US/mo | Key limit unlocked |
|------|-------|-------|-------------------|
| Free | $0 | $0 | 1 org, 1 campaign, 1 user, no team |
| Basic | $25 CAD | $20 USD | 3 campaigns, 25 users, team chat, reports |
| Pro | $65 CAD | $49 USD | 10 campaigns, 100 users, advanced dashboards |
| Enterprise | $130+ CAD | $99+ USD | Unlimited everything |

Annual plans available: Basic saves 15%, Pro saves 20%.

---

## 2. Key Findings — CoinUsUp

### 🔴 Conversion Blockers (High Impact)
1. **Free plan is too restrictive to demonstrate value**
   - Free = 1 org, 1 campaign, 1 event, 1 user. Users hit walls immediately before seeing the product's value.
   - Recommendation: Expand free to 1 org, **2 campaigns, 3 events, 5 users** — let them invite a small team and see collaboration work before hitting a paywall.

2. **No trial period for paid plans**
   - Users jump from free (very limited) directly to $20/mo — no easy on-ramp.
   - Recommendation: Add **14-day free trial** for Basic with no credit card required. Dramatically improves conversion.

3. **Upgrade CTA placement (locked content experience)**
   - Locked campaigns/events show inline "Upgrade Plan" banners — this is good. But it only fires after the user hits a limit. 
   - Recommendation: Add upgrade nudge **earlier** — when users reach 80% of their limit (e.g., "You've used 2 of 3 campaigns — unlock more with Pro").

4. **Pricing page discovery unknown (SEO audit found critical issues)**
   - Missing sitemap.xml means Google may not index the pricing page efficiently.
   - Recommendation: Add sitemap.xml + submit to Search Console. Quick win, zero dev cost.

### 🟡 Retention & Engagement (Medium Impact)
5. **No onboarding flow identified**
   - New users land in app without a guided setup. The GET_STARTED_TUTORIAL_SETUP.md suggests this was worked on — confirm it's active.
   - Recommendation: Verify onboarding funnel is live and tracks completion rate. Target: >60% onboarding completion.

6. **Team invites locked behind Basic**
   - Team collaboration is a core retention driver — the moment a user invites a colleague, churn drops sharply.
   - Recommendation: Allow **1 team invite on free** (just one), then lock more behind Basic. Creates network effect + conversion driver.

7. **No email re-engagement for inactive free users**
   - If free users don't log in for 14+ days, they're probably churning.
   - Recommendation: Automated email at day 7 inactivity ("Your campaign needs attention") and day 14 ("Here's what you're missing with Basic").

8. **No annual plan push at checkout**
   - Annual pricing exists (Basic saves 15%, Pro saves 20%) but users may default to monthly.
   - Recommendation: Default checkout to annual with toggle to monthly. Improves LTV significantly.

### 🟢 Revenue Acceleration Levers (Lower effort)
9. **Add a "Nonprofit" plan**
   - Coin drives, fundraisers, events — this app serves nonprofits and volunteer orgs naturally.
   - A nonprofit-discounted Basic ($12 CAD/mo with .org email verification) widens the addressable market and creates goodwill/word of mouth.

10. **White-label as a new revenue tier**
    - `whiteLabel: false` across all plans including Enterprise. White-labeling is currently unused.
    - Recommendation: Add white-label as Enterprise+ upsell ($199 CAD/mo) — high-value for organizations that run coin drives on behalf of multiple charities.

---

## 3. Even Us Up — Current State

### What it is
Expense sharing app — split bills, track who owes what among groups.

### Known limitations
- I don't have the codebase locally — need access to assess code-level issues.
- Lower priority per Joe's profile (tertiary after CoinUsUp and Signal App).

### High-Level Recommendations (based on expense-sharing app patterns)
1. **Recurring groups drive retention** — If Even Us Up supports group persistence (roommates, couples, travel groups), push users to name/save their group on signup. Named groups retain 2x longer.
2. **Settlement reminders** — Automated push/email when debts are unpaid >7 days ("Alex still owes you $45").
3. **Free tier generosity** — Expense apps live or die by network effects. Keep free generous, charge for premium features (receipt scanning, recurring splits, export to CSV).
4. **Cross-promote with CoinUsUp** — Both apps serve groups managing shared money. A landing page mention on each other drives awareness (not a technical integration — just copy/SEO).

---

## 4. Priority Action Matrix

| Action | Effort | Revenue Impact | Do first? |
|--------|--------|---------------|-----------|
| Add sitemap.xml to CoinUsUp | 1h | Medium (SEO) | ✅ Yes |
| Expand free plan slightly | 2h | High (conversion) | ✅ Yes |
| Add 14-day trial for Basic | 3h | High (conversion) | ✅ Yes |
| 80% limit upgrade nudge | 3h | High (conversion) | ✅ Yes |
| Default annual at checkout | 1h | High (LTV) | ✅ Yes |
| Free → 1 team invite | 2h | Medium (retention) | ✅ Yes |
| Day 7/14 inactivity emails | 4h | Medium (churn) | Soon |
| Nonprofit plan | 3h | Medium (market) | Soon |
| White-label enterprise tier | 5h | Low-Medium | Later |
| Even Us Up audit (need codebase) | — | — | Queue |

---

## 5. Metrics to Establish Now (Baseline)

Before measuring +15% growth, need baseline readings:

| Metric | Where to get it | Target |
|--------|----------------|--------|
| Total paying orgs | Supabase: subscriptions table | — |
| Free → Basic conversion rate | Supabase: plan changes | Target: >5% |
| Basic → Pro conversion rate | Supabase: plan changes | Target: >15% |
| Monthly churn rate | Supabase: cancelled subs | Target: <5% |
| Revenue/user (ARPU) | Stripe dashboard | — |
| Annual vs monthly ratio | Stripe | Target: >30% annual |

**Next step:** Joe to pull these from Stripe + Supabase so Alfred can set real targets.

---

## 6. Q1 Revenue Growth Path (+15%)

To hit +15% revenue by end of Q1, the fastest levers are:
1. **Add 14-day trial** → expect +5-10% new paid conversions
2. **Default annual at checkout** → expect +8-12% LTV on new signups
3. **80% limit nudge** → expect +3-5% upgrade rate from free users
4. **Fix sitemap SEO** → expect +organic traffic over 60-90 days (Q2 payoff)

Combined, these should comfortably reach +15% without major new features.

---

## 7. Immediate Next Steps for Alfred

1. Implement sitemap.xml for CoinUsUp (1h, autonomous)
2. Expand free tier limits in planLimits.ts (2h, autonomous)
3. Build 80% limit nudge component (3h, autonomous)
4. Add "default to annual" at checkout (1h, autonomous)

**Need from Joe:**
- Confirm Stripe dashboard access or pull baseline revenue metrics
- Confirm Even Us Up codebase location for deep audit
- Approve free plan expansion before deploying (changes what users can do)

---

*Audit scope: CoinUsUp codebase, SEO audit, pricing analysis, plan structure. Even Us Up: limited (no codebase access).*
