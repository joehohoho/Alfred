# Compliance Deadline Tracker — Feasibility & Build Analysis
**Generated:** 2026-03-19 by Alfred  
**Card:** task_1773957650263_904cc503  
**Status:** Ready for Joe review

---

## TL;DR

**Verdict: Strong YES — build it.**  
Low build effort, clear market gap, fear-driven retention, and a pricing tier that feels cheap vs. the cost of a single fine. The core product is a recurring-alert engine with a pre-seeded compliance calendar per business type — not a scheduling app, not accounting.

---

## 1. Market Gap Analysis

### Existing Tools — Why They Miss

| Category | Examples | Gap |
|---|---|---|
| Enterprise IT License Mgmt | Zluri, Snipe-IT | For corporate SaaS spend, not government permits |
| Vertical Scheduling SaaS | DaySmart Tattoo, Booksy, STX | Booking-first; compliance is an afterthought sidebar, not the product |
| Generic Calendars | Google Calendar, Outlook | No pre-seeded regulatory deadlines, no business-type logic, no escalation |
| Municipal Portals | City websites | No proactive alerts; owner must know to check |

**Key gap:** No product exists that says "you're a tattoo studio in Ontario — here are your 11 recurring compliance deadlines, pre-loaded, with 90/30/7-day alerts." That product doesn't exist. These owners Google it manually (or miss it).

### Target Verticals (High-Regulation, High-Pain)

| Vertical | Compliance Pain | US Count (est.) |
|---|---|---|
| Tattoo / Piercing Studios | Health dept inspections, bloodborne pathogen certs, ink registration | ~25,000 |
| Food Trucks | Health permits, commissary agreements, fire certs, zoning, vehicle inspection | ~35,000 |
| Cannabis Dispensaries | State license renewals, track-and-trace compliance, employee badging | ~15,000 |
| Daycares / Home Daycares | Licensing renewals, fire drills logged, staff cert expirations | ~200,000+ |
| Estheticians / Nail Salons | State board license, sanitation inspections, individual tech licenses | ~300,000+ |

TAM: Millions of regulated micro-businesses in NA alone. Even 0.1% penetration = thousands of customers.

---

## 2. Revenue Model

| Tier | Price/mo | Target |
|---|---|---|
| Solo | $19/mo | Single-location sole proprietor |
| Studio | $39/mo | 2-5 locations or multi-staff license tracking |
| Multi-Location | $79/mo | Franchise or chain with 5+ sites |

**Key psychology:** A missed health permit renewal = $500–$5,000 fine + forced closure = days of lost revenue. The product pays for itself in preventing one incident. This is a no-brainer sell.

**200 customers at $39 avg = $7,800 MRR / ~$93,600 ARR**  
Realistic 12-month target for solo founder with basic marketing.

---

## 3. MVP Feature Set

### Must Have (v1)
- **Business Type Onboarding Wizard** — pick your type (tattoo, food truck, daycare, etc.) + jurisdiction (province/state) → pre-seeded compliance calendar loaded automatically
- **Deadline Dashboard** — visual list: "X days until Y permit renewal"
- **Email + SMS Alerts** — 90 / 30 / 7 / 1 day before each deadline
- **Custom Deadlines** — add one-off or recurring items not in the pre-seeded list
- **Mark as Renewed** — one-click to reset the countdown for another cycle
- **Document Vault (light)** — upload PDF of current permit, linked to the deadline

### Nice to Have (v2)
- **Team Member License Tracking** — track individual employee cert expiration (food handler, bloodborne pathogen, cosmetology license)
- **Jurisdiction Updates** — Alfred-style periodic scan for regulatory changes, flagged to user
- **Renewal Link Library** — direct link to the municipal/state renewal portal per deadline
- **Multi-Location** — single dashboard for franchise/chain operators
- **Integrations** — Slack/email digest, Google Calendar sync

### Explicitly Out of Scope (v1)
- Accounting / invoicing
- Scheduling / booking
- POS / payment processing
- Automated filing (legal liability minefield)

---

## 4. Tech Stack (Recommended — Lean)

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js + Tailwind | Fast to build, great dashboard UIs |
| Backend | Supabase (Postgres + Auth + Storage) | Auth, DB, file storage in one; free tier covers MVP |
| Alerts | Resend (email) + Twilio (SMS) | Resend is cheap/reliable; SMS optional at launch |
| Payments | Stripe | Standard; subscriptions built-in |
| Hosting | Vercel | Free tier fine for MVP scale |
| Compliance DB | JSON seed files per business type | Human-maintained; update annually |

