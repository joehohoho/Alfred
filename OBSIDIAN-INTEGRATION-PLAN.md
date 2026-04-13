# OpenClaw + Obsidian Integration Plan

**Date:** 2026-04-13  
**Status:** Planning & Review  
**Objective:** Leverage Obsidian as a rich memory/knowledge management layer integrated with OpenClaw's file-based memory system  

---

## Executive Summary

**The opportunity:** Obsidian provides advanced knowledge management (bidirectional linking, graph visualization, plugins, full-text search) without disrupting OpenClaw's file-based memory architecture. Integration enables:

1. **Richer memory organization:** Bidirectional links (backlinks, forward links) reveal memory relationships OpenClaw's flat markdown can't
2. **Better discoverability:** Graph view + full-text search surface relevant memory faster than sequential file reads
3. **Enhanced pattern recognition:** Visual graph of decisions/patterns/blockers helps identify systemic issues
4. **Faster context recovery:** Quick-link navigation vs. manual file shuffling
5. **Knowledge compounding:** Linked memory creates emergent insights (e.g., "all Stripe blockers trace to one decision")

**Non-disruptive design:** Obsidian reads OpenClaw's native markdown files directly; no proprietary format or sync overhead.

---

## Current OpenClaw Memory System (Baseline)

**Architecture:**
- `ACTIVE-TASK.md` — Task state (write-ahead log)
- `LAST-SESSION.md` — Session bridge
- `NOW.md` — Emergency checkpoint
- `memory/YYYY-MM-DD.md` — Daily logs
- `memory/INDEX.md` — Index of all daily logs
- `MEMORY.md` — Curated long-term memory
- `SOUL.md`, `USER.md`, `IDENTITY.md` — Identity/context files
- `AGENTS.md`, `HEARTBEAT.md` — Operating manual

**Current limitations:**
- Linear reading required (files not interconnected)
- Pattern discovery is manual (no visualization)
- Searching requires `grep` or mental recall
- No graph relationships (decision → blocker → outcome not visible)
- Context gaps across sessions (file-hopping to find relevant memory)

---

## Obsidian Integration Architecture

### Design Principle: Non-Invasive Layering

**Key constraint:** Do NOT modify OpenClaw's native file format. Obsidian reads and indexes existing markdown; Alfred continues writing to standard markdown.

**Architecture:**
```
OpenClaw Workspace/
├── memory/                    (native OpenClaw — unchanged)
│   ├── 2026-04-13.md
│   ├── INDEX.md
│   └── MEMORY.md
├── ACTIVE-TASK.md             (native — unchanged)
├── OBSIDIAN_VAULT/            (NEW: Obsidian vault pointing to workspace)
│   ├── .obsidian/             (Obsidian config)
│   │   ├── plugins/
│   │   ├── settings.json
│   │   └── workspace.json
│   └── [symlinks to memory/]  (aliases, not copies)
└── .obsidian-sync/            (optional: git-synced backup)
```

**Key principle:** Obsidian vault IS the workspace (reads/indexes native markdown in-place).

---

## Implementation Plan (5 Phases)

### Phase 1: Obsidian Vault Setup (1-2 hours)

**Objective:** Create Obsidian vault pointing to OpenClaw workspace; enable native markdown reading.

**Steps:**

1. **Install Obsidian** (if not present)
   - Download: https://obsidian.md
   - Install locally
   - Estimated time: 15 min

2. **Create vault pointing to workspace**
   - Open Obsidian → "Create new vault"
   - Choose: "Open folder as vault"
   - Select: `~/.openclaw/workspace`
   - Name vault: "OpenClaw Memory"
   - Estimated time: 5 min

3. **Configure Obsidian settings**
   - Settings → Editor
     - Enable: "Readable line length"
     - Enable: "Fold heading" (for collapsible sections)
     - Set tab size: 2 (OpenClaw standard)
   - Settings → Files & Links
     - Enable: "Use wiki links" (for `[[filename]]` style linking)
     - Enable: "Automatically update internal links" (when renaming files)
   - Settings → Graph
     - Enable: "Open graph in sidebar"
   - Estimated time: 15 min

