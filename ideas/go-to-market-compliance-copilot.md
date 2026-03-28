# Go-to-Market Strategy: Canadian SMB Compliance Copilot

**Launch Target:** May 1, 2026  
**Budget:** $2,000-5,000 (first 2 months)  
**Team:** Joe (solo)  
**Goal:** 50-100 paying customers by June 30, 2026

---

## Customer Research (April 1-7)

### Validation Interviews (10 customers)

**Screener Question:**
> "Do you own/run a Canadian small business (10-100 employees)? Do you currently track CRA deadlines, HST/GST filing dates, and payroll compliance obligations?"

**Target Channels:**
1. **Canadian Small Business Facebook Groups:**
   - Canadian Small Business Owners Forum (45k members)
   - Small Business Canada (32k members)
   - Canadian Entrepreneurs (28k members)
   
2. **Reddit:**
   - r/CanadianSmallBusiness (8k members)
   - r/CanadianEntrepreneur (4k members)

3. **LinkedIn:**
   - Direct message 10 SMB owners found via search "Canadian SMB founder"

4. **Cold Email:**
   - Email 20 accountants/bookkeepers (from local Chamber of Commerce directories)
   - Subject: "Beta testers needed: Canadian compliance calendar for SMBs"

### Interview Questions (30 min call)

**Pain Points:**
1. "What's your biggest compliance headache right now? (HST? Payroll? CRA deadlines?)"
2. "How are you currently tracking CRA deadlines? (spreadsheet, email, calendar?)"
3. "Have you ever missed a deadline? What was the impact?"
4. "How much time do you spend on compliance each month?"
5. "What would be worth paying for to reduce that?"

**Pricing Feedback:**
6. "Would you pay $29/month for automated CRA deadline reminders + HST/GST checklists?"
7. "Would you pay $79/month if it also included AI Q&A for tax/HR questions?"
8. "How much is a single missed CRA deadline worth to you? (in terms of penalty + time)"

**Product Feedback:**
9. "What features would matter most to you? (reminders, checklists, AI help, document storage?)"
10. "Would you integrate this with QuickBooks/FreshBooks if we offered it?"

**Go-Forward:**
11. "Would you be interested in beta testing in April?"

### Output
- **Spreadsheet:** Record 10 interviews + responses
- **Synthesis:** 1-page summary of top 3 pain points + pricing feedback
- **Commit:** Recruit 5-10 beta customers for April MVP phase

**Effort:** 10 hrs (recruiting) + 5 hrs (interviews) = 15 hrs total

---

## MVP Roadmap (April 8-28)

### Week 1: Core Features (April 8-14)
**Deliverable:** Functional deadline calendar + basic UI

Tasks:
- [ ] Research & document HST/GST filing deadlines (all Canadian provinces + CRA)
  - HST provinces: ON, NB, NS, NL, PE
  - GST provinces: BC, AB, SK, MB, QC, etc.
  - CRA key dates: T4 slips (Feb 28), Corporate return (6 months end of fiscal year)
- [ ] Create database schema (user, business_info, deadline, notification_log)
- [ ] Build calendar view (Next.js + react-calendar or fullcalendar.io)
- [ ] Auto-populate deadlines based on business fiscal year
- [ ] Email notification setup (SendGrid)

**Tech Stack:**
```
Frontend: Next.js + TypeScript
Backend: Vercel serverless functions
Database: Supabase PostgreSQL
Auth: Supabase + Google OAuth
Email: SendGrid or Resend
Hosting: Vercel
```

**Estimated effort:** 40 hrs (full time = 5 days)

### Week 2: AI + Polish (April 15-21)
**Deliverable:** Working beta with AI copilot + email reminders

Tasks:
- [ ] Claude API integration for compliance Q&A
  - Prompt: "You are a Canadian tax/HR compliance expert. Answer questions about HST, GST, CRA deadlines, T4 obligations, CPP/EI deductions, and corporate bylaws."
  - Context: Province + business type + employee count
- [ ] UI for asking compliance questions (simple chat interface)
- [ ] Payroll compliance checklist (T4 dates, source deduction deadlines)
- [ ] Email reminder system (30 days before due date)
- [ ] User registration flow + onboarding
- [ ] Basic analytics (signup count, active users)

**Estimated effort:** 35 hrs (full time = 4 days)

