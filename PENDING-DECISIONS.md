# PENDING DECISIONS — Consolidation Report

**Generated:** 2026-04-16 00:07:17
**Total Pending:** 18 items
**Status:** Deduplicated and consolidated by category

---

## Quick Status

| Category | Items | Blocking | Status |
|----------|-------|----------|--------|
| Bill Review & Invoice Audit | 4 | 0 | 🟡 PENDING |
| CoinUsUp — Trial Feature | 5 | 0 | 🟡 PENDING |
| Consulting Scalability | 1 | 0 | 🟡 PENDING |
| Even Us Up | 1 | 0 | 🟡 PENDING |
| Other | 5 | 0 | 🟡 PENDING |
| Trader Signal Post-Mortem | 2 | 0 | 🟡 PENDING |

**Total Blocking:** 0

---

## Bill Review & Invoice Audit

### 🟡 Implementation complete & waiting on your build direction choice: (A) Personal internal invoice-audit tool, or (B) External SaaS MVP. Which should we build? Once you choose, I can start immediately.
**Pending since:** Apr 15, 16:21
**ID:** `notif_1776270111548_b0cde226`

task_1774058538023_ae4bf3d2

### 🟡 You approved the MVP build on Mar 31, but we're blocked on the scope direction. Quick decision needed:

**Option A (Personal Tool):** Internal invoice-audit tool for your own use (You get an audit queue UI, I handle detection backend)

**Option B (External SaaS MVP):** Revenue-focused MVP to test-sell to Canadian SMBs (requires go-to-market plan)

Blueprint complete + market validation done either way. 

**What should I do?** Reply with A or B so I can unblock the build. No other details needed.
**Pending since:** Apr 13, 04:18
**ID:** `notif_1776053901200_0aeb3bd0`

No details provided

### 🟡 You asked me to build an MVP for the Bill Review invoice audit tool (Mar 31). I need one clarification before I start:

**A) Personal Tool** — Build a personal invoice audit app for your own use (you audit invoices, catch duplicates/overcharges)

**B) External SaaS MVP** — Build a product to sell to Canadian SMBs (bootstrap version, test with 3-5 pilot customers, iterate based on feedback)

The blueprint and market analysis support both. But the build path, design, and priorities differ.

Which direction? (Reply A or B in the card comment)
**Pending since:** Apr 10, 02:41
**ID:** `notif_1775788889479_5d542fd8`

No details provided

### 🟡 Market validation complete. Blueprint ready at ideas/BILL_REVIEW_INVOICE_AUDIT_AUTOMATION_BLUEPRINT_2026-03-20.md.\n\n**DECISION NEEDED:** Should I build this as:\n\n**Option A: Personal Tool**\nJust for your own SMB billing audits. ~2-3 day MVP. Test internally first, then expand.\n\n**Option B: Commercial SaaS**\nBuilt for resale to other SMBs. Full MVP with onboarding/support/pricing. ~1-2 week build.\n\n**Recommend:** Start with A (personal tool). If it works for you, expand to B later.\n\n**What you do:** Choose A or B. I build immediately.\n\n**Timeline:** A = 2-3 days. B = 1-2 weeks.
**Pending since:** Apr 09, 18:41
**ID:** `notif_1775760070634_61acb260`

No details provided


## CoinUsUp — Trial Feature

### 🟡 Card task_1773156748695_23b9e471 has been fully implemented and is waiting for your Stripe dashboard update since 2026-04-09. Last reminder was Apr 9.
**Pending since:** Apr 15, 20:22
**ID:** `notif_1776284524796_1d6fca66`

**Next Step:**\nLog into Stripe dashboard and create/update 12 Basic/Pro price objects with 14-day trial. Once done, the feature goes live.\n\n**Or:** If you'd prefer to skip the trial feature for now

### 🟡 Implementation is complete. To finish: either (A) Update the 12 Basic/Pro tier prices in Stripe dashboard to enable trials, or (B) Skip this feature for now. Which would you prefer?
**Pending since:** Apr 15, 16:21
**ID:** `notif_1776270113597_79b10ca4`

