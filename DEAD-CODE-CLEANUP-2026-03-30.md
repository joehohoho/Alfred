# Dead Code & Cleanup Sweep — 2026-03-30

**Executed:** 2026-03-30 01:20 ADT (offline task, automated)  
**Scanner:** Alfred Proactive Audit  
**Status:** ✅ Analysis Complete | Recommendations Ready

---

## Executive Summary

Workspace has grown to **182 markdown files** and **160 scripts**. While git hygiene is excellent (no files >6 months old), there are opportunities for consolidation:

1. **Empty/stale directories:** 8 empty directories consuming inodes
2. **Duplicate documentation:** 4 documentation clusters with overlapping topics
3. **Large output files:** 6 large analysis markdown files (8-24KB) that could be archived
4. **Singleton scripts:** ~20 scripts not referenced in active cron/LaunchAgent config
5. **Temporary files:** 1 stale `.tmp` file

**Total cleanup potential:** ~150KB freed + improved discoverability

---

## Detailed Findings

### 1. Empty Directories (8 items)

These consume inodes and create confusion:

```
./outbox/archive
./outbox/logs
./.hal-notify-ack
./.alfred-queue
./archive
./.guard-state
./state/archives
./webhooks
./.pi
```

**Action:** Safe to delete (no active content)

---

### 2. Stale Temporary Files (1 item)

```
./.hal-alfred-tracking/launchagent-health.json.tmp
```

**Status:** Left from a failed operation  
**Action:** Delete

---

### 3. Large Monolithic Analysis Files (Consolidation Candidates)

These are well-researched but large; candidates for summarization + archival:

| File | Size | Topic | Recommendation |
|------|------|-------|---|
| `PASSIVE-INCOME-SCAN-2026-03-26.md` | 20KB | Income opportunities | Keep (active reference), but move to `reference/` |
| `JOE-PROFILE.md` | 53KB | Joe behavioral model | **CRITICAL** — Keep, but consider splitting into subsections + index |
| `trial-allegations-analysis.md` | 35KB | Legal analysis | Archive to `memory/archive/` |
| `YOUTUBE-VIDEO-IMPLEMENTATION-COMPLETE.md` | 12KB | Project retrospective | Archive to `memory/archive/` |
| `MISSION-CONTROL-IMPLEMENTATION-PLAN.md` | 24KB | System design (completed) | Archive to `memory/archive/` |
| `SYSTEM-AUDIT-2026-03-10.md` | 24KB | Historical audit | Archive to `memory/archive/` |

**Expected freed space:** ~140KB

---

### 4. Duplicate/Overlapping Documentation Clusters

Four topic clusters have multiple related files with overlapping content:

#### Cluster A: Code Review & Quality
- `COINUSUP-CODE-REVIEW-2026-03-26.md`
- `COINUSUP-CODE-REVIEW-FOLLOWUP-2026-03-27.md`
- `COINUSUP-TEST-COVERAGE-AUDIT-2026-03-27.md`
- `GIT-HYGIENE-REPORT-2026-03-26.md`
- `GIT-HYGIENE-AUDIT-2026-03-27.md`

**Recommendation:** Create single `CODE-QUALITY-SUMMARY.md` with cross-references to project-specific audits

#### Cluster B: Infrastructure & Improvements
- `INFRASTRUCTURE-IMPROVEMENTS-2026-03-27.md`
- `INFRASTRUCTURE-IMPROVEMENTS-CHECKLIST.md`
- `INFRASTRUCTURE-IMPROVEMENTS-DEPLOYMENT.md`
- `HAL-INFRASTRUCTURE-IMPROVEMENTS.md`
- `HAL-INFRA-IMPROVEMENTS.md`
- `PROACTIVE-ANALYSIS-ALFRED-INFRASTRUCTURE-2026-03-27.md`

**Recommendation:** Single `INFRASTRUCTURE-LOG.md` with phase-based organization

#### Cluster C: HAL Integration & Directives
- `HAL-DIRECTIVES.md`
- `HAL-DEPLOYMENT-READY.md`
- `HAL-INFRA-CRON-CONFIG.md`
- `HAL-SUBSCRIPTION-IMPLEMENTATION.md`
- `HAL-QUOTA-SAFEGUARDS.md`
- `HAL-UTILIZATION-PLAN.md`

**Recommendation:** Consolidate to `HAL-OPERATIONS.md` with section-based organization

#### Cluster D: Analysis Reports (Passive Income / Workflows)
- `PASSIVE-INCOME-PORTFOLIO-2026-03-26.md`
- `PASSIVE-INCOME-PORTFOLIO-SNAPSHOT.md`
- `PASSIVE-INCOME-SCAN-2026-03-26.md`
- `PROACTIVE-ANALYSIS-WORKFLOW-EFFICIENCY-2026-03-27.md`
- `WORKFLOW-EFFICIENCY-2026-03-26.md`

**Recommendation:** Create `ANALYSIS-LOG/` directory with dated entries, keep only latest summary in root

---

### 5. Singleton Scripts (Not in Active Cron/LaunchAgent Config)

Analysis shows these scripts exist but aren't referenced in `openclaw.json` or active cron jobs:

