# AI Grant Writer for Nonprofits — Technical Specification
**Date:** 2026-04-15  
**Status:** Ready for implementation  
**Author:** Alfred  
**Scope:** MVP (Weeks 1-6)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│  React SPA (TypeScript, TailwindCSS, React Query)       │
│  - Auth UI (sign up, login, SSO)                        │
│  - Org profile setup                                     │
│  - Proposal builder (drafting copilot)                  │
│  - Funder search + discovery                            │
│  - Compliance dashboard                                 │
│  - Settings (team, billing)                             │
└───────────────────┬────────────────────────────────────┘
                    │ HTTPS/REST API
                    ▼
┌──────────────────────────────────────────────────────────┐
│                   API GATEWAY / LOAD BALANCER             │
│  (Vercel or AWS CloudFront)                             │
└───────────────────┬────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
┌──────────────┐ ┌────────────┐ ┌────────────┐
│ AUTH SERVICE │ │API SERVICE │ │BACKGROUND │
│ (Clerk/Auth0)│ │(Express)   │ │ JOBS      │
│              │ │            │ │(Bull Queue)
└──────────────┘ └─────┬──────┘ └────┬───────┘
                       │             │
                       └──────┬──────┘
                              ▼
                    ┌──────────────────────┐
                    │  BUSINESS LOGIC      │
                    │ - Proposal service   │
                    │ - Funder matcher     │
                    │ - Compliance engine  │
                    │ - AI copilot (Claude)
                    └─────────┬────────────┘
                              ▼
                    ┌──────────────────────┐
                    │   DATA LAYER         │
                    │ - PostgreSQL         │
                    │ - Redis (cache)      │
                    │ - S3 (documents)     │
                    └──────────────────────┘
                              
                    ┌──────────────────────┐
                    │  EXTERNAL SERVICES   │
                    │ - Claude API         │
                    │ - SendGrid (email)   │
                    │ - Stripe (payments)  │
                    └──────────────────────┘
```

---

## Database Schema (PostgreSQL)

### Core Tables

#### 1. Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  auth_id VARCHAR(255) UNIQUE NOT NULL, -- Clerk/Auth0 ID
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_id ON users(auth_id);
```

#### 2. Organizations
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  mission_statement TEXT,
  ein VARCHAR(20), -- IRS Employer ID
  budget_range VARCHAR(50), -- e.g., "$50k-$100k"
  focus_areas TEXT[], -- Array of cause areas (e.g., ["education", "health"])
  geographic_focus TEXT[], -- Array of states/regions
  nonprofit_status VARCHAR(50), -- "501c3", "pending", "other"
  nonprofit_verified BOOLEAN DEFAULT false,
  stripe_customer_id VARCHAR(255), -- For payments
  plan_type VARCHAR(50) DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  plan_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_orgs_owner ON organizations(owner_id);
CREATE INDEX idx_orgs_plan ON organizations(plan_type);
```

#### 3. Team Members
```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50) DEFAULT 'member', -- 'admin', 'editor', 'viewer'
  invited_at TIMESTAMP DEFAULT now(),
  accepted_at TIMESTAMP,
  permissions TEXT[], -- ['read_proposals', 'write_proposals', 'manage_team']
  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_team_org ON team_members(org_id);
