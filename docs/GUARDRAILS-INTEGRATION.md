# Guardrails Integration Guide

Complete deployment guide for Features #1 and #3 from the infrastructure review.

---

## What We're Deploying

### Feature #1: Review Escalation Engine
- **File:** `scripts/review-escalation-engine.sh`
- **Function:** Auto-promote stuck review cards; send digest notifications
- **Impact:** 50%+ reduction in review wait time; zero manual status checks
- **Docs:** `docs/REVIEW-ESCALATION.md`

### Feature #3: Preflight Validator + Config Protection
- **Validator:** `scripts/task-preflight-validator.sh`
- **Config Guard:** `scripts/config-protect-init.sh`
- **Function:** Block incomplete handoffs; prevent accidental edits to critical files
- **Impact:** Fewer continuity failures; zero gateway crashes from forbidden edits
- **Docs:** `docs/PREFLIGHT-GUARDRAILS.md`

---

## Deployment Plan

### Phase 1: Setup (30 min)

#### 1.1 Enable config file protection
```bash
# Check current status
bash scripts/config-protect-init.sh --status

# Enable immutable flags on critical files (requires sudo)
sudo bash scripts/config-protect-init.sh --enable

# Verify protection works
bash scripts/config-protect-init.sh --test
# Expected: "✅ PROTECTION WORKING: File writes are blocked"
```

**Verification:**
```bash
# Try to edit — should be blocked
echo '{}' > ~/.openclaw/openclaw.json
# bash: /Users/hopenclaw/.openclaw/openclaw.json: Operation not permitted ✓
```

#### 1.2 Verify scripts are executable
```bash
ls -la scripts/review-escalation-engine.sh
ls -la scripts/task-preflight-validator.sh
ls -la scripts/config-protect-init.sh

# If not executable:
chmod +x scripts/review-escalation-engine.sh
chmod +x scripts/task-preflight-validator.sh
chmod +x scripts/config-protect-init.sh
```

#### 1.3 Create required directories
```bash
mkdir -p tracking logs goals/handoffs

# Verify
ls -d tracking logs goals/handoffs
```

### Phase 2: Test Review Escalation (15 min)

#### 2.1 Test script with sample data
```bash
# Dry-run (no changes to kanban)
bash scripts/review-escalation-engine.sh --dry-run

# Expected output: "[DRY] Would promote..." if cards are stale
# Expected failure: "Kanban API unreachable" if dashboard isn't running
```

#### 2.2 (Optional) Start dashboard for live test
```bash
# If dashboard isn't running:
launchctl start com.alfred.dashboard-nextjs

# Wait 5 seconds for startup
sleep 5

# Try live run (will show actual cards in review)
bash scripts/review-escalation-engine.sh
```

### Phase 3: Test Preflight Validator (10 min)

#### 3.1 Test with template
```bash
# Use provided template
bash scripts/task-preflight-validator.sh --handoff goals/handoff-template.json

# Expected: FAIL (card ID doesn't exist)
# This is correct — template is for reference only
```

#### 3.2 Create a valid test handoff
```bash
# First, get a real kanban card ID from the board
CARD_ID=$(curl -s http://localhost:3001/api/kanban | jq -r '.columns.todo[0].id // "test-card"')

# Create test handoff
cat > goals/handoffs/test-handoff.json << EOF
{
  "objective": "Test preflight validator",
  "owner": "alfred",
  "kanban_card_id": "$CARD_ID",
  "deliverables": [
    "test-file.txt — sample deliverable"
  ],
  "validation_command": "echo 'Test passed'",
  "validation_expected_output": "Test passed",
  "rollback_plan": "git revert HEAD",
  "constraints": ["Test only"]
}
EOF

# Validate
bash scripts/task-preflight-validator.sh --handoff goals/handoffs/test-handoff.json

# Expected: "✅ PREFLIGHT PASSED"
```

### Phase 4: Integration with Cron (20 min)

#### 4.1 Add review escalation to cron

Option A: Manual cron entry
```bash
# Edit crontab
crontab -e

# Add this line (runs every 30 minutes):
*/30 * * * * bash /Users/hopenclaw/.openclaw/workspace/scripts/review-escalation-engine.sh >> /Users/hopenclaw/.openclaw/workspace/logs/review-escalation.log 2>&1

# Save and exit
```

