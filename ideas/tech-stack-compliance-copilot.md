# Tech Stack: Canadian SMB Compliance Copilot

**MVP Target:** 2-week build (April 8-21)  
**Philosophy:** Simplicity > features. Use managed services. No DevOps complexity.

---

## Architecture Overview

```
┌─────────────────┐
│   Web Client    │  React SPA (Vercel)
│  (Dashboard)    │  - Calendar view
└────────┬────────┘  - AI chat
         │           - Settings
         │
    [HTTPS/REST API]
         │
┌────────▼────────────────────┐
│   Backend (Serverless)       │  Next.js API Routes (Vercel)
│   - User auth               │  - User management
│   - Calendar logic          │  - Deadline queries
│   - AI copilot              │  - Email reminders
│   - Email sending           │  - Analytics
└────────┬────────────────────┘
         │
    ┌────┴──────┬─────────────┬──────────────┐
    │            │             │              │
┌───▼──┐  ┌──────▼─┐  ┌─────┬┘  ┌──────┐    │
│ DB   │  │Claude  │  │SMTP │   │Auth  │    │
│(PG)  │  │ API    │  │Email│   │OAuth │    │
└──────┘  └────────┘  └─────┘   └──────┘    │
                                             │
 Supabase                OpenAI/Claude     SendGrid    Supabase
```

---

## Tech Choices (Rationale)

### Frontend
**Framework:** Next.js (TypeScript)
- **Why:** Full-stack framework (API routes + UI in one repo)
- **Alternative:** SvelteKit (lighter) — stick with Next.js for ecosystem
- **UI Components:** shadcn/ui (free, no design system cost)
- **Calendar:** react-big-calendar or fullcalendar.io (lite version)
- **Chat UI:** Custom (simple textarea + message list)
- **Deployment:** Vercel (zero-config, automatic deploys)

**Dependencies:**
```json
{
  "next": "^14.0",
  "react": "^18.0",
  "typescript": "^5.0",
  "@supabase/auth-helpers-nextjs": "^0.8",
  "react-big-calendar": "^1.8",
  "shadcn/ui": "^0.4",
  "zod": "^3.22", // Validation
  "framer-motion": "^10", // Animations (optional)
  "date-fns": "^2.30"
}
```

**Build time:** ~2 hours (boilerplate + component setup)

### Backend
**Framework:** Next.js API Routes (serverless)
- **Why:** No separate backend; collocated with frontend
- **Alternative:** Fastapi/Python — stick with Node for speed
- **Database ORM:** Supabase client (simple queries, no heavy ORM)

**Core endpoints:**
```
POST   /api/auth/signup              (Register)
POST   /api/auth/login               (Login)
GET    /api/auth/user                (Current user)
GET    /api/deadlines                (List user deadlines)
POST   /api/deadlines                (Create custom deadline)
GET    /api/copilot/chat             (Chat with AI)
POST   /api/copilot/chat             (Send message to copilot)
POST   /api/notifications/email      (Send reminder emails)
```

**Build time:** ~8 hours (auth scaffolding + CRUD endpoints)

### Database
**Service:** Supabase (PostgreSQL + managed auth)
- **Why:** Zero DevOps, built-in auth, REST API, real-time subscriptions
- **Cost:** $25/month (generous free tier covers MVP)
- **Schema:**

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  business_name TEXT,
  province TEXT,
  fiscal_year_end DATE,
  created_at TIMESTAMP
);

-- Deadlines
CREATE TABLE deadlines (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name TEXT,
  due_date DATE,
  frequency TEXT, -- 'once', 'yearly', 'quarterly', 'monthly'
  category TEXT,  -- 'cra', 'payroll', 'corporate', 'custom'
  description TEXT,
  created_at TIMESTAMP
);

-- AI Chat History
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  role TEXT, -- 'user' or 'assistant'
  content TEXT,
  created_at TIMESTAMP
);

-- Email Reminders Log
CREATE TABLE reminder_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  deadline_id UUID,
  sent_at TIMESTAMP,
  status TEXT -- 'sent', 'failed'
);

