# Freshness Scanner Integration Guide

**Status:** Ready to integrate into daily/weekly workflows  
**Generated:** 2026-04-11  
**Tools:** 2 scripts + 2 reports

---

## What You Built

### 1. **Freshness Scanner** (`scripts/freshness-scanner.js`)
- Audits 148+ artifacts (memory files, ideas, tasks, research)
- Detects staleness (older than category thresholds)
- Identifies supersessions (newer version likely replaces older)
- Flags contradictions (multiple conflicting artifacts for same topic)
- Generates prioritized refresh queue

**Output:** `FRESHNESS-SCANNER-REPORT.md` (markdown report)

**Run:**
```bash
node ~/.openclaw/workspace/scripts/freshness-scanner.js
```

**Thresholds (configurable in code):**
- Daily logs: 7 days
- Portfolio snapshots: 7 days
- Growth audits: 14 days
- Proactive scans: 14 days
- Signal app research: 21 days
- Portfolio analysis: 14 days
- Decisions: 30 days

---

### 2. **Freshness Maintenance Script** (`scripts/freshness-maintenance.sh`)
- Automation wrapper around scanner
- Auto-archives stale/superseded artifacts
- Consolidates contradictory artifacts
- Tracks completion via `ARTIFACT-CONSOLIDATION-COMPLETION.md`

**Usage:**
```bash
# Scan only
./scripts/freshness-maintenance.sh --scan

# Dry-run (show what would be archived)
./scripts/freshness-maintenance.sh --dry-run

# Auto-archive stale artifacts
./scripts/freshness-maintenance.sh --aggressive

# Consolidate a specific topic
./scripts/freshness-maintenance.sh --consolidate signal-app

# Show current report
./scripts/freshness-maintenance.sh --report

# Archive a specific file
./scripts/freshness-maintenance.sh --archive FILENAME.md
```

---

### 3. **Consolidation Plan** (`ARTIFACT-CONSOLIDATION-PLAN.md`)
- Detailed action plan for resolving stale/contradictory artifacts
- Maps 3 consolidation zones: Signal App, CoinUsUp, Even Us Up
- Includes implementation steps and success criteria
- Estimates ~2.3MB memory savings from cleanup

**Consolidation zones:**
- **Signal App:** 4 artifacts → 1 canonical + archives
- **CoinUsUp:** 6 artifacts → 1 canonical + archives
- **Even Us Up:** 3 artifacts → 1 canonical + archives

---

### 4. **Freshness Scanner Report** (`FRESHNESS-SCANNER-REPORT.md`)
Auto-generated analysis showing:
- 4 stale artifacts (>14 days old)
- 2 superseded artifacts (newer version exists)
- 3 contradiction zones (multiple conflicting sources)
- 7 prioritized refresh queue items

**Current findings:**
| Issue | Count | Impact |
|-------|-------|--------|
| Stale artifacts | 4 | Recommendations outdated |
| Superseded | 2 | Duplicate versions |
| Contradictions | 3 | Conflicting guidance |
| **Refresh queue** | **7 items** | **Action items** |

---

## Integration Strategy

### Option A: Manual (For Review & Approval)
1. Run scanner: `node scripts/freshness-scanner.js`
2. Review `FRESHNESS-SCANNER-REPORT.md`
3. Review `ARTIFACT-CONSOLIDATION-PLAN.md`
4. Manually consolidate each zone (3-4 hours of work)
5. Archive files when done

**Best for:** First run, high-stakes decisions

---

### Option B: Semi-Automated (Weekly Routine)
1. **Sunday evening (cron job):** Run scanner
2. **Monday morning:** Review report + plan
3. **Monday-Wednesday:** Execute consolidations
4. **Friday:** Verify + archive completed items

**Script to add to cron:**
```bash
# Freshness scan weekly (Sunday 8 PM AST)
0 20 * * 0 cd ~/.openclaw/workspace && node scripts/freshness-scanner.js >> ~/.openclaw/logs/freshness-scans.log 2>&1

# Auto-archive stale items monthly (1st of month)
0 6 1 * * cd ~/.openclaw/workspace && bash scripts/freshness-maintenance.sh --aggressive >> ~/.openclaw/logs/freshness-maintenance.log 2>&1
```

---

