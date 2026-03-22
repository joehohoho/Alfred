# SaaS MVP Blueprint — Daily Wellness Check-in Service for Seniors Living Alone

Card: `task_1774036851586_0c5814fa`  
Date: 2026-03-20  
Owner: Alfred

## 1) Problem + Positioning
Families worry daily about older parents/relatives who live alone. Existing options are either:
- too hardware-heavy (wearables, sensors),
- too expensive (human call centers), or
- too broad (generic telehealth tooling).

**Product angle:** “Peace of mind as a subscription.”
- Buyer: adult children/caregiver families
- End user: senior
- Core value: daily proof-of-wellness + automatic escalation when no response
- Promise: simple, reliable, no app required for the senior

## 2) MVP Scope (1–2 weeks)

### In scope
1. Family signup + payment (Stripe)
2. Senior profile setup (name, timezone, preferred language, call vs SMS)
3. Daily check-in scheduler
4. Check-in via Twilio:
   - SMS: reply YES / custom keyword
   - Voice: press 1 to confirm okay
5. Escalation engine:
   - no response window (e.g., 60 min)
   - escalation to Contact #1, then Contact #2
   - optional final escalation to local non-emergency guidance script
6. Event log + dashboard timeline
7. Basic notification preferences + quiet hours

### Out of scope (post-MVP)
- AI conversation
- fall detection / sensor integrations
- multi-tenant agencies
- medication reminders
- insurance integrations

## 3) Lean Architecture (low maintenance)
- **Frontend:** Next.js (family dashboard + onboarding)
- **Backend:** Next.js API routes or small Express service
- **DB:** Postgres (Supabase/Neon)
- **Queue/Scheduler:**
  - Option A: Trigger.dev / Inngest cron + jobs (fastest)
  - Option B: pg_cron + worker
- **Telecom:** Twilio Programmable Voice + Messaging + status webhooks
- **Payments:** Stripe subscriptions ($19/$29)
- **Hosting:** Vercel (web) + managed Postgres

## 4) Core Workflow (state machine)

### Daily run states
`scheduled -> sent -> confirmed | timeout -> escalated_l1 -> escalated_l2 -> unresolved`

### Timing defaults
- Send check-in at configured local time (e.g., 9:00 AM)
- Wait 15 minutes, retry once
- Start escalation at +60 minutes if still unconfirmed
- Escalation ladder delays: 15 min between contacts

### Confirmation paths
- SMS: senior replies YES / OK (case-insensitive)
- Voice: DTMF 1 confirms wellness

## 5) Data Model (MVP)

```sql
-- families paying for service
create table families (
  id uuid primary key,
  owner_email text not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'basic',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- senior receiving check-ins
create table seniors (
  id uuid primary key,
  family_id uuid not null references families(id) on delete cascade,
  full_name text not null,
  phone_e164 text not null,
  timezone text not null,
  preferred_channel text not null check (preferred_channel in ('sms','voice')),
  checkin_time_local time not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- escalation contacts
create table escalation_contacts (
  id uuid primary key,
  senior_id uuid not null references seniors(id) on delete cascade,
  priority int not null,
  full_name text not null,
  phone_e164 text not null,
  relation text,
  notify_channel text not null default 'sms',
  unique(senior_id, priority)
);

-- one daily check instance
create table checkins (
  id uuid primary key,
  senior_id uuid not null references seniors(id) on delete cascade,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  confirmed_at timestamptz,
  status text not null,
  escalation_level int not null default 0,
  created_at timestamptz not null default now()
);

-- immutable event history
create table checkin_events (
  id bigserial primary key,
  checkin_id uuid not null references checkins(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

## 6) Twilio Integration Notes

### Outbound
- SMS send template: friendly + short
- Voice call uses TwiML:
  - greeting with senior’s name
  - prompt “Press 1 if you’re okay”
  - repeat once then hang up

### Inbound/webhooks
- `POST /webhooks/twilio/sms` (capture reply)
- `POST /webhooks/twilio/voice/status` (call lifecycle)
- `POST /webhooks/twilio/voice/gather` (DTMF)

### Reliability controls
- idempotency keys on check-in dispatch
- webhook signature verification (Twilio X-Twilio-Signature)
- retries with exponential backoff for provider/API errors

## 7) Compliance + Risk Guardrails (important)
This is a wellness reminder service, not emergency response/medical advice.

MVP must include:
1. Explicit terms: “Not a 911 replacement”
2. Consent records for contacting senior + escalation contacts
3. TCPA/CASL compliance patterns:
   - opt-in evidence
   - opt-out keyword handling (STOP)
4. Data minimization + retention policy
5. Incident script for unresolved events

## 8) Unit Economics (sanity check)
Using fetched Twilio headline pricing:
- SMS ~ $0.0083/message
- Outbound voice ~ $0.014/min (inbound/receive ~$0.0085/min)

Conservative monthly telecom cost per senior (daily check + occasional retries/escalations):
- likely low single digits USD/month for normal usage
- leaves strong margin at $19–$29 pricing tiers

## 9) Launch Plan (first 30 days)

### Week 1 (build)
- auth + onboarding + senior/contact CRUD
- scheduler + check-in state machine
- Twilio SMS + voice webhooks

### Week 2 (stabilize + ship)
- Stripe subscriptions
- dashboard timeline + alert history
- terms/privacy pages + compliance copy
- pilot with 5–10 families

### Early acquisition channels
1. Facebook caregiver groups (content-led)
2. Local senior-care communities/church networks
3. Partnerships with home-care agencies (referral)

## 10) Success Metrics (MVP)
- Daily confirmation rate > 85%
- Escalation false-positive rate < 10%
- Family 30-day retention > 90%
- Time-to-onboard < 10 minutes

## 11) Build Recommendation
Proceed with MVP.
- Technically straightforward
- emotionally strong value proposition
- low maintenance compared with many consumer SaaS ideas
- fast to revenue with clear willingness-to-pay segment

**Best next step:** Build a private beta with 10 families and iterate escalation timing/template language before broader launch.