### Week 3: Beta Testing (April 22-28)
**Deliverable:** Live beta with 10-20 testers, feedback collected

Tasks:
- [ ] Recruit 10-20 beta users from Facebook/Reddit
- [ ] Monitor usage + collect feedback via Typeform
- [ ] Fix critical bugs + UX issues
- [ ] Iterate on AI copilot prompts based on user questions
- [ ] Create landing page (simple, Webflow or Framer)
- [ ] Set up payment processing (Stripe)

**Estimated effort:** 20 hrs (part time = distributed)

**Total MVP Effort:** 95 hrs (~2 weeks full-time)

---

## Launch Strategy (May 1-31)

### Soft Launch (May 1-7)
**Goal:** 20 paying customers

**Channels:**
1. **Email beta testers:** "Compliance Copilot is now live. Use code BETA50 for 50% off first 3 months."
2. **Facebook groups:** Post in 5 Canadian SMB groups: "Just launched Canadian compliance calendar + AI for HST/GST. Free for first 10 SMBs, $29/month after."
3. **Reddit:** Post in r/CanadianSmallBusiness + r/CanadianEntrepreneur with demo video
4. **LinkedIn:** Personal post about launch + tag Canadian SMB groups/communities

**Budget:** $0 (organic)

### Paid Acquisition (May 8-31)
**Goal:** 50-100 customers

**Channels:**
1. **Google Ads** (Budget: $1,000-1,500)
   - Keywords: "CRA deadlines Canada", "HST filing deadline", "Canadian payroll compliance"
   - Landing page: Compliance Copilot home page
   - Target: SMBs (income: $50k+, business owner intent)
   - Expected CAC: $20-30
   - Expected conversion: 3-5%

2. **Facebook Ads** (Budget: $500-1,000)
   - Audience: Canadian business owners (25-65), interests: accounting, tax, small business
   - Creative: "Stop missing CRA deadlines. AI calendar + compliance help for $29/month"
   - Expected CAC: $15-25
   - Expected conversion: 2-4%

3. **Organic Referral Program**
   - Refer a friend: "Refer an SMB, get $10 credit per signup" (capped at 5 referrals/month)
   - Expected viral coefficient: 0.2-0.3 (low, but helps)

**Total Ad Budget (Month 1):** $1,500-2,500

### Public Relations (May - ongoing)
1. **Press release:** "Canadian startup launches AI-powered compliance calendar for SMBs"
2. **Podcast outreach:** Contact 10 Canadian small business podcasts
3. **Blog posts:** "Top CRA deadlines for Canadian SMBs in 2026" (SEO play)

**Budget:** $0 (organic outreach)

---

## Pricing Strategy

### Tier 1: Basic ($29/month)
- HST/GST deadline calendar
- Payroll compliance checklist
- Email reminders (30 days before due)
- Email support
- Perfect for: Solo consultants, micro-businesses

### Tier 2: Pro ($79/month)
- Everything in Basic +
- AI copilot (ask compliance questions)
- Document storage (5GB for tax docs, receipts, invoices)
- Priority email support
- Integration roadmap: QuickBooks, FreshBooks
- Perfect for: 10-50 person SMBs

### Tier 3: Enterprise ($199/month)
- Everything in Pro +
- Unlimited document storage
- Team collaboration (multi-user access)
- Phone support
- Custom integrations + API access
- Perfect for: 50-100 person SMBs + accounting firms

### Expansion Revenue (Post-MVP)
1. **Add-ons:** T1 personal tax (simple filing) — $50/month add-on
2. **Training:** 1-on-1 compliance training sessions — $200/hr
3. **Integrations:** QuickBooks sync — $15/month add-on
4. **Consulting:** Custom payroll setup — $500/project

---

## Customer Acquisition Cost (CAC) & Payback Period

### Month 1 (May):
- Total ad spend: $2,000
- New customers: 80 (mixed organic + paid)
- Blended CAC: $25/customer
- Payback period: 1.2 months (at $79 avg MRR)

### Month 2-3 (June-July):
- Word-of-mouth + organic: 40% of new signups
- Ad spend: $1,500/month
- New customers/month: 100+
- CAC: $15-20
- Payback period: <1 month

### Unit Economics (Steady State)
- Avg MRR per customer: $50 (mix of Basic + Pro + Enterprise)
- Customer lifetime: 24 months (assuming 2-year retention)
- Lifetime value (LTV): $1,200
- CAC: $20
- LTV:CAC ratio: 60:1 ✅ (healthy)

