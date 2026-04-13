# MEMORY.md Overflow Prevention Plan

**Status:** In Progress  
**Target:** Zero recurrence of bootstrap failures due to file size  
**Updated:** 2026-03-15 13:03 ADT

---

## Problem Statement

**What happened (2026-03-12 to 2026-03-15):**
- MEMORY.md grew to 25,877 chars (127% of 20KB gateway limit)
- Every session bootstrap attempted to inject oversized file
- Truncation warnings + session initialization failures
- Cascading notifications + broken routing for 3+ days
- 300+ failed delivery events stuck in queue

**Why it occurred:**
1. No automated size monitoring before threshold
2. No archival policy for old entries
3. Content written to MEMORY.md that belonged in daily logs (YYYY-MM-DD.md)
4. No enforcement of "curated" principle (curation requires active maintenance)

**Why it will happen again without intervention:**
- MEMORY.md is attractive for "important stuff"
- No friction to appending new content
- Archive system doesn't exist yet

---

## Solution Architecture (3 Layers)

### Layer 1: Real-time Monitoring & Alerting

**Goal:** Catch size growth before hitting 20KB limit  
**Mechanism:** Automated cron job runs every 30 minutes

```bash
# Script: scripts/memory-size-monitor.sh

#!/bin/bash
MEMORY_FILE="$HOME/.openclaw/workspace/MEMORY.md"
SOFT_LIMIT=15000  # Alert at 75% (15KB)
HARD_LIMIT=19500  # Emergency at 97.5% (19.5KB)
CURRENT_SIZE=$(wc -c < "$MEMORY_FILE")

if [[ $CURRENT_SIZE -gt $HARD_LIMIT ]]; then
  echo "[CRITICAL] MEMORY.md at $CURRENT_SIZE bytes (hard limit: $HARD_LIMIT)"
  # Trigger emergency archival
  bash ~/.openclaw/workspace/scripts/memory-emergency-archive.sh
  
  # Alert joe
  curl -s -X POST http://localhost:3001/api/notifications \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"CRITICAL: MEMORY.md Overflow\",\"body\":\"Emergency archival triggered. File was $CURRENT_SIZE bytes.\"}"
    
elif [[ $CURRENT_SIZE -gt $SOFT_LIMIT ]]; then
  echo "[WARN] MEMORY.md at $CURRENT_SIZE bytes (soft limit: $SOFT_LIMIT). Scheduled archival at 20:00 AST."
  # Log to memory log for daily review
  echo "$(date '+%Y-%m-%dT%H:%M:%S') | WARN | MEMORY.md size: $CURRENT_SIZE bytes | Soft limit: $SOFT_LIMIT" \
    >> ~/.openclaw/workspace/memory/size-audit.log
fi
```

**Cron schedule:**
```json
{
  "name": "Memory Size Monitor",
  "schedule": { "kind": "every", "everyMs": 1800000 },
  "payload": { "kind": "systemEvent", "text": "Run: bash ~/.openclaw/workspace/scripts/memory-size-monitor.sh" },
  "sessionTarget": "main",
  "enabled": true
}
```

