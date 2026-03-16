# Preflight Guardrails & Config Protection

## Overview

Two complementary systems replace procedural discipline with technical controls:

1. **Task Preflight Validator** — Enforces complete handoffs before execution
2. **Config File Protection** — Prevents accidental edits to critical files

---

## Feature #1: Task Preflight Validator

### Purpose
Block task execution if handoff is incomplete, reducing rework and failures.

### Location
`scripts/task-preflight-validator.sh`

### Usage

#### Validate a handoff before delegating to HAL
```bash
bash scripts/task-preflight-validator.sh --handoff goals/handoffs/task-123.json
```

Output:
```
[2026-03-16 13:19:31] === Handoff Preflight Validation ===
[2026-03-16 13:19:31] Check 1: Schema validation...
[2026-03-16 13:19:31]   ✓ objective present
[2026-03-16 13:19:31]   ✓ deliverables present
[2026-03-16 13:19:31]   ✓ validation_command present
[2026-03-16 13:19:31]   ✓ rollback_plan present
...
✅ PREFLIGHT PASSED — Task approved for execution.
```

#### Use strict mode (enforce rollback plans)
```bash
bash scripts/task-preflight-validator.sh --handoff goals/handoffs/task-123.json --strict
```

### Exit Codes
- **0** = PASS (all checks green, task ready)
- **1** = FAIL (critical check failed, task BLOCKED)
- **2** = WARN (non-critical issues, task allowed but flagged)

### Checks Performed

| Check | Requirement | Failure | Action |
|-------|-------------|---------|--------|
| Schema | All required fields present | Missing field | CRITICAL FAIL |
| Deliverables | Non-empty checklist | Empty list | CRITICAL FAIL |
| Validation Command | Test/verification command defined | Empty | CRITICAL FAIL |
| Rollback Plan | Recovery steps documented | Empty (strict mode) | CRITICAL FAIL |
| Kanban Card | Card exists and is accessible via API | Not found | CRITICAL FAIL |
| Owner | Task owner assigned | Empty | CRITICAL FAIL |
| Safety | No protected files in deliverables | Danger file mentioned | CRITICAL FAIL |

### Handoff Template

Location: `goals/handoff-template.json`

```json
{
  "objective": "Fix login redirect bug without breaking email",
  "owner": "hal",
  "kanban_card_id": "card-abc-123",
  "deliverables": [
    "src/auth.js — updated auth logic",
    "tests/auth.test.js — test coverage",
    "ROLLBACK.md — rollback instructions"
  ],
  "validation_command": "npm test -- auth.test.js",
  "validation_expected_output": "All tests pass",
  "rollback_plan": "1. Revert src/auth.js to HEAD~1\n2. npm install\n3. npm run dev",
  "constraints": [
    "Do not modify database schema",
    "Maintain email system compatibility"
  ],
  "estimated_tokens": 3500,
  "estimated_cost_usd": 0.15,
  "risk_level": "medium"
}
```

### Workflow Integration

Before delegating to HAL:
```bash
#!/bin/bash
# 1. Create handoff file
cat > goals/handoffs/task-123.json << EOF
{
  "objective": "...",
  ...
}
EOF

# 2. Validate before sending to HAL
bash scripts/task-preflight-validator.sh --handoff goals/handoffs/task-123.json
if [ $? -ne 0 ]; then
  echo "❌ Handoff incomplete, blocking delegation"
  exit 1
fi

# 3. Safe to send to HAL
sessions_spawn runtime=subagent task="Complete task-123 per handoff in $(pwd)/goals/handoffs/task-123.json"
```

---

## Feature #2: Config File Protection

### Purpose
Use OS-level immutable flags to prevent accidental edits that crash the gateway.

### Critical Protected Files
- `~/.openclaw/openclaw.json` — Gateway config (crashes on edit)
- `~/.openclaw/cron/jobs.json` — Cron jobs
- `~/Library/LaunchAgents/com.*.plist` — Service configs

### Location
`scripts/config-protect-init.sh`

### Usage

#### Check current protection status
```bash
bash scripts/config-protect-init.sh --status
```

Output:
```
=== Config File Protection Status ===

File: /Users/hopenclaw/.openclaw/openclaw.json
  Permissions: -rw-r--r--
  Status: ✅ PROTECTED (immutable)

File: /Users/hopenclaw/.openclaw/cron/jobs.json
  Permissions: -rw-r--r--
  Status: ✅ PROTECTED (immutable)
```

#### Enable protection (requires sudo)
```bash
sudo bash scripts/config-protect-init.sh --enable
```

#### Verify protection works
```bash
bash scripts/config-protect-init.sh --test
```

Output:
```
=== Testing Config File Protection ===

✅ PROTECTION WORKING: File writes are blocked
```

#### Disable protection (emergency only)
```bash
sudo bash scripts/config-protect-init.sh --disable
```

### How It Works

**macOS immutable flag (uchg):**
```bash
# Set immutable
sudo chflags uchg ~/.openclaw/openclaw.json

# Try to edit (blocked)
echo '{}' > ~/.openclaw/openclaw.json
# bash: /Users/hopenclaw/.openclaw/openclaw.json: Operation not permitted
```