---

## Success Metrics (90-Day)

| Metric | Target | How to Track |
|--------|--------|--------------|
| **Signups** | 500+ | Supabase user count |
| **Paying customers** | 100-150 | Stripe dashboard |
| **MRR** | $5k-7.5k | Stripe recurring revenue |
| **Retention (30-day)** | >60% | Cohort analysis |
| **CAC** | <$25 | Ad spend / new customers |
| **Product-market fit** | NPS > 40 | Monthly NPS survey |
| **Feature requests** | Top 3 identified | Typeform feedback |

---

## Post-Launch (June-August 2026)

### High-Priority Features
1. **QuickBooks integration** — Export deadline checklist to QB calendar
2. **Bulk email feature** — Send compliance summary to multiple team members
3. **Mobile app** — iOS/Android (via React Native or Flutter)
4. **T1 Preparation Helper** — Guide SMBs through T1 General personal tax filing

### Content Marketing (3 blog posts/month)
- "CRA Deadline Calendar 2026: Key Dates Every Canadian SMB Needs to Know"
- "HST/GST Filing Mistakes That Cost Small Businesses Thousands"
- "AI for Compliance: How to Stay Tax-Compliant Without a Bookkeeper"

### Customer Success
- Monthly email: Upcoming deadlines + compliance reminders
- Quarterly webinar: "Q&A: Canadian Tax Changes in 2026"
- Paid customer concierge: Setup call (15 min, free) for Enterprise customers

---

## Hiring & Scale (If Traction Hits)

### If 200+ customers by July:
- Hire 1 part-time customer success person ($2k/month)
- Build automated onboarding flow (reduce support load)
- Launch Spanish-language version (expand to Latin America? Out of scope for now)

### If 500+ customers by September:
- Hire 1 full-time engineer (build integrations, mobile app)
- Consider pivot to SaaS acquisition (sell to accountants vs direct-to-SMB)

---

## Budget Summary (First 6 Months)

| Item | Cost |
|------|------|
| **Development (MVP)** | ~$0 (Joe solo) |
| **Hosting (Vercel + Supabase)** | $100/month = $600 |
| **Email (SendGrid)** | $10/month = $60 |
| **Ads (May-July)** | $2k + $1.5k + $1.5k = $5k |
| **Domain + SSL** | $20/year |
| **Landing page (Webflow)** | $120/month × 3 = $360 |
| **Total Cash Outlay** | ~$6k |

**Expected revenue (6-month):** $5k + $7.5k + $12k + $16k + $20k + $23k = **$83.5k gross**

---

## Risk Mitigation

### Risk #1: Regulatory Changes
**Problem:** CRA rules change mid-year (rare, but possible)
**Mitigation:** Monitor CRA website + subscribe to CRA updates. Publish blog posts about changes.

### Risk #2: Low Product-Market Fit
**Problem:** SMBs don't want to pay for compliance (they use free tools)
**Mitigation:** Validate pricing in customer research (April). A/B test $29 vs $49 vs $79 pricing.

### Risk #3: High Churn
**Problem:** Customers cancel after CRA deadline passes
**Mitigation:** Focus on sticky features: quarterly webinars, compliance Q&A, document storage, integrations.

### Risk #4: Acquisition Cost Too High
**Problem:** Google Ads + Facebook Ads saturated; CAC exceeds $30
**Mitigation:** Pivot to organic (content marketing, partnerships with accountants/bookkeepers)

### Risk #5: Competitive Response
**Problem:** Wealthsimple or TurboTax launches similar product
**Mitigation:** Lock in early customers with 1-year contracts. Build integrations (QuickBooks, FreshBooks) that competitors can't match in 6 months.

---

## Key Decisions for Joe (Review & Approve)

1. **Proceed with Compliance Copilot?** YES / NO
2. **Timeline:** Start April 1 MVP build? YES / NO
3. **Budget:** Approve $5k ad spend (May-July)? YES / NO
4. **Pricing tiers:** Use $29/$79/$199 model? ADJUST
5. **First 10 customers:** Offer 50% discount for life? YES / NO (retention vs revenue tradeoff)

---

**Status:** ✅ Go-to-market strategy complete and ready for Joe review.
