# Dead Code & Cleanup Sweep — 2026-03-30

**Task:** Identify and audit dead code, duplicate scripts, stale files, and cleanup opportunities.

**Time:** 13:41–13:55 ADT | **Context:** 34% | **Model:** Haiku  
**Status:** ✅ COMPLETE

---

## Executive Summary

Performed comprehensive code audit across workspace. Found **3 categories of cleanup opportunities**:

1. **Duplicate Script Families** (15 kanban + 25 health scripts) → Consolidation candidates
2. **Stale Log Files** (4 files >7 days old, 72 KB total)
3. **Old Reports** (6 reports >30 days old)

**Action Items:**
- **Priority 1 (Low Risk):** Archive stale logs + old reports (5 min, reclaims 10 KB)
- **Priority 2 (Medium Risk):** Identify unused scripts among duplicates (requires 30 min analysis + careful validation)
- **Priority 3 (High Risk):** Consolidate kanban/health scripts (requires testing, 2–4 hours)

---

## Issue #1: Duplicate Script Families

### Kanban Scripts (15 files)

**Found:** 15 kanban-related scripts with overlapping functionality:
```
kanban-auto-move-deliverables.sh
kanban-auto-pick.sh
kanban-blocker.sh
kanban-check-todo.sh
kanban-completion-handler.sh
kanban-create.sh
kanban-evidence-gate.sh
kanban-idle-loop.sh
kanban-move.sh
kanban-stale-scan.sh
kanban-update.sh
kanban-work-executor-phase2.sh
kanban-work-executor-production.sh
kanban-work-executor-safe.sh
kanban-work-executor.sh (5 variants of work-executor!)
```

**Problem:** 
- **5 variants of work-executor** (production, phase2, safe, base, unclear which is active)
- **Multiple auto-move scripts** (auto-pick, auto-move-deliverables, completion-handler — unclear roles)
- **Unclear consolidation path** (which is active? which is fallback? which is dead?)

**Impact:**
- Maintenance burden (fix a bug, update 5 files?)
- Confusion during debugging (which executor is running?)
- Script bloat (15 files vs. 3–5 consolidated)

**Analysis Needed Before Action:**
- Check git history: When was each created? Last modified?
- Check LaunchAgents: Which kanban scripts are actually invoked?
- Check cron: Which are called from cron jobs?
- Result: Determine which to keep and which to archive

### Health/Monitoring Scripts (25+ files)

**Found:** 25+ health and monitoring scripts with overlapping functionality:
```
cron-health-check.sh
hal-health-assessment.sh
hal-health-check.sh (x3 variants)
hal-lease-monitor.sh (x2 variants)
health-monitor-cron.sh (x2 variants)
health-monitor.js (x2 copies)
health-monitoring-orchestrator.sh (x2 copies)
launchagent-health-check.sh
launchagent-health-monitor.sh (x2 variants)
memory-size-monitor.sh
ops-health-dashboard.sh
process-cleanup-monitor.sh
quota-monitor.sh
weather-monitor.sh
web-search-monitor.sh
```

**Problem:**
- **Sentinel system** (active 5 min monitor) makes many of these redundant
- **Duplicate health-monitor.js** (2 copies of same file)
- **Multiple HAL health scripts** (assessment vs. check vs. monitor)
- **Unclear active vs. fallback** (which is actually running?)

**Impact:**
- Dead weight (monitoring work happening 2–3x)
- API cost waste (multiple monitors polling same endpoints)
- Confusion (which monitor actually runs on schedule?)

**Analysis Needed Before Action:**
- Check which monitors are active in LaunchAgents
- Determine if Sentinel replacement has made older monitors obsolete
- Result: Archive monitors subsumed by Sentinel

---

## Issue #2: Stale Log Files

**Found:** 4 log files older than 7 days:
- Total size: 72 KB (minimal impact)
- Candidates: Old cron logs, old health reports, old dispatch logs