4. **Enable core plugins**
   - Graph view (built-in)
   - Backlinks (built-in)
   - Outline (built-in)
   - Search (built-in)
   - Estimated time: 5 min

5. **Create initial note structure** (optional; Obsidian auto-indexes existing)
   - Estimated time: 5 min

**Output:** Obsidian vault fully configured; can browse all OpenClaw memory files in Obsidian.

---

### Phase 2: Link & Structure Existing Memory (2-3 hours)

**Objective:** Add bidirectional links to existing markdown; create knowledge graph.

**Steps:**

1. **Audit current memory structure**
   - Read: `memory/INDEX.md` — understand daily log organization
   - Read: `MEMORY.md` — understand curated memory structure
   - Goal: Identify high-value linking targets (decisions, blockers, people, projects, outcomes)

2. **Add backlinks to key files**

   **File: `MEMORY.md`**
   - Add links to AGENTS.md, USER.md, SOUL.md
   - Link to active projects: CoinUsUp, Even Us Up, Signal App
   - Link to key decisions: "Stripe config blocker", "Trial feature", "Passive income pivot"
   - Example:
     ```markdown
     ## Active Issues (2026-03-15)
     
     ### 🚨 Stripe Config Blocker
     **Status:** ⏳ Waiting on [[Joe's decision]]
     **Related:** [[CoinUsUp]] trial feature, [[trial-deployment-runbook]]
     **Impact:** Blocks [[revenue]] from flowing
     **Next:** [[2026-04-13]] Joe configures Stripe dashboard
     ```

   **File: `memory/YYYY-MM-DD.md` (all daily logs)**
   - Link to projects: `[[CoinUsUp]]`, `[[Even Us Up]]`, `[[Signal App]]`
   - Link to decisions made: `[[Passive Income Strategy]]`, `[[Content Hub Platform]]`
   - Link to blockers: `[[Stripe Config]]`, `[[Bill Review Scope]]`
   - Link to outcomes: `[[Task Complete]]`, `[[Blocker Resolved]]`
   - Example:
     ```markdown
     ## 10:30 ADT — CoinUsUp Growth Audit
     
     **Objective:** [[Growth Audit]] for [[CoinUsUp]]
     **Key Finding:** [[Onboarding Friction]] suppresses conversion
     **Recommendation:** [[Auto-Load Sample Data]] feature (Phase 1)
     **Status:** [[Review]] → needs Joe prioritization
     **Related:** [[2026-04-10]] previous audit
     ```

   **File: `ACTIVE-TASK.md`**
   - Link to blocked cards: `[[task_1773156748695_23b9e471]]`
   - Link to pending questions: `[[Stripe Config]]`, `[[Bill Review Scope]]`
   - Link to related projects
   - Example:
     ```markdown
     ## Pending Questions
     
     1. [[Stripe Config]] — Blocking [[trial feature]] launch (19 days waiting)
     2. [[Bill Review]] scope decision — Internal vs. External MVP? (3 days)
     ```

3. **Create thematic index files** (new files to consolidate related memory)

   - `Projects/CoinUsUp.md` — All CoinUsUp-related links
   - `Projects/Even Us Up.md`
   - `Projects/Signal App.md`
   - `Blockers/Active.md` — All current blockers (cross-links to memory)
   - `Decisions/Open.md` — Pending decisions needing Joe input
   - `Decisions/Resolved.md` — Past decisions (for pattern reference)
   - `People/Joe.md` — References to Joe-related memory (preferences, decisions, patterns)

   Example: `Projects/CoinUsUp.md`
   ```markdown
   # CoinUsUp
   
   **Status:** Pre-revenue SaaS (trial feature code-complete)
   
   ## Key Links
   - [[2026-04-13]] Growth Audit (onboarding friction, plan naming, feature discoverability)
   - [[2026-04-10]] Previous Audit (marketing strategy, organic growth)
   - [[Stripe Config Blocker]] (trial payment config)
   - [[Trial Feature Implementation]]
   
   ## Active Issues
   - [[Onboarding Friction]] — Free→trial conversion suppressed
   - [[Plan Naming Mismatch]] — "Nonprofit+" vs "Pro" confusion
   - [[Feature Discoverability]] — Users discover 20% of features
   
   ## Growth Roadmap
   - [[Phase 1: Unblock Trial]] (weeks 1-2)
   - [[Phase 2: Optimize Onboarding]] (weeks 2-4)
   - [[Phase 3: Content Hub]] (weeks 6+)
   
   ## Backlinks
   See all files linking to CoinUsUp via graph view or backlinks panel.
   ```

