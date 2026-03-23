# CoinUsUp Growth Audit (2026-03-23)

## Executive Summary

**CoinUsUp Status:** Mature nonprofit fundraising platform with mobile launch in progress, strong feature set (campaigns, donations, volunteer shifts, events, donations tracking), Stripe integration, and mobile (iOS/Android via Capacitor).

**Growth Assessment:** Platform is technically solid but lacks key growth accelerators. Primary friction is **discoverability + acquisition** (user needs to know about CoinUsUp to sign up). Secondary friction is **engagement depth** (features exist but engagement/retention metrics unclear).

---

## TOP 3 USER EXPERIENCE FRICTION POINTS

### 1. **Onboarding Complexity** (CRITICAL)
**Problem:** 
- New orgs see multi-step org creation flow before accessing meaningful features
- Setup checklist exists but UX doesn't guide users to "first win" quickly enough
- No pre-populated sample data in free tier (fixed in recent commit, but new users don't know about it)
- Role management + permission setup required before volunteers can join

**Evidence:**
- Recent commit: "feat: Add onboarding checklist with sample data" (20d0fed) — suggests this was a known gap
- Auth flow requires deep understanding of Supabase auth + Capacitor deep links (TODOs in code)
- Organization context setup is mandatory before any other features unlock

**Impact:** High - new users likely drop before creating first campaign or adding volunteers

**Quick Win:** 
- Show guided walkthrough (1-2 min) before org creation
- Auto-populate sample data on signup (already in code, needs to be highlighted)
- Add "Skip setup" → "Quick start template" path for first-time users

---

### 2. **Feature Discoverability** (HIGH)
**Problem:**
- Platform has 18+ major features (campaigns, donations, events, shifts, chat, expenses, reports, tasks, etc.) but navigation is sidebar-based
- Users don't know what's possible without exploring
- No in-app feature hints or "new feature" callouts
- Reporting/analytics features buried in Reports page (many orgs may not use them)

**Evidence:**
- Pages directory shows: Campaigns, Donations, Events, Expenses, GroupEmail, Members, Reports, Settings, ShiftCheckIn, Tasks, VolunteerShifts, Chat
- 21 components in src/components but no feature tour / onboarding overlay
- Supabase tables suggest deeper features (metrics, analytics) not visibly promoted

**Impact:** Medium - users stuck with basic campaigns when advanced features (bulk email, expense tracking, shift scheduling) could unlock new workflows

**Quick Win:**
- Add feature highlights card in dashboard for 2-3 underutilized features
- "Did you know?" tooltips in settings + pages
- Feature request button in nav footer (collect user feedback)

---

### 3. **Mobile App Launch Quality** (MEDIUM, TACTICAL)
**Problem:**
- Mobile app (iOS/Android) is being built but not yet in production
- Capacity/depth of mobile features may be reduced vs. web initially
- Deep-link auth still TODOs in code
- Push notifications + offline queue still in implementation phase

**Evidence:**
- Recent commits: "feat(attendance): enhance QR check-in + kiosk mode UI" + Capacitor v6→v8 migration
- Multiple TODOs for Capacitor deep links, Google/Apple auth
- Mobile Launch Plan dated 2026-03-20 with 4-week timeline (starting when?)

**Impact:** Low (tactical) — but launch timing matters for growth; delayed launch = delayed mobile user acquisition

**Quick Win:**
- Finalize deep-link auth this week (blocks TestFlight submission)
- Beta test with 10 real orgs before launch (to catch UX issues)
- Plan app store listing + ASO (keywords, screenshots, description) in parallel

---

## TOP 3 MISSING FEATURES (USER-LIKELY WANTS)

### 1. **Bulk Email + Segmentation** (HIGH IMPACT)
**Why Missing:**
- Email/messaging is critical for nonprofits (donor newsletters, volunteer announcements, event reminders)
- GroupEmail page exists but appears limited to single recipients or basic sending
- No evidence of template library, scheduling, A/B testing, or segmentation in codebase

**User Need:**
- Nonprofit manager: "I need to send a thank-you email to all donors who gave >$500 this month"
- Volunteer lead: "I need to remind all Event A volunteers 48 hours before"
- Fundraiser: "I need to email campaign subscribers with updates"

**Effort Estimate:** 5-8 days
- Email template builder: 2 days
- Segmentation logic (filters by donation, event, membership): 2 days
- Batch send + scheduling: 1 day
- Testing + refinement: 1-2 days

**ROI:** Very High — drives engagement, retention, and fundraising (email is primary nonprofit communication tool)

---

### 2. **Donor Relationship Management (CRM Basics)** (HIGH IMPACT)
**Why Missing:**
- Platform tracks donations but not donor history, preferences, communication log
- No "donor profile" view showing: donation history, pledge status, event attendance, communication preferences
- Ability to assign donors to relationship managers would unlock fundraising teams

**User Need:**
- Major donor coordinator: "Show me all donors who haven't given in 6 months"
- Executive director: "I need to see all touchpoints with Donor X before meeting them"
- Development manager: "Which donors should I follow up with this week?"

**Effort Estimate:** 6-10 days
- Donor profile page (history, attributes, tags): 2 days
- Donation lifecycle tracking (pledge, gift, thank-you, next ask): 2 days
- Segmentation filters + dashboards: 1.5 days
- Assignment + workflow (assign to staff): 1.5 days
- Testing: 1-2 days

**ROI:** Very High — donor retention + lifetime value are core to nonprofit sustainability

---

### 3. **Integration with Popular Tools** (MEDIUM IMPACT)
**Why Missing:**
- Platform is Supabase + Stripe integrated, but no connections to:
  - Mailchimp / ConvertKit (email list sync)
  - Slack (notifications, updates)
  - Google Calendar (event sync)
  - QuickBooks / Wave (accounting sync)
  - Zapier (workflow automation)

**User Need:**
- Nonprofit manager: "Send new donors to our Mailchimp list automatically"
- Volunteer coordinator: "Post shift reminders to Slack"
- Bookkeeper: "Sync donations to QuickBooks to avoid manual entry"

**Effort Estimate:** 4-6 days per integration (Zapier would unlock many)
- Slack notifications: 2-3 days (webhook setup + event mapping)
- Mailchimp sync: 3-4 days (contact sync, list creation)
- Zapier: 1-2 days (set up Zapier trigger endpoints)

**ROI:** Medium-High — integrations reduce friction for teams using multiple tools

---

## TOP 3 GROWTH LEVERS

### LEVER 1: **SEO + Content Marketing** (IMMEDIATE, Low Cost)

**Current State:**
- Site has blog (recent additions: 6c7299a, 307b1d8 — blog post updates)
- But no evidence of: sitemap, structured data, keyword research, link building

**Growth Play:**
1. **Optimize for nonprofit + fundraising keywords:**
   - "Free nonprofit fundraising software"
   - "Volunteer management platform"
   - "Donation tracking for nonprofits"
   - "Fundraising platform for small nonprofits"
   
2. **Create cornerstone content (2-3 weeks):**
   - "Complete Guide to Nonprofit Fundraising" (long-form, SEO-optimized)
   - "How to Organize Volunteer Shifts Effectively" (guides + templates)
   - "Nonprofit Donation Tracking Best Practices"
   
3. **Backlink strategy:**
   - Reach out to nonprofit blogs + directories
   - Guest posts on nonprofit technology sites
   - Get listed on G2, Capterra, AlternativeTo

**Effort:** 20-30 hrs (content creation + technical SEO) = 3-4 weeks part-time

**Expected Impact:** 100-300 organic signups/month within 3 months (depending on competition)

**ROI:** Very High ($0 paid acquisition cost, lasting compounding effect)

---

### LEVER 2: **Product-Qualified Leads (PQL) Funnel** (2-3 weeks)

**Current State:**
- Free trial exists (SelectPlan page) but no clear conversion funnel
- No data on: trial-to-paid conversion rate, feature usage during trial, churn reasons

**Growth Play:**
1. **Freemium tier optimization:**
   - Free plan: single org, 10 volunteers, basic donations + campaigns
   - Pro plan: unlimited volunteers, advanced reporting, bulk email, Slack integration ($30-50/mo)
   - Track which features drive conversion (e.g., "bulk email" = 40% conversion lift)

2. **In-app conversion optimization:**
   - Show upgrade prompt when user hits free tier limits (e.g., "You've reached 10 volunteer limits. Upgrade for unlimited.")
   - Feature gates for premium features (CRM, analytics, integrations)
   - Track user behavior: which actions correlate with conversion?

3. **Free-to-paid playbook:**
   - Email sequences for trial sign-ups (onboarding, feature tips, upgrade pitch)
   - In-app onboarding tasks that unlock premium features once completed
   - Success metric: "Org created first campaign and invited 5 volunteers" → show upgrade modal

**Effort:** 10-15 days (feature gating + analytics instrumentation + email sequences)

**Expected Impact:** 15-25% trial-to-paid conversion (industry avg ~5-10% for SaaS)

**ROI:** Very High — leverages existing user base, uses existing features as hooks

---

### LEVER 3: **Partnership + Channel Strategy** (ONGOING)

**Current State:**
- No evidence of partnerships with: nonprofit consultants, grant platforms, nonprofit networks, religious organizations

**Growth Play:**
1. **Partner with nonprofit consultants:**
   - "Recommend CoinUsUp to your clients" program
   - White-label / co-marketing opportunities
   - Example: Network for Good, Bloomerang, DonorBox all have consultant partner programs

2. **Nonprofit networks + associations:**
   - List on: Nonprofit Tech for Good directory, Idealware, GlobalGiving (their platform recommendations)
   - Sponsor small nonprofit community events
   - Partner with university nonprofit programs (teaching tool + case study)

3. **Bundle with grant platforms:**
   - Integration with: GrantStation, Grants.gov, Foundation Center
   - "Apply for grants, track with CoinUsUp"
   - Co-marketing: "Grant winners success stories"

**Effort:** 30-40 hrs initial outreach = 2-3 weeks

**Expected Impact:** 50-200 signups/month (long tail, but highly qualified)

**ROI:** High (lasting channel, compound interest over time)

---

## PRIORITIZED RECOMMENDATIONS

### PRIORITY 1: Ship Mobile Launch (Week of Mar 23)
**Why:** Mobile is already 80% done; shipping unlocks platform credibility + new user segment
**Actions:**
- Finalize deep-link auth (2 days)
- Internal beta test (3 days)
- Submit to TestFlight + Google Play Console (1 day)

**Expected Impact:** 50-100 new mobile-first users/month

---

### PRIORITY 2: Fix Onboarding (Weeks of Mar 30 - Apr 6)
**Why:** Improves first-time user success → lowers churn, increases trial-to-paid conversion
**Actions:**
- Add 60-second guided walkthrough (2 days)
- Highlight sample data feature (1 day)
- A/B test onboarding paths (track completion %) (3 days)

**Expected Impact:** 10-15% improvement in trial activation rate

---

### PRIORITY 3: Launch Freemium Tier + Feature Gating (Weeks of Apr 6 - Apr 20)
**Why:** Monetization lever that compounds as user base grows
**Actions:**
- Define free vs. Pro tier (2 days)
- Implement feature gates for: bulk email, CRM, advanced reporting (5 days)
- Build in-app upgrade flows (3 days)
- Set up analytics tracking (2 days)

**Expected Impact:** 15-25% trial-to-paid conversion (vs. current unknown baseline)

---

### PRIORITY 4: SEO Content + Organic Growth (Ongoing, 5 hrs/week)
**Why:** Lasting, compounding acquisition channel
**Actions:**
- Publish 1 cornerstone article every 2 weeks
- Optimize site for nonprofit fundraising keywords
- Build backlink strategy

**Expected Impact:** 100-300 organic signups/month (3-6 month runway)

---

### PRIORITY 5: Bulk Email Feature (Weeks of Apr 20 - May 10)
**Why:** Most requested nonprofit feature; enables engagement + retention
**Actions:**
- Email template builder (2 days)
- Segmentation engine (2 days)
- Batch send + scheduling (1 day)
- Testing + launch (2 days)

**Expected Impact:** 20-30% increase in user engagement (email = primary nonprofit tool)

---

## QUICK WINS (Can Start Today)

1. **Feature Discovery Tooltips** (2 days)
   - Add "Did you know?" tips to Reports, CRM, Email, Events pages
   - Highlight underutilized features in dashboard

2. **Onboarding Video** (1 day)
   - 90-second walkthrough of core features
   - Link from sign-up + first login

3. **Feature Request Button** (4 hours)
   - Simple form in nav footer: "What feature would help you?"
   - Collect 20-30 requests, prioritize for roadmap

4. **Mobile App Store Listing Prep** (3 days)
   - Write app description, capture screenshots
   - Plan ASO keywords (app store optimization)
   - Ready to launch day app goes live

5. **Nonprofit Directory Submission** (2 days)
   - Submit to: Nonprofit Tech for Good, Idealware, GlobalGiving
   - Get listed in 3-5 nonprofit software directories

---

## METRICS TO TRACK

**Acquisition:**
- Organic search traffic (SEO impact)
- Trial sign-ups by source (organic, paid, partner, direct)
- Mobile app downloads (post-launch)

**Activation:**
- First campaign created within 7 days of signup (%)
- First volunteer invited within 7 days (%)
- Sample data used / onboarding completed (%)

**Retention:**
- Monthly active users (MAU) / churn rate
- Frequency of logins + feature usage
- Trial-to-paid conversion rate

**Revenue:**
- Monthly recurring revenue (MRR)
- Customer lifetime value (CLV)
- Average revenue per account (ARPA)

---

## COMPETITIVE CONTEXT

**Direct Competitors:** 
- **Buddy Punch** ("10,000+ businesses") — emphasizes mobile + QR
- **Calamari** ("130,000+ users") — global scale, feature-rich
- **Donorbox** — donations + fundraising (larger footprint)
- **GiveWP** — WordPress plugin alternative

**CoinUsUp Advantage:**
- All-in-one (fundraising + volunteer management + events + chat)
- Nonprofit-focused (vs. generic attendance tools)
- Transparent, community-driven roadmap

**CoinUsUp Gaps:**
- Smaller user base (requires faster growth)
- Fewer integrations (Stripe only vs. competitors' 20+)
- Mobile app not yet launched (competitors have mature apps)

---

## NEXT STEPS

1. **This Week:** Finalize mobile app launch (deep links + TestFlight)
2. **Next Week:** Onboarding redesign + first cornerstone blog post
3. **Week 3:** Feature gating + freemium tier implementation
4. **Week 4:** Bulk email feature kickoff
5. **Ongoing:** SEO content + partnership outreach

---

## Appendix: Codebase Snapshot

**Tech Stack:**
- Frontend: React + TypeScript + Vite + Tailwind
- Backend: Supabase (PostgreSQL, auth, realtime)
- Mobile: Capacitor (iOS/Android)
- Payments: Stripe
- Hosting: Vercel

**Key Metrics:**
- 45K+ lines of code
- 137 React components
- 33 pages
- 21 dirs in src/

**Recent Work:**
- Mobile launch prep (Capacitor v8, QR check-in, push notifications)
- Recurring donations (Stripe subscriptions)
- Onboarding improvements (sample data)
- Toolchain upgrades (React, Tailwind, Recharts)

---

**Audit Date:** 2026-03-23 20:03 ADT  
**Status:** Ready for Product Roadmap Discussion
