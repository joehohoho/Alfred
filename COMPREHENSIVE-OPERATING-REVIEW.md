# Comprehensive Operating Review Framework

Status: Implemented (2026-03-20)

## Purpose
Unified recurring review across:
- system and infrastructure health
- Alfred/HAL workflow and process quality
- tooling reliability and gaps
- Command Center product/functionality audit

## Implementation
- Script: `scripts/comprehensive-operating-review.sh`
- Output: `reports/operating-review/<timestamp>.md`
- Latest symlink: `reports/operating-review/latest.md`

## Review Outputs
Each run produces:
1. Executive summary
2. What is working well
3. What is not working well and why
4. Keep / Improve / Remove recommendations
5. Next autonomous actions
6. Raw status snapshot

## Scheduling
- Cron job: `Comprehensive Operating Review (Weekly)`
- Job ID: `648bc4bb-4fba-4ba8-931e-828f393e59bc`
- Schedule: Mondays 10:15 (America/Moncton)
- Delivery: Discord (`#autonomous-updates`, channel id `1484566371412213934`)

## Next Enhancements
1. Command Center page usage telemetry (7d/30d usage)
2. Dead/low-value page detector (remove/replace candidates)
3. Synthetic flow checks per key page (load + action smoke tests)
4. Reliability scorecard trendline