CREATE INDEX idx_team_user ON team_members(user_id);
```

#### 4. Proposals
```sql
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'foundation', 'government', 'corporate'
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'rejected', 'funded'
  
  -- Proposal content (JSON structure)
  content JSONB, -- {sections: {intro: "...", mission_alignment: "...", etc}}
  metadata JSONB, -- {word_count, last_edited_by, confidence_score}
  
  -- Funder info (optional)
  target_funder_id UUID REFERENCES funders(id),
  funder_requirement JSONB, -- {max_words, required_sections, deadline}
  
  -- Tracking
  submitted_at TIMESTAMP,
  response_received_at TIMESTAMP,
  outcome VARCHAR(50), -- 'pending', 'funded', 'rejected'
  amount_requested DECIMAL(12,2),
  amount_awarded DECIMAL(12,2),
  
  -- Versioning
  version INT DEFAULT 1,
  parent_version_id UUID REFERENCES proposals(id),
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_proposals_org ON proposals(org_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_funder ON proposals(target_funder_id);
CREATE INDEX idx_proposals_created ON proposals(created_at DESC);
```

#### 5. Proposal Comments (Collaboration)
```sql
CREATE TABLE proposal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  section VARCHAR(50), -- Which section the comment applies to
  comment_text TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_comments_proposal ON proposal_comments(proposal_id);
```

#### 6. Funders Database
```sql
CREATE TABLE funders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50), -- 'foundation', 'government', 'corporate', 'individual'
  
  -- Grant details
  grant_size_min DECIMAL(12,2),
  grant_size_max DECIMAL(12,2),
  focus_areas TEXT[], -- e.g., ["education", "health", "environment"]
  geographic_focus TEXT[], -- e.g., ["US", "CA", "global"]
  
  -- Application info
  deadline TIMESTAMP,
  deadline_recurrence VARCHAR(50), -- 'annual', 'rolling', 'quarterly'
  application_url VARCHAR(500),
  requirements_summary TEXT,
  
  -- Metadata
  website_url VARCHAR(500),
  acceptance_rate DECIMAL(5,2), -- Percentage
  average_grant_size DECIMAL(12,2),
  last_updated TIMESTAMP,
  data_source VARCHAR(100), -- 'foundation_center', 'manual', 'user_submission'
  
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_funders_focus ON funders USING GIN(focus_areas);
CREATE INDEX idx_funders_geo ON funders USING GIN(geographic_focus);
CREATE INDEX idx_funders_grant_size ON funders(grant_size_min, grant_size_max);
CREATE INDEX idx_funders_deadline ON funders(deadline);
```

#### 7. Funder Matches (Algorithmic)
```sql
CREATE TABLE funder_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  funder_id UUID NOT NULL REFERENCES funders(id),
  
  -- Matching score (0-100)
  relevance_score DECIMAL(5,2),
  match_reason TEXT, -- Why this funder matches (e.g., "mission alignment + geography")
  
  -- User actions
  favorited BOOLEAN DEFAULT false,
  applied BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_matches_org ON funder_matches(org_id);
CREATE INDEX idx_matches_score ON funder_matches(relevance_score DESC);
```

#### 8. Compliance Items
```sql
CREATE TABLE compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  item_type VARCHAR(100), -- '990_form_due', 'grant_reporting_due', 'audit_required'
  description TEXT,
  deadline TIMESTAMP NOT NULL,
  recurrence VARCHAR(50), -- 'annual', 'once', 'grant_specific'
  
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'overdue'
  completed_at TIMESTAMP,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_compliance_org ON compliance_items(org_id);
CREATE INDEX idx_compliance_deadline ON compliance_items(deadline);
```

#### 9. Proposal Templates (Library)
```sql
CREATE TABLE proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50), -- 'foundation', 'government', 'corporate'
  description TEXT,
  
  -- Template structure (JSON)
  sections JSONB, -- {intro: {prompt: "...", word_limit: 200}, mission: {...}, etc}
  sample_content JSONB, -- Example filled-in content
  
  is_nonprofit_specific BOOLEAN DEFAULT true,
  difficulty_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'
  
  -- Organization-specific customizations
  org_id UUID REFERENCES organizations(id), -- NULL = system template
  is_custom BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_templates_type ON proposal_templates(type);
CREATE INDEX idx_templates_org ON proposal_templates(org_id);
```

---

## API Contract (Core Endpoints)

### Authentication & Auth

```
POST /api/auth/signup
  Body: { email, password, org_name, mission }
  Response: { user_id, org_id, auth_token }

POST /api/auth/login
  Body: { email, password }
  Response: { user_id, org_id, auth_token }

POST /api/auth/logout
  Response: { success: true }

GET /api/auth/me
  Response: { user, org, team_members }
```

### Organizations

```
GET /api/orgs/:org_id
  Response: { id, name, mission, plan, team_size, ... }

PATCH /api/orgs/:org_id
  Body: { mission, focus_areas, geographic_focus, nonprofit_status }
  Response: { updated org }

POST /api/orgs/:org_id/verify-nonprofit
  Body: { ein, verification_document }
  Response: { verified: true/false }