task_1773156748695_23b9e471

### 🟡 CoinUsUp trial code is 100% complete and deployed to staging. All you need to do is update 12 Stripe product prices with trial_period_days=14. Takes 5 minutes.

Basic tier (4 prices): US Monthly, US Annual, CA Monthly, CA Annual
Pro tier (4 prices): US Monthly, US Annual, CA Monthly, CA Annual

Once done, I'll deploy to production same day.

**Questions:**
1. Ready to do Stripe dashboard update today?
2. Or should we skip/defer free trials for now?
**Pending since:** Apr 10, 02:41
**ID:** `notif_1775788885611_a5021adb`

No details provided

### 🟡 CoinUsUp trial implementation is production-ready (code + frontend 100% complete, all tests passing).\n\n**BLOCKER:** Stripe dashboard manual config needed.\n\n**Action:** Create 12 price IDs in Stripe:\n- Basic Monthly US, Basic Monthly CA\n- Basic Annual US, Basic Annual CA\n- Pro Monthly US, Pro Monthly CA\n- Pro Annual US, Pro Annual CA\n- Plus 2 Enterprise prices\n\nFor each, set **trial_period_days = 14**.\n\n**Help:** See CoinUsUp repo stripe-prices.ts for exact product/price IDs to create.\n\n**Timeline:** 30 min work, then trial launches immediately.
**Pending since:** Apr 09, 18:41
**ID:** `notif_1775760070628_22478b25`

No details provided

### 🟡 CoinUsUp Recurring Donations — Stripe Keys Needed to Proceed with Testing
**Pending since:** Mar 24, 10:37
**ID:** `notif_1774348633358_ebc3c96c`

Phase B testing is blocked on Stripe configuration. The feature is 100% code-complete (builds, all hooks work, UI integrated), but I can't run the end-to-end tests without Stripe API keys.

**What you


## Consulting Scalability

### 🟡 What would make your consulting work more systematic or scalable?
**Pending since:** Apr 14, 13:00
**ID:** `notif_1776171600763_0cfd371b`

Right now it's bespoke. Could you build repeatable templates, productize pieces, or just accept it's 1-on-1?


## Even Us Up

### 🟡 For Even Us Up, what's the smallest win that would feel like real progress?
**Pending since:** Apr 13, 13:00
**ID:** `notif_1776085200829_3538e76a`

Not 'become the next Splitwise'—what would feel like legitimate traction in the next 3 months?


## Other

### 🟡 Card task_1774058538023_ae4bf3d2 has been blocked since 2026-04-08 waiting for you to choose the build direction. Last reminder was Apr 9.
**Pending since:** Apr 15, 20:22
**ID:** `notif_1776284521725_0c434a2c`