Option B: Use OpenClaw cron API (if available)
```bash
curl -X POST http://localhost:7777/api/cron/add \
  -H "Content-Type: application/json" \
  -d '{
    "name": "review-escalation-engine",
    "schedule": { "kind": "every", "everyMs": 1800000 },
    "payload": { "kind": "systemEvent", "text": "bash /Users/hopenclaw/.openclaw/workspace/scripts/review-escalation-engine.sh" },
    "delivery": { "mode": "none" },
    "sessionTarget": "main",
    "enabled": true
  }'
```

#### 4.2 Verify cron is running
```bash
# Check crontab
crontab -l | grep review-escalation

# Monitor log file
tail -f logs/review-escalation.log
# Should see entries every 30 minutes
```

### Phase 5: Document & Communicate (10 min)

#### 5.1 Update ACTIVE-TASK.md
```markdown
## Task: Deploy Guardrails (Features #1 & #3)

Status: ✅ COMPLETE

### Deliverables
- [x] Config protection enabled on critical files (~/.openclaw/openclaw.json, etc.)
- [x] Review escalation engine deployed + scheduled (every 30 min)
- [x] Preflight validator ready (blocks incomplete handoffs)
- [x] Documentation published (PREFLIGHT-GUARDRAILS.md, REVIEW-ESCALATION.md)

### Metrics
- Protection status: All critical files immutable
- Review escalation: Active (0 cards auto-promoted so far)
- Preflight checks: Ready (0 tasks validated so far)

### Next: Monitor for 1 week, then measure impact
```

#### 5.2 Create summary for Joe
Document in memory:
```bash
cat >> memory/2026-03-16.md << 'EOF'
## Infrastructure Improvements Deployed

### Feature #1: Review Escalation Engine
- Auto-promotes review cards >7 days to "blocked" lane
- Sends digest notifications (no spam)
- Runs every 30 min automatically
- Expected impact: 50%+ reduction in review wait time

### Feature #3: Preflight Validator + Config Protection
- Blocks tasks without complete handoff (objective, deliverables, validation command, rollback plan)
- Prevents accidental edits to ~/.openclaw/openclaw.json (immutable flag)
- Routes config changes through memory/notifications instead
- Expected impact: Zero gateway crashes from forbidden edits; fewer continuity failures

### Status
- All scripts deployed and tested
- Cron job running (review-escalation every 30 min)
- Config protection enabled (critical files immutable)
- Ready for monitoring

### Logs to watch
- logs/review-escalation.log (see auto-promotion events)
- logs/config-edit-attempts.log (monitor for blocked edits)
- tracking/review-escalation-latest.json (metrics)
EOF
```

---

## Usage After Deployment

### Daily workflow: Create and validate handoff

```bash
#!/bin/bash
# Example: Delegate a task to HAL

# 1. Create kanban card (or use existing)
CARD_ID="card-abc-123"

# 2. Create handoff file
cat > goals/handoffs/$CARD_ID.json << 'HANDOFF'
{
  "objective": "Add dark mode toggle to settings page",
  "owner": "hal",
  "kanban_card_id": "card-abc-123",
  "deliverables": [
    "src/components/Settings.jsx — updated with toggle",
    "src/styles/dark-mode.css — new theme styles",
    "tests/Settings.test.jsx — test dark mode switch",
    "ROLLBACK.md — rollback steps"
  ],
  "validation_command": "npm test -- Settings.test.jsx && npm run build",
  "validation_expected_output": "Build successful, all tests pass",
  "rollback_plan": "git revert <commit-hash> && npm install && npm run dev",
  "constraints": ["Maintain light mode as default", "Test on Safari + Chrome"]
}
HANDOFF

# 3. Validate with preflight
bash scripts/task-preflight-validator.sh --handoff goals/handoffs/$CARD_ID.json
# Expected: ✅ PREFLIGHT PASSED

# 4. Delegate to HAL (handoff is complete)
sessions_spawn runtime=subagent task="Add dark mode toggle per handoff: $(pwd)/goals/handoffs/$CARD_ID.json"

# 5. HAL delivers, you verify, card moves to review automatically
# 6. Review escalation engine checks every 30 min
#    - If >7 days, auto-promotes to blocked + escalation comment
#    - Otherwise, digest notification sent to Joe
```