-- Analytics
CREATE TABLE events (
  id UUID PRIMARY KEY,
  user_id UUID,
  event_type TEXT, -- 'signup', 'login', 'ask_copilot', 'view_calendar'
  created_at TIMESTAMP
);
```

**Build time:** ~3 hours (design + migrations)

### AI Integration
**LLM:** Claude API (Anthropic)
- **Why:** Better at compliance Q&A than GPT; token-efficient
- **Model:** claude-3-5-sonnet (best balance of speed/quality for Q&A)
- **Cost:** ~$0.01 per question (1000 questions/month = $10)
- **Rate limit:** 50k tokens/min (plenty for MVP)

**Prompt Template:**
```
System Prompt:
---
You are a Canadian tax and business compliance expert. You help small business owners
(10-100 employees) understand CRA deadlines, HST/GST filing, payroll obligations, 
and corporate compliance.

Context:
- User's province: [PROVINCE]
- Business type: [SOLE_PROP|PARTNERSHIP|CORPORATION]
- Fiscal year end: [DATE]
- Number of employees: [N]

Rules:
1. Always cite CRA website or official source
2. If unsure, say "I recommend verifying with CRA at [URL]"
3. Focus on Canadian rules only
4. Simple language (no jargon)
5. Mention potential penalties if deadline is missed

Question: [USER_QUESTION]
---
```

**Integration code:**
```typescript
// pages/api/copilot/chat.ts
import { Anthropic } from "@anthropic-ai/sdk";

const client = new Anthropic();

export default async function handler(req, res) {
  const { message, userId } = req.body;
  
  // Get user context
  const user = await db.from("users").select("*").eq("id", userId).single();
  
  // Build system prompt with user context
  const systemPrompt = buildSystemPrompt(user);
  
  // Get conversation history
  const history = await db
    .from("chat_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(5);
  
  // Call Claude
  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: "user", content: message }
    ]
  });
  
  // Save to history
  await db.from("chat_messages").insert([
    { user_id: userId, role: "user", content: message },
    { user_id: userId, role: "assistant", content: response.content[0].text }
  ]);
  
  res.json({ reply: response.content[0].text });
}
```

**Build time:** ~2 hours (API integration + prompt tuning)

### Email Service
**Provider:** SendGrid or Resend
- **Why:** Simple, reliable, good templates
- **Cost:** $10/month (Resend free tier = 100 emails/day)
- **MVP approach:** Use Resend (free, simpler)

**Email template (reminder):**
```
Subject: Reminder: HST filing due [DATE]

Hi [NAME],

Your HST return is due on [DATE] (in 30 days).

To file online: 
1. Log into CRA My Account
2. Navigate to HST/GST → File return
3. Answer questions → Submit

This usually takes 15-20 minutes.

Need help? Ask our AI: [LINK]

