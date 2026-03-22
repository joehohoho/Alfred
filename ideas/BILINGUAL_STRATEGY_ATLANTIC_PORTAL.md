# Bilingual Strategy — Atlantic Contractor Portal

**Card:** task_1774171849501_375342e7  
**Date:** 2026-03-22  
**Status:** LOCALIZATION & LANGUAGE STRATEGY

---

## Executive Summary

**Bilingual is a competitive moat, not a nice-to-have.**

Atlantic Canada has significant French-speaking populations (especially New Brunswick), but every construction tool on the market is English-only. By building bilingual from day one, we:
1. **Lock out Procore** (enterprise bloat, expensive to add)
2. **Serve a TAM competitors ignore** (French-Canadian contractors)
3. **Build trust in Quebec-border regions** (Dieppe, NB is bilingual-first)
4. **Make legal/compliance easier** (French templates required for government work)

**Scope for MVP:** Templates + documents bilingual (EN+FR). UI translations deferred to Phase 2.

---

## Bilingual Market Opportunity

### French-Speaking Contractor Population (Atlantic Canada)

**New Brunswick (Bilingual by Law):**
- Total population: ~750,000
- French-first speakers: ~230,000 (31%)
- Francophone contractors: ~150-200 (estimated from construction workforce ~25,000)
- **Opportunity:** High (legal requirement for government contracts, cultural expectation)

**Quebec Border (Eastern Townships, Outaouais):**
- Contractors serving Quebec clients need French
- Cross-border projects common
- Estimated pool: 100-200 contractors

**Nova Scotia & Newfoundland (Lower Volume):**
- Acadian populations in scattered regions
- Lower density, but cultural importance
- Estimated: 50-100 contractors

**Total Addressable Bilingual TAM: ~300-500 contractors**
- This is 15-25% of total 2,000 contractor TAM
- But higher willingness-to-pay (bilingual = professionalism signal)
- Lower churn (switching costs higher)

### Revenue Impact

**Conservative Estimate:**
- 30% of customers operate in bilingual regions
- 20% require French documents/communication
- Willing-to-pay premium: +$25/month (for full bilingual support)

**Year 1 revenue from bilingual premium: +$2,000-4,000**
**Year 3 impact: +$15,000-25,000 ARR**

More importantly: **Bilingual is the only product differentiator that Procore can't quickly copy.**

---

## Bilingual Scope Definition

### MVP Scope (Phase 1 Build): Templates + Documents

**IN SCOPE (Bilingual from Day 1):**
1. Quote template (EN + FR versions, auto-generate both)
2. Change order template (EN + FR)
3. Scope of work document (EN + FR)
4. Progress update template (EN + FR)
5. Project status email (EN + FR)
6. Legal/terms footer (EN + FR, Quebec-compliant)

**Approach:** Single template system with language toggle
```
Quote
  └─ template_quote_en.html
  └─ template_quote_fr.html
When user creates quote:
  ✓ Contractor selects language (EN or FR)
  ✓ PDF generated in chosen language
  ✓ Client gets document in that language
  ✓ Approval signature same document
```

**NOT IN SCOPE (Phase 2):**
- Full UI translation (login, dashboard, etc.)
- Mobile app translation
- Customer support in French (yet)
- Legal terms beyond template footers

### Phase 2 Scope (Post-Validation): Full UI Translation

- Complete UI translation (all buttons, labels, forms)
- French customer support (chat + email)
- Quebec legal compliance review (contract templates)
- Mobile app translation

---

## Implementation Strategy

### 1. Document Template System

**Architecture:**
```
/templates
  /quotes
    quote_en.html (English template)
    quote_fr.html (French template)
  /change_orders
    change_order_en.html
    change_order_fr.html
  /scope_documents
    scope_en.html
    scope_fr.html

When creating quote:
  User selects: Language (EN/FR) → System picks right template
  Template fills with:
    - Contractor company name
    - Project details
    - Line items
    - Terms & conditions (bilingual footer)
  Output: PDF in selected language
```

**Translation Approach:**
- Use professional translator (not Google Translate)
- Cost: $1,500-2,000 for templates (one-time)
- French specialist (Quebec French, not just literal translation)
- Legal review for terms/compliance

### 2. Dynamic Content Rendering

**Problem:** Quotes have dynamic content (line items, prices). Translation must be smart.

