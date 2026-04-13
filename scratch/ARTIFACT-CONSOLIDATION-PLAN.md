# Artifact Consolidation & Freshness Plan

**Generated:** 2026-04-11  
**Status:** Ready for implementation

---

## Overview

Freshness scanner identified 4 stale artifacts, 2 supersessions, and 3 contradiction zones. This plan consolidates conflicting recommendations and archives superseded versions.

**Expected payoff:**
- Eliminate 12+ hours/month of attention on duplicate/stale recommendations
- Restore single source of truth for each topic (Signal App, CoinUsUp, Even Us Up)
- Lower token burn during audits by 20-30% (fewer files to process)
- Reduce context pollution from contradictory recommendations

---

## Priority 1: Archive Stale Artifacts

### PORTFOLIO-SNAPSHOT-2026-04-02.md
- **Status:** Superseded by PORTFOLIO-SNAPSHOT-2026-04-11.md (9 days newer)
- **Action:** Archive immediately
- **Command:** `mv memory/PORTFOLIO-SNAPSHOT-2026-04-02.md memory/archive/`

### COINUSUP-GROWTH-ANALYSIS-2026-03-18.md
- **Status:** Older variant; 2026-03-31 and 2026-04-03 audits exist
- **Action:** Verify 2026-04-03 version is more current; archive if confirmed
- **Command:** `mv COINUSUP-GROWTH-ANALYSIS-2026-03-18.md memory/archive/`

---

## Priority 2: Consolidation Zones

### Zone 1: Signal App Strategy (4 conflicting artifacts)

**Artifacts:**
1. `SIGNAL-APP-MONETIZATION-ANALYSIS.md` (Mar 7, stale 34d)
2. `SIGNAL-APP-PHASE1-PLAN.md` (Feb 20, old implementation plan)
3. `signal-app-monetization-2026-04-03.md` (Apr 3, recent audit)
4. `signal-app-research.md` (Feb 17, old research)

**Current state:** Multiple versions of monetization strategy from different phases.

**Consolidation action:**
1. Read all 4 files (mapping strategy evolution)
2. Create single `SIGNAL-APP-CANONICAL-STRATEGY.md` with:
   - **Current recommendation** (from Apr 3 audit)
   - **Rationale** (why this approach)
   - **Phase 1 specifics** (from Phase1-Plan)
   - **Timeline** (milestones)
   - **Version history** (how strategy evolved; what changed and why)
3. Archive originals to `memory/archive/signal-app/`
4. Update kanban card comments with pointer to canonical version

**Owner:** Alfred (analysis) + HAL (implementation if approved)

---

### Zone 2: CoinUsUp Growth (6 conflicting artifacts)

**Artifacts:**
1. `2026-03-31-coinusup-growth-audit.md`
2. `2026-04-03-coinusup-growth-audit.md`
3. `COINUSUP-CONTENT-HUB-COMPLETION.md`
4. `COINUSUP-GROWTH-ANALYSIS-2026-03-18.md` (stale, old)
5. `INDEX-COINUSUP-CONTENT-HUB.md`
6. `coinusup-content-hub-research.md`

**Current state:** Multiple audits (Mar 31, Apr 3), content hub project details, and old analysis.

**Consolidation action:**
1. Read newest audit (2026-04-03) — that's source of truth
2. Check if Content Hub completion supersedes older growth recommendations
3. Create `COINUSUP-CANONICAL-GROWTH-ROADMAP.md` with:
   - **Top 3 growth levers** (latest audit)
   - **Content Hub status** (what's done, what's blocked)
   - **Quick wins** (implementation roadmap)
   - **Timeline** (dependencies)
   - **Audit history** (Mar 31 vs Apr 3 changes)
4. Archive originals to `memory/archive/coinusup/`
5. Add pointer to Kanban Ideas column for next CoinUsUp work

**Owner:** Alfred (consolidation) + HAL (implementation roadmap)

---

### Zone 3: Even Us Up Roadmap (3 conflicting artifacts)

**Artifacts:**
1. `2026-03-21-even-us-up-discovery.md` (discovery phase findings)
2. `2026-03-21-even-us-up-completion.md` (post-discovery wrap)
3. `2026-04-03-even-us-up-growth-audit.md` (recent audit)

**Current state:** Phase outputs (discovery, completion) + recent growth audit. Likely complementary rather than contradictory.