- `acp-with-provenance.sh` — ACP harness integration (may be manual-use)
- `agent-discord-post.sh` — Discord message formatting helper
- `agents-size-guard.sh` — File size monitoring (referenced in HEARTBEAT.md)
- `alfred-hal-discussion.sh` — Referenced in idle loop, active
- `alfred-proactive-check.sh` — Referenced in idle loop, active
- `alfred-process-queue.sh` — Job queue processor (check if still used)
- `backup-system.sh` — Backup orchestration (check LaunchAgent name mismatch)
- `cc-dead-page-detector.sh` — Old Command Center analysis
- `check-decision-guard.sh` — Decision tracking (referenced in SOUL.md)
- `check-ollama-health.sh` — Ollama health check (DISABLED per TOOLS.md)
- `claude-code-router.sh` — Shell helper (loaded in profiles, not LaunchAgent)
- `codex-rate-limit-responder.sh` — Rate limit handling (may be cron-scheduled)

**Status:** Need fine-grained audit to determine which are truly dead vs. helper/utility scripts

**Recommendation:** Audit these 12 scripts individually; move unused ones to `scripts/archive/`

---

### 6. Large Project Directories (Not Dead Code, but Heavy)

```
CoinUsUp/          582M  (npm modules included)
signal-app-mvp/    553M  (npm modules included)
Expense_Sharing/   252M  (npm modules included)
projects/          128M  (mixed)
```

**Note:** These are active codebases. Consider:
- `npm ci --omit=dev` in CI contexts to reduce bundled size
- `.gitignore` should already exclude node_modules, but verify
- Large repos should have dedicated review separate from dead-code cleanup

---

### 7. Memory & Tracking Files

**Status:** ✅ Well-managed
- Daily logs rotate properly
- Archive structure in place
- MEMORY.md recently compressed (2026-03-15)

**Observation:** Memory files total 1.7MB, well below limits. No action needed.

---

## Cleanup Action Plan

### Phase 1: Low-Risk Deletions (Immediate)

```bash
# Empty directories (safe to delete)
rmdir ./outbox/archive ./outbox/logs ./.hal-notify-ack ./.alfred-queue ./archive ./.guard-state ./state/archives ./webhooks ./.pi

# Temporary file
rm -f ./.hal-alfred-tracking/launchagent-health.json.tmp

# Script: check-ollama-health.sh (DISABLED per TOOLS.md)
mv scripts/check-ollama-health.sh scripts/archive/
```

**Risk:** None | **Recoverability:** Git history | **Expected time:** 2 min

### Phase 2: Archival & Consolidation (Requires Review)

**Before archiving these large files, verify they're truly historical:**

```bash
# Create archive structure
mkdir -p memory/archive/analysis
mkdir -p memory/archive/projects
mkdir -p reference/

# Move historical analysis files
mv trial-allegations-analysis.md memory/archive/analysis/
mv YOUTUBE-VIDEO-IMPLEMENTATION-COMPLETE.md memory/archive/projects/
mv MISSION-CONTROL-IMPLEMENTATION-PLAN.md memory/archive/projects/
mv SYSTEM-AUDIT-2026-03-10.md memory/archive/

# Move reference docs
mv PASSIVE-INCOME-SCAN-2026-03-26.md reference/
mv PRD.md reference/

# Create consolidation placeholders
# See Phase 3 below
```

**Risk:** Low (read-only archival) | **Recoverability:** High | **Expected time:** 30 min

### Phase 3: Consolidation Tasks (Recommended, Not Critical)

**These require thoughtful content synthesis and are low-priority:**

1. **CODE-QUALITY-SUMMARY.md** — Merge code review findings
2. **INFRASTRUCTURE-LOG.md** — Consolidate 6 infra files with timeline
3. **HAL-OPERATIONS.md** — Merge HAL configuration files
4. **ANALYSIS-LOG/** — Organize dated analysis reports

**Defer to next cleanup cycle** (after Joe confirms no active reference to these files)

---

### Phase 4: Script Audit (Deferred)

Requires validation to avoid breaking active helpers:

```bash
# Check these scripts for actual usage before deleting
for script in acp-with-provenance.sh agent-discord-post.sh \
              alfred-process-queue.sh backup-system.sh \
              cc-dead-page-detector.sh codex-rate-limit-responder.sh; do
  echo "=== $script ==="
  grep -r "$script" ~ --include="*.sh" --include="*.js" --include="*.json" 2>/dev/null | head -3
done
```

**Defer to:** 2026-04-15 (after 2 more weeks of active usage observation)

---

## Memory & Space Savings

| Phase | Action | Space Freed | Risk |
|-------|--------|-------------|------|
| 1 | Delete empty dirs + temp file | ~50KB | None |
| 2 | Archive 6 large files | ~140KB | Low |
| 3 | Consolidate documentation | ~60KB | Medium |
| 4 | Archive unused scripts | ~80KB | High |
| **Total** | | **~330KB** | **Low-Medium** |

---

## Recommendations for Ongoing Hygiene

1. **Quarterly review:** Run this analysis every 90 days
2. **Archive policy:** Move completed projects to `archive/` after 90 days of no updates
3. **Documentation consolidation:** When 3+ files cover same topic, merge to single source + subsections
4. **Script graveyard:** Create `scripts/archive/` and move unused helpers there instead of deleting
5. **Memory rotation:** Continue current practice of archiving old daily logs

---

## Status & Next Steps

✅ **Analysis Complete** — All findings documented above

**Immediate Action (Joe's approval needed for Phase 2+):**
- Execute Phase 1 (9 deletions, ~30 seconds)
- Defer Phases 2-4 pending Joe's confirmation

**Implementation Owner:** Joe (verify no active references before archival)

---

**Generated by:** Alfred Proactive Sweep  
**Timestamp:** 2026-03-30 01:20:52 ADT
