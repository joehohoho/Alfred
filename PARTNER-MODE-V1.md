# Partner Mode v1 — Alfred ↔ HAL ↔ Joe

Status: In Progress (started 2026-03-20)

## Goal
Create a low-micromanagement operating model with high trust, strong autonomy, and predictable outcomes.

## Phase 1 (Implemented)

### 1) Change Control Lite (enforced checklist)
Script: `scripts/change-control-lite.sh`

What it enforces before/after significant changes:
- Problem statement + objective
- Current-state analysis (dependencies/failure points/blast radius)
- Options considered + rationale for selected solution
- Guardrails (preflight/checkpoints/retry/fallback/rollback)
- Verification evidence (before/after health checks)
- Explicit restart requirement + restart safety decision

### 2) Verification Bundle Generator
Script: `scripts/verification-bundle.sh`

Produces a single bundle under `tracking/verification/<timestamp>/` with:
- Cron preflight output
- OpenClaw status snapshot
- LaunchAgent snapshot
- Optional custom command output

Use this as post-change evidence and audit trail.

## Near-Term Phases

### Phase 2: Handoff Contract Hard Gate (Implemented baseline)
- HAL dispatch now requires validated handoff contract per task id (`goals/handoffs/<task_id>.json`).
- Auto-block + comment when handoff is missing/invalid.
- Validation now enforces acceptance criteria + autonomy boundaries via `scripts/validate-handoff-generic.sh`.
- Next in this phase: completion-evidence auto-check before card close.

### Phase 3: Partner Dashboard Slice
- “Autonomous work in progress”
- “Waiting on Joe decisions”
- “Recently changed + verification state”

### Phase 4: Notification Quality Tuning
- Batch non-urgent updates.
- Alert only on blockers/risk/high-impact deltas.

## Operating Rule
For all meaningful system changes:
1) Start a change-control record
2) Execute with guardrails
3) Generate verification bundle
4) Close record with evidence and next-step recommendation
