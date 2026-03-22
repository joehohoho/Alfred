# SOP Drift Detector for AI Automations — MVP Blueprint

Date: 2026-03-20
Card: `task_1774045849229_1d65d0f3`
Owner: Alfred

## 1) Product Thesis

SOP tools help teams document process, but they do not reliably detect when live automations diverge from docs. The wedge is **continuous drift monitoring** across automation platforms plus digestable remediation alerts.

**Core promise:** “Know within hours when your documented process is no longer what your automation actually does.”

## 2) ICP + Beachhead

### Primary ICP (first 10 paying users)
- Automation consulting clients with 10–200 active workflows
- Tech stack includes at least one of: Zapier, n8n, Make, HubSpot Workflows
- Pain signals:
  - Onboarding/retraining churn due to stale docs
  - Frequent “why did this run change?” incidents
  - Compliance or QA pressure (ops, RevOps, finance ops)

### Who not to target in MVP
- Regulated enterprise requiring SOC2 on day 1
- Teams without stable SOP docs
- Single-workflow solopreneurs

## 3) Market Validation Snapshot (light research)

Demand for SOP/documentation tooling is validated by incumbents (Whale, Waybook, Scribe, Fluency). Wedge appears under-served: automated cross-system drift detection tied to workflow configs.

Technical feasibility signals:
- Zapier provides Zap listing/details APIs in Partner/Powered docs.
- n8n provides public REST API and workflow endpoints (plan-gated in cloud).
- HubSpot exposes Automation API workflows endpoints.
- Make exposes Scenarios and Blueprint APIs.

This means an MVP can launch with **connector-first polling + normalized diffing** without browser scraping.

## 4) MVP Scope (v1.0)

## Must-have
1. Connectors:
   - Zapier (list zaps + key step metadata)
   - n8n (workflows JSON)
   - Make (scenario blueprint + metadata)
   - HubSpot (workflow list/details)
2. SOP ingestion:
   - Markdown upload/paste (single source of truth per workflow)
   - Optional Google Doc URL import in v1.1
3. Drift engine:
   - Snapshot current workflow spec
   - Compare with previous snapshot + SOP expectation
   - Emit drift events with severity score (low/med/high)
4. Alerts:
   - Immediate alert on high-severity drift
   - Weekly digest (summary + unresolved drift backlog)
   - Delivery: email + Discord webhook (Joe ecosystem fit)
5. Dashboard:
   - Connected systems, monitored workflows, open drifts, MTTR

## Explicitly out of scope (MVP)
- Auto-remediation / auto-edit of workflows
- Deep semantic process mining from logs
- Full RBAC/SSO/SCIM
- Enterprise-grade compliance packaging

## 5) Drift Detection Model

Use a two-layer drift model:

### A) Structural drift (deterministic)
Compare normalized workflow graph:
- Trigger app/event changes
- Step add/remove/reorder
- Key field mapping changes
- Filter/branch condition modifications
- Auth/account connection changes

### B) Behavioral drift (heuristic)
Compare intent extracted from SOP text vs workflow metadata:
- SOP says “notify Slack channel X,” workflow points to Y
- SOP says “create invoice before email,” order inverted
- SOP required approver node missing

MVP can do behavioral drift with rules + lightweight LLM check only for ambiguous changes.

## 6) Severity Scoring (MVP rubric)

`severity = impact_weight × confidence_weight × criticality_weight`

- **Impact weight:** changed trigger/route/output destination > cosmetic renames
- **Confidence:** deterministic diff high confidence; heuristic NLP medium
- **Criticality:** workflow tagged as finance/customer/compliance raises score

Thresholds:
- `>= 0.75` → High (immediate alert)
- `0.45–0.74` → Medium (daily rollup)
- `< 0.45` → Low (weekly digest)

## 7) Technical Architecture (pragmatic)

1. **Connector Pollers** (cron/scheduler)
   - Pull workflow metadata per provider
   - Respect per-provider rate limits + ETag/updatedAt where available