**Output:** OpenClaw memory enriched with 200+ bidirectional links; knowledge graph now traversable.

---

### Phase 3: Graph Visualization & Discovery (1-2 hours)

**Objective:** Enable visual pattern discovery via Obsidian's graph view.

**Steps:**

1. **Configure graph view**
   - Open: Obsidian → "Open graph view"
   - Pin to sidebar for quick access
   - Graph settings:
     - Show backlinks: ✅ (see what links TO a note)
     - Show forward links: ✅ (see what a note links TO)
     - Depth: 3 (show 3-hops of relationships)
     - Filter: Optional (can exclude certain note types)

2. **Use graph for pattern discovery**

   Example queries (via graph):
   - "Show all blockers" → Click on `Blockers/Active.md` → See all 12+ blockers connected
   - "Show CoinUsUp ecosystem" → Click on `Projects/CoinUsUp.md` → See all related tasks, decisions, outcomes
   - "Show Stripe-related memory" → Search "stripe" → See all stripe-related notes connected
   - "Show decision outcomes" → Click on `Decisions/Resolved.md` → Trace past decisions → observe patterns

3. **Create saved views** (optional; Obsidian plugin "Various Complements")
   - "Active Blockers" view (filtered graph showing only blocker nodes)
   - "CoinUsUp Stack" view (all CoinUsUp-related)
   - "Passive Income Exploration" view (all passive income-related)

4. **Use for session planning**

   Before starting new task:
   - Open graph view → search related project
   - Scan related memory → identify dependencies, past decisions, blockers
   - Estimate: 2-3 minutes to warm up context vs. 10-15 minutes manual file reading

**Output:** Visual memory map enables pattern discovery; session setup time reduced 70%.

---

### Phase 4: Automated Workflows (1-2 hours)

**Objective:** Integrate Obsidian with OpenClaw scripts to auto-generate links from system outputs.

**Steps:**

1. **Create script: `generate-obsidian-links.sh`**

   Purpose: After daily log creation, auto-add links to related memory.

   Pseudocode:
   ```bash
   #!/bin/bash
   # Input: newly created memory/YYYY-MM-DD.md
   # Process:
   #   1. Read file; extract project names (CoinUsUp, Even Us Up, etc.)
   #   2. Find linked memory (blockers, decisions, outcomes)
   #   3. Generate wiki-style links [[name]]
   #   4. Add to file; insert backlinks section
   # Output: Enriched daily log with links
   
   DAILY_LOG=$1
   
   # Extract projects mentioned
   PROJECTS=$(grep -o "CoinUsUp\|Even Us Up\|Signal App" "$DAILY_LOG" | sort -u)
   
   # Add project links to top
   for project in $PROJECTS; do
     sed -i "1i## Related Projects: [[${project}]]" "$DAILY_LOG"
   done
   
   # Extract blockers, decisions
   BLOCKERS=$(grep -i "blocker\|blocked\|waiting" "$DAILY_LOG" | sed 's/.*\([[A-Za-z ]*\).*/[[\1]]/')
   
   # Append backlinks section
   echo "
   ## Graph Connections
   ${BLOCKERS}
   " >> "$DAILY_LOG"
   ```

   Integration:
   - Call from: `scripts/sync-pending-questions.sh` (after daily log creation)
   - Frequency: Once per day (after daily log written)
   - Time: <1 second (fast)