GET /api/orgs/:org_id/stats
  Response: { proposals_submitted, success_rate, total_funded, ... }
```

### Proposals

```
GET /api/orgs/:org_id/proposals
  Query: { status, type, limit, offset }
  Response: [ { id, title, status, funder, created_at }, ... ]

POST /api/orgs/:org_id/proposals
  Body: { title, type, target_funder_id? }
  Response: { proposal_id, sections_to_fill }

GET /api/proposals/:proposal_id
  Response: { id, title, type, content, version, comments, ... }

PATCH /api/proposals/:proposal_id
  Body: { section: "intro", content: "..." }
  Response: { proposal (updated) }

POST /api/proposals/:proposal_id/generate-section
  Body: { section: "mission_alignment", context_items: [...] }
  Response: { generated_content, confidence_score }

POST /api/proposals/:proposal_id/submit
  Body: { funder_id, submission_method: "email|manual" }
  Response: { submitted_at, tracking_id }

POST /api/proposals/:proposal_id/versions
  Body: { title, base_version_id? }
  Response: { new_version_id }

GET /api/proposals/:proposal_id/versions
  Response: [ { version, created_at, created_by, changes }, ... ]
```

### Funders

```
GET /api/funders/search
  Query: { q, focus_areas[], grant_size_min, grant_size_max, deadline_within_days, limit }
  Response: [ { id, name, grant_size, deadline, ... }, ... ]

GET /api/funders/:funder_id
  Response: { id, name, details, requirements, deadline, acceptance_rate, ... }

GET /api/orgs/:org_id/funder-matches
  Query: { limit, offset, min_score }
  Response: [ { funder, relevance_score, match_reason }, ... ]

POST /api/funder-matches/:match_id/favorite
  Response: { favorited: true }

DELETE /api/funder-matches/:match_id/favorite
  Response: { favorited: false }
```

### Compliance

```
GET /api/orgs/:org_id/compliance
  Response: [ { item_type, deadline, status, recurrence }, ... ]

POST /api/orgs/:org_id/compliance
  Body: { item_type, deadline, recurrence, description }
  Response: { id, created_at }

PATCH /api/compliance/:item_id
  Body: { status, notes, completed_at? }
  Response: { updated item }

GET /api/orgs/:org_id/compliance/calendar
  Response: { events: [ { deadline, item_id, description }, ... ] }
```

### Templates

```
GET /api/templates
  Query: { type, nonprofit_specific }
  Response: [ { id, name, type, description }, ... ]

GET /api/templates/:template_id
  Response: { id, name, sections, sample_content, ... }

POST /api/orgs/:org_id/templates
  Body: { name, type, sections, is_custom }
  Response: { template_id }

PATCH /api/templates/:template_id
  Body: { sections, sample_content }
  Response: { updated template }
```

### Team Management

```
POST /api/orgs/:org_id/team-members
  Body: { email, role: "admin|editor|viewer" }
  Response: { invitation_sent, member_id }

GET /api/orgs/:org_id/team-members
  Response: [ { user, role, accepted_at, ... }, ... ]

PATCH /api/team-members/:member_id
  Body: { role, permissions }
  Response: { updated member }

DELETE /api/team-members/:member_id
  Response: { success: true }
