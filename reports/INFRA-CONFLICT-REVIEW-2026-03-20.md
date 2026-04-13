# Infra Conflict & Guardrail Review — 2026-03-20

Scope: implement and validate recommendations from OpenClaw optimization review while avoiding duplicate/conflicting automation.

## Changes Applied
1. Fixed notification preflight path bug in `scripts/send-notification.sh`
   - Added `SCRIPT_DIR` initialization before invoking `policy-preflight.sh`.
   - Prevents `/policy-preflight.sh: No such file or directory` failure mode.

2. Hardened Codex auth alerting in `scripts/check-codex-auth.sh`
   - Dedupe guardrails: 12h cooldown + failure-delta threshold.
   - Prevents noisy repeat alerts and alert storms.

3. Created infra validation gate: `scripts/recommendations-preflight.sh`
   - Checks script presence, cron API reachability, duplicate cron-name detection,
     cron delivery preflight, HAL/Alfred router JSON sanity, and notification policy linkage.

4. Updated checklist: `OPENCLAW-OPTIMIZATION-CHECKLIST.md`
   - Added preflight execution step and explicit failure guardrails.

5. Added weekly guardrail audit cron
   - Job: `Recommendations Preflight Audit (Weekly)`
   - Schedule: Monday 10:15 AM America/Moncton
   - Delivery: Discord `1476598143016505446` (#alfred-logs)

## Conflict / Duplication Review Result
- Duplicate cron names: none detected.
- Existing cron preflight validator remains canonical routing check (no duplicate validator introduced).
- New weekly audit is complementary (meta-check), not a second routing validator.
- Existing known-failure review job in `#general-research` remains unchanged and non-overlapping.

## Safety Guardrails Confirmed
- Explicit cron delivery target validation before enable path.
- Dedupe notification suppression for recurring auth failures.
- Policy preflight required for direct-user notifications.
- Weekly automated preflight audit with summarized outcomes.

## Rollback Plan (if needed)
- Remove weekly job id `e682130d-d362-412a-801d-52f143cc0b8e`.
- Revert changes in:
  - `scripts/send-notification.sh`
  - `scripts/check-codex-auth.sh`
  - `OPENCLAW-OPTIMIZATION-CHECKLIST.md`
  - delete `scripts/recommendations-preflight.sh`

## Verification Evidence
- `bash scripts/recommendations-preflight.sh` => all critical checks passed.
- `bash scripts/check-codex-auth.sh` => dedupe active, no repeated alert spam.
- Cron job creation + manual enqueue succeeded.