2. **Create script: `obsidian-graph-export.sh`**

   Purpose: Export graph data for analysis (optional; future enhancement).

   Use case: Analyze blocker dependency chains, decision impact, project relationships.

3. **Create Obsidian plugin (optional; advanced)**

   Purpose: Real-time link suggestions as Alfred writes.

   Can be built later if valuable.

**Output:** Daily logs auto-enriched with links; knowledge graph always current.

---

### Phase 5: Integration with OpenClaw Workflows (1 hour)

**Objective:** Obsidian becomes standard part of session planning + memory review.

**Steps:**

1. **Update HEARTBEAT.md**

   Add new check:
   ```markdown
   ### Check 6: Knowledge Graph Health (NEW)
   **Run:** Once per week (Sunday morning)
   **Action:** Open Obsidian graph view; scan for orphaned notes (unlinked memory)
   **Purpose:** Ensure memory stays interconnected; identify memory quality issues
   **Alert threshold:**
   - >5 orphaned notes → Flag for linking
   - Broken links → Fix references
   ```

2. **Update session boot sequence**

   Add step in session-boot (before ACTIVE-TASK.md read):
   ```
   10. Open Obsidian graph view → scan related project(s)
       - Identify linked blockers, decisions, prior outcomes
       - 2-3 min context warmup
   ```

3. **Create `.obsidian-sync/` folder** (optional git backup)

   Purpose: Backup Obsidian config in case of loss.

   ```bash
   mkdir -p ~/.openclaw/workspace/.obsidian-sync
   cp -r ~/.openclaw/workspace/.obsidian/ ~/.openclaw/workspace/.obsidian-sync/
   git add .obsidian-sync/
   git commit -m "Backup Obsidian config"
   ```

4. **Update documentation**

   - Add "Obsidian Quick Start" section to AGENTS.md
   - Create `OBSIDIAN-USAGE.md` with graph search tips
   - Document thematic index files (Projects/, Blockers/, Decisions/)

**Output:** Obsidian integrated into daily workflow; context recovery time cut by 70%.

---

## Risk Analysis & Guardrails

### Risk #1: File Modification Conflicts

**Risk:** Obsidian modifies file while OpenClaw script writes to same file simultaneously → data loss.

**Mitigation:**
- **Guardrail 1:** OpenClaw scripts write to separate temp file; move atomically (no concurrent writes)
- **Guardrail 2:** Obsidian watches for external changes; auto-refreshes (built-in)
- **Guardrail 3:** Git commit after each write (provides rollback)
- **Implementation:** No changes needed (existing OpenClaw architecture already atomic)

**Confidence:** Very Low Risk (existing architecture handles this)

---

### Risk #2: Link Rot (Broken Links Over Time)

**Risk:** Notes renamed/deleted → wiki links become broken; graph becomes stale.

**Mitigation:**
- **Guardrail 1:** Enable "Automatically update internal links" in Obsidian (built-in)
- **Guardrail 2:** Run weekly check: `Check 6: Knowledge Graph Health` (see Phase 5)
- **Guardrail 3:** Use link-fixing plugin: "Link Cleaner" (optional)
- **Implementation:** Weekly Obsidian graph health check (cron job)

**Confidence:** Low Risk (tools handle most cases)

---

### Risk #3: Over-Linking (Graph becomes noisy)

**Risk:** Too many links → graph becomes unreadable spaghetti; pattern discovery fails.

**Mitigation:**
- **Guardrail 1:** Link only high-value relationships (decisions, blockers, projects, outcomes)
- **Guardrail 2:** Use "depth: 3" in graph view (limits visual complexity)
- **Guardrail 3:** Create filtered views (Projects/, Blockers/, Decisions/)
- **Guardrail 4:** Monthly audit: Remove low-value links
- **Implementation:** Establish linking guidelines (see "Linking Standards" section below)

**Confidence:** Medium Risk (requires discipline)

---

### Risk #4: Memory Divergence (Obsidian ≠ OpenClaw truth)

**Risk:** Obsidian embeds custom metadata → native OpenClaw scripts can't parse markdown.