**Solution:** Bilingual dictionary system
```
Database of construction terms:
  Labor → Main-d'œuvre
  Materials → Matériaux
  Excavation → Excavation
  Framing → Charpente
  Electrical → Électricité
  
When rendering quote in French:
  1. Load template_quote_fr.html
  2. For each line item: Translate category using dictionary
  3. Keep prices unchanged (numbers same)
  4. Render complete PDF
```

**Trade term database (CSV):**
```
English, French
Framing, Charpente
Drywall, Plaques de plâtre
Painting, Peinture
Electrical Work, Travaux Électriques
HVAC Installation, Installation CVCA
...
```

### 3. Email Notifications (Bilingual)

**When sending approval requests via email:**

```
If quote language = EN:
  Subject: "Quote Approval Needed for [Project]"
  Body: English email template
  Attachment: quote_en.pdf

If quote language = FR:
  Subject: "Approbation de Soumission Requise pour [Projet]"
  Body: French email template
  Attachment: quote_fr.pdf
```

**Email templates (EN + FR):**
- Quote sent notification
- Quote approved confirmation
- Change order submitted
- Change order approved
- Project completion notice

### 4. Client Portal (Phase 2: Bilingual UI)

**MVP (English-only portal):**
- Clients see documents in language received
- If they received French quote, they see French PDF
- Basic portal (view projects, download docs, approve)

**Phase 2 (Bilingual UI):**
- Client can toggle portal language (EN/FR)
- All UI in selected language
- Approval button labels bilingual

---

## Discovery Call Validation

### Questions to Add (Bilingual Scope)

1. **"Do you work with French-speaking clients or teams?"**
   - If yes → gauge how often, pain level
   - If no → note, may not prioritize full bilingual UI

2. **"Would you want quotes auto-generated in French?"**
   - If yes → willingness to pay premium?
   - If no → English-only is fine

3. **"Do any of your clients require French documentation?"**
   - Government contracts (often mandate bilingual)
   - Francophone regions (Dieppe, Moncton, etc.)

4. **"What language should your contractor profile be?"**
   - English-only (phase 1)
   - Bilingual (phase 2, costs more)

### Success Criteria for Bilingual

**Validation target:** 50%+ of 10 discovery calls mention French customers/requirement

**If 50%+ say yes:**
- Prioritize bilingual templates in MVP
- Budget translator ($2,000)
- Recruit 1+ French-speaking pilots

**If <30% say yes:**
- Defer bilingual templates to Phase 2
- Build English MVP first, add French after
- Reduce bilingual in discovery calls

---

## Technical Considerations

### 1. Database Schema

**Track language preference:**
```
projects table:
  id
  contractor_id
  language (enum: 'en', 'fr')
  
quotes table:
  id
  project_id
  language (en | fr)
  pdf_url (points to correct language PDF)
```

### 2. PDF Generation

**Use template engine:**
- Handlebars or Jinja2 (supports conditionals)
- Pass data + language → render correct template
- Use wkhtmltopdf or similar for PDF generation

**Example:**
```
// API endpoint
POST /quotes
{
  project_id: "proj_123",
  language: "fr",
  items: [
    { description: "Framing", cost: 2000 },
    { description: "Electrical", cost: 1500 }
  ]
}

// Server side
1. Load template_quote_fr.html
2. Translate item descriptions using dictionary
3. Render template with data
4. Generate PDF
5. Save to /storage/quotes/quote_123_fr.pdf
6. Return download link
```

### 3. Search & Indexing

**Bilingual search (Phase 2):**
- Index both English and French terms
- User searches "électricité" → finds "electrical work"
- User searches "framing" → finds "charpente"

---

## Quebec Legal Compliance (Phase 2)

### Considerations for Quebec-Based Contractors

**Quebec has unique contractor regulations:**
1. **Charte de la langue française** — French must be primary language in Quebec
2. **Consumer Protection Act (Quebec)** — Specific contract requirements
3. **Quebec construction standards** — Different from other provinces

**What we need to do (Phase 2):**
1. Have Quebec legal expert review template terms
2. Ensure compliance with Quebec construction law
3. Add Quebec-specific contract language (if applicable)
4. Mark templates as "Quebec-compliant"

**Cost estimate:** $500-1,000 legal review

**For MVP:** Standard EN/FR templates acceptable. Phase 2: full Quebec compliance.

---

## Bilingual Support & Customer Success

### MVP Support (English-only)
- Support team English-only
- Most contractors can do English support even if using French docs

### Phase 2 Support (Bilingual)
- Hire 0.5 FTE French support staff
- Chat support in French (evenings/weekends)
- Email support with 24h bilingual response