### Weekly review: Check escalation metrics

```bash
# See how many cards were escalated
cat tracking/review-escalation-latest.json | jq '{promoted: .promoted, critical: (.critical | length), warned: (.warning | length)}'

# Example output:
# {
#   "promoted": 2,
#   "critical": 1,
#   "warned": 3
# }
```

### Emergency: Disable config protection

```bash
# Only if critical changes needed immediately:
sudo bash scripts/config-protect-init.sh --disable

# Make edits
nano ~/.openclaw/openclaw.json

# Re-enable protection
sudo bash scripts/config-protect-init.sh --enable
```

---

## Monitoring Checklist

### Daily (automatic)
- [ ] Review escalation runs every 30 min (check logs/review-escalation.log)
- [ ] Config protection active (no blocked edit attempts should occur)
- [ ] Cron log updated (last entry within 30 min)

### Weekly
- [ ] Review escalation metrics: any auto-promotions? (check tracking/review-escalation-latest.json)
- [ ] Config protection: any attempted edits blocked? (check logs/config-edit-attempts.log)
- [ ] Preflight usage: how many handoffs validated? (grep preflight logs)

### Monthly
- [ ] Measure impact: review wait time down 50%? (compare weeks before/after)
- [ ] Gateway stability: any crashes? (check openclaw logs)
- [ ] Team feedback: notification noise acceptable? (adjust thresholds if needed)

---

## Troubleshooting

### Review escalation script fails
```
Error: Kanban API unreachable
```
**Fix:**
```bash
launchctl start com.alfred.dashboard-nextjs
sleep 5
bash scripts/review-escalation-engine.sh
```

### Preflight validator always fails
```
CRITICAL: Kanban card not found
```
**Fix:**
- Verify kanban card exists: `curl -s http://localhost:3001/api/kanban | jq '.columns.todo[0]'`
- Use correct card ID in handoff JSON
- Ensure kanban API is running

### Can't edit protected files
```
Operation not permitted
```
**This is expected.** To edit:
1. Document change in memory file
2. Send notification to Joe
3. Joe runs: `sudo bash scripts/config-protect-init.sh --disable`
4. Joe makes edit + re-enables protection

### Config protection won't enable
```
Failed to set uchg on ~/.openclaw/openclaw.json (need sudo)
```
**Fix:**
```bash
sudo bash scripts/config-protect-init.sh --enable
# Enter password when prompted
```

---

## Success Criteria

After 1 week of deployment:

✅ **Review Escalation**
- [ ] No manual "check kanban" cycles (notifications sent automatically)
- [ ] At least 1 card auto-promoted (or zero stale cards ✓)
- [ ] Digest notifications received (not per-card spam)

✅ **Preflight Validator**
- [ ] At least 2 tasks validated with preflight
- [ ] Zero tasks failed preflight that shouldn't have
- [ ] Handoff template being used consistently

✅ **Config Protection**
- [ ] Config files immutable (try to edit, blocked)
- [ ] Edit attempts logged (zero actual edits)
- [ ] At least 1 config change routed through memory/notification

✅ **Overall**
- [ ] No gateway crashes from config edits
- [ ] Reduced review card backlog
- [ ] Team reports improved clarity on task expectations

---

## Files Reference

| File | Purpose |
|------|---------|
| `scripts/review-escalation-engine.sh` | Auto-escalate stale review cards |
| `scripts/task-preflight-validator.sh` | Validate handoff completeness |
| `scripts/config-protect-init.sh` | Manage config file protection |
| `scripts/edit-guard-wrapper.sh` | Shell wrapper to warn before editing (optional) |
| `goals/handoff-template.json` | Template for new handoffs |
| `docs/REVIEW-ESCALATION.md` | Feature #1 detailed docs |
| `docs/PREFLIGHT-GUARDRAILS.md` | Feature #3 detailed docs |
| `logs/review-escalation.log` | Main escalation log |
| `logs/config-edit-attempts.log` | Blocked edit attempts |
| `tracking/review-escalation-latest.json` | Latest escalation metrics |

---

## Related

- **Feature #2 (Dashboard):** Not deployed yet (complex scope)
- **Original review:** `docs/INFRASTRUCTURE-REVIEW.md` (if exists)
- **Model policy:** `MODEL-POLICY.md`