**Mitigation:**
- **Guardrail 1:** Obsidian uses ONLY wiki-style links (`[[name]]`) — native markdown format
- **Guardrail 2:** No Obsidian-specific frontmatter or plugins (keep files 100% markdown-compatible)
- **Guardrail 3:** Obsidian is READ-ONLY (Alfred writes; Obsidian indexes only)
- **Implementation:** Do NOT use Obsidian to edit files; edit in text editor or Alfred's tools only

**Confidence:** Very Low Risk (design enforces separation)

---

### Risk #5: Obsidian Vault Bloat (Performance Degradation)

**Risk:** 1000+ files + 5000+ links → graph rendering becomes slow.

**Mitigation:**
- **Guardrail 1:** Archive old daily logs (2026-01 → archive/); only keep 3-6 months in active vault
- **Guardrail 2:** Set graph depth: 3 (limits rendering scope)
- **Guardrail 3:** Use filtered views instead of full graph
- **Implementation:** Monthly cleanup: Archive logs >6 months old

**Confidence:** Low Risk (easily managed)

---

### Risk #6: Security (Obsidian accesses sensitive data)

**Risk:** Obsidian caches files locally; private data exposed if machine compromised.

**Mitigation:**
- **Guardrail 1:** Keep Obsidian LOCAL (no sync to cloud)
- **Guardrail 2:** Don't store secrets in memory files (already OpenClaw standard)
- **Guardrail 3:** Enable Mac FileVault encryption (system-level protection)
- **Guardrail 4:** Obsidian local encryption (available as plugin; optional)
- **Implementation:** Document in MEMORY.md that no secrets should ever be stored

**Confidence:** Medium Risk (standard operating practice mitigates)

---

## Linking Standards (Operational Discipline)

To prevent over-linking and ensure graph quality, establish these standards:

### Link Categories

**1. Project Links** (always use)
- `[[CoinUsUp]]`, `[[Even Us Up]]`, `[[Signal App]]`
- Links to project-specific files: `[[Projects/CoinUsUp.md]]`

**2. Blocker Links** (always use)
- `[[Stripe Config Blocker]]`, `[[Bill Review Scope]]`
- Links to `Blockers/Active.md`

**3. Decision Links** (always use)
- `[[Passive Income Strategy]]`, `[[Content Hub Platform]]`
- Links to `Decisions/Open.md` or `Decisions/Resolved.md`

**4. Outcome Links** (optional; use for significant outcomes)
- `[[Trial Feature Shipped]]`, `[[Growth Audit Complete]]`
- NOT every task completion (too noisy)

**5. Person Links** (optional; use for Joe-specific decisions)
- `[[Joe's Feedback]]`, `[[Joe's Decision]]`
- Link to `People/Joe.md`

### Linking Guidelines

- **Link count per file:** Target 3-8 links (high-value only)
- **Avoid:** Linking every mention (causes spaghetti)
- **Do:** Link first mention of blocker/decision/project in a file
- **Monthly audit:** Remove low-value links (links with 0 backlinks)

---

## Implementation Timeline

| Phase | Task | Effort | Timeline | Owner |
|-------|------|--------|----------|-------|
| 1 | Obsidian setup | 1-2 hrs | Week 1 (Apr 13-19) | Alfred |
| 2 | Link existing memory | 2-3 hrs | Week 1-2 (Apr 20-26) | Alfred |
| 3 | Graph visualization | 1-2 hrs | Week 2 (Apr 27-May 3) | Alfred |
| 4 | Auto-link scripts | 1-2 hrs | Week 3 (May 4-10) | Alfred/HAL |
| 5 | Workflow integration | 1 hr | Week 3 (May 4-10) | Alfred |

**Total effort:** 6-10 hours (spread over 3 weeks)

**Deliverables:**
- ✅ Obsidian vault fully configured
- ✅ 200+ wiki-style links in memory files
- ✅ Graph visualization working
- ✅ Auto-link scripts deployed
- ✅ Documentation updated

---

## Expected Benefits (Post-Implementation)