---
Compliance Copilot
```

**Scheduled emails:**
- Run every morning at 8 AM EST
- Query deadlines due in 30 days
- Send personalized reminder emails

**Implementation:** Use cron job or Vercel Cron

**Build time:** ~2 hours (template setup + SendGrid integration)

### Authentication
**Provider:** Supabase Auth (OAuth + Email)
- **Why:** Built into Supabase, no separate service
- **Methods:** Email/password (MVP), Google OAuth (v2)
- **Cost:** Free (included in Supabase)

**Flow:**
1. User signs up with email
2. Verify email (magic link)
3. Set password
4. Redirect to dashboard

**Build time:** ~2 hours (using @supabase/auth-helpers-nextjs)

### Hosting & Deployment
**Platform:** Vercel
- **Why:** Next.js native, automatic deploys from Git, serverless
- **Cost:** Free tier covers MVP (100k requests/mo, 6 GB bandwidth)
- **Domain:** Compliance-copilot.com (Namecheap = $10/yr)
- **SSL:** Free (automatic from Vercel)
- **CD/CI:** Git push → automatic deploy

**Build time:** ~1 hour (connect repo to Vercel)

---

## Development Timeline (70 hours, 2 weeks)

### Week 1: Core Features (40 hours)

**Day 1-2: Database + Auth (10 hours)**
- [ ] Design schema (1 hr)
- [ ] Create Supabase project + migrations (2 hrs)
- [ ] Implement signup/login API (3 hrs)
- [ ] Test auth flow (2 hrs)
- [ ] Setup Vercel deployment (2 hrs)

**Day 3-4: Frontend Boilerplate (15 hours)**
- [ ] Create Next.js project (1 hr)
- [ ] Setup shadcn/ui + Tailwind (2 hrs)
- [ ] Build login/signup pages (4 hrs)
- [ ] Build dashboard layout (3 hrs)
- [ ] Setup Supabase client + queries (3 hrs)
- [ ] Test auth on deployed version (2 hrs)

**Day 5: Calendar + Deadlines (15 hours)**
- [ ] Research HST/GST deadlines for all provinces (3 hrs)
- [ ] Populate deadline database (2 hrs)
- [ ] Build calendar view (react-big-calendar) (5 hrs)
- [ ] Build deadline creation UI (3 hrs)
- [ ] API endpoints for deadline CRUD (2 hrs)

### Week 2: AI + Polish (30 hours)

**Day 1-2: AI Copilot (10 hours)**
- [ ] Anthropic API setup + authentication (1 hr)
- [ ] Write system prompt + test (2 hrs)
- [ ] Build chat UI component (3 hrs)
- [ ] API endpoint for Claude calls (2 hrs)
- [ ] Save chat history to database (2 hrs)

**Day 3: Email Reminders (8 hours)**
- [ ] Setup Resend account (1 hr)
- [ ] Design reminder email template (2 hrs)
- [ ] Implement cron job for daily reminders (3 hrs)
- [ ] Test email sending (2 hrs)

**Day 4: Polish + Testing (8 hours)**
- [ ] Fix UX issues (2 hrs)
- [ ] Mobile responsiveness (2 hrs)
- [ ] Test all flows end-to-end (2 hrs)
- [ ] Optimize performance + bundle size (1 hr)
- [ ] Security audit (basic) (1 hr)

**Day 5: Launch Prep (4 hours)**
- [ ] Create landing page (using Framer or simple HTML) (2 hrs)
- [ ] Setup Stripe payment (simple: just customer ID for now) (1 hr)
- [ ] Documentation for beta users (1 hr)

---

## Technology Summary

| Layer | Technology | Cost | Build Time |
|-------|-----------|------|-----------|
| **Frontend** | Next.js + React | Free | 4 hrs |
| **Backend** | Next.js API Routes | Free | 2 hrs |
| **Database** | Supabase (PostgreSQL) | $25/mo | 1 hr |
| **AI** | Claude API | $10/mo | 2 hrs |
| **Email** | Resend | Free | 2 hrs |
| **Auth** | Supabase Auth | Free | 2 hrs |
| **Hosting** | Vercel | Free | 1 hr |
| **Total** | — | **$45/mo** | **~16 hrs** |

---

## Local Development

### Setup (30 min)

```bash
# Clone project
git clone <repo>
cd compliance-copilot

# Install deps
npm install

# Setup env vars
cp .env.example .env.local
# Add:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...
# ANTHROPIC_API_KEY=...
# RESEND_API_KEY=...

# Run locally
npm run dev
# Visit http://localhost:3000
```

### Database Migration

```bash
# Create migration
npx supabase migration new init_schema

# Apply locally
npx supabase migration up

# Push to remote
npx supabase db push
```

---

## Cost Breakdown (First Year)

| Service | Monthly | Annual |
|---------|---------|--------|
| Supabase (PostgreSQL) | $25 | $300 |
| Claude API | $10 | $120 |
| Resend (emails) | $0 (free tier) | $0 |
| Vercel | $0 (free tier) | $0 |
| Domain | $0.83 | $10 |
| **Total** | **$35.83** | **$430** |

**Note:** Costs scale with usage; if >10k API calls/month, upgrade to paid tiers.

---

## Scalability Notes

### What scales easily:
- ✅ Database (Supabase auto-scales)
- ✅ API routes (Vercel auto-scales)
- ✅ Email sending (Resend handles 1M+ emails/mo)
- ✅ Claude API (generous rate limits)

### What needs attention at scale:
- Cron jobs (switch to proper job queue if >100k emails/day)
- Chat history (may need indexing if conversations grow)
- File uploads (if adding document storage in v2)

**Scaling is straightforward; don't over-engineer for MVP.**

---

## Security Checklist

- [ ] All environment variables in .env (never commit)
- [ ] HTTPS only (automatic on Vercel)
- [ ] CORS headers configured
- [ ] Rate limiting on API endpoints (add middleware)
- [ ] SQL injection prevention (use parameterized queries)
- [ ] Password hashing (Supabase handles)
- [ ] Session management (Supabase Auth)
- [ ] GDPR compliance (data deletion on request)

---

## Next Steps

1. **Create GitHub repo** with Next.js boilerplate
2. **Setup Supabase project** + create tables
3. **Deploy to Vercel** (empty app first)
4. **Start development** with contingent architecture above

**Total setup time:** ~1 hour
**MVP build time:** 70 hours (2 weeks)
**Go-live:** May 1, 2026

---

**Status:** ✅ Tech stack defined. Ready to start development.
