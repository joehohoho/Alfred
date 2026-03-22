# Atlantic Contractor Portal — Success Metrics & KPI Dashboard

**Card:** task_1774171849501_375342e7  
**Date:** 2026-03-22  
**Status:** DISCOVERY PHASE METRICS FRAMEWORK

---

## Overview

This document defines how we'll measure success across three phases:
1. **Discovery Phase (Mar 22 - Apr 15)** — Validate demand
2. **Build Phase (Apr 15 - Jun 15)** — MVP development
3. **Pilot Phase (Jun 15 - Jul 15)** — Real-world testing

---

## Phase 1: Discovery Phase Metrics (THIS MONTH)

### Discovery Call Metrics

| KPI | Target | Why | How to Measure |
|-----|--------|-----|---|
| **Outreach sent** | 10+ | Cold prospecting baseline | Count emails + calls made |
| **Response rate** | 30%+ | Industry standard (contractors slower) | Positive replies / total outreach |
| **Discovery calls booked** | 5-7 | Achieve 50-70% conversion | Confirmed call + attendee |
| **Calls completed** | 8+ | Exceed minimum (validation > perfection) | Call duration + notes taken |
| **Completion quality** | 100% | Full script + all questions | Checklist: problem, tools, WTP, pilot |
| **Avg call duration** | 45 min | Proper discovery depth | Clock call length |

**Success Criteria:** 8+ calls completed, 100% quality (full script)

---

### Market Validation Metrics

| KPI | Target | Validation |
|-----|--------|---|
| **Approval delay confirmed** | 100% (8/8) | All contractors cite 7-14 day baseline |
| **Willingness-to-pay: $50-75** | 75%+ | Most accept starter pricing |
| **Willingness-to-pay: $75-150** | 60%+ | Professional tier acceptance |
| **Approval workflow priority** | 80%+ | Quote + change order = must-haves |
| **Bilingual need** | 50%+ | At least half work in French regions |
| **Current tool pain (Asana/Monday)** | 70%+ | Most tools inadequate for approvals |
| **Switching intent signal** | 60%+ | Would try new tool if proven helpful |

**Go/No-Go Threshold:** 7/8 metrics hit ≥ target = GREEN light for MVP build

---

### Pilot Recruitment Metrics

| KPI | Target | Owner |
|-----|--------|-------|
| **Pilot candidates identified** | 5+ | During discovery calls |
| **Pilot sign-ups** | 3 | Final milestone this phase |
| **Pilot agreement signed** | 3 | Legal + financial commitment |
| **Pilot kickoff scheduled** | 3 | Week of March 31 |
| **Average pilot company size** | 6 people | Core ICP validation |
| **Pilot trade distribution** | Varied (renovation, HVAC, GC) | Segment testing |
| **Bilingual pilots** | 2 of 3 | Localization validation |

**Success:** 3 pilots signed + engaged by April 1

---

### Discovery Insights Captured

**Required Documentation:**
- [ ] 8 call transcripts (or detailed notes) + recording (with consent)
- [ ] Common pain patterns extracted (quote delays, change order friction, tooling gaps)
- [ ] Willingness-to-pay summary (by segment, by feature)
- [ ] ICP refinement (which contractor type showed highest pain?)
- [ ] Competitive landscape summary (what do they use today? Why inadequate?)
- [ ] Feature priority re-ranked (based on 8 conversations)
- [ ] Bilingual scope refined (English-only? Full UI? Templates only?)
- [ ] Pilot candidate profiles (why each is valuable for testing)

---

## Phase 2: MVP Build Metrics (APR 15 - JUN 15)

### Development Velocity

| KPI | Target | Owner |
|-----|--------|-------|
| **Weeks elapsed** | 8 weeks | Fixed timeline |
| **Features completed** | 12 MVP features | Scope locked |
| **Code quality** | 80%+ test coverage | Unit + integration tests |
| **Bug escape rate** | <5% of features | QA before release |
| **Architecture decisions** | Locked by week 2 | Tech lead finalization |

**Checkpoint:** Week 4 (50% features, zero architectural debt)

---

### Feature Delivery Roadmap

```
Week 1-2: Architecture + Database Schema
  - User + role management
  - Project + approval document schema
  - Notification system setup

Week 3-4: Quote Workflow + Portal
  - Quote creation + templating
  - Client approval signature
  - Email notifications
  - Basic portal view

Week 5-6: Change Order Workflow
  - Change order creation + approval
  - Approval history + audit trail
  - Document version control

Week 7: Bilingual Infrastructure
  - Template localization (EN ↔ FR)
  - UI internationalization setup

Week 8: Integration + Launch Prep
  - Testing (unit, integration, e2e)
  - Security review
  - Performance optimization
  - Documentation
```