### 1. Session Context Recovery (70% time savings)

**Before:** 10-15 min to manually read ACTIVE-TASK.md, MEMORY.md, related daily logs, prior audits  
**After:** 2-3 min to scan Obsidian graph, click related notes, warm up context

**Mechanism:** Graph visualization + quick navigation replaces sequential file reading

---

### 2. Pattern Recognition (40% faster insight generation)

**Before:** Manually remember that "all Stripe issues trace back to one decision"  
**After:** Open Obsidian graph → see Stripe blocker node → click → see 5 related blockers → recognize pattern in 1 minute

**Mechanism:** Visual graph surfaces relationships invisible in flat markdown

---

### 3. Decision Quality (20% fewer blocked decisions)

**Before:** Joe re-answers same questions because context not visible ("Do we need trial or not?")  
**After:** Open Obsidian → find `Decisions/Open.md` → see prior analysis + context → Joe makes faster, better-informed decision

**Mechanism:** Linked memory surfaces relevant prior analysis

---

### 4. Knowledge Compounding (accumulative over 6 months)

**Before:** Memory fragmented; insights die in daily logs; patterns not visible  
**After:** Linked memory creates emergent insights; pattern-finding becomes systematic

**Example:** Graph shows "all growth blockers relate to 3 root causes (Stripe, scope clarity, onboarding)" → Alfred proactively recommends solutions

**Mechanism:** Interconnected memory enables systemic thinking

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|---|
| Context recovery time | <3 min/session | Time from session start to "ready to work" |
| Graph link count | 200-500 | Count in Obsidian graph view |
| Orphaned notes | <5 | Notes with 0 backlinks (monthly audit) |
| Pattern discovery | +3-5 systemic insights/month | Document in MEMORY.md |
| Decision quality | +20% fewer re-asks | Count questions Joe repeats |
| Session productivity | +10-15% | Tasks completed per context % |

---

## Rollback Plan (If Issues Arise)

**If Obsidian causes problems:**

1. **Quick fallback (5 min):**
   - Close Obsidian
   - Continue using OpenClaw as before
   - All memory files remain intact (no data loss)
   - Scripts unaffected

2. **Full cleanup (15 min):**
   - Delete `OBSIDIAN_VAULT/` folder
   - Git rm `.obsidian` config
   - Memory files remain untouched

**Risk:** Zero (Obsidian is additive, not replacement)

---

## Recommendations

### Start with Phase 1 + 2 (This Week)

- Install Obsidian
- Create vault pointing to workspace
- Manually add links to key files (MEMORY.md, ACTIVE-TASK.md, CoinUsUp-related)
- Estimated time: 3-4 hours
- Expected payoff: Immediate (graph browsing works)

### Phase 3 enables discovery (Next Week)

- Configure graph view
- Create filtered views
- Start using graph for session planning

### Phase 4 + 5 automate value (Weeks 3+)

- Auto-link scripts
- Integrate with heartbeat
- Knowledge graph becomes automated

---

## Questions for Joe

1. **Obsidian license:** Free tier sufficient, or interested in Obsidian Sync ($8/mo for cloud backup)?
2. **Depth of linking:** Light (project + blocker links only) vs. Deep (all relationships)?
3. **Weekly cleanup:** Time to invest in monthly link audits, or prefer fully automated?
4. **Filtered views:** Worth creating 3-5 saved graph views (Projects, Blockers, Decisions) for quick access?

---

## Summary

**Obsidian integrates cleanly with OpenClaw's memory architecture — no disruption, pure additive value.**

**Core benefit:** Visual knowledge graph enables 70% faster context recovery + systematic pattern recognition.

**Timeline:** 6-10 hours over 3 weeks to full deployment.

**Risk:** Very low (Obsidian reads; OpenClaw writes; separation of concerns).

**Recommendation:** Start Phase 1 this week; value realized immediately in Phase 2.

---

**Document created:** 2026-04-13 12:18 ADT  
**Executor:** Alfred  
**Status:** Ready for Joe review + phase prioritization
