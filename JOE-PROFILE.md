# JOE-PROFILE.md — Joe's Decision Patterns & Preferences

Generated: 2026-04-22 22:00 ADT (14-Day Reflection)
Last Updated: 2026-04-22 22:00 ADT (14-Day Reflection)

---

## Core Decision Patterns

**Autonomy Style:**
- Wants **transparency over every decision**, not fewer approvals
- Prefers async updates via Discord webhook (#decisions channel) vs synchronous blocking questions
- "Make the decision and tell me after" for low-stakes items; escalate for security/cost/architecture shifts
- Rewards proactive work that shows visible progress

**Passive Income Philosophy:**
- #1: User adoption (CoinUsUp is the priority flagship)
- #2: Data quality (Signal App blocked on signal quality, not features)
- Timeline: 5-10 hrs/week maintaining, 10-20 hrs/week building new
- Target: $5k-$10k/month passive income, growing
- Monetization path: CoinUsUp → Signal App → Even Us Up (in that order)
- **SHIFT (Apr 5-22 2026):** Client/consulting work has diminished and Joe is now working a 9-5, so passive income work needs to fit around that and stay leverage-heavy
- Focus: Launch lean MVPs (low maintenance once setup), validate quickly, scale winners
- **Build Philosophy:** "One thing really well" (focused, not sprawling). "Something new but with low maintenance once setup."
- **New constraint (Apr 16-22):** Joe is open to new ideas only if they require minimal time investment and Alfred can carry a large share of the execution

**Repetition Intolerance:**
- Flagged Feb 27 & Mar 3: Stop asking about cross-project synergies (answered: none worth pursuing)
- Flagged Feb 27 & Mar 10: Stop asking about consulting productization (answered: no recurring problems, not worth exploring)
  - **REINFORCED Apr 1, 9, 17, 19:** Explicitly told me to stop asking the same consulting productization question. This is a settled decision.
- Feb 26: Made effort to find answers myself BEFORE asking
- **Pattern:** If asked the same thing twice, Joe will call it out. Do better.

**Visibility & Logging:**
- Wants Discord webhook delivery for all autonomous decisions (https://discord.com/api/webhooks/1476590430803202279/Np1MtEaUHs69JtS6_le54RCGzd0Jv0zkQMd-9zTBaoger20HuzHsh1T6ii-N8tdJxMVo)
- Appreciates long-form status reports (daily ops, full analysis)
- Prefers one-sentence answers to yes/no questions (doesn't want verbose justifications)

---

## Project Priorities (Apr 2026)

**NOW (Confirmed Apr 5-15):**

1. **CoinUsUp** — User adoption is the success metric. Unlock: more users signing up, with marketing + UI still the main levers.
   - BLOCKER: 14-day free trial feature code 100% complete, awaiting Stripe dashboard config (12 prices, trial_period_days=14, ~5 min task, 21+ days pending)
   - No external marketing budget; scaling organically
   - Daily metric Joe watches: user adoption
   - UI/feature work should focus on adoption drivers, not feature completeness

2. **Signal App** — Data quality + model learning is the blocker, not features.
   - Poor signals to buy/trade; backtest doesn't improve signals
   - Internal use only for now (signals not good enough for external release)
   - Second-priority after CoinUsUp

3. **Even Us Up** — Internal/household app first, with improvements currently biased toward performance and internal quality.
   - Smallest meaningful win right now: performance optimization
   - External growth/monetization is not the near-term focus

4. **Consulting Work** — Greatly diminished because Joe is now working full time for a company.
   - No productization opportunities in consulting (confirmed repeatedly)
   - Stop exploring this angle
   - Treat consulting as background context, not a growth engine

**APPROVED FOR REVIEW/BUILD:**
- **AI Grant Writer for Nonprofits** (8.1/10, 2-3 week MVP) — 6 spec docs complete, awaiting go/no-go for 4-week sprint
- **Bill Review & Invoice Audit Automation** (scope pending: A=personal tool first, B=external SaaS MVP; 21 days waiting)
- **Trader Signal Post-Mortem Assistant** (5 spec docs complete, awaiting approval for build)

**PORTFOLIO (High-Quality Ideas, Scored 8.0+):**
- Automation Audit Kit (8.2/10) — 3 days build, $1.2k–$4k MRR
- Digital Receipt Aggregator (8.2/10) — 2-3 weeks build, $2.3k–$17k MRR, direct consulting synergy
- API Cost Monitor (8.3/10, FinOps market) — 3-4 weeks build, $2k–$18k MRR
- Signal Quality Dashboard (8.0/10) — Companion to Signal App
- Offline-First Field Dispatch (8.1/10) — $5.6B FSM market, lean MVP 3-4 weeks
- Trading Setup Ebook (7.3/10) — Lead magnet for Signal App

---

## Communication Preferences

**Channel:** Discord (primary)
**Response style:** One-liner answers for yes/no, full analysis for open-ended
**Approval gate:** Stripe trial config (5 min work, unblocks CoinUsUp revenue)
**Preference:** If Alfred spots simplification or focus issues in an app, bring a concrete recommendation instead of a generic philosophy question
**Quiet hours:** Don't ping directly before 9am or after 11pm via iMessage, but keep working 24/7

---

## Known Frustrations

- **#1 PAIN POINT:** "Having to fix issues with Alfred and HAL, and troubleshooting Alfred thinking HAL is offline when he's not" (Mar 26, explicit)
  - Alfred has been addressing this: HAL graceful degradation (Apr 15), better error handling
  - **Implication:** Joe wants reliable autonomous systems, not constant handholding
- Wants immediate unblocks on critical revenue work (CoinUsUp trial, stuck 21+ days on 5-min Stripe task)
- Dislikes duplicate/recurring questions (shows poor memory/effort)
  - **Specific example:** Asked about consulting productization 3+ times despite clear "not worth exploring" answer
  - Stop asking consulting/synergy questions; these are settled decisions
- Current real-world constraint is time and attention outside a 9-5, so recommendations that assume deep founder bandwidth will create friction

---

## Decision Guardrails (Apr 2026)

**Do NOT ask about:**
1. **Consulting productization** — Settled: no recurring problems, not worth exploring (flagged Feb-Mar, reinforced Apr 1/9/17/19)
2. **Cross-project synergies** — Settled: CoinUsUp ≠ Signal App architecturally or operationally (different markets, no shared infrastructure worth building)
3. **Even Us Up monetization timing** — Settled: after adoption improves, but current near-term work is performance/internal quality
4. **Signal App external use** — Settled: internal only until signal quality improves

**DO escalate immediately:**
1. Security risks, breaches, data loss concerns
2. Major cost overruns or unexpected charges
3. Critical infrastructure failures (gateway, auth, services)
4. Architectural decisions on new products (scope, build vs. buy, etc.)

---

## New Observations (Apr 22 2026 Reflection)

1. **Joe's founder time is now constrained by a 9-5 job, so passive-income work must be asymmetrical.** He is still committed to passive income, but wants ideas that can move with low personal time and high Alfred leverage.  
   - Sources: notif_1776171600763_0cfd371b, notif_1776517200629_d2e568fe, notif_1776603600489_10de5492, notif_1776352122477_85658abf  
   - Confidence: **high**

2. **CoinUsUp remains the clearest scorecard app, and the scorecard is still user adoption.** Joe restated both the unlock and the metric in back-to-back daily inquiry answers.  
   - Sources: notif_1776690000517_e5933c28, notif_1776776400579_ddcc5fcb, memory/2026-04-22.md  
   - Confidence: **high**

3. **Even Us Up is effectively an internal tool right now, so meaningful progress means performance/internal improvements, not external growth work.**  
   - Sources: notif_1776085200829_3538e76a, notif_1776430800563_27e507ba  
   - Confidence: **high**

4. **Joe still prefers focused products, but now wants Alfred to proactively identify where simplification is needed instead of asking abstract strategy questions.**  
   - Sources: notif_1776862800553_166a3473, prior Apr 1 product-philosophy answer via inquiry log context  
   - Confidence: **medium**

5. **Consulting has fallen below both the 9-5 and passive-income tracks in practical priority.** It should be treated as residual background work, not a source of new product direction.  
   - Sources: notif_1776171600763_0cfd371b, notif_1776517200629_d2e568fe  
   - Confidence: **high**

---

## Last Updated

2026-04-22 22:00 ADT (14-day reflection, full)
Previous: 2026-04-16 01:03 ADT (14-day reflection)
Next full reflection: 2026-05-06 (14 days)