**Cost:** ~$20,000/year (part-time)

---

## Competitive Advantage Narrative

**Use in marketing + discovery:**

> "Every major construction tool is English-only. Procore, Asana, Monday—all make French-speaking contractors feel like afterthoughts. We built bilingual from day one because 25% of Atlantic Canada speaks French, and your clients deserve documents in their language. Plus, government contracts often require bilingual compliance. We handle that for you."

**This is the hook that Procore can't quickly copy.**

---

## Translation & Localization Timeline

### Pre-MVP (Phase 1 Build, Weeks 5-6)
- [ ] Hire translator (construction industry experience)
- [ ] Translate 5 core templates (quote, change order, scope, progress, email)
- [ ] Build trade term dictionary (100+ common terms)
- [ ] Legal review (terms footer, compliance)
- **Duration:** 3-4 weeks
- **Cost:** $1,500-2,000

### MVP Launch (Week 8)
- [ ] Templates live (EN + FR)
- [ ] Language toggle in quote creation
- [ ] Bilingual email notifications
- [ ] Portal shows documents in correct language

### Phase 2 (Post-Pilot, Weeks 12-16)
- [ ] Full UI translation (dashboard, buttons, forms)
- [ ] Mobile app translation
- [ ] Quebec legal compliance review
- [ ] French customer support
- **Duration:** 4-6 weeks
- **Cost:** $2,000-3,000 (translation + legal)

---

## Measurement & Success

### Bilingual Adoption KPI (After MVP Launch)

| Metric | Target |
|--------|--------|
| **Bilingual quote usage** | 20%+ of quotes in French |
| **French pilot sign-ups** | 2 of 3 pilots bilingual |
| **Bilingual willingness-to-pay** | 70%+ accept $75/mo for bilingual |
| **French-speaking contractor interest** | 30%+ of pilot pool |

**If <15% use French:**
- Deprioritize full UI translation (Phase 2)
- Keep template approach, English portal OK

**If 30%+ use French:**
- Accelerate Phase 2 bilingual UI
- Hire French support staff sooner
- Market to Quebec + bilingual regions

---

## Budget & Resources

### MVP Bilingual Build

| Item | Cost | Timeline |
|------|------|----------|
| Professional translator (templates) | $1,500 | Week 6 |
| Trade term dictionary creation | $300 | Week 5 |
| Legal review (terms) | $200 | Week 6 |
| Testing (bilingual PDFs, emails) | 20h eng | Week 7 |
| **Total** | **$2,000** | **3 weeks** |

### Phase 2 Full Bilingual

| Item | Cost | Timeline |
|------|------|----------|
| Full UI translation | $2,000 | 3 weeks |
| Quebec legal compliance | $500-1,000 | 2 weeks |
| French QA/testing | 30h eng | 1 week |
| French support hire (0.5 FTE) | $20,000/yr | Ongoing |
| **Total** | **$22,500-23,000** | **6 weeks** |

---

## Risks & Mitigation

### Risk: Translation Quality
**Problem:** Bad translations = look unprofessional
**Mitigation:** Use professional translator, Quebec French specialist, pilot contractor review

### Risk: Bilingual increases complexity
**Problem:** Double the templates, double the bugs?
**Mitigation:** Automate with template system, test both languages equally

### Risk: Low bilingual adoption
**Problem:** Spent $2K on translation, only 5% of users use it
**Mitigation:** Discovery calls validate demand first (50%+ say yes)

### Risk: Quebec legal compliance missing
**Problem:** Sell to Quebec, template violates law
**Mitigation:** Phase 2 legal review before selling to Quebec

---

## Decision Framework

### Green Light for Bilingual MVP (Phase 1)
✅ **Proceed if discovery calls show:**
- 50%+ mention French clients/requirement
- 3+ French-speaking pilots willing to sign
- Willingness to pay +$25/mo for bilingual

### Yellow Light: Defer to Phase 2
🟡 **Defer bilingual UI if:**
- 30-50% mention French
- 1-2 French-speaking pilots
- Lower bilingual pricing signal

### Red Light: English-Only MVP
❌ **Go English-only if:**
- <30% mention French
- 0 French-speaking pilots
- No bilingual willingness-to-pay

---

**Status:** BILINGUAL STRATEGY READY FOR DISCOVERY VALIDATION  
**Next:** Ask bilingual questions in discovery calls, validate demand

**Recommendation:** Build English MVP with bilingual templates (low-risk, high-reward). Defer full UI translation to Phase 2 based on validation results.