**Go-Live Criteria:** All 12 MVP features complete + <5% bugs in QA

---

### Code & Infrastructure Metrics

| Metric | Target | Why |
|--------|--------|-----|
| **Response time (API)** | <200ms | Mobile portal usability |
| **Uptime target** | 99.5% | Small-team critical |
| **Database size (pilot)** | <10GB | Scaling headroom |
| **Tech debt ratio** | <10% | Maintainability |
| **Documentation coverage** | 100% of API | Handoff quality |

---

## Phase 3: Pilot Testing Metrics (JUN 15 - JUL 15)

### Pilot Usage Metrics

| KPI | Target | Why |
|-----|--------|-----|
| **Quotes sent via portal** | 5+ per pilot | Adoption validation |
| **Change orders created** | 1+ per pilot | Feature usage |
| **Client approvals via portal** | 3+ per pilot | Client experience validation |
| **Active users per pilot** | 3+ | Team adoption, not just owner |
| **Portal logins** | 50+ total | Engagement baseline |
| **Session duration** | 10+ min avg | Actual work, not just browsing |

**Success Threshold:** All 3 pilots hit all usage targets

---

### Pilot Feedback Metrics

| KPI | Measurement | Target |
|-----|---|---|
| **NPS (Net Promoter Score)** | "How likely to recommend? (0-10)" | 7+ (promoter territory) |
| **Feature satisfaction** | "Did quote workflow save time? (1-5)" | 4+ (useful) |
| **Approval cycle improvement** | Baseline vs pilot | 30%+ faster |
| **Time saved (self-report)** | "Hours/week saved?" | 5+ hours |
| **Willingness to pay** | "Worth $75/mo?" | 3/3 say yes |
| **Switching likelihood** | "Would switch from [current tool]?" | 3/3 say yes |
| **Critical bugs reported** | Severity + count | <3 blockers |
| **Feature requests** | Most-mentioned | Prioritize top 3 |

**Success:** 3/3 pilots score ≥7 NPS, yes on all 4 willingness questions

---

### Pilot Business Metrics

| KPI | Baseline | Pilot Goal | Why |
|-----|----------|-----------|-----|
| **Approval cycle (quotes)** | 7-14 days | 2-3 days | Core value prop |
| **Change order cycle** | 4-12 weeks | 5-7 days | Game-changer |
| **Client approval rejection rate** | 5-10% | 1-2% | Clarity reduces rework |
| **Approval re-submissions** | 2-3x avg | <1x | Portal prevents lost approvals |
| **Project completion variance** | ±10% | ±5% | Better timeline predictability |

**Validation:** Measure before/after during 4-week pilot

---

## Phase 4: Post-Launch KPIs (JUL 15+)

### Growth Metrics

| KPI | Year 1 Target | Year 2 Target |
|-----|---|---|
| **Customers** | 20 | 75 |
| **MRR (Monthly Recurring Revenue)** | $2,000 | $8,000 |
| **ARR (Annual Recurring Revenue)** | $24,000 | $96,000 |
| **CAC (Customer Acquisition Cost)** | <$200 | <$300 |
| **LTV (Lifetime Value, 5-year)** | $600+ | $800+ |
| **LTV:CAC Ratio** | >3:1 | >3:1 |
| **Churn rate** | <5%/month | <3%/month |

---

### Product Health

| KPI | Target |
|-----|--------|
| **NPS (all customers)** | 50+ (excellent SaaS range) |
| **Feature adoption (quote workflow)** | 90%+ of customers |
| **Feature adoption (change order)** | 75%+ of customers |
| **Portal client satisfaction** | 80%+ say "impressed client" |
| **Support ticket volume** | <2/customer/month |
| **Uptime** | 99.5%+ |
| **Bug escape (prod)** | <1% of deployments |

---

## Tracking & Dashboards

### Discovery Phase Dashboard (Weekly)

```
OUTREACH
  Emails sent: 10 / target 10 ✓
  Calls booked: 6 / target 5-7 ✓
  Calls completed: 5 / target 8+

DISCOVERY INSIGHTS
  Approval delay confirmed: 5/5 (100%) ✓
  WTP $50-75 acceptance: 4/5 (80%) ✓
  Approval workflow priority: 5/5 (100%) ✓
  
PILOT RECRUITMENT
  Candidates identified: 4 / target 5+
  Pilot sign-ups: 2 / target 3
  Status: ON TRACK
```

