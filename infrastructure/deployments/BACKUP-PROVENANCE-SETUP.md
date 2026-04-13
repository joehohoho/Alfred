# Backup & Provenance Setup (v2026.3.8+)

**Implemented:** 2026-03-09 (Monday, 11:43 AM)  
**Features:** Backup CLI automation + ACP provenance tracking

---

## 📦 Backup CLI

### What's Automated

**Weekly backup** runs every Sunday at 2:00 AM AST.

- **Script:** `~/.openclaw/workspace/scripts/backup-weekly.sh`
- **LaunchAgent:** `com.alfred.backup-weekly`
- **Backup directory:** `~/.openclaw/workspace/.backups/`
- **Rotation:** Keeps 4 most recent backups (~4 weeks of history)
- **Log:** `~/.openclaw/workspace/.backups/backup.log`

### Backup Contents

Each backup archive includes:
- ✅ Gateway config (`~/.openclaw/openclaw.json`)
- ✅ Workspace directory (`~/.openclaw/workspace/`)
- ✅ Session state
- ✅ Credentials (encrypted)

### Manual Backup

Run anytime:
```bash
openclaw backup create --verify --output ~/manual-backup.tar.gz
```

### Verify Backup

```bash
openclaw backup verify ~/path/to/backup.tar.gz
```

### Check Backup Schedule

```bash
launchctl list | grep backup-weekly
# Should show: com.alfred.backup-weekly ✓
```

### View Backup Log

```bash
tail -f ~/.openclaw/workspace/.backups/backup.log
```

---

## 🔍 ACP Provenance

### What It Does

ACP provenance adds **session trace IDs** and **receipt injection** to spawned agents (HAL, Codex, etc.).

**Modes:**
- `off` — No provenance (default)
- `meta` — Include session metadata + trace IDs
- `meta+receipt` — Metadata + visible receipts in output (recommended)

### Enable Provenance

**For manual ACP runs:**
```bash
openclaw acp --provenance meta+receipt [rest of command]
```

**Using the wrapper:**
```bash
bash ~/.openclaw/workspace/scripts/acp-with-provenance.sh --help
```

### What You Get

With provenance enabled, ACP spawns now include:
- Session trace ID (unique per spawn)
- Timestamp
- Agent ID
- Request/response metadata
- Visible receipt in output showing agent completed the task

**Example output:**
```
---RECEIPT---
session_trace: abc123def456
agent: hal
duration_ms: 3421
status: completed
timestamp: 2026-03-09T15:30:45Z
---END RECEIPT---
```

### Integration with HAL Execution Log

HAL execution log (`memory/hal-execution-log.jsonl`) now automatically includes:
- Session trace IDs (cross-reference to receipts)
- Spawn metadata from provenance
- Better audit trail for debugging + performance analysis

### Why This Matters

**Before:** HAL spawns were a black box. If a task failed, hard to know when/why.  
**After:** Full session trace shows exactly what happened, duration, trace IDs for log analysis.

---

## 🎯 Implementation Checklist

- ✅ Updated to v2026.3.8
- ✅ Backup CLI automation installed
  - Script: `backup-weekly.sh`
  - LaunchAgent: `com.alfred.backup-weekly` (Sunday 2 AM)
  - Rotation: 4-week history
- ✅ ACP provenance wrapper created (`acp-with-provenance.sh`)
- ✅ Documentation: This file

---

## 📋 Quick Commands

```bash
# Test backup
bash ~/.openclaw/workspace/scripts/backup-weekly.sh

# Manual backup
openclaw backup create --verify --output ~/backup-$(date +%s).tar.gz

# Check LaunchAgent status
launchctl list | grep backup-weekly

# View backup log
tail -20 ~/.openclaw/workspace/.backups/backup.log

# Use ACP with provenance
bash ~/.openclaw/workspace/scripts/acp-with-provenance.sh --help

# List recent backups
ls -lah ~/.openclaw/workspace/.backups/
```

---

## ⚠️ Notes

1. **Backup runs automatically** — Sunday 2 AM. No action needed.
2. **Provenance is opt-in** — Use `--provenance meta+receipt` flag for manual runs. Default remains `off`.
3. **Storage** — Each backup is ~50-100 MB. 4-week rotation = ~200-400 MB total.
4. **Verification** — Backups include integrity checks; verified on creation.
5. **Recovery** — To restore: `openclaw backup recover ~/path/to/backup.tar.gz` (not yet tested; validate before relying)

---

## Next Steps

1. Test the backup this Sunday at 2 AM (watch log)
2. Monitor backup log size (`~/.openclaw/workspace/.backups/backup.log`)
3. Consider enabling provenance for HAL spawns to improve audit trail
4. Archive old backups if storage becomes a constraint (4-week rotation can be adjusted)
