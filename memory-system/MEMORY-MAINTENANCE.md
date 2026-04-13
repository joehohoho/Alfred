# MEMORY.md Maintenance Quick Reference

**Purpose:** Quick guide for keeping MEMORY.md healthy  
**Owner:** Alfred  
**Frequency:** Monthly audit (1st of month, 10:00 AST)

---

## Health Check (2-minute inspection)

```bash
# Check current size
wc -c ~/.openclaw/workspace/MEMORY.md

# View recent audit log
tail -20 ~/.openclaw/workspace/memory/size-audit.log

# Verify monitoring is running (should have entries from last 30 min)
tail -1 ~/.openclaw/workspace/memory/size-audit.log
```

**Expected output:**
- Size: < 19,500 bytes (97.5% of limit)
- Latest log entry: < 30 minutes old with status "OK"

**If different:** Run emergency archival immediately
```bash
bash ~/.openclaw/workspace/scripts/memory-smart-archive.sh dry-run
# Review output, then:
bash ~/.openclaw/workspace/scripts/memory-smart-archive.sh apply
```

---

## Monthly Audit (End of Month)

**Checklist:**
- [ ] Is MEMORY.md still curated (only decisions + lessons)?
- [ ] Any sections that should be moved to daily logs?
- [ ] Any old entries that could be archived?
- [ ] Monitor script ran successfully (20+ times, all OK)?
- [ ] Gateway logs clean (no truncation warnings)?

**Command to audit:**
```bash
grep "WARN\|CRITICAL" ~/.openclaw/workspace/memory/size-audit.log
# Should return: (nothing)
```

**If you find old entries:**
1. Move to `memory/YYYY-MM-DD.md` (daily log) if transient
2. Move to `memory/MEMORY-ARCHIVE.md` if evergreen but old (>30 days)
3. Delete if no longer relevant

**Example (old tool research):**
- ❌ Don't keep in MEMORY.md: "To Investigate: memfw-memory firewall (Feb 20)"
- ✅ Do: Move to `memory/tool-evaluations/memfw-review.md`

---

## Curation Rules (Copy-Paste Reminder)

**KEEP in MEMORY.md:**
- Security rules (CRITICAL)
- Joe's context & decision boundaries
- Active system issues (< 30 days old)
- Lessons learned (proven patterns)
- Continuity philosophy

**MOVE to daily logs (memory/YYYY-MM-DD.md):**
- Temporary task notes
- Session checkpoints
- Cron job status
- Debugging traces

**MOVE to archive (memory/MEMORY-ARCHIVE.md):**
- Resolved issues (marked ✅)
- Tool research (>30 days old)
- Historical context (no active use)

**DELETE:**
- Duplicate entries
- Contradicted decisions (log new decision, delete old)
- Broken links / stale references

---

## Troubleshooting

### Monitor script fails silently
```bash
bash ~/.openclaw/workspace/scripts/memory-size-monitor.sh
# Should output nothing (success) or [WARN]/[CRITICAL] message
```

### Archival script has errors
```bash
bash ~/.openclaw/workspace/scripts/memory-smart-archive.sh
# Should output dry-run report with "OK" or "WARN"
```

### MEMORY.md still too large after archival
1. Check what was actually archived:
   ```bash
   tail -50 ~/.openclaw/workspace/memory/MEMORY-ARCHIVE.md
   ```
2. Consider moving more content to daily logs
3. Consider splitting tool research into separate files

### Gateway still showing truncation warnings
```bash
tail -20 ~/.openclaw/logs/gateway.err.log | grep "MEMORY.md"
# Should return: (nothing)
```

If warnings appear, MEMORY.md size might have crept back up:
```bash
wc -c ~/.openclaw/workspace/MEMORY.md
```

---

## Emergency Procedure

**If MEMORY.md hits hard limit (19.5KB+):**

1. Stop the gateway (prevent further truncation):
   ```bash
   launchctl stop ai.openclaw.gateway
   ```

2. Run emergency archival:
   ```bash
   bash ~/.openclaw/workspace/scripts/memory-smart-archive.sh apply
   ```

3. Verify size:
   ```bash
   wc -c ~/.openclaw/workspace/MEMORY.md
   ```

4. Restart gateway:
   ```bash
   launchctl start ai.openclaw.gateway
   sleep 3 && launchctl list | grep openclaw.gateway
   ```

5. Verify clean bootstrap:
   ```bash
   tail -20 ~/.openclaw/logs/gateway.err.log
   # Should NOT contain "MEMORY.md is X chars (limit 20000)"
   ```

---

## Monitoring Dashboard

**What to check daily (automated via cron):**
```
memory/size-audit.log
├─ Latest timestamp: should be < 30 min old
├─ Status: should be "OK"
└─ Size: should be 14-19% of limit (2.8KB - 3.8KB)
```

**What to check monthly (manual):**
- MEMORY.md content curation
- Archive file is being populated
- No truncation warnings in gateway logs

**What to check quarterly:**
- Consider deleting old sections from archive
- Review if curation rules still apply
- Check if tool/pattern research files could be consolidated

---

## Reference

- Full plan: `MEMORY-OVERFLOW-PREVENTION.md`
- Recovery summary: `GATEWAY-RECOVERY-SUMMARY.md`
- Current state: `MEMORY.md`
- Archive: `memory/MEMORY-ARCHIVE.md`
- Audit log: `memory/size-audit.log`

---

**Last updated:** 2026-03-15  
**Next review:** 2026-04-01 (monthly audit)
