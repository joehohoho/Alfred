# Auto Repair Follow-up SaaS — MVP Blueprint

Date: 2026-03-20
Card: task_1774033251912_cd809622

## 1) Opportunity Summary

Build a lightweight customer lifecycle automation tool for independent auto shops:
- Service reminders (time/mileage-based)
- Declined estimate follow-up sequences
- Post-visit review requests
- Win-back campaigns for inactive customers

This product deliberately avoids full shop-management/invoicing and focuses on one pain: **repeat customer revenue without manual follow-up**.

## 2) Fast Market Validation (desk research)

### Market size signal
- U.S. repair/maintenance establishment counts from public datasets and industry sources commonly land in the **~170k–300k** range depending on category definition (independent shops, mechanics, service centers, etc.).
- Using a conservative serviceable target of 100k independent shops, 1% penetration = 1,000 customers.

### Existing demand signal
Current shop platforms already market these exact outcomes:
- automated reminders
- review requests
- follow-up campaigns
- retention/reactivation

That confirms demand exists. The opening is:
- simpler onboarding
- lower price for smaller independents
- “just works” lifecycle flows without full ERP migration

### Compliance requirement (must-have)
US SMS automation requires A2P 10DLC registration and compliant consent handling. MVP must include:
- opt-in recording
- STOP/HELP processing
- consent audit trail
- sending window limits + quiet hours

## 3) Positioning (wedge)

## Product promise
“Turn yesterday’s repairs into next month’s booked work — automatically.”

## ICP (initial)
- Independent shops with 2–15 bays
- No dedicated marketer
- Existing customer base but weak follow-up discipline
- Likely already texting manually from front desk phone

## Anti-positioning
- Not replacing shop-management software
- Not for enterprise dealer groups at MVP stage

## 4) Pricing Hypothesis

- Starter: **$79/mo** (up to 1,500 contacts, core automations)
- Growth: **$129/mo** (multi-sequence campaigns, advanced reporting)
- Pro: **$149/mo** (multi-location lite, priority support)

Upsell later:
- done-for-you setup package ($299 one-time)
- add-on managed campaigns

## 5) MVP Scope (ship in ~2 weeks)

## In scope
1. Contact import (CSV + manual add)
2. Event creation:
   - service completed
   - declined estimate
3. Automation templates:
   - service reminder at X days
   - declined estimate nudge (D+2, D+10)
   - review request (D+1)
   - win-back (180+ days inactive)
4. Message channels:
   - SMS (Twilio)
   - email (Resend or Postmark)
5. Basic dashboard:
   - messages sent/delivered/replied
   - booked callback count (manual tag)
   - review link click rate
6. Compliance controls:
   - opt-out handling
   - quiet hours by timezone
   - consent log per contact

## Out of scope (MVP)
- Deep integrations with every shop platform
- AI message generation
- attribution-perfect revenue reporting
- custom workflow builder UI (use templates + parameters first)

## 6) System Architecture (practical)

- Frontend: Next.js (App Router)
- Backend: Next.js API routes or lightweight Express service
- DB: Postgres (Supabase or Neon)
- Queue/Scheduling: Upstash QStash + cron or BullMQ/Redis
- SMS: Twilio Messaging Service (A2P 10DLC)
- Email: Resend/Postmark
- Auth: Clerk or NextAuth
- Hosting: Vercel + managed Postgres

### Core entities
- organizations
- users
- customers
- vehicles
- service_events
- estimates (with declined flag)
- automations
- automation_runs
- messages
- consent_events

### Critical workflows
1) Event ingested → rules evaluated → schedule run(s)
2) Worker dispatches message via channel adapter
3) Delivery/reply webhooks update message status
4) STOP/UNSUBSCRIBE webhook triggers suppression + audit log

## 7) Data Model (minimum SQL draft)

```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/New_York',
  created_at timestamptz default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  email text,
  sms_opt_in boolean not null default false,
  sms_opt_in_at timestamptz,
  email_opt_in boolean not null default true,
  created_at timestamptz default now()
);

create table service_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  event_type text not null check (event_type in ('service_completed','declined_estimate')),
  event_date date not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create table automations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  trigger_type text not null,
  channel text not null check (channel in ('sms','email')),
  delay_hours int not null default 24,
  template text not null,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  automation_id uuid references automations(id) on delete set null,
  channel text not null,
  provider_id text,
  status text not null default 'queued',
  body text not null,
  sent_at timestamptz,
  delivered_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz default now()
);

create table consent_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  channel text not null,
  consent_state text not null check (consent_state in ('opt_in','opt_out')),
  source text not null,
  created_at timestamptz default now()
);
```

## 8) Message Templates (MVP copy)

### Service reminder (SMS)
"Hi {{first_name}}, it’s been {{days_since_service}} days since your last visit at {{shop_name}}. Want us to book your next maintenance? Reply YES and we’ll text available times. Reply STOP to opt out."

### Declined estimate follow-up (SMS)
"Hi {{first_name}}, just checking in on the {{service_name}} estimate from {{estimate_date}}. We can still fit you in this week if helpful. Reply YES for times or STOP to opt out."

### Review request (SMS)
"Thanks again for visiting {{shop_name}}. If we earned it, could you leave a quick review? {{review_link}} Reply STOP to opt out."

### Win-back (email)
Subject: Still driving well?
Body: short check-in + seasonal recommendation + booking link.

## 9) 14-Day Build Plan

Day 1-2
- project scaffold, auth, org model, env setup
- Twilio + email provider integration stubs

Day 3-4
- customer import + CRUD
- service event ingestion UI/API

Day 5-6
- automation templates + scheduler
- queue worker for delayed sends

Day 7
- delivery/reply webhooks
- STOP handling + suppression list

Day 8-9
- dashboard metrics + activity log
- message history screen

Day 10
- compliance hardening (quiet hours, consent logs)

Day 11-12
- onboarding wizard + sample templates

Day 13
- QA + seed test shop data + bug fixes

Day 14
- deploy + pilot readiness checklist

## 10) Go-To-Market Plan (first 10 customers)

1. Prospect source:
- Google Maps + local directories (independents)
- prioritize shops with weak review velocity / stale social presence

2. Offer:
- 14-day free trial
- “we set up first 3 automations for you”

3. Sales motion:
- simple loom demo + one-page ROI calculator
- ROI anchor: one recovered ticket can pay monthly fee

4. Pilot KPIs (first 30 days):
- activation: % shops sending first campaign within 48h
- retention signal: weekly active shops
- value signal: response/click rate + “booked from follow-up” count

## 11) Key Risks + Mitigations

- Deliverability/compliance risk
  - Mitigation: mandatory consent capture + A2P-ready onboarding + strict STOP logic
- Onboarding friction
  - Mitigation: CSV-first import, no integration required for pilot
- Feature overlap with incumbents
  - Mitigation: position as lightweight overlay + faster setup + lower price point
- Attribution ambiguity
  - Mitigation: manual assisted attribution first, integrate deeper later

## 12) Definition of Done for this card

- Clear MVP architecture and scope documented
- Concrete data model and message workflows defined
- Build plan with day-by-day milestones defined
- GTM and pricing hypothesis documented
- Compliance constraints explicitly built into MVP design

---

## Recommended immediate next execution task

Create `apps/garage-followup-mvp` and implement Day 1-4 (auth + org/customer/event models + CSV import + Twilio send test) to convert this blueprint into a runnable pilot.