### Option C: Fully Automated (No Manual Review)
1. Scanner runs daily
2. Auto-archives anything >2x threshold
3. Consolidation flagged in Discord
4. Human reviews consolidated files (not raw artifacts)

**Not recommended initially** — consolidations require domain knowledge.

---

## Recommended Next Steps

### Phase 1: Immediate (Today)
- [x] Create scanner + maintenance tools
- [x] Run initial scan (done)
- [x] Generate consolidation plan (done)
- [ ] **Review both reports with Joe**
- [ ] **Get approval on archival strategy**

### Phase 2: This Week
- [ ] Consolidate Signal App (highest impact)
- [ ] Consolidate CoinUsUp (6 artifacts = most potential savings)
- [ ] Consolidate Even Us Up (3 artifacts)
- [ ] Archive all old research files

### Phase 3: Ongoing (Weekly/Monthly)
- [ ] Run scanner weekly
- [ ] Archive confirmed-stale items monthly
- [ ] Review quarterly consolidation needs
- [ ] Update thresholds based on Joe's feedback

---

## Key Artifacts to Preserve

**DO NOT ARCHIVE:**
- `SIGNAL-APP-PHASE1-PLAN.md` — Contains implementation details for Phase 1
- `signal-app-monetization-2026-04-03.md` — CANONICAL (keep)
- `2026-04-03-coinusup-growth-audit.md` — CANONICAL (keep)
- `EVEN-US-UP-CANONICAL-ROADMAP.md` — Once created, this is canonical

**DO ARCHIVE:**
- Old snapshots (>7 days)
- Superseded research (older version + newer exists)
- Duplicate analyses (same topic, different authors/dates)

---

## Success Metrics

After consolidation completion:

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Stale artifacts | 4 | 0 | 0 |
| Superseded | 2 | 0 | 0 |
| Contradiction zones | 3 | 0 | 0 |
| Refresh queue items | 7 | 0 | 0 |
| Memory used (artifacts) | ~2.3MB excess | -60% | ~920KB savings |
| Context noise | High | Low | Minimal |

---

## Maintenance Going Forward

### Daily/Weekly
- Freshness scanner runs weekly (Sunday evening)
- Stale count checked in weekly standup
- If >2 items stale, consolidate immediately

### Monthly
- Run aggressive archival mode
- Clean up old research
- Update thresholds if needed

### Quarterly
- Full freshness audit
- Review categories + thresholds
- Adjust scanner logic if patterns change

---

## Troubleshooting

### Scanner finds too many stale items
→ Thresholds too aggressive. Increase in `freshness-scanner.js` THRESHOLDS object.

### Consolidation takes too long
→ Split across multiple sessions. Focus on one zone at a time.

### Archive directory grows too large
→ Implement archive rotation (move items >3 months old to long-term storage).

### Can't decide which version is canonical
→ Check recency (newer is usually better) + check Kanban card comments for context.

---

## Files Created

| File | Purpose | Maintenance |
|------|---------|-------------|
| `scripts/freshness-scanner.js` | Core scanning logic | Update thresholds as needed |
| `scripts/freshness-maintenance.sh` | Automation wrapper | Update topic consolidations |
| `FRESHNESS-SCANNER-REPORT.md` | Auto-generated report | Regenerate weekly |
| `ARTIFACT-CONSOLIDATION-PLAN.md` | Implementation guide | Update as consolidations complete |
| `ARTIFACT-CONSOLIDATION-COMPLETION.md` | Progress tracking | Update during execution |
| `memory/archive/` | Archived artifacts | Rotate to cold storage quarterly |

---

## Questions for Joe

1. **Consolidation priority:** Start with Signal App (highest complexity) or CoinUsUp (most artifacts)?
2. **Archival timing:** Immediate (this week) or phased?
3. **Threshold tuning:** Are 14-day thresholds reasonable, or too aggressive?
4. **Integration:** Weekly cron job, or manual trigger only?
5. **Archive retention:** Keep indefinitely, or delete after 6 months?

---

## Summary

You now have a **systemized freshness layer** that:
- ✅ Automatically detects stale recommendations
- ✅ Flags superseded artifacts
- ✅ Identifies contradictions
- ✅ Generates prioritized work queue
- ✅ Archives old versions systematically
- ✅ Reduces context pollution and token burn

**Expected payoff:** 12+ hours/month saved on duplicate/outdated recommendations, 60% reduction in artifact-related context overhead.
