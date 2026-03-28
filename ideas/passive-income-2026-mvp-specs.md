# 3 Novel Passive Income Ideas — MVP Specifications & Execution Roadmaps
**Created:** 2026-03-28 02:30 ADT  
**Status:** In Development  
**Based on:** HAL market trends analysis (Mar 27) + Joe's 20+ year domain expertise

---

## Idea #1: Unstructured Data → Structured Records SaaS

### Market Position
**Problem:** Law firms, accounting practices, and legal departments spend 15-20 hours/month on manual document extraction (contracts, invoices, agreements → structured accounting records).

**Why Now:**
- Document extraction accuracy improved 40% in 2024-2025 (Claude, GPT-4v)
- Enterprise demand for RPA alternatives (Zapier/Make don't handle complex documents)
- Pricing power: law firms bill $200-400/hr; saving 20 hrs/month at $300/hr = $6,000 value per client

**Competitive Landscape:**
- Zapier: No invoice/contract OCR capability
- UiPath: Enterprise-only ($50k+/year)
- Parsio: $20-100/month but limited accuracy + no accounting integration
- **Gap:** Affordable, specialized tool for legal/accounting firms with accounting system integrations (QuickBooks, Xero, NetSuite)

**Joe's Moat:** 20+ years in accounting/legal consulting; understands exact pain points and integration needs

### MVP Scope (Week 1-3)
**Target Customer:** Solo lawyer or 2-5 person accounting firm

**Core Features:**
1. PDF upload + email forwarding inbox
2. Extract 5 document types (invoices, contracts, expense reports, receipts, agreements)
3. Output to CSV or direct API integration to QuickBooks/Xero
4. Manual review UI (highlight extracted fields, approve/reject)
5. Audit log (who changed what, when)

**Tech Stack:**
- Backend: Python FastAPI or Node.js
- Document processing: Claude API (`vision`) or OpenAI GPT-4v
- Frontend: React SPA (Vercel)
- Database: PostgreSQL (user data, audit logs)
- File storage: AWS S3 or Supabase
- Integration: QuickBooks/Xero REST APIs

**Infrastructure:**
- Cost: ~$30-50/month (Vercel, Supabase, AWS)
- Deploy: Vercel + Supabase (simplest stack)

### MVP Timeline (2-3 weeks, solo dev)
```
Week 1:
  - Day 1-2: Schema design + API scaffolding (document, extraction_result, user)
  - Day 3-4: Document ingestion (S3 upload, email endpoint)
  - Day 5: Claude/GPT-4v extraction pipeline + prompt tuning

Week 2:
  - Day 1-2: Manual review UI (React)
  - Day 3-4: Export to CSV + QuickBooks integration
  - Day 5: Testing + edge cases

Week 3:
  - Day 1-2: Audit logging + user auth (Supabase)
  - Day 3: Bug fixes + performance tuning
  - Day 4-5: Sales/marketing prep (landing page, email sequences)
```

### Revenue Model
**Pricing:** $199-499/month (per-firm, unlimited documents)
- Starter: $199 (100 docs/month, no integrations)
- Pro: $299 (500 docs/month, QuickBooks integration)
- Enterprise: $499 (unlimited, all integrations, priority support)

**Acquisition:** Outbound to legal/accounting forums, LinkedIn, local bar associations (15-20 emails/week)

**Revenue Forecast:**
- Month 1: 1-2 customers ($200-400 MRR)
- Month 2-3: 3-5 customers ($600-2,500 MRR)
- Month 6: 10-15 customers ($2-7k MRR)

**Effort:** 20 hrs/week (development) + 5 hrs/week (sales/support)

---

## Idea #2: AI-Governed Approval Workflow Engine

### Market Position
**Problem:** Large companies want AI to automate decisions (approvals, resource allocation, expense reviews), but legal/compliance teams need: human approval checkpoints, audit trails, and policy enforcement.

**Why Now:**
- Zapier/Make are feature-heavy and slow for complex workflows
- 75% of enterprises (Gartner 2026) want AI-powered workflows but fear compliance risk
- Demand for "AI with guardrails" is growing 3x YoY
- Opportunity: lightweight, compliance-first alternative

**Competitive Landscape:**
- Zapier: No native approval step + no audit logging
- Make (formerly Integromat): Basic approval but no AI decision-making
- Workato: $15k+/year, enterprise-only
- **Gap:** Focused on compliance workflows (approval chain + audit trail + policy enforcement)

**Joe's Moat:** 20+ years in automation consulting; understands corporate compliance + operational constraints

### MVP Scope (Week 1-6)
**Target Customer:** Mid-market company (50-500 people) with 3-5 approval workflows

**Core Features:**
1. Workflow builder (if X, then AI suggests action, route to approver)
2. AI recommendation engine (Claude for decision suggestions)
3. Approval queue UI (queued actions, waiting for approval)
4. Audit log (decision, approver, timestamp, result)
5. Integration: Slack notifications + email
6. Policy engine (rules: only approve if amount < $5k, only approvers in this group)

**Tech Stack:**
- Backend: Node.js/TypeScript (serverless functions or always-on)
- Workflow engine: Custom state machine or Bull job queue
- LLM: Claude API
- Frontend: React SPA
- Database: PostgreSQL
- Auth: OAuth2 (Google, Microsoft)

**Infrastructure:**
- Cost: ~$80-150/month (Vercel, Supabase, serverless compute)
- Scale: Handle 100-1000 approvals/day

### MVP Timeline (4-6 weeks, solo dev)
```
Week 1:
  - Schema design (workflow, decision, approval, audit_log)
  - Workflow builder boilerplate

Week 2:
  - Workflow execution engine (if/then logic)
  - Claude integration for suggestions

Week 3:
  - Approval queue UI
  - Slack/email notifications

Week 4:
  - Audit logging + policy enforcement
  - OAuth + user management

Week 5-6:
  - Testing, performance tuning
  - Customer demo prep
```

### Revenue Model
**Pricing:** Usage-based + monthly seat fee
- Base: $499/month (up to 10 team members, 1,000 approvals/month)
- Pro: $999/month (up to 50 people, 5,000 approvals/month)
- Enterprise: $2,999+/month (custom integrations, SLA, priority support)
- Overage: $0.50 per additional approval

**Acquisition:** LinkedIn B2B outreach, industry forums, consulting networks

**Revenue Forecast:**
- Month 1-2: 0 customers (building, demo prep)
- Month 3: 1 customer ($500 MRR)
- Month 6: 2-3 customers ($1.5-2.5k MRR)
- Month 12: 5-8 customers ($2.5-8k MRR)

**Effort:** 30 hrs/week (development) + 10 hrs/week (sales/support) — more complex than idea #1

---

## Idea #3: Canadian SMB Compliance Copilot

### Market Position
**Problem:** Canadian SMBs (10-100 employees) face CRA deadlines, HST/GST deadlines, payroll deductions, and compliance penalties. Existing tools (Wealthsimple, TurboTax) don't automate business compliance.

**Why Now:**
- CRA penalties: up to 50% of unpaid tax + late fees (strong motivation)
- No single tool handles: HST/GST due dates + CRA deadlines + T4 obligations + provincial rules
- 2.9M SMBs in Canada; 70% manually track deadlines (spreadsheet + email reminders)
- Market gap: ChatGPT + personal tax software exist, but nothing for business compliance

**Competitive Landscape:**
- Wealthsimple Tax: Personal returns only
- UFile: Accounting firms (expensive, $2k+/year)
- CRA My Account: Tracking only, no AI
- Dext: Expense tracking, no compliance
- **Gap:** AI copilot + calendar + checklists for Canadian SMB compliance

**Joe's Moat:** Canadian-based, understands SMB pain + CRA rules; US competitors don't handle Canadian regulations

### MVP Scope (Week 1-2)
**Target Customer:** 10-50 person Canadian SMB without a bookkeeper/accountant

**Core Features:**
1. HST/GST deadline calendar (auto-populate from CRA rules)
2. Payroll compliance checklist (T4 deadlines, source deduction dates)
3. Corporate filing calendar (annual return, director obligations)
4. AI copilot (ask questions about HST, payroll, deductions)
5. Email reminders (30 days before due date)
6. Document storage (keep receipts, invoices organized)

**Tech Stack:**
- Frontend: Next.js SPA (simple, fast)
- Backend: Node.js serverless (Firebase or Supabase)
- AI: Claude API for copilot
- Database: Supabase PostgreSQL
- Emails: SendGrid or Resend

**Infrastructure:**
- Cost: ~$30-50/month (Vercel, Supabase, SendGrid)
- Quick to launch: no complex integrations needed

### MVP Timeline (2 weeks, solo dev)
```
Week 1:
  - Day 1-2: HST/GST deadline database (research CRA + provincial rules)
  - Day 3-4: Payroll compliance checklist (T4, CPP, EI dates)
  - Day 5: UI + calendar view

Week 2:
  - Day 1-2: AI copilot (Claude integration)
  - Day 3-4: Email reminders (SendGrid)
  - Day 5: Testing + launch prep
```

### Revenue Model
**Pricing:** Simple monthly subscription
- Basic: $29/month (HST/GST + payroll reminders, email support)
- Pro: $79/month (+ AI copilot, document storage 5GB, priority support)
- Enterprise: $199/month (+ integrations, QuickBooks sync, 50GB storage)

**Acquisition:** Facebook groups (Canadian small business), LinkedIn, Reddit (/r/CanadianSmallBusiness), Google Ads (HST compliance, CRA deadlines)

**Revenue Forecast:**
- Month 1: 0 customers (launch)
- Month 2: 3-5 customers ($100-150 MRR)
- Month 3: 10-15 customers ($300-450 MRR)
- Month 6: 30-50 customers ($900-1.5k MRR)
- Month 12: 100-150 customers ($2.9-4.4k MRR)

**Effort:** 20 hrs/week (development) + 8 hrs/week (support/marketing)

---

## Comparative Analysis

| Metric | #1 Unstructured Data | #2 Approval Engine | #3 Compliance Copilot |
|--------|----------------------|-------------------|----------------------|
| **MVP Time** | 2-3 weeks | 4-6 weeks | 2 weeks |
| **Tech Complexity** | 2/5 | 4/5 | 2/5 |
| **Fastest Revenue** | 2-4 weeks (1st customer) | 4-6 weeks | 2-3 weeks |
| **Potential 6-month MRR** | $1-2.5k | $1.5-2.5k | $900-1.5k |
| **Sales Cycle** | 1-2 weeks | 4-6 weeks | 1-2 weeks |
| **Market Size** | Medium (law firms + accountants) | Large (all enterprises) | Large (Canadian SMBs) |
| **Joe's Advantage** | Very high (20yr domain) | High (consulting exp) | Very high (Canadian + SMB) |
| **Competitive Moat** | Medium (integrations + accuracy) | High (policy engine + audit) | High (Canadian-specific rules) |

---

## Recommendation: Start with Idea #3 (Compliance Copilot)

**Why:**
1. **Fastest MVP:** 2 weeks vs 2-3 weeks (#1) vs 4-6 weeks (#2)
2. **Clearest market:** Canadian SMBs have acute pain (CRA penalties)
3. **Low tech risk:** Straightforward stack, no complex integrations in MVP
4. **Strong moat:** Regulatory complexity = switching cost; US competitors can't compete on Canadian rules
5. **Acquisition channel:** Facebook groups, Reddit, Google Ads (all cost-effective)
6. **Revenue timing:** First customer in 3-4 weeks (realistic)

**Secondary Pick:** Idea #1 (Unstructured Data) as #2 — similar dev time but higher enterprise price point

---

## Next Steps (For Joe Review)

1. **Validate revenue assumptions** — survey 5-10 Canadian SMBs:
   - "Would you pay $29-79/month for automated CRA deadline tracking + AI compliance help?"
   - "What's your biggest compliance pain today?"

2. **Technical validation:**
   - Confirm HST/GST rules for MVP (research CRA website)
   - Test Claude API for compliance Q&A

3. **Acquire first customer while building:**
   - Post in Canadian small business Facebook groups (March 30)
   - Email 10-15 accountants + bookkeepers offering early access

4. **Execute MVP build:** Start April 1, launch April 14

---

**Deliverable Complete:** ✅ Detailed specs + competitive analysis + execution roadmaps for all 3 ideas ready for Joe review/feedback.
