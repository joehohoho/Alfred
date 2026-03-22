# Voice-to-SOP Builder for Field Service Teams

Card: `task_1774054884299_23d01b3d`  
Date: 2026-03-20

## 1) Positioning (where Joe can win)

**Wedge:** “Job-close SOP capture” for field teams (HVAC, plumbing, electrical, restoration, mobile service) with 5–50 staff.

Most field-service platforms (e.g., ServiceTitan, Jobber, FieldInsight) include forms/checklists, but not a **frictionless voice-first SOP capture flow** at the end of a real job. Existing SOP tools (Scribe/Trainual/Waybook class) are mostly office-first.

**Differentiator:**
- 90-second voice memo from tech after finishing a job
- AI converts it into a structured SOP draft
- Supervisor approves/edits quickly
- SOP becomes reusable checklist/template for future jobs

## 2) Problem/Solution fit

### Core pain points (target segment)
- Tribal knowledge stays in senior tech heads
- Inconsistent job quality by technician
- Slow onboarding of new hires
- Office lacks clear post-job “what actually worked” knowledge

### Product promise
Turn “what I did on this job” into a reusable SOP in under 3 minutes with minimal typing.

## 3) MVP scope (buildable quickly)

## Input
- Mobile web app (PWA) with one-tap “Record Job-Close Note”
- Optional upload of photo + invoice/job metadata

## Processing pipeline
1. Speech-to-text transcription
2. LLM extraction into SOP schema
3. Confidence scoring + missing-field prompts

## SOP schema (v1)
- Job type
- Preconditions/safety checks
- Tools/materials
- Step-by-step actions
- Common failure modes
- QA/verification checks
- Customer handoff notes
- Estimated duration

## Approval workflow
- Draft status: `pending_review`
- Supervisor can approve/edit/reject
- On approve, SOP published to team library

## Output surfaces
- SOP page (readable on mobile)
- Printable PDF
- Job checklist mode (checkbox execution)

## Integrations (v1.1)
- Webhook/Zapier/Make trigger after approval
- Export to Notion/Google Docs/Confluence

## 4) Suggested architecture (low complexity)

- Frontend: Next.js + Tailwind (mobile-first)
- Backend: Supabase (Auth + Postgres + Storage)
- STT: Whisper API (or Deepgram for faster streaming)
- LLM: Claude/ChatGPT for SOP structuring
- Queue: lightweight background jobs (Supabase functions / worker)
- PDF: html-to-pdf service

## Data model (minimum)
- `companies`
- `users` (role: tech/supervisor/admin)
- `jobs`
- `voice_notes`
- `sop_drafts`
- `sops`
- `sop_revisions`

## 5) Pricing model (initial)

### Recommended launch pricing
- **Starter:** $99/mo (up to 10 users, capped transcriptions)
- **Growth:** $249/mo (up to 25 users, approvals + templates)
- **Pro:** $499/mo (up to 50 users, API/export + priority support)

### MRR scenarios
- 30 customers mixed at ~$220 ARPA → **~$6.6k MRR**
- 50 customers mixed at ~$240 ARPA → **~$12k MRR**

This fits the “~k-k MRR initial target” framing with realistic SMB pricing.

## 6) Competitive map

## Indirect competitors
- Field Service suites (ServiceTitan/Jobber/etc.): strong dispatch/invoicing/checklists, weak voice-native SOP capture.
- SOP/documentation platforms (Scribe/Trainual/Waybook class): strong documentation, weak field workflow capture.

## Opportunity gap
**Voice-first, in-the-truck, job-close documentation loop** with supervisor approval and instant reuse.

## 7) Go-to-market (first 10 customers)

## ICP
Owners/ops managers of 5–50 person service firms with recurring jobs and onboarding pain.

## Offer
“Convert your top techs’ voice notes into team SOPs in 2 weeks.”

## Acquisition channels
1. Direct outreach to local/regional service companies
2. Partner with field-service consultants/implementers
3. Niche Facebook/Reddit/trade groups with demo clips
4. Case-study-led outbound (“reduced onboarding time by X%”)

## Sales motion
- 30-min discovery + workflow mapping
- 7-day pilot on one workflow (e.g., furnace maintenance)
- Success criteria: SOPs created, approval time, repeatability score
- Convert to monthly subscription + optional setup fee

## 8) 14-day execution plan

### Days 1–3
- Define SOP schema + prompt templates
- Build recording + upload flow
- Implement transcription

### Days 4–6
- Draft generator + structured output
- Supervisor review UI
- Basic SOP library

### Days 7–9
- PDF/checklist output
- Team permissions
- Error handling + confidence flags

### Days 10–12
- Pilot-ready onboarding flow
- Seed data + demo scripts by trade (HVAC/plumbing/electrical)

### Days 13–14
- Internal test with 10+ sample recordings
- Fixes + launch page + pilot outreach list

## 9) Risks + mitigations

- **Transcript noise (truck/field audio):** add guided prompts + noise handling + “repeat unclear” UX
- **Hallucinated procedural steps:** force extraction-only mode first, tag uncertain items
- **Low adoption by techs:** keep capture to one button + <90 sec target
- **SMB price sensitivity:** provide ROI framing (onboarding time + fewer callbacks)

## 10) Definition of done for this card

- Product concept narrowed to a defendable wedge
- MVP feature set defined
- Pricing + MRR math drafted
- Architecture + execution plan documented
- Ready for next phase: clickable prototype or build kickoff