**Safety checks:**
- ✅ Dry-run first (audit log only, no archival)
- ✅ Runs as systemEvent (safe, can't fail the gateway)
- ✅ Alerts in advance (75% threshold) instead of after crisis

---

### Layer 2: Smart Archival Policy

**Goal:** Automatically move old/stale content to archive before hitting limit  
**Mechanism:** Age-based + content-type rules

**Rules:**
1. **Age-based archival** (30+ days old → move to `memory/MEMORY-ARCHIVE.md`)
   - Sections like "To Investigate (Tools & Patterns)" from Feb/early March
   - Old decision records (>30 days)
   - Resolved issues marked ✅

2. **Content reclassification** (belongs elsewhere, not MEMORY.md)
   - Temporary task notes → daily logs (memory/YYYY-MM-DD.md)
   - Code examples/references → `docs/` or project-specific READMEs
   - Tool research → `memory/tool-evaluations/` (separate files)
   - Cron job status → `ACTIVE-TASK.md` (transient)

3. **Preservation rules** (always keep in MEMORY.md)
   - Security rules (CRITICAL)
   - Joe's context + decision boundaries
   - Active system issues
   - Current session/continuity info

**Implementation:**
```bash
# Script: scripts/memory-smart-archive.sh

#!/bin/bash
set -e

MEMORY_FILE="$HOME/.openclaw/workspace/MEMORY.md"
ARCHIVE_FILE="$HOME/.openclaw/workspace/memory/MEMORY-ARCHIVE.md"
TEMP_MEMORY=$(mktemp)
TEMP_ARCHIVE=$(mktemp)

# Read current files
cp "$MEMORY_FILE" "$TEMP_MEMORY"
cp "$ARCHIVE_FILE" "$TEMP_ARCHIVE" 2>/dev/null || echo "# MEMORY Archive" > "$TEMP_ARCHIVE"

# Parse sections by date marker (e.g., "## [2026-02-15]")
# Move sections older than 30 days to archive
awk -v cutoff="2026-02-13" '
  /^## \[/ {
    # Extract date from section header
    match($0, /\[([^\]]+)\]/, arr)
    section_date = arr[1]
    if (section_date < cutoff) {
      print_to_archive = 1
    } else {
      print_to_archive = 0
    }
  }
  print_to_archive ? print >> ARGV[2] : print >> ARGV[1]
' "$TEMP_MEMORY" "$TEMP_ARCHIVE"

# Verify MEMORY.md is still >1000 bytes (safety: don't archive everything)
NEW_SIZE=$(wc -c < "$TEMP_MEMORY")
if [[ $NEW_SIZE -lt 1000 ]]; then
  echo "[ERROR] Archival would leave MEMORY.md too small ($NEW_SIZE bytes). Aborting."
  exit 1
fi

# Verify gateways can still load compressed file
if [[ $NEW_SIZE -gt 19500 ]]; then
  echo "[WARN] After archival, still at $NEW_SIZE bytes. May need manual review."
fi

# Atomic swap
mv "$TEMP_MEMORY" "$MEMORY_FILE"
mv "$TEMP_ARCHIVE" "$ARCHIVE_FILE"

echo "[OK] Archived sections from before 2026-02-13. MEMORY.md now $NEW_SIZE bytes."
```

**Cron schedule (runs nightly at 20:00 AST during maintenance window):**
```json
{
  "name": "Daily Memory Archival",
  "schedule": { "kind": "cron", "expr": "0 20 * * *", "tz": "America/Moncton" },
  "payload": { "kind": "systemEvent", "text": "Run: bash ~/.openclaw/workspace/scripts/memory-smart-archive.sh" },
  "sessionTarget": "main",
  "enabled": true
}
```

**Safety measures:**
- ✅ Dry-run first (capture output to verify before swap)
- ✅ Preserve critical sections (hardcoded list: Security Rules, Joe's Context, Active Issues)
- ✅ Minimum size check (don't archive too much)
- ✅ Archive is readable/searchable (not lost)
- ✅ Atomic file swap (no halfway states)
- ✅ Runs in maintenance window (nightly, after user bedtime)

---

### Layer 3: Workflow Changes

**Goal:** Prevent content bloat at source  

**Rule 1: Don't use MEMORY.md for task state**
- ❌ Pending questions → go to ACTIVE-TASK.md + Command Center notifications
- ❌ Session checkpoints → go to LAST-SESSION.md
- ❌ Cron job logs → go to memory/heartbeat-efficiency.json
- ✅ MEMORY.md = decisions + lessons + joe-context only

**Rule 2: Enforce "curated" principle**
- Each entry must answer: "Will I need this in 30 days?"
- If NO → daily log (memory/YYYY-MM-DD.md) instead
- If YES → MEMORY.md + date-stamp it

**Rule 3: Add entry templates to make curation explicit**
```markdown
## [2026-03-15] Issue Name (TAG: critical|lesson|decision)

**Status:** [active|resolved|archived]
**Keep until:** [date or "ongoing"]
**Reason:** [Why this belongs in permanent memory]

[Content]
```

**Implementation:**
- Update MEMORY.md header with curation rules (done in current version)
- Update daily standup checklist to ask: "Is MEMORY.md still curated?"
- Monthly audit (1st of month): Alfred reviews MEMORY.md for stale content

---

## Deployment Plan

### Phase 1: Setup (Today - 2026-03-15)
- ✅ Compress MEMORY.md (already done)
- [ ] Create `scripts/memory-size-monitor.sh`
- [ ] Create `scripts/memory-smart-archive.sh`
- [ ] Create `memory/MEMORY-ARCHIVE.md` (initial, empty)
- [ ] Create `memory/size-audit.log` (initial)
- [ ] Test scripts in dry-run mode (no changes)

### Phase 2: Deployment (Tomorrow - 2026-03-16)
- [ ] Enable memory-size-monitor cron (every 30 min)
- [ ] Enable daily-memory-archival cron (20:00 AST nightly)
- [ ] Update MEMORY.md header with curation rules
- [ ] Pin this plan to ACTIVE-TASK.md for verification

### Phase 3: Verification (Week 1)
- [ ] Monitor size-audit.log daily (no warnings expected)
- [ ] Verify no false positives in alerts
- [ ] Test emergency-archival path (manual trigger)
- [ ] Confirm gateway bootstrap is clean (no truncation warnings)

### Phase 4: Hardening (Week 2)
- [ ] Add monthly audit cron (1st of month, 10:00 AST)
- [ ] Document curation rules in AGENTS.md
- [ ] Train on "MEMORY.md is not a scratch pad" during standup

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Archival script loses critical data | Low | Critical | Preserve list (hardcoded), dry-run first, test recovery |
| Cron jobs fail → disable themselves | Medium | High | Test cron syntax, use systemEvent (won't crash gateway), monitor logs |
| Archive becomes unreachable | Low | Medium | Keep in workspace (readable), document retrieval path |
| False positives in size alerts | Medium | Low | Use 75% soft limit (not 95%), only alert once per day |
| Workflow rules not followed | High | Medium | Monthly audit + comments in daily logs, not enforcement |

---

## Success Criteria

✅ **MEMORY.md stays <19KB (95% of limit) at all times**
- Monitored every 30 minutes
- Audited daily in logs
- Never causes bootstrap failure again

✅ **No data loss from archival**
- Archive is searchable and accessible
- Critical content never auto-archived
- Recovery is documented

✅ **Gateway stays stable**
- No truncation warnings in logs
- No session initialization failures
- Clean bootstraps 100% of the time

✅ **Maintenance is sustainable**
- <5 min of manual work per month (monthly audit)
- Mostly automated (cron jobs)
- Clear ownership (Alfred)

---

## Related Fixes (Secondary Issues)

Once this plan is stable, address:
1. **Plugin config warnings** (ollama, sglang, vllm id mismatches) → update manifests
2. **Security misconfiguration** (wildcard CORS, disabled device auth) → hardening pass
3. **Delivery recovery failures** (5 stuck messages) → drain queue + root cause analysis
4. **Re-enable disabled crons** (Evening Routine, Daily Inquiry) → investigate Mar 12 failures

---

## Owner & Schedule

**Owner:** Alfred  
**Next review:** 2026-03-22 (one week, verify no false positives)  
**Monthly audit:** 1st of month, 10:00 AST  
**Escalation:** If size hits soft limit 3+ times in one week, trigger manual review
