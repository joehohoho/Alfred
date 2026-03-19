# Even Us Up Monetization Experiment
**Project:** Even Us Up  
**Experiment:** Referral + Retention Trigger Test  
**Duration:** 4 weeks (2026-03-19 → 2026-04-16)  
**Owner:** Joe  
**Goal:** Improve DAU → MAU ratio; validate referral loop + repeat usage mechanics

---

## Hypothesis

Even Us Up's bottleneck is retention, not acquisition. Users create a group, settle expenses, and churn. By adding (1) sticky features (recurring categories, autopay reminders) + (2) a referral mechanic, we'll increase 7-day retention by ≥25% and seed viral coefficient >1.0.

---

## Experiment Design

### Phase 1: Baseline + Retention Diagnostics (Week 1, Mar 19–25)

**Objective:** Understand why users churn; identify top friction points

**Setup:**
1. **Measure current retention:**
   - Group creation date
   - Last activity date per group
   - % of groups active >1x in week 2 after creation (7-day retention)
   
2. **Identify friction (qualitative):**
   - Email 3–5 inactive groups: "Would you use Even Us Up more if...?" (open-ended survey)
   - Collect top 3 blockers

3. **Define sticky feature hypothesis:**
   - Example: "Recurring expense categories" (so group doesn't need to re-enter similar expenses each week)
   - Example: "Autopay reminders" (e.g., "You owe Sarah $25 for groceries — click to pay")

**Success criteria:**
- Baseline 7-day retention established (target: >20% of new groups active week 2)
- ≥3 user feedback responses identifying top 2 blockers
- Sticky feature scoped (1–2 week sprint)

---

### Phase 2: Sticky Feature + Autopay Launch (Week 2–3, Mar 26–Apr 08)

**Objective:** Ship retention mechanic; measure impact on DAU + MAU

**Setup:**
1. **Ship sticky feature (e.g., recurring categories):**
   - Let groups set "Groceries," "Rent," "Dining" as recurring categories
   - Pre-populate new expense form with category (1-click entry)
   - Measure: % of groups using feature, avg expenses per group (higher = stickiness)

2. **Ship autopay reminder:**
   - When a balance is owed, send reminder: "You owe [friend] $[amt]. Pay now?"
   - 1-click payment link
   - Measure: % of reminders → payment conversion, time-to-payment (faster = more engaged)

3. **Referral onboarding (soft launch):**
   - Add "Invite friends" button to group settings
   - Simple copy: "Add [friend] to the group — they'll see all expenses instantly"
   - Track: # invites sent, # acceptances, # new users from referral

**Success criteria:**
- Recurring category feature: ≥50% of active groups using it (sticky)
- Autopay reminder → payment: ≥20% conversion (users respond)
- 7-day retention: ≥30% of new groups active week 2 (↑ from baseline)
- Referrals: ≥5 new users sourced from existing user invites

---

### Phase 3: Viral Loop + Growth Incentive (Week 4, Apr 09–16)

**Objective:** Turn referral into growth lever; add gamification

**Setup:**
1. **Referral incentive (optional):**
   - Option A: "Refer a friend → skip 1 settlement cycle" (internal benefit)
   - Option B: "Refer a friend → unlock premium theme pack" (cosmetic)
   - A/B test which resonates (50/50 randomization)
   - Measure: referral rate per variant

2. **Viral messaging:**
   - Group members see: "[Friend] was added by you. They've already settled [N] expenses!"
   - Gamify: "Your group has 5 members. Leaderboard badge unlocked!"
   - Measure: % of groups with 5+ members (network effect)

3. **Monetization readiness check:**
   - Ask 5–10 power users (groups 5+ members): "Would you pay $2.99/mo for [premium feature: analytics dashboard, history export]?"
   - Collect willingness-to-pay signals

**Success criteria:**
- Referral rate: ≥1 new user per 10 active groups (viral coefficient trending >1.0)
- Premium willingness: ≥30% of power users open to paid tier
- 7-day retention: ≥35%+ (sustained uplift from Phase 2)
- MAU growth: ≥20% week-over-week

---

## Implementation Checklist

**Before launch (by Mar 25):**
- [ ] Retention baseline measured (7-day cohort analysis)
- [ ] User feedback survey sent (3–5 inactive groups)
- [ ] Sticky feature scoped + designed (1–2 week sprint plan)
- [ ] Autopay reminder copy + flow finalized
- [ ] Referral invite UI mocked up

**During Phase 2 (Mar 26–Apr 08):**
- [ ] Daily: Feature usage metrics (% groups using recurring categories)
- [ ] Every 3 days: Reminder → payment conversion tracked
- [ ] Mid-week: Qualitative feedback from early adopters
- [ ] Note blockers (e.g., "users don't see reminder notification")

**End of week 3 (Apr 08):**
- [ ] Compile retention uplift data (7-day retention % week 2 vs. week 3)
- [ ] Design Phase 3 referral incentive A/B test
- [ ] Plan premium willingness survey

**End of experiment (Apr 16):**
- [ ] Synthesis: retention, referral rate, monetization signals
- [ ] Decide: ship retention loop as default, iterate messaging, or pivot to different feature

---

## Success Metrics (Target)

| Metric | Baseline | Target (EOE) | Owner Notes |
|---|---|---|---|
| **7-day retention** | TBD (measure phase 1) | ↑ 25% | Retention is the bottleneck; success = sticky features work |
| **% groups using sticky feature** | — | ≥50% | Feature adoption = perceived value |
| **Autopay reminder → payment** | — | ≥20% | Users respond to friction-reducing prompt |
| **Referrals per active group** | — | ≥0.5 (trending toward 1.0) | Viral loop beginning; >1.0 = exponential growth |
| **New users from referral** | 0 | ≥5 | Validate referral as acquisition channel |
| **Premium willingness** | — | ≥30% of power users | Signal for future monetization |

---

## Rollback / Pivot

**If 7-day retention still <20%:** Stickiness not the issue. Options:
1. Pivot to acquisition instead (users aren't finding the app)
2. Test different sticky feature (recurring categories may not be valuable)
3. Simplify onboarding (maybe too friction-heavy upfront)

**If referral converts but retention flat:** Growth loop exists, but churn still high. Options:
1. Add push notifications for overdue balances (re-engagement)
2. Launch groups-as-templates (make it easier to reuse group structure)
3. Test feature: auto-settle recurring expenses (no manual action needed)

**If retention improves but referrals stall:** Retention works, viral doesn't. Options:
1. Simplify invite flow (1-click, not 5 taps)
2. Add incentive (as in Phase 3) to motivate referrals
3. Target high-value segments: groups that settle frequently (more likely to refer)

---

## Weekly Check-in Format (Fri, 2 PM AST)

```
Even Us Up Retention Experiment — Week [N]

Retention:
- 7-day retention (cohort): [%]
- Sticky feature usage: [#] groups ([%])
- Autopay reminder → payment: [#] / [#] ([%])

Growth:
- Referrals sent: [#]
- Referrals accepted: [#]
- New users from referral: [#]

Qualitative:
- User feedback: [1–2 sentences]
- Key friction: [1–2 sentences]

Next week:
- [ ] [Action item]
```

---

## Post-Experiment Actions

**Win:** 7-day retention ≥35%, referral rate ≥0.5/group, ≥5 premium-interested users  
→ Ship retention loop as default; plan Phase 2 (premium tiers, analytics)

**Partial success:** 7-day retention ≥25%, referral rate <0.5/group  
→ Retention loop works; focus on viral mechanics (incentives, messaging); revisit referral in sprint 2

**No traction:** 7-day retention <20%, referral rate ~0  
→ Problem deeper than stickiness; consider redesigning core value prop (why use Even Us Up vs. Venmo?)

---

## Related Docs

- Metrics dashboard: `metrics-dashboard-template.md` (track Even Us Up MAU, DAU, active groups)
- Portfolio snapshot: `passive-income-portfolio-snapshot-2026-03-19.md` (context)