```

---

## Core Business Logic

### Proposal Drafting Copilot

**Algorithm: AI-Guided Proposal Generation**

```javascript
async function generateProposalSection(
  proposalId,
  sectionName,
  orgContext,
  funderRequirements
) {
  // 1. Build context from org profile
  const orgProfile = {
    mission: org.mission_statement,
    impact: org.past_outcomes, // From previous proposals
    budget: org.budget_range,
    focus_areas: org.focus_areas,
    location: org.geographic_focus
  };

  // 2. Build funder requirements
  const funderContext = {
    name: funder.name,
    priorities: funder.focus_areas,
    grant_size: funder.grant_size_range,
    requirements: funder.requirements_summary
  };

  // 3. Create Claude prompt (based on section type)
  const prompts = {
    intro: `Write a compelling introduction for a grant proposal from [ORG] to [FUNDER]. 
      Org mission: ${orgProfile.mission}
      Funder focus: ${funderContext.priorities}
      Length: 100-150 words`,
    
    mission_alignment: `Explain how [ORG]'s mission directly aligns with [FUNDER]'s priorities.
      Org mission: ${orgProfile.mission}
      Org impact: ${orgProfile.impact}
      Funder priorities: ${funderContext.priorities}
      Length: 150-200 words`,
    
    budget_narrative: `Write a brief narrative explaining the requested budget of $${funder.grant_size}.
      Budget breakdown: [ITEM]: [COST]
      Funder grant size: ${funderContext.grant_size}
      Length: 100-150 words`,
    
    outcomes: `Define measurable outcomes for this grant project.
      Org mission: ${orgProfile.mission}
      Grant scope: [PROVIDED_BY_USER]
      Timeline: [PROVIDED_BY_USER]
      Format: List 3-5 SMART outcomes`,
  };

  // 4. Call Claude API
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 500,
    system: `You are an expert nonprofit grant writer. Generate clear, compelling content.
      Follow nonprofit grant writing best practices. Be specific and measurable.`,
    messages: [
      {
        role: "user",
        content: prompts[sectionName] || prompts.intro
      }
    ]
  });

  // 5. Parse response
  const generatedContent = response.content[0].text;
  
  // 6. Calculate confidence score (based on word count, coherence, specificity)
  const confidenceScore = calculateConfidence(generatedContent, sectionName);

  return {
    content: generatedContent,
    confidence_score: confidenceScore,
    tokens_used: response.usage.output_tokens
  };
}
```

### Funder Matching Algorithm

```javascript
async function calculateFunderMatch(org, funder) {
  let score = 0;
  let reasons = [];

  // 1. Focus area alignment (0-40 points)
  const focusOverlap = intersection(org.focus_areas, funder.focus_areas);
  if (focusOverlap.length > 0) {
    score += 40 * (focusOverlap.length / org.focus_areas.length);
    reasons.push(`Focus area match: ${focusOverlap.join(', ')}`);
  }

  // 2. Geographic alignment (0-20 points)
  const geoMatch = intersection(org.geographic_focus, funder.geographic_focus);
  if (geoMatch.length > 0 || funder.geographic_focus.includes('global')) {
    score += 20;
    reasons.push(`Geographic fit: ${geoMatch.join(', ') || 'Global'}`);
  }

  // 3. Grant size alignment (0-20 points)
  const { min: orgBudget } = parseBudgetRange(org.budget_range);
  if (orgBudget >= funder.grant_size_min && orgBudget <= funder.grant_size_max) {
    score += 20;
    reasons.push(`Grant size range matches (${funder.grant_size_min}-${funder.grant_size_max})`);
  } else if (orgBudget <= funder.grant_size_max * 1.5) {
    score += 10; // Slight match
  }

  // 4. Application deadline (0-20 points)
  const daysUntilDeadline = daysBetween(now(), funder.deadline);
  if (daysUntilDeadline > 30 && daysUntilDeadline < 180) {
    score += 20; // Plenty of time
  } else if (daysUntilDeadline > 10) {
    score += 10; // Some time
  }

  return {
    relevance_score: Math.min(100, score),
    match_reason: reasons.join('; ')
  };
}
```

### Compliance Tracking Engine

```javascript
async function initializeComplianceChecklist(org) {
  // Create standard nonprofit compliance items
  const items = [
    {
      item_type: '990_form_due',
      description: 'Annual Form 990 filing due',
      deadline: getFormDeadline(org.nonprofit_status),
      recurrence: 'annual'
    },
    {
      item_type: 'audit_required',
      description: 'Annual audit (if revenue > $500k)',
      deadline: moment().add(1, 'year').toDate(),
      recurrence: 'annual'
    },
    {
      item_type: 'nonprofit_status_renewal',
      description: 'Verify nonprofit tax status still active',
      deadline: moment().add(2, 'years').toDate(),
      recurrence: 'biennial'
    }
  ];

  // Add grant-specific compliance for submitted proposals
  const submittedProposals = await getSubmittedProposals(org);
  for (const proposal of submittedProposals) {
    items.push({
      item_type: 'grant_reporting_due',
      description: `Reporting deadline for ${proposal.funder.name}`,
      deadline: calculateReportingDeadline(proposal.deadline),
      recurrence: 'grant_specific'
    });
  }

  // Save all items
  await insertComplianceItems(org.id, items);
}
```

---

## AI Integration (Claude API)

### Prompt Engineering Strategy

**System Prompt (Foundation):**
```
You are an expert nonprofit grant writer with 15+ years of experience.
You help nonprofits write compelling, specific grant proposals.