2. **Normalization Layer**
   - Convert provider-specific JSON to canonical schema:
     - `workflow`, `nodes`, `edges`, `trigger`, `actions`, `conditions`, `destinations`
3. **Snapshot Store**
   - Save immutable snapshots (versioned)
4. **Diff Engine**
   - Structural diff between latest and baseline
   - Intent check vs SOP manifest
5. **Policy/Rules Engine**
   - Severity scoring + suppressions + noise controls
6. **Notification Service**
   - Immediate + digest notifications
7. **Web UI/API**
   - Workflow drilldown, drift timeline, acknowledge/resolved states

## Suggested stack (fast to ship)
- Backend: Node/TypeScript (Nest or Fastify)
- DB: Postgres + JSONB
- Queue/schedule: BullMQ + Redis (or managed equivalent)
- Frontend: Next.js minimal dashboard
- Auth: magic link for MVP

## 8) Data Model (minimum)

- `integrations` (provider, account, token_ref, status)
- `workflows` (provider_id, external_id, name, tags, risk_level)
- `workflow_snapshots` (workflow_id, captured_at, hash, normalized_json)
- `sops` (workflow_id, version, source, content_markdown, manifest_json)
- `drift_events` (workflow_id, snapshot_from, snapshot_to, type, severity, evidence_json, status)
- `notification_logs` (event_id, channel, sent_at, outcome)

## 9) MVP Build Plan (30 days)

### Week 1 — Foundation
- Canonical schema + snapshot hashing
- One connector end-to-end (n8n or Zapier first)
- Basic dashboard skeleton

### Week 2 — Multi-connector + diff
- Add second and third connectors
- Structural diff engine with evidence snippets
- Event generation + storage

### Week 3 — SOP alignment + alerts
- SOP upload + lightweight manifest extraction
- Severity scoring + immediate alerts
- Weekly digest job

### Week 4 — Pilot hardening
- Add HubSpot/Make connector (whichever remains)
- Noise reduction (suppression rules, debounce)
- Pilot onboarding playbook + billing stub

## 10) Pricing + Packaging

### Starter (target $29/mo)
- Up to 25 workflows
- Weekly digest + medium/high alerts
- 30-day snapshot history

### Growth (target $49/mo)
- Up to 100 workflows
- Real-time alerts + policy rules
- 180-day history + acknowledgements

### Consulting-assisted onboarding
- One-time setup service for Joe’s clients ($300–$1,500)
- Fast path to recurring subscription attach rate

## 11) Go-to-Market (Joe-specific)

1. Start with 3 existing consulting clients as design partners.
2. Offer “Drift Audit in 7 days” as paid diagnostic or free lead-in.
3. Use audit report as conversion artifact (shows hidden workflow-doc mismatches).
4. Convert to subscription + optional managed monitoring.

Messaging angle:
- “Your SOP is a promise. We verify the automation still keeps it.”

## 12) Risks + Mitigations

1. **API scope/rate-limit friction**
   - Mitigation: incremental polling, backoff, connector health status
2. **Alert fatigue**
   - Mitigation: severity thresholds, suppression rules, digest defaults
3. **Doc quality variance**
   - Mitigation: SOP manifest template + minimum required fields
4. **Token/security concerns**
   - Mitigation: encrypted token storage, least-privilege scopes, audit logs

## 13) Acceptance Criteria for this card

- [x] Clear product wedge and ICP documented
- [x] Connector-first technical architecture defined
- [x] MVP scope with explicit non-goals
- [x] Severity scoring + alert model specified
- [x] 30-day delivery plan created
- [x] Pricing + GTM plan tailored to Joe’s channel

## 14) Next Execution Task Suggestions

1. Build canonical workflow schema + diff spec (`docs/sop-drift-schema-v1.md`)
2. Implement first connector spike (Zapier or n8n)
3. Build drift evidence renderer for alerts and weekly digest templates