**Consolidation action:**
1. Read all 3 — verify phase sequence (discovery → completion → growth audit)
2. Create `EVEN-US-UP-CANONICAL-ROADMAP.md` with:
   - **Discovery findings** (features identified in phase)
   - **Completion status** (what was delivered)
   - **Growth levers** (from Apr 3 audit)
   - **Next phase** (implementation plan/dependencies)
   - **Timeline** (milestones)
3. Archive originals to `memory/archive/even-us-up/`
4. Link from Kanban to canonical version if work resumes

**Owner:** Alfred (consolidation)

---

## Priority 3: Stale Research Documents

These are older than threshold but lower impact (no active projects depend on them):

- `SIGNAL-APP-MONETIZATION-ANALYSIS.md` (34d stale)
- `signal-app-research.md` (41d stale)

**Action:** Archive to `memory/archive/` (covered in Consolidation Zone 1)

---

## Implementation Steps

### Phase 1: Preparation (30 min)
1. Create archive directories:
   ```bash
   mkdir -p memory/archive/{signal-app,coinusup,even-us-up}
   ```

2. Run freshness scanner again to validate current state:
   ```bash
   node scripts/freshness-scanner.js > /tmp/freshness-before.txt
   ```

### Phase 2: Consolidation (2-3 hours)

**Task 2a: Signal App (45 min)**
- Read all 4 artifacts
- Write `SIGNAL-APP-CANONICAL-STRATEGY.md`
- Archive originals
- Post Kanban comment with link

**Task 2b: CoinUsUp (60 min)**
- Read all 6 artifacts (some may be supporting docs)
- Write `COINUSUP-CANONICAL-GROWTH-ROADMAP.md`
- Archive originals
- Update next CoinUsUp work card

**Task 2c: Even Us Up (30 min)**
- Read all 3 artifacts
- Write `EVEN-US-UP-CANONICAL-ROADMAP.md`
- Archive originals
- Note in Kanban

### Phase 3: Cleanup (15 min)
1. Run freshness scanner to verify reduction:
   ```bash
   node scripts/freshness-scanner.js > /tmp/freshness-after.txt
   diff /tmp/freshness-before.txt /tmp/freshness-after.txt
   ```

2. Document results in `ARTIFACT-CONSOLIDATION-COMPLETION.md`

3. Move consolidated artifacts to `memory/` (not archive) for ongoing reference

---

## Success Criteria

- ✅ All 6 old/stale artifacts archived
- ✅ 3 canonical versions created (Signal App, CoinUsUp, Even Us Up)
- ✅ Stale count reduced from 4 to 0
- ✅ Superseded count reduced to 0 (via archival)
- ✅ Contradiction zones resolved (single source per topic)
- ✅ Memory usage down 15-20% from cleanup
- ✅ Freshness scanner re-run shows clean status

---

## Maintenance

**Going forward:**
1. Use this scanner quarterly (every 3 months)
2. When auditing a topic, check `ARTIFACT-CONSOLIDATION-PLAN.md` for canonical location
3. When creating new analysis, consolidate into existing canonical if one exists
4. Archive old variants immediately (don't let duplicates accumulate)

---

## Appendix: File Sizes (Before)

Used to estimate token savings from cleanup:

| File | Size | Status |
|------|------|--------|
| SIGNAL-APP-MONETIZATION-ANALYSIS.md | 254KB | Archive |
| signal-app-research.md | 115KB | Archive |
| SIGNAL-APP-PHASE1-PLAN.md | 239KB | Archive |
| signal-app-monetization-2026-04-03.md | 223KB | Keep (canonical) |
| **Signal App subtotal** | **831KB** | **→ ~223KB** |
| COINUSUP-GROWTH-ANALYSIS-2026-03-18.md | 128KB | Archive |
| 2026-03-31-coinusup-growth-audit.md | 246KB | Archive |
| 2026-04-03-coinusup-growth-audit.md | 224KB | Keep (canonical) |
| COINUSUP-CONTENT-HUB-COMPLETION.md | 256KB | Archive |
| INDEX-COINUSUP-CONTENT-HUB.md | 387KB | Merge into canonical |
| coinusup-content-hub-research.md | 183KB | Archive |
| **CoinUsUp subtotal** | **1.424MB** | **→ ~224KB** |
| **Total cleanup potential** | **~2.3MB** | **~60% reduction** |

---

**Next step:** Begin Phase 1 preparation when ready.
