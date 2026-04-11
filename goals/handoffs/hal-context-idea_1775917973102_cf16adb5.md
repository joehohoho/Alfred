# HAL Context — idea_1775917973102_cf16adb5

## Card
- ID: idea_1775917973102_cf16adb5
- Type: idea
- Priority: normal
- Title: Even Us Up growth audit refresh (Apr 11)

## Description
## Even Us Up growth audit refresh (Apr 11, 11:31 ADT)

**Thesis:** Even Us Up should not chase Splitwise feature parity. The best wedge is still **Canada-first, Interac-native, household/roommate settlement with a clearer path from expense -> settled**. Also, Joe's own context matters here: **0-20 visitors/day and no external adoption means growth is primarily an activation/positioning problem, not just a feature gap.**

### Prioritized list

#### 1) UX friction: Settlement clarity and next action visibility
- **Priority:** P1
- **Effort:** **S** (4-8h)
- **Why it matters:** This is still the biggest leak. Users need to instantly understand **who owes whom, how much, and what to do now**. If that answer is buried or ambiguous, Splitwise feels simpler even when Even Us Up has better local fit.
- **Differentiate vs Splitwise:** Make settlement feel more concrete and more Canadian, for example **"Send  via Interac to Alex"** instead of generic ledger language.
- **Recommended fix:** Persistent dashboard card, plain-language balances, Interac-first instructions, quick settlement confirmation/history.

#### 2) UX friction: Blank-slate onboarding
- **Priority:** P1
- **Effort:** **M** (8-16h)
- **Why it matters:** New users are likely landing in an empty app without enough scaffolding. That kills activation before the product's value shows up.
- **Differentiate vs Splitwise:** Presets for **roommates, couples, trip** with Canada-first defaults and sample data.
- **Recommended fix:** 3-step onboarding wizard, seeded sample group/expense, strong first CTA: create group -> add expense -> settle.

#### 3) Growth lever: Reposition around household/roommate completion, not generic expense tracking
- **Priority:** P1
- **Effort:** **S-M** (6-12h for copy + landing/onboarding updates)
- **Why it matters:** Splitwise owns the generic category. Even Us Up needs a sharper reason to exist.
- **Best positioning:** **"Split expenses and actually finish settling, built for Canada."**
- **Recommended fix:** Rewrite landing/onboarding/app copy around Interac, CAD, recurring shared-life expenses, and closure rather than tracking.

#### 4) Missing feature: Notifications and nudges
- **Priority:** P1
- **Effort:** **M** (10-16h)
- **Why it matters:** Without reminders, even good settlement UX fades from memory and retention suffers.
- **Differentiate vs Splitwise:** Use **useful** nudges tied to Interac settlement, unpaid balances, and recurring bills, not generic spam.
- **Recommended fix:** Due reminders, inactive-group nudges, settlement confirmations, per-user frequency controls.

#### 5) Missing feature: Household mode / recurring shared-life workflows
- **Priority:** P2
- **Effort:** **M-L** (12-24h depending on current completeness)
- **Why it matters:** This is one of the clearest defensible wedges. Households and couples repeat the same jobs every month.
- **Differentiate vs Splitwise:** Monthly rhythm, recurring bills, shared home view, soft accountability, simple closeout.
- **Recommended fix:** Tighten recurring expense flows, monthly recap, persistent 2-person/household mode.

#### 6) Growth lever: Activation before acquisition
- **Priority:** P1
- **Effort:** **M** (1-2 weeks combined with #1 and #2)
- **Why it matters:** With 0-20 visitors/day, throwing energy into broad acquisition before fixing first-session activation is upside-down.
- **Recommendation:** Treat the next sprint as an **activation sprint**, not a feature sprint. Measure: signup -> group created -> first expense -> first settlement.

#### 7) UX friction: Mobile flow still likely feels web-first
- **Priority:** P2
- **Effort:** **M** (12-20h)
- **Why it matters:** Expense sharing is naturally phone-first. If core actions feel cramped or slow, users will assume the product is second-tier.
- **Recommended fix:** Mobile-first pass on add expense, settle up, reminders, and invite flow.

#### 8) Missing feature: Fairness insights / monthly recap
- **Priority:** P3
- **Effort:** **S-M** (6-12h)
- **Why it matters:** Helpful for retention, but less urgent than activation and settlement clarity.
- **Differentiate vs Splitwise:** Lightweight household-oriented answers: who paid most, what's changed this month, is the group drifting off-balance?

#### 9) Growth lever: Referral loop tied to real group moments
- **Priority:** P2
- **Effort:** **S-M** (6-10h)
- **Why it matters:** This app should spread group-by-group, not through paid acquisition.
- **Recommended fix:** Prompt invites after successful settlement, group completion milestones, roommate/couple specific share prompts.

### Top 3 summary

**Top 3 UX friction points**
1. Settlement clarity / next action visibility — **S**
2. Blank-slate onboarding — **M**
3. Mobile core flows feel web-first — **M**

**Top 3 missing features**
1. Notifications and nudges — **M**
2. Household mode + recurring shared-life workflows — **M-L**
3. Fairness insights / monthly recap — **S-M**

**Top 3 growth levers**
1. Reposition around Canada-first settlement completion — **S-M**
2. Fix activation before acquisition — **M**
3. Referral loop around real group use cases — **S-M**

### Recommended order
1. **Settlement clarity redesign**
2. **Onboarding / activation wizard**
3. **Landing + in-app positioning refresh**
4. **Notifications / nudges**
5. **Household recurring workflow polish**
6. **Referral loop**

### Bottom line
Even Us Up looks **under-positioned, not invalid**. The smartest move is to become the **best Canadian household/roommate settlement app**, not a broader Splitwise clone. In the near term, the highest ROI is to improve **activation + settlement clarity**, because with current traffic levels, those two levers matter more than shipping another layer of features.

## Initial Deliverables Checklist
- [ ] Confirm understanding of objective
- [ ] List exact files to touch
- [ ] Define validation command(s)
- [ ] Note rollback/safety plan for non-trivial changes

## Notes
- Auto-generated by scripts/kanban-create.sh
- Update this file before HAL dispatch when more context is available.