Rules:
1. Be specific and data-driven; avoid vague language
2. Align nonprofit's mission with funder's priorities
3. Use clear, accessible language (avoid jargon)
4. Follow nonprofit grant writing best practices
5. Always include measurable outcomes
6. Respect word limits strictly

Output format:
- For section content: Plain text, ready to insert into proposal
- For feedback: Constructive suggestions for improvement
- For alternatives: Provide 2-3 options when appropriate
```

**Section-Specific Prompts:**
- Introduction: Compelling hook + org credibility
- Mission alignment: Direct connection between org work + funder priorities
- Budget narrative: Transparent, itemized budget explanation
- Outcomes: SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound)
- Impact: Quantifiable results and long-term change

### Token Management
- **Avg tokens per section:** 150-300
- **Avg proposal (5 sections):** 1,000-1,500 tokens
- **Monthly budget (50 proposals):** ~75k tokens (~$3-5/month at Anthropic pricing)
- **Optimization:** Implement caching for repeated sections; reuse templates

---

## Data Flow Diagrams

### New Proposal Creation Flow

```
User Clicks "New Proposal"
  ↓
Select Template (foundation/government/corporate)
  ↓
Enter Proposal Title + Target Funder
  ↓
Fill Form: sections to complete
  ↓
For Each Section:
  ├─ Display section prompt
  ├─ User enters context (optional AI assistance)
  ├─ Call /api/proposals/:id/generate-section
  ├─ Claude generates draft
  ├─ User reviews + edits
  └─ Save section
  ↓
Review Complete Proposal
  ↓
Option A: Save Draft
Option B: Submit to Funder
```

### Funder Discovery Flow

```
User Searches Funders
  ↓
Enter Criteria (focus area, grant size, deadline)
  ↓
GET /api/funders/search
  ├─ Query funders DB with filters
  ├─ Return ranked results (by deadline, match)
  └─ Cache results (5 min TTL)
  ↓
Display Results
  ↓
User Views Funder Detail
  ├─ Full funder info
  ├─ Match score to org
  ├─ Application requirements
  ├─ Option to favorite / mark as applied
  └─ Linked proposals (if any)
```

---

## Deployment & Infrastructure

### Frontend
- **Hosting:** Vercel (React SPA)
- **CDN:** Vercel global edge network
- **Monitoring:** Sentry + PostHog
- **Performance targets:** <2s initial load, <100ms API response

### Backend
- **Hosting:** Railway or Render
- **Database:** PostgreSQL (Managed via Railway/Heroku)
- **Cache:** Redis (for proposal drafts, search results)
- **File Storage:** AWS S3 or Cloudinary (for document uploads)
- **Job Queue:** Bull (for background tasks: email, report generation)

### Configuration

**.env.example:**
```
# Auth
AUTH0_DOMAIN=xxx.auth0.com
AUTH0_CLIENT_ID=xxx
AUTH0_CLIENT_SECRET=xxx

# Database
DATABASE_URL=postgresql://user:pass@localhost/grantwriter

# Claude API
ANTHROPIC_API_KEY=sk-ant-xxx

# Email
SENDGRID_API_KEY=sg-xxx

