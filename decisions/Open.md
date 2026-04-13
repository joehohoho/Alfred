# Open Decisions (Awaiting Joe Input)

**Last Updated:** 2026-04-13 14:08 ADT  
**Total:** 5 decisions (2 urgent, 3 strategic)

---

## 🔴 URGENT (Age: 19+ days)

### Decision 1: CoinUsUp Trial — Stripe Configuration
**Question:** Ready to configure 12 Stripe prices with trial_period_days=14 today?  
**Context:**
- Trial feature code is 100% complete (database, checkout, webhooks, frontend all tested)
- Staging deployment ready
- Only blocker: 12 Stripe prices need trial_period_days set in Stripe dashboard
- Effort: ~5 minutes
- Payoff: Trial launches → revenue generation begins

**Options:**
- ✅ **Option A:** Configure today → deploy tomorrow
- ❌ **Option B:** Skip trials for now → defer revenue

**Recommendation:** A (high-priority unblock)  
**Notification history:** Multiple (latest 2026-04-09 03:40)  
**Age:** 19 days pending  

---

### Decision 2: Bill Review MVP — Scope Direction
**Question:** Build as personal tool (A) or commercial SaaS (B)?  
**Context:**
- Market validation complete (demand confirmed; 14.3% CAGR in invoice audit market)
- Blueprint ready (internal tool spec + SaaS spec both drafted)
- Competitors identified (Stampli, BILL, Coupa exist but miss SMB audit-first)
- Revenue potential: $60-80K ARR (personal) or $120-150K ARR (SaaS)

**Options:**
- **Option A (Personal Tool):** 
  - Build internal invoice-audit app for Joe's use
  - Estimated: 2-3 weeks MVP
  - Test internally; expand later if successful
  - Lower risk, faster to revenue
  
- **Option B (Commercial SaaS):**
  - Build for market; target Canadian SMBs
  - Estimated: 1-2 weeks MVP + 2 weeks go-to-market
  - Higher revenue potential but more work upfront
  - Requires onboarding, support, pricing

**Recommendation:** Start with A (personal tool). If it works for you, expand to B.  
**Notification history:** Multiple (latest 2026-04-10 02:41)  
**Age:** 3+ days pending  

---

## 🟡 STRATEGIC (Age: 10+ days)

### Decision 3: Even Us Up — Q2 Prioritization
**Question:** Is Even Us Up a top-3 project for Q2 (Apr-May)?  
**Context:**
- Product is market-ready; strong differentiation (Interac + roommate-first positioning)
- Execution stalled 23 days despite Q2 plan existing
- No progress, no visible blockers (except priority clarity)
- Growth potential: +20-50% in active groups if Phase 1 executed

**Options:**
- **Option A (Top-3 Priority):**
  - Pick Phase 1 focus: settlement clarity (4-6h), onboarding (6-10h), or OCR (8-12h)
  - Allocate time to 3-week Phase 1 sprint
  - Start referral program (~$500/month budget)
  
- **Option B (Back-burner):**
  - Keep Even Us Up as side project; focus on CoinUsUp + Bill Review
  - Monthly check-in for maintenance only

**Recommendation:** If you have 3+ weeks available, recommend Option A (high synergy with other products).  
**Impact:** Phase 1 completion → +$150-250 MRR growth  
**Age:** 23-day execution gap  

---

### Decision 4: Signal App — Public vs. Internal
**Question:** Launch Signal App as public product or keep as personal trading tool?  
**Context:**
- Market opportunity: $20,000-35,000 MRR (if launched publicly)
- Current use: Personal trading signals (not monetized)
- Validation: 3+ competitors live; gap = Joe's signal-review + risk analysis angle
- Effort: 6-8 weeks to MVP, 4-6 weeks to productization

**Options:**
- **Option A (Public Product):**
  - Launch to market; target retail traders
  - Freemium + premium tiers ($29-79/month)
  - Requires: go-to-market (Reddit, Discord, communities), customer support
  - Revenue potential: $20-35K MRR (year 1-2)
  
- **Option B (Personal Tool):**
  - Keep for your own trading
  - Optimize for your signals + risk profile only
  - Low maintenance; zero revenue but personal value

**Recommendation:** Option A has high passive income potential if you want to add it to roadmap.  
**Market validation:** Done (demand confirmed)  
**Age:** Pending strategic decision  

---

### Decision 5: Q2 Revenue Targets — Strategy Clarity
**Question:** What's your target revenue for end of Q2 (May 31)?  
**Context:**
- Current MRR: ~$400-650 (Even Us Up + ancillary)
- CoinUsUp potential: +$200-500 MRR (if trial launches + optimized)
- Bill Review potential: +$200-400 MRR (if launched as personal tool → SaaS)
- Signal App potential: +$2,000-5,000 MRR (if launched publicly)
- Time budget: Limited (prioritization needed)

**Options:**
- **Option A (Conservative):** $500-800 MRR by May 31 (CoinUsUp + Even Us Up growth only)
- **Option B (Moderate):** $1,000-1,500 MRR by May 31 (add Bill Review personal tool + Signal App foundation)
- **Option C (Aggressive):** $2,000+ MRR by May 31 (all products moving; Signal App launched)

**Recommendation:** Depends on your time availability + risk tolerance. Option B balances growth + feasibility.  
**Impact:** Target guides prioritization of all 5 active projects  
**Age:** Ongoing (not yet set)  

---

## 📊 Decision Priority Map

| Decision | Urgency | Effort | Impact | Recommended |
|----------|---------|--------|--------|------------|
| Stripe Config (CoinUsUp) | 🔴 URGENT | 5 min | Critical | A (do today) |
| Bill Scope | 🔴 URGENT | - | Critical | A (personal first) |
| EUU Priority | 🟡 MEDIUM | 3 weeks | High | A (if time available) |
| Signal Public | 🟡 MEDIUM | 14-16 wks | High | A (strategic decision) |
| Revenue Target | 🟡 MEDIUM | - | High | B (moderate target) |

---

## 🔗 Related Files

**Context & Analysis:**
- [[Projects/CoinUsUp]] — trial feature details
- [[Projects/Even-Us-Up]] — growth audit findings
- [[Projects/Signal-App]] — market opportunity
- [[Blockers/Active]] — current blockers

**Memory References:**
- [[memory/2026-04-13]] — daily audit findings
- [[memory/2026-04-10]] — Even Us Up growth audit
- [[ACTIVE-TASK.md]] — pending questions section

---

**Next Steps:**

1. **Today:** Reply to Stripe Config decision (5 min, highest ROI)
2. **This week:** Clarify Bill Scope (A or B)
3. **Next week:** Set Even Us Up priority + Phase 1 focus
4. **Ongoing:** Signal App + Revenue Target strategic decisions

---

**Created:** 2026-04-13 14:08 ADT (Alfred)  
**Status:** Waiting on Joe input for unblocking