**Build time estimate:** 2–4 weeks solo (vibe coding with Codex/Claude Code), assuming:
- Week 1: Auth, onboarding wizard, compliance calendar seeding (3 business types)
- Week 2: Dashboard, alert engine, email notifications
- Week 3: Document vault, custom deadlines, Stripe integration
- Week 4: Polish, mobile responsiveness, 2 more business types, beta launch

---

## 5. Compliance Database Design

The core moat is the pre-seeded deadline data. Structure:

```json
{
  "business_type": "tattoo_studio",
  "jurisdiction": "CA",  // province or state code
  "deadlines": [
    {
      "id": "health_permit_annual",
      "label": "Health Department Permit Renewal",
      "recurrence": "annual",
      "typical_due": "varies_by_municipality",
      "alert_days": [90, 30, 7, 1],
      "renewal_url": "https://...",
      "notes": "Required by all tattoo studios operating in CA. Contact local health unit."
    },
    {
      "id": "bloodborne_pathogen_cert",
      "label": "Bloodborne Pathogen Training Certificate",
      "recurrence": "annual",
      "typical_due": "rolling",
      "alert_days": [60, 30, 7],
      "notes": "Required per artist. Track individually."
    }
  ]
}
```

Start with 5 verticals × 3 jurisdictions = manageable initial dataset. Expand via user feedback.

---

## 6. Go-To-Market Strategy

### Phase 1 — Beta (Month 1-2)
- Post in niche Reddit communities: r/tattooartists, r/FoodTrucks, r/Childcare, r/smallbusiness
- Free 90-day beta for 20-30 studios in exchange for feedback + testimonials
- Focus: one vertical only (food trucks or tattoo studios — both have tight community networks)

### Phase 2 — Launch (Month 3)
- Product Hunt launch
- Cold email to local tattoo/food truck associations
- "Avoid this $2,000 fine" content marketing (case studies, blog)
- Partner with local business licensing consultants (referral share)

### Phase 3 — Growth (Month 4+)
- Expand jurisdictions via community-submitted data
- Add team member license tracking (unlocks daycare/salon verticals)
- Affiliate program for business lawyers / accountants who serve these verticals

---

## 7. Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Jurisdiction data becomes stale | Medium | Annual review process; community corrections; disclaim "verify with local authority" |
| Low organic discovery | Medium | Niche community presence + content marketing; these owners search for this specifically |
| Competitor copies idea | Low-Medium | First-mover community trust + network effects from jurisdiction data |
| SMS costs spike | Low | Gate SMS behind paid tiers; email primary |
| Regulations change mid-year | Low | UI allows user to override + flag; email update when major changes occur |
| User churn after renewal season | Low | Fear of missed deadlines = sticky; always another deadline coming |

---

## 8. Differentiation vs. Hypothetical Competitors

The key moat is **pre-seeded compliance intelligence by business type + jurisdiction**. Competitors would have to:
1. Research every deadline per vertical per jurisdiction
2. Build onboarding UX that feels effortless, not generic
3. Win community trust in tight-knit trades (tattoo artists, food truck operators)

A generic calendar app will never nail this UX. A bookings app won't pivot to it — it's not their core.

---

## 9. Joe's Build Path (Recommended)

1. **Start:** Food Trucks (US + Canada) — extremely active online communities, well-documented compliance requirements, strong word-of-mouth network
2. **Then:** Tattoo / Piercing Studios — tight community, high pain, Instagram presence to leverage
3. **Then:** Daycares + Estheticians — larger TAM, slightly more complex (staff cert tracking)
4. **Later:** Cannabis (complex, legally sensitive, better once product is proven)

---

## 10. Passive Income Score (Alfred's Estimate)

| Criterion | Score | Notes |
|---|---|---|
| Build effort | 9/10 | Very low; 3-4 week solo MVP |
| Market size | 8/10 | Millions of regulated micro-businesses |
| Retention / churn resistance | 9/10 | Fear of fines = no one cancels |
| Maintenance burden | 9/10 | Annual deadline data review only |
| Competition moat | 7/10 | Gap exists now; could attract clones |
| Revenue ceiling | 7/10 | $50-150K ARR realistic; not unicorn-scale |
| **Overall** | **8.2/10** | **Strong passive income candidate** |

---

## Recommendation

**Build this.** It hits every criterion Joe cares about:
- Low build effort (pure vibe coding candidate)
- Sticky subscription (fear-based retention)
- Minimal maintenance
- Clear niche that existing tools ignore

**Next step if approved:** Spawn a Codex agent to scaffold the Next.js + Supabase project with the food truck onboarding wizard as v1. Estimated 2-3 days to working demo.

---

*Analysis by Alfred 🎩 | 2026-03-19*