### Alternative Workflow: Config Changes via Memory

If a config change is needed:

1. **Document in memory**
   ```bash
   # memory/2026-03-16.md
   ## Config Change Proposal

   **File:** openclaw.json
   **Change:** Increase gateway timeout to 60s
   **Reason:** Reduce webhook delivery failures
   **Current value:** 30s (line 42)
   ```

2. **Send notification to Joe**
   ```bash
   bash scripts/send-notification.sh \
     "Config Change Proposal" \
     "Gateway timeout change documented in memory/2026-03-16.md — review & approve?"
   ```

3. **Joe applies change safely**
   ```bash
   # Once approved:
   sudo bash scripts/config-protect-init.sh --disable
   # Make edits via claude code or text editor
   sudo bash scripts/config-protect-init.sh --enable
   ```

### Integration with Editor Guards

Optional: Prevent accidental edits at shell level:

```bash
# Source in ~/.zshrc
source ~/.openclaw/workspace/scripts/edit-guard-wrapper.sh

# Warn before editing danger files
edit_with_guard ~/.openclaw/openclaw.json
# ⚠️  CRITICAL: This file is PROTECTED. Editing can crash the gateway.
# Instead, document your change in memory/YYYY-MM-DD.md ...
```

---

## Combined Workflow Example

**Scenario:** HAL needs to fix a bug, including a potential cron config change.

### Step 1: Create handoff with constraints
```json
{
  "objective": "Fix delayed job processing in cron",
  "kanban_card_id": "card-456",
  "deliverables": [
    "src/job-processor.js — fixed batch timing",
    "tests/processor.test.js — test coverage",
    "NO CONFIG CHANGES — changes proposed only in handoff"
  ],
  "validation_command": "npm test -- processor.test.js",
  "rollback_plan": "git revert <commit-hash>",
  "constraints": [
    "Do NOT edit cron/jobs.json directly",
    "Propose cron changes in handoff notes; Joe will apply separately"
  ]
}
```

### Step 2: Preflight validation
```bash
bash scripts/task-preflight-validator.sh --handoff goals/handoffs/card-456.json
# ✅ PREFLIGHT PASSED
```

### Step 3: Safe delegation
```bash
sessions_spawn runtime=subagent task="Complete task per $(pwd)/goals/handoffs/card-456.json"
```

### Step 4: HAL delivers code + config proposal
```
Delivered:
  ✓ src/job-processor.js
  ✓ tests/processor.test.js
  ✓ PROPOSED_CONFIG.md (cron change: increase max_workers from 2 to 4)
```

### Step 5: Alfred routes config proposal to Joe
```bash
# Memory note + notification
echo "Joe approved config change in notification; applying..."
sudo bash scripts/config-protect-init.sh --disable
jq '.max_workers = 4' ~/.openclaw/cron/jobs.json > /tmp/cron.json.tmp
mv /tmp/cron.json.tmp ~/.openclaw/cron/jobs.json
sudo bash scripts/config-protect-init.sh --enable
```

---

## Monitoring & Logs

### Edit attempt log
`~/.openclaw/workspace/logs/config-edit-attempts.log`

Example:
```
[2026-03-16 13:15:22] BLOCKED EDIT ATTEMPT: direct write on ~/.openclaw/openclaw.json (alfred @ /tmp)
```

### Preflight check log
`~/.openclaw/workspace/tracking/preflight-checks.log`

Example:
```
[2026-03-16 13:19:31] === Handoff Preflight Validation ===
[2026-03-16 13:19:31] Check 5: Kanban card validation...
[2026-03-16 13:19:31]   ✓ Kanban card exists: card-123
```

---

## FAQ

**Q: Can I still edit protected files in an emergency?**  
A: Yes. Run: `sudo bash scripts/config-protect-init.sh --disable`, make changes, then re-enable.

**Q: What if preflight fails but the work is urgent?**  
A: Fix the handoff (add missing fields), then re-run validator. Skipping preflight defeats its purpose.

**Q: Can I relax protection on a specific file?**  
A: Modify `config-protect-init.sh` to remove that file from `PROTECT_LIST`, then re-enable.

**Q: Does protection survive reboot?**  
A: Yes. The immutable flag persists across reboots (macOS feature).

---

## Next Steps

1. **Initialize protection now:**
   ```bash
   sudo bash scripts/config-protect-init.sh --enable
   bash scripts/config-protect-init.sh --test
   ```

2. **Test preflight validator:**
   ```bash
   bash scripts/task-preflight-validator.sh --handoff goals/handoff-template.json
   ```

3. **Document in ACTIVE-TASK.md:**
   - "Preflight guardrails deployed"
   - "Config protection enabled — all critical files immutable"
   - "Handoff template in place for all delegations"

4. **Monitor logs:** Check `logs/config-edit-attempts.log` weekly for blocked edits.

---

## Related Files

- **Handoff template:** `goals/handoff-template.json`
- **Edit guard wrapper:** `scripts/edit-guard-wrapper.sh`
- **Review escalation (Feature #1):** `scripts/review-escalation-engine.sh`
- **Kanban API docs:** Search kanban endpoints in dashboard code