### Build Phase Dashboard (Weekly)

```
DEVELOPMENT VELOCITY
  Features completed: 6/12 (50%)
  Days elapsed: 28/56 (50%)
  Status: ON TRACK
  
CODE QUALITY
  Test coverage: 85%
  Bugs found (QA): 3
  Bugs fixed: 3
  Status: GREEN
  
BLOCKERS
  None active
```

### Pilot Phase Dashboard (Weekly)

```
PILOT USAGE
  Avg quotes/pilot: 4.3 / target 5 (86%)
  Avg change orders/pilot: 0.8 / target 1 (80%)
  Client approvals: 8 / target 9 (89%)
  
FEEDBACK COLLECTION
  Surveys completed: 3/3
  NPS average: 8.3 / target 7+ ✓
  Feature satisfaction: 4.2/5 / target 4+ ✓
  
BUSINESS IMPACT
  Approval cycle improvement: 32% / target 30%+ ✓
  Time saved: 6.5 hrs/week avg / target 5+ ✓
```

---

## Data Collection Methods

### Discovery Phase
- **Surveys:** Post-call feedback form (5 min)
- **Interviews:** Full call transcripts (transcription service)
- **Tracking:** Google Sheets (outreach + calls log)
- **Storage:** `/ideas/DISCOVERY_CALLS_TRACKING.md`

### Build Phase
- **Git commits:** Automated feature tracking
- **Jira/GitHub:** Sprint velocity + bug tracking
- **Code metrics:** SonarQube or similar (test coverage %)
- **Architecture reviews:** Weekly sync on decisions

### Pilot Phase
- **Usage analytics:** Posthog or Segment (feature adoption)
- **Surveys:** End-of-week + end-of-pilot (structured + open-ended)
- **Baseline measurements:** Pre-pilot approval cycle (questionnaire)
- **Post-pilot measurements:** Same questionnaire, compare
- **Qualitative feedback:** Recorded interviews (30 min, final week)

---

## Success Criteria Summary

### Discovery Phase (Mar 22 - Apr 15)
✅ **PASS if:**
- 8+ discovery calls completed (100% script fidelity)
- 7/8 market validation metrics hit ≥target
- 3 pilots signed + kickoff scheduled
- All insights documented + decision points clear

❌ **FAIL if:**
- <5 calls completed
- <5 validation metrics hit target (weak demand signal)
- <2 pilots signed
- Contradictory feedback (no coherent ICP)

---

### Build Phase (Apr 15 - Jun 15)
✅ **PASS if:**
- 12 MVP features 100% complete
- <5% bug escape to QA
- <200ms API response time
- 80%+ test coverage
- All design partnerships launched with early access

❌ **FAIL if:**
- >3 features incomplete at deadline
- >10% bug rate (quality debt)
- Performance issues (>500ms latency)
- <60% test coverage

---

### Pilot Phase (Jun 15 - Jul 15)
✅ **PASS if:**
- All 3 pilots hit usage targets
- 3/3 pilots score NPS ≥7
- 3/3 pilots say "worth paying for"
- 30%+ approval cycle improvement validated
- <3 critical bugs reported

❌ **FAIL if:**
- <2 pilots hit usage targets
- Average NPS <6 (detractor territory)
- <2/3 willing to pay
- <15% cycle improvement
- >5 critical bugs requiring fixes

---

## Decision Framework

### Red Flag Indicators (Early Warning)

| Indicator | Action |
|-----------|--------|
| By week 1 of discovery: <2 calls booked | Double outreach, pivot channels |
| By week 2: Approval delay NOT mentioned in 2+ calls | May not be core pain, reassess |
| By week 3: <30% WTP acceptance (all tiers) | Pricing hypothesis wrong, pivot |
| By week 4: <1 pilot signed | Not enough interest, consider pause |
| Mid-build: >20% feature slippage | Quality risk, extend timeline |
| Week 6 of build: Test coverage <60% | Technical debt accumulating, remediate |
| Mid-pilot: <3 quotes/pilot submitted | Low adoption, diagnose UI/usability |
| Pilot week 3: NPS trending <6 | Critical issues, emergency fix sprint |

**Action:** Alert and course-correct immediately (don't wait for phase-end review)

---

## Review Cycle

**Weekly Check-ins:** Dashboard review (15 min, Slack update)  
**Phase-end Review:** Full metrics retrospective + Go/No-Go decision  
**Monthly Reflection:** Product-market fit assessment (narrative + metrics)

---

**Status:** METRICS FRAMEWORK READY FOR DISCOVERY EXECUTION  
**Next:** Begin collecting data this week
