# Cron-to-State Registry

## Overview

The **cron-to-state registry** maps every cron job to its referenced scripts and targets, enabling daily drift audit to catch:

- ❌ Missing scripts (job references deleted files)
- ⚠️ Stale reminders (job names don't match canonical commands)
- 🔧 Deprecated jobs (flagged for cleanup)
- 📝 Text-only instructions (no backing script)

## Files

- **`~/.openclaw/cron-registry.json`** — Canonical registry (23 jobs, generated from `~/.openclaw/cron/jobs.json`)
- **`scripts/cron-drift-auditor.sh`** — Daily audit script (detects missing scripts, stale refs)
- **`scripts/cron-registry-builder.sh`** — Rebuilds registry from current cron jobs
- **`.hal-alfred-tracking/drift-audit.jsonl`** — Audit findings (append-only log)

## Quick Start

### Run a Drift Audit

```bash
bash scripts/cron-drift-auditor.sh --verbose
```

Output shows:
- ✓ Scripts that exist
- ❌ Missing scripts (job will fail on execution)
- ⚠️ Text-only instructions (verify they execute via API/webhook)

### Current Registry Status

Last audit (Apr 12, 2026 @ 17:04 AST):

| Status | Count | Issues |
|--------|-------|--------|
| ✓ OK | 21 jobs | Scripts exist, no drift |
| ⚠️ WARNING | 2 jobs | Text-only instructions (no backing scripts) |
| ❌ ERROR | 1 job | `hal-backup.sh` is missing |

### Fix the Missing Script

The `hal-backup.sh` script is referenced by the "HAL Backup - State Snapshot" job but does not exist.

**Options:**
1. **Restore from backup:** `git log --follow -- scripts/hal-backup.sh`
2. **Create a new one:** `bash scripts/cron-registry-builder.sh --help`
3. **Disable the job:** Update `~/.openclaw/cron/jobs.json` and set the job's `enabled: false`

## Schema

Each job in the registry tracks:

```json
{
  "jobId": "unique-id",
  "jobName": "Human-readable name",
  "enabled": true,
  "references": [
    {
      "type": "script",
      "target": "/path/to/script.sh",
      "verifyCmd": "test -x /path/to/script.sh"
    }
  ],
  "lastAuditMs": 1776099600000,
  "driftStatus": "ok|warning|error",
  "warnings": ["array of drift findings"]
}
```

## Daily Audit

A cron job runs daily:

```
Cron Drift Audit (Daily)
  Schedule: 08:00 AM AST
  Script: bash scripts/cron-drift-auditor.sh
  Output: Discord channel + ~/.hal-alfred-tracking/drift-audit.jsonl
```

This ensures:
- Broken reminders are caught before they fail
- Refactors don't leave dangling script references
- Operator noise stays low

## Maintenance

### Update the Registry

When you add/remove/rename cron jobs:

```bash
bash scripts/cron-registry-builder.sh --verbose
# Review changes
git add ~/.openclaw/cron-registry.json
git commit -m "Update cron registry: [reason]"
```

### Interpret Audit Findings

Audit log location: `~/.openclaw/workspace/.hal-alfred-tracking/drift-audit.jsonl`

Each line is a JSON record:

```json
{"severity":"error","jobId":"hal-backup-state","jobName":"HAL Backup - State Snapshot","issue":"MISSING_SCRIPT","target":"/Users/hopenclaw/.openclaw/workspace/scripts/hal-backup.sh"}
{"severity":"warning","jobId":"webhook-listener-answers","jobName":"Webhook Listener - Check for Answers","issue":"TEXT_ONLY_INSTRUCTION","target":"Checking for answered notifications via webhook listener..."}
```

Parse with:

```bash
jq -r '.jobId + ": " + .issue' ~/.openclaw/workspace/.hal-alfred-tracking/drift-audit.jsonl
```

## Prevention Guardrails

### Before Refactoring Scripts

1. Check if script is referenced by any cron job:
   ```bash
   grep -r "script-name.sh" ~/.openclaw/cron-registry.json
   ```

2. If yes, update all references before deleting

3. Run audit to verify:
   ```bash
   bash scripts/cron-drift-auditor.sh
   ```

### When Adding New Cron Jobs

1. Update the registry:
   ```bash
   bash scripts/cron-registry-builder.sh
   ```

2. Run audit:
   ```bash
   bash scripts/cron-drift-auditor.sh --verbose
   ```

3. Commit:
   ```bash
   git add cron-registry.json && git commit -m "Add new cron job: [name]"
   ```

## Related

- **Sentinel System** — Monitors cron job health (every 5 min)
- **Gateway Cron Jobs** — `~/.openclaw/cron/jobs.json` (source of truth)
- **Audit Log** — `.hal-alfred-tracking/drift-audit.jsonl` (findings)

## Next Steps (Planned)

- [ ] Auto-suggest replacement scripts when missing
- [ ] Auto-disable jobs with persistent failures
- [ ] Dashboard widget for cron registry health
- [ ] Integration with change-control system for script refactors