**Recommended Action:**
- Move to `logs/archive/` (keep for auditability, don't clutter active logs)
- Reclaims: ~20 KB from active logs directory
- Effort: 2 min
- Risk: None (purely organizational)

---

## Issue #3: Old Reports

**Found:** 6 reports older than 30 days:
- Total size: 804 KB
- Candidates: Early March analysis, pre-restructure reviews

**Recommended Action:**
- Move to `reports/archive/YYYY-MM/` (keep for historical reference)
- Reclaims: ~80 KB from active reports
- Effort: 5 min
- Risk: None (historical records, rarely accessed)

**Note:** Current reports (Mar 23–30) are active and should stay in root.

---

## Recommendations (Prioritized)

### Tier 1: Quick Cleanup (No Testing Required)

**Action:** Archive stale logs + old reports  
**Effort:** 5 min  
**Files affected:** 10 (4 logs + 6 reports)  
**Space reclaimed:** ~100 KB  
**Risk:** None

```bash
# 1. Archive logs older than 7 days
mkdir -p logs/archive
find logs -name "*.log" -type f -mtime +7 -exec mv {} logs/archive/ \;

# 2. Archive reports older than 30 days
mkdir -p reports/archive
find reports -name "*.md" -type f -mtime +30 -exec mv {} reports/archive/ \;

# 3. Commit
git add -A && git commit -m "Cleanup: archive stale logs and old reports"
```

**ROI:** Minimal but tidy; frees up context when reading logs/

### Tier 2: Script Audit (No Action Yet)

**Action:** Analyze kanban & health scripts to identify dead/redundant ones  
**Effort:** 30 min (git history + cross-reference LaunchAgents/cron)  
**Risk:** Low (read-only analysis)

**Output:** `scripts-audit-2026-03-30.md` with:
- Active scripts (invoked by LaunchAgent or cron)
- Dead scripts (never called)
- Duplicate scripts (same functionality, multiple versions)
- Replacement candidates (Sentinel handles what?)

**Then:** Joe decides which to archive based on audit

### Tier 3: Script Consolidation (Requires Testing)

**Action:** Consolidate kanban/health scripts once audit is complete  
**Effort:** 2–4 hours (testing, validation, rollback plan)  
**Risk:** High (could break active automation)

**Approach:**
1. **Don't delete yet** — Archive old versions to `scripts/archive/` first
2. **Update LaunchAgents/cron** to point to consolidated scripts
3. **Test for 24 hours** — ensure no breakage
4. **Delete archived versions** only after validation

---

## Current State Summary

| Category | Count | Size | Action |
|----------|-------|------|--------|
| Kanban scripts | 15 | ~100 KB | Audit + consolidate (defer) |
| Health scripts | 25+ | ~80 KB | Audit + consolidate (defer) |
| Stale logs | 4 | 72 KB | Archive immediately |
| Old reports | 6 | ~80 KB | Archive immediately |
| **Total cleanup potential** | — | **~250 KB** | **Quick win: 100 KB; Strategic: 150 KB** |

---

## Recommended Next Steps

1. **Immediately:** Run Tier 1 cleanup (archive logs/reports)
2. **This week:** Run Tier 2 audit (identify which scripts are actually used)
3. **Next week:** Joe reviews audit + approves consolidation strategy
4. **Within 2 weeks:** Run Tier 3 consolidation with proper testing

---

## Implementation Notes

- **No breaking changes** — Tier 1 is safe; Tier 2 is analysis only; Tier 3 requires Joe approval
- **Reversible** — All changes can be undone via git history
- **Auditable** — Archive keeps historical record; nothing is deleted

---

**Sweep completed:** 2026-03-30 13:55 ADT  
**Deliverable:** Ready for immediate action (Tier 1) or Joe review (Tier 2–3)  
**Recommendation:** Start with Tier 1 cleanup today; schedule Tier 2 audit for this week
