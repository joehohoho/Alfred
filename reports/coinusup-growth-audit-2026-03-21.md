# CoinUsUp Growth Audit (2026-03-21)

## Scope
Review based on local CoinUsUp workspace docs/codebase (`CoinUsUp/`), including mobile launch plan, onboarding checklist, SEO audit, and existing feature hooks/pages.

## Prioritized Recommendations (with effort)

### P1 — Fix acquisition foundation (SEO/indexability + landing architecture)
**Why now:** SEO audit shows high-severity blockers (missing sitemap + SPA rendering/meta duplication), which caps organic growth before feature work can convert.

**Actions:**
1. Add `sitemap.xml` + robots sitemap reference + submit in Search Console
2. Pre-render/SSR marketing pages (`/`, `/features`, `/pricing`, `/about`, `/contact`) to avoid same-shell metadata
3. Add Organization + FAQ + Breadcrumb schema where missing

**Effort:** **M** (3-5 dev days)
**Expected impact:** Higher indexation, better rich-result eligibility, lower paid-acquisition dependence.

---

### P2 — Reduce activation drop-off in first 10 minutes
**Why now:** Onboarding exists, but still requires users to perform setup decisions before seeing value.

**Actions:**
1. Convert onboarding to a guided “first success” flow with one-click defaults (group + campaign + invite pre-created and editable)
2. Track step-level funnel analytics (`view checklist`, `step1`, `step2`, `step3`, `completed`) and add time-to-first-value KPI
3. Add in-product walkthrough for 2 highest-value jobs: **collect donations** and **run volunteer shift attendance**

**Effort:** **M** (4-6 dev days)
**Expected impact:** +activation rate, lower trial abandonment.

---

### P3 — Launch “Mobile Ops Pack” as monetized differentiator
**Why now:** Mobile launch plan already identifies strong wedge: offline attendance + QR check-in + field ops reliability.

**Actions:**
1. Ship offline attendance queue + idempotency protections
2. Ship signed QR check-in/out workflow
3. Productize as add-on ($0.99/user/mo) with targeted upsell surfaces in volunteer/shift workflows

**Effort:** **L** (2-4 weeks)
**Expected impact:** Better retention for event-heavy orgs + direct ARPU lift.

---

## Top 3 UX Friction Points

1. **Time-to-first-value still too long for new users**  
   - Evidence: onboarding requires multiple setup steps; value appears after manual progression
   - Impact: users may leave before first “win”
   - Fix effort: **M**

2. **Mobile/field reliability for critical workflows not fully hardened yet**  
   - Evidence: mobile launch doc identifies offline queue/QR/deep-link reliability as unresolved launch blockers
   - Impact: trust loss in event-day usage (the moment product must work)
   - Fix effort: **L**

3. **Plan/feature boundaries likely unclear in-app at decision moments**  
   - Evidence: subscription hooks exist (`useSubscription`, `useStripeSubscription`, `useIAPSubscription`) but upsell clarity appears fragmented
   - Impact: conversion leakage + confusion at paywall edges
   - Fix effort: **S-M**

## Top 3 Missing Features Users Likely Want

1. **Volunteer self-serve shift signup + swap marketplace**  
   - Why: reduces organizer admin burden; common ask in volunteer/event ops
   - Effort: **M**

2. **Automated donor follow-up journeys (receipt + thank-you + reactivation sequences)**  
   - Why: recurring revenue growth lever; hooks/templates already present in codebase
   - Effort: **M**

3. **Executive dashboard with campaign health forecasting** (pace vs goal, risk alerts, “at-risk event” flags)  
   - Why: turns data into decisions, helps justify paid tiers
   - Effort: **M-L**

## Top 3 Growth Levers

1. **SEO Engine (highest leverage short-term)**
   - Fix technical blockers + ship content clusters (fundraising templates, event checklists, volunteer management guides)
   - Effort: **M** initial + ongoing content ops

2. **Virality via built-in sharing loops**
   - One-click donor share pages, campaign milestone badges, volunteer referral invites, team challenge links
   - Effort: **M**

3. **Monetization expansion via role-based packaging**
   - Keep core accessible, monetize operational painkillers (mobile ops pack, automation pack, advanced reporting)
   - Effort: **M-L**

## 30-Day Execution Plan (practical)

- **Week 1:** SEO blocker fix set (sitemap/robots/schema/rendering plan)
- **Week 2:** onboarding funnel instrumentation + first-success onboarding UX
- **Week 3-4:** mobile ops pack beta (offline attendance + QR) and pricing/upsell copy tests

## Priority Matrix

1. **Acquisition foundation (SEO blockers)** — **High impact / Medium effort**
2. **Activation optimization (onboarding first win + analytics)** — **High impact / Medium effort**
3. **Monetized mobile reliability features** — **High impact / High effort**
4. **Viral sharing loops** — **Medium-high impact / Medium effort**
5. **Advanced forecasting dashboard** — **Medium impact / Medium-high effort**

## Bottom Line
If only one thing is done this week: **fix technical SEO + rendering/indexability**.  
If two: add **onboarding funnel analytics + first-success flow**.  
If three: start **Mobile Ops Pack** beta as the retention + monetization wedge.
