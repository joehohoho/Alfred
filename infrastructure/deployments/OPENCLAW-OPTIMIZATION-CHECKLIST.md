# OpenClaw Optimization Checklist (Alfred ↔ HAL)

Purpose: make setup, reliability, and recovery repeatable instead of ad-hoc.

## 0) Baseline Snapshot (before changes)
- [ ] Run `openclaw status`
- [ ] Run `bash ~/.openclaw/workspace/scripts/ops-health-dashboard.sh`
- [ ] Record active cron failures (if any)
- [ ] Capture current model routing + fallback assumptions

Owner: Alfred

---

## 1) Delivery Routing Preflight (cron safety)
- [ ] Run `bash ~/.openclaw/workspace/scripts/cron-preflight-validator.sh --all`
- [ ] Confirm all `delivery.mode="announce"` jobs have explicit `delivery.to`
- [ ] Confirm all `delivery.mode="webhook"` jobs use valid URL in `delivery.to`
- [ ] Fix any guild-id/invalid channel-id targets before enabling jobs

Owner: HAL

---

## 2) Auth-Failure Dedupe Alerts
- [ ] Monitor codex auth failures from gateway error log
- [ ] Alert once per cooldown window (avoid noisy repeats)
- [ ] Re-alert only when failures materially increase
- [ ] Keep clear remediation text in notification

Owner: HAL

---

## 3) Memory/Context Guardrails
- [ ] Keep Session Checkpoint running every 30 minutes
- [ ] At >60% context: update ACTIVE-TASK/LAST-SESSION/NOW + daily memory log
- [ ] Ensure major-step findings are written to disk (no context-only memory)

Owner: Alfred

---

## 4) Model Routing + Fallback Validation
- [ ] Validate LOCAL/Codex/Haiku/Sonnet path availability
- [ ] Confirm fallback behavior on provider auth failure
- [ ] Ensure fallback does not create duplicate user notifications

Owner: Alfred

---

## 5) Security Posture Quick Audit
- [ ] Review exposed services and high-risk flags
- [ ] Confirm no unsafe config drift
- [ ] Confirm no forbidden file edits (`~/.openclaw/openclaw.json`)

Owner: Alfred

---

## 6) Known-Failure Pattern Review (weekly)
- [ ] Summarize top recurring failures from last 7 days
- [ ] Include: frequency, impact, root cause, fix, prevention status
- [ ] Post summary in `#general-research`

Owner: Alfred

---

## 7) Runbook Conversion
- [ ] Convert each recurring incident into runbook format:
  - Trigger
  - Diagnosis
  - Fix
  - Validation
  - Rollback

Owner: Alfred

---

## 8) Validate + Close the Loop
- [ ] Run checklist once per week and after major infra changes
- [ ] Run `bash ~/.openclaw/workspace/scripts/recommendations-preflight.sh`
- [ ] Log outcomes in `memory/YYYY-MM-DD.md`
- [ ] Track unresolved items in OPEN-LOOPS.md/kanban

Owner: Alfred

---

## 9) Failure Guardrails (required)
- [ ] Every new automation has: preflight check + rollback note + post-change validation
- [ ] Use dedupe for repeated alerts (avoid spam loops)
- [ ] Keep delivery routes explicit (`delivery.to`) and validated before enabling jobs
- [ ] Run Phase 2 routing policy check: `bash ~/.openclaw/workspace/scripts/task-routing-policy.sh --text "<task>" --json`
- [ ] If `must_delegate=true`, do not run inline; route via delegated execution path
- [ ] If a critical check fails, do not auto-enable affected job(s)

Owner: Alfred + HAL

---

## Immediate Action Mapping (from Joe approval)
1. ✅ Checklist created (`OPENCLAW-OPTIMIZATION-CHECKLIST.md`) — Alfred
2. ✅ Channel/Webhook validator in place (`scripts/cron-preflight-validator.sh`) — HAL
3. ✅ Auth failure dedupe alerting implemented (`scripts/check-codex-auth.sh`) — HAL
4. ✅ Weekly known-failure review automation scheduled for `#general-research` — Alfred