# Storage
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=grantwriter-prod

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Environment
NODE_ENV=production
API_URL=https://api.grantwriter.io
```

---

## Security Considerations

### Authentication & Authorization
- **Auth0 / Clerk:** Managed auth (SAML, OAuth, MFA support)
- **JWT tokens:** Short-lived access tokens (15 min) + refresh tokens (7 day)
- **Role-based access control (RBAC):** Admin, Editor, Viewer roles
- **Team-based permissions:** Members can only access org's data

### Data Protection
- **Encryption at rest:** PG pgcrypto for sensitive fields (EIN, etc.)
- **Encryption in transit:** HTTPS + TLS 1.2+
- **API key management:** Anthropic API key never exposed to client
- **Audit logs:** All proposal changes logged with user + timestamp

### API Security
- **Rate limiting:** 100 req/min per user (to prevent abuse)
- **Input validation:** Server-side validation on all endpoints
- **SQL injection protection:** Parameterized queries only
- **CSRF protection:** SameSite cookies + CSRF tokens for POST

### Nonprofit Data Compliance
- **HIPAA N/A** (not handling medical data)
- **GDPR compliance:** Right to data access, deletion
- **Data retention:** Proposal data retained per org preference (min 1 year)
- **Vendor compliance:** Verify Auth0, Stripe, SendGrid GDPR compliance

---

## Performance & Scalability

### Database Optimization
- **Indexes:** On org_id, status, created_at (common queries)
- **Query optimization:** Use EXPLAIN ANALYZE for slow queries
- **Connection pooling:** PgBouncer for connection management
- **Partitioning:** Consider partitioning proposals by date (future)

### Caching Strategy
- **Client cache:** React Query 1-hour default; adjust per endpoint
- **Server cache:** Redis for funders search, org stats (5 min TTL)
- **API caching:** ETag headers for GET requests

### Load Testing
- **Tool:** k6 or Locust
- **Target:** 100 concurrent users, 5,000 proposals in DB
- **Performance goals:** p95 API response <500ms

---

## Monitoring & Observability

### Key Metrics
- **API response time:** p50, p95, p99
- **Claude API latency:** Avg generation time per section
- **Database query time:** Slow query log (>1s)
- **Error rate:** 5xx errors per endpoint
- **Signup conversion:** Free → Pro conversion rate
- **Feature usage:** % of proposals using AI copilot

### Alerting
- **Critical:** Database down, API error rate >1%, Claude API errors
- **Warning:** API response p95 >1s, error rate >0.1%
- **Info:** New signup, new paying customer

### Logging
- **Structured logging:** Winston (JSON format)
- **Centralized:** ELK or Datadog
- **Log retention:** 30 days (searchable), 1 year (archived)

---

## Testing Strategy

### Unit Tests
- Service functions (Claude integration, matching algorithm)
- Helpers (budget parsing, date calculations)
- Target: 80%+ coverage on core services

### Integration Tests
- API endpoint contracts (happy path + error cases)
- Database transactions (isolation levels, rollback)
- Auth flow (signup, login, token refresh)

### E2E Tests
- Signup → Create proposal → Generate section → Submit
- Search funder → Favorite → View match details
- Team invite → Accept → Collaborate on proposal

---

## Deployment Checklist

- [ ] Database migrations tested (pg_dump backup)
- [ ] Environment variables configured
- [ ] Auth0 / Clerk tenant created
- [ ] Stripe test keys configured
- [ ] Anthropic API key validated
- [ ] SendGrid email templates configured
- [ ] S3 bucket created + CORS configured
- [ ] Sentry project created
- [ ] PostHog project created
- [ ] GitHub Actions CI/CD pipeline configured
- [ ] Vercel project linked to GitHub
- [ ] Railway/Render backend deployed
- [ ] Database seeded with funder data
- [ ] Health check endpoint live
- [ ] Smoke tests passing
- [ ] Product launch checklist (landing page, pricing, support email)

---

## MVP Completion Definition

**Done when:**
1. ✅ Authentication (signup, login, logout)
2. ✅ Org profile creation + mission statement
3. ✅ Proposal drafting copilot (with Claude integration)
4. ✅ Template selection (at least 3 types)
5. ✅ Funder database search (2k+ funders)
6. ✅ Funder matching algorithm (relevance score)
7. ✅ Basic compliance checklist (nonprofit-specific items)
8. ✅ Version history (basic: timestamp + author)
9. ✅ Team member invitation (email-based)
10. ✅ Landing page (value prop, pricing, signup button)
11. ✅ Deployment to production
12. ✅ Smoke tests passing
13. ✅ Basic documentation (setup guide, user onboarding)

**Out of scope (Phase 2):**
- Advanced template customization
- Automated funder database sync
- Grant marketplace / affiliate commission
- Advanced analytics (cohort analysis, LTV tracking)
- CoinUsUp integration (Phase 2)