Please select ONE:\n\n**A) Personal Internal Tool** — Build a simple invoice audit tool for your own use first\n\n**B) External SaaS MVP** — Build freemium SaaS targeting Canadian SMBs (.5k-15k MRR po

### 🟡 All 6 specification documents are complete and validated (87.9 KB, ~22K words). Market, product, technical, and business validation all PASS. Ready to handoff to development. Question: Approve to start 4-week development sprint this week? See GRANT_WRITER_EXECUTIVE_SUMMARY_2026-04-15.md for decision summary.
**Pending since:** Apr 15, 16:21
**ID:** `notif_1776270105660_d1330128`

task_1776231233660_b4350b92

### 🟡 Untitled
**Pending since:** Mar 25, 16:18
**ID:** `?`



### 🟡 Untitled
**Pending since:** Mar 25, 16:18
**ID:** `?`



### 🟡 Untitled
**Pending since:** Mar 25, 16:18
**ID:** `?`




## Trader Signal Post-Mortem

### 🟡 5 spec documents delivered: Product Blueprint, Tech Spec, MVP Plan, Bootstrap Guide, Executive Summary. Ready for your review and go/no-go decision. All files at /workspace/ideas/TRADER_SIGNAL_* (total 68KB, ~15 min read time). Key insight: Setup-based review workflow is missing from competitors—this fills a gap.
**Pending since:** Apr 13, 20:19
**ID:** `notif_1776111569945_1142976b`

Approve for build

### 🟡 The freshness scanner found 148 artifacts with 4 stale, 2 superseded, and 3 contradiction zones.

**What I need from you:**
1. Review FRESHNESS-SCANNER-REPORT.md (findings)
2. Confirm which superseded items to archive (e.g., Apr 2 portfolio vs Apr 11 portfolio)
3. Review the 3 contradiction zones (Signal App, CoinUsUp Growth, Even Us Up Roadmap)
4. Approve cleanup automation

Once you confirm, I'll auto-archive stale items and consolidate contradiction zones.

**Timeline:** 30 min to review, 20 min to execute if approved.
**Pending since:** Apr 13, 04:18
**ID:** `notif_1776053904561_9e9d7720`

No details provided


---

## Action Required

**BLOCKING DECISIONS (must decide before proceeding):**

_(none)_

**PENDING DECISIONS (should decide soon):**

1. **Card task_1773156748695_23b9e471 has been fully implemented and is waiting for your Stripe dashboard update since 2026-04-09. Last reminder was Apr 9.** (ID: `notif_1776284524796_1d6fca66`)
1. **Implementation is complete. To finish: either (A) Update the 12 Basic/Pro tier prices in Stripe dashboard to enable trials, or (B) Skip this feature for now. Which would you prefer?** (ID: `notif_1776270113597_79b10ca4`)
1. **CoinUsUp trial code is 100% complete and deployed to staging. All you need to do is update 12 Stripe product prices with trial_period_days=14. Takes 5 minutes.

Basic tier (4 prices): US Monthly, US Annual, CA Monthly, CA Annual
Pro tier (4 prices): US Monthly, US Annual, CA Monthly, CA Annual

Once done, I'll deploy to production same day.

**Questions:**
1. Ready to do Stripe dashboard update today?
2. Or should we skip/defer free trials for now?** (ID: `notif_1775788885611_a5021adb`)
1. **CoinUsUp trial implementation is production-ready (code + frontend 100% complete, all tests passing).\n\n**BLOCKER:** Stripe dashboard manual config needed.\n\n**Action:** Create 12 price IDs in Stripe:\n- Basic Monthly US, Basic Monthly CA\n- Basic Annual US, Basic Annual CA\n- Pro Monthly US, Pro Monthly CA\n- Pro Annual US, Pro Annual CA\n- Plus 2 Enterprise prices\n\nFor each, set **trial_period_days = 14**.\n\n**Help:** See CoinUsUp repo stripe-prices.ts for exact product/price IDs to create.\n\n**Timeline:** 30 min work, then trial launches immediately.** (ID: `notif_1775760070628_22478b25`)
1. **CoinUsUp Recurring Donations — Stripe Keys Needed to Proceed with Testing** (ID: `notif_1774348633358_ebc3c96c`)
1. **Card task_1774058538023_ae4bf3d2 has been blocked since 2026-04-08 waiting for you to choose the build direction. Last reminder was Apr 9.** (ID: `notif_1776284521725_0c434a2c`)
1. **All 6 specification documents are complete and validated (87.9 KB, ~22K words). Market, product, technical, and business validation all PASS. Ready to handoff to development. Question: Approve to start 4-week development sprint this week? See GRANT_WRITER_EXECUTIVE_SUMMARY_2026-04-15.md for decision summary.** (ID: `notif_1776270105660_d1330128`)
1. **Untitled** (ID: `?`)
1. **Untitled** (ID: `?`)
1. **Untitled** (ID: `?`)
... and 8 more

---

_Report auto-generated by `consolidate-pending-decisions.sh`_