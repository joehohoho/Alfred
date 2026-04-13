# Learnings Log - Bug Prevention & Pattern Documentation

**Purpose:** Prevent repeat mistakes by documenting bugs found, root causes, fixes, and preventive measures.

**Format:** Each entry captures what went wrong, why, how we fixed it, and how to prevent it in the future.

**Maintenance:** When a bug is discovered and fixed, add an entry here immediately. Before assuming something is broken, check this log for similar issues.

---

## Infrastructure & System

### [2026-02-17] Ollama CPU Spike During Idle (97% Reduction Fixed)
- **Symptom:** CPU at 30-40% baseline even when OpenClaw inactive; model remained loaded in memory (7.6 GB)
- **Root Cause:** Ollama model was never unloading; default keep-alive timeout was too long
- **Fix:** Set `OLLAMA_KEEP_ALIVE=10m` in `~/.ollama/ollama.env` → model unloads after 10 min inactivity
- **Result:** CPU dropped to 0% during idle; memory freed to 20MB
- **Prevention:** Monitor CPU via LaunchAgent watchdog; alert if baseline >15%
- **Reference:** See MEMORY.md "Ollama Optimization" section

---

### [2026-02-18] Config Drift - Model Versions Out of Sync
- **Symptom:** AGENTS.md said "haiku-4-5, sonnet-4-5, opus-4-5" but actual models were different (Opus is 4-6)
- **Root Cause:** Manual edits to AGENTS.md without verifying against actual installed models
- **Fix:** Created daily config report cron (`scripts/daily-config-check.sh`) that:
  1. Reads AGENTS.md config
  2. Compares to actual installed models
  3. Flags discrepancies
  4. Proposes fixes
- **Result:** Config is now validated daily; drifts caught within 24h
- **Prevention:** Never manually edit model versions; always run config check before deploying
- **Reference:** See AGENTS.md model tiers section

---

### [2026-02-18] GitHub Repository Token Exposure
- **Symptom:** Old repo commits contained API keys in plaintext
- **Root Cause:** Credentials were hardcoded during early setup; .gitignore wasn't strict enough
- **Fix:** 
  1. Deleted old repo completely
  2. Rebuilt from scratch with clean history
  3. Added comprehensive .gitignore (no .env, secrets, API keys)
  4. Created pre-commit hook to prevent re-occurrence
- **Result:** Zero secrets in current history
- **Prevention:** All credentials now in encrypted `.env` files; pre-commit hook scans for patterns before commit
- **Reference:** See GIT-CONFIG.md for pre-commit setup

---

### [2026-02-18] Memory.md Exceeding 20KB Gateway Injection Limit
- **Symptom:** Gateway failed to inject MEMORY.md during session bootstrap (file > 20KB)
- **Root Cause:** Accumulated 25KB of notes in single file; exceeded OpenClaw injection limit
- **Fix:** 
  1. Compressed MEMORY.md to 3.5KB (removed redundant sections)
  2. Archived old entries to `memory/MEMORY-ARCHIVE.md`
  3. Created structured 4-layer memory system (ACTIVE-TASK, LAST-SESSION, checkpoint files, daily logs)
  4. Implemented memory-size-monitor.sh cron that alerts at 85%+ usage
- **Result:** Gateway bootstrap now clean; no truncation
- **Prevention:** Memory files capped at 4KB per file; cron monitors size daily; escalating alerts at 60%, 75%, 85%
- **Reference:** See HEARTBEAT.md "Check 1: Context Compression Alert"

---

### [2026-02-26] Cron Job Auto-Disable Pattern
- **Symptom:** 6 cron jobs repeatedly auto-disabled (Evening Routine, Daily Inquiry, Daily Config, etc.)
- **Root Cause:** Discord delivery without explicit channel ID in `delivery.to` field
  - Example: `"delivery": {"mode": "announce"}` (missing `"to": "C0AH4QSA71T"`)
  - Without explicit channel, job fails to post → auto-disables
- **Fix:**
  1. Identified pattern: Mar 10, 12, 15 all had missing channel IDs
  2. Updated cron job schema validation
  3. Re-enabled all 6 jobs with explicit channel IDs
  4. Added SAFEGUARD to AGENTS.md: "Always use explicit channel IDs in delivery.to"
- **Result:** No auto-disables in last 7 days
- **Prevention:** 
  - Cron job creation now requires explicit channel ID in delivery config
  - Pre-deployment validation checks for missing "to" field
  - Kanban protocol notes this as critical (see AGENTS.md Cron Job Configuration)
- **Reference:** AGENTS.md "Cron Job Configuration (SAFEGUARD)" section

---

### [2026-03-07] Kanban Approval Bottleneck
- **Symptom:** 4-5 review cards stuck indefinitely waiting for approval; no way to approve from notification
- **Root Cause:** Approval buttons not rendered in Discord/notification UI; Joe must navigate to kanban board separately
- **Impact:** ~4-5 hrs/week of manual approval checking; slows iterative work
- **Status:** Known issue, not yet fixed (requires UI improvement)
- **Prevention:** [Pending fix in next cycle]
- **Reference:** AGENTS.md "KNOWN ISSUE: Kanban Approval Bottleneck"

---

## Code & Development

### [2026-02-21] Dashboard "No Data Available" Error
- **Symptom:** Dashboard showed "No data available" even though system was running
- **Root Cause:** Wrong gateway methods called
  - Tried: `node.list()` (returns clients, not sessions)
  - Tried: `usage.summary()` (doesn't exist)
  - Needed: Read sessions from disk + query gateway for recent status
- **Fix:** Created `refresh.js` that:
  1. Queries gateway `status()` method (correct endpoint)
  2. Reads `stats.json` for API costs
  3. Reads `jobs.json` for cron status
  4. Generates `data.json` for dashboard display
- **Result:** Dashboard now shows accurate session count + costs + jobs
- **Prevention:** Always check OpenClaw API docs before calling methods; test locally with logging
- **Reference:** See `~/.openclaw/dashboard/refresh.js`

---

### [2026-02-26] HAL Dispatch Blocked by One-Card Rule
- **Symptom:** HAL idle dispatcher wouldn't pick up new work even though `in_progress` was empty (from HAL's perspective)
- **Root Cause:** Misunderstanding of "HAL only picks up new card when in_progress is empty"
  - HAL was checking global `in_progress` column (which had Alfred's cards)
  - Should have been checking HAL-specific `in_progress` (just HAL's cards)
- **Fix:** Clarified rule in AGENTS.md:
  - "HAL only picks new card if NO HAL cards are in_progress"
  - "Alfred may have multiple in_progress cards (parallel work)"
  - "HAL queue is separate from Alfred's work queue"
- **Result:** HAL dispatch working correctly
- **Prevention:** Document per-agent queues clearly; distinguish between global board state + agent-specific state
- **Reference:** AGENTS.md "Critical constraint" under HAL section

---

### [2026-03-09] Model Version Assumptions
- **Symptom:** Standardized all models to 4.5 without asking (Opus should be 4-6)
- **Root Cause:** Made assumption based on incomplete information instead of asking Joe
- **Learning:** Don't standardize config without explicit confirmation
- **Fix:** Reverted Opus to 4-6 per Joe's clarification
- **Prevention:** When finding config inconsistencies, ask first; don't auto-correct across all files
- **Reference:** MEMORY.md "Clarifications from Joe (8:59 AM)"

---

## Operations & Notifications

### [2026-03-15] Duplicate Daily Inquiry Questions
- **Issue:** Same questions cycle every 4 days without deduplication
  - "What passive income opportunities should we explore?"
  - "What synergies exist between projects?"
  - Asked repeatedly, same answer each time
- **Root Cause:** No "last_asked" timestamp tracking; questions regenerated fresh each time
- **Impact:** Erodes trust in notification system; wastes tokens on repeat analysis
- **Status:** Known issue, awaiting implementation of question deduplication
- **Prevention Needed:** Add `last_asked` timestamp to question registry; skip if <7 days old
- **Reference:** MEMORY.md "Daily Inquiry Duplicate Questions (PRIORITY 1)"

---

### [2026-03-17] Cron Job Channel Routing Implicit vs Explicit
- **Symptom:** 6+ critical jobs auto-disabled on Mar 10, 12, 15
- **Root Cause:** Using `delivery.mode="announce"` without explicit `delivery.to` field
  - System tried implicit routing (doesn't work reliably)
  - Job failed silently → auto-disable
- **Learning:** Always be explicit; never assume implicit behavior works
- **Fix:** Add explicit channel IDs to all delivery configs
- **Prevention:** Pre-deploy validation enforces explicit channel IDs for cron jobs
- **Reference:** AGENTS.md "Cron Job Configuration (SAFEGUARD)"

---

## Documentation & Memory

### [2026-02-18] Config Drift Prevention
- **Issue:** Multiple config files (AGENTS.md, TOOLS.md, MODEL-POLICY.md) can diverge
- **Root Cause:** Manual edits without consistency checks
- **Fix:** 
  1. Created daily config report that cross-references all docs
  2. Flagged inconsistencies (e.g., model versions, permission scopes)
  3. Proposed fixes automatically
- **Result:** Config now validated daily; drifts caught within 24h
- **Prevention:** Run config check before every session; always update in one place (source of truth)
- **Reference:** AGENTS.md "Write-Ahead Logging (Required)" section

---

### [2026-03-20] Documentation Completeness Gaps
- **Issue:** Project documentation incomplete (CoinUsUp had README, Even Us Up + Signal App missing)
- **Root Cause:** Documentation is easy to defer; not prioritized
- **Learning:** Comprehensive documentation prevents repeat questions + helps agents
- **Fix:** Created detailed READMEs for all projects (template: architecture, DB schema, API, deployment, known issues)
- **Prevention:** All new projects must have README on creation; include in checklist
- **Reference:** See Expense_Sharing/README.md and signal-app-mvp/README.md

---

## Pattern Findings (Not Bugs, But Useful Patterns)

### Successful Patterns ✅

#### Pattern: Off-Hours Cron Scheduling
- **Finding:** Running compute-heavy crons at night (2-6 AM) prevents quota window exhaustion during day
- **Benefit:** Can use full quota for interactive work without blocking on background jobs
- **Implementation:** All daily crons scheduled 2-6 AM; spread 5 min apart to avoid thundering herd
- **Reference:** AGENTS.md "Kanban Protocol" + HEARTBEAT.md

#### Pattern: 3-Tier Backup System
- **Finding:** Local git + GitHub hourly + weekly archives provide bulletproof recovery
- **Benefit:** Can recover from any single failure (local disk, GitHub account, etc.)
- **Implementation:** 
  1. Local git (instant)
  2. GitHub push hourly (cloud, accessible)
  3. Archive to `/Users/hopenclaw/.alfred-backups/` weekly (cold storage)
- **Reference:** MEMORY.md "3-Tier Backup System"

#### Pattern: Handoff Contracts for HAL Work
- **Finding:** Explicit contracts (objective + deliverables + validation) prevent back-and-forth
- **Benefit:** HAL knows exactly what's needed; reduces review cycles + rework
- **Implementation:** `goals/handoffs/TEMPLATE.json` with required fields
- **Reference:** AGENTS.md "Alfred-HAL Handoff Contract"

#### Pattern: Write-Ahead Logging for Tasks
- **Finding:** Updating ACTIVE-TASK.md + kanban card comments BEFORE work prevents context loss
- **Benefit:** If session resets, next boot reads card comments + ACTIVE-TASK.md to recover approach
- **Implementation:** Before multi-step task: update file → post kanban comment → do work → update again
- **Reference:** AGENTS.md "Write-Ahead Logging (Required)"

---

## Quick Reference: Bug Lookup by Symptom

| Symptom | Issue | See |
|---------|-------|-----|
| CPU high during idle | Ollama model not unloading | [2026-02-17] |
| Config values inconsistent | Manual edits without validation | [2026-02-18] Config Drift |
| Gateway doesn't inject MEMORY.md | File > 20KB | [2026-02-18] Memory.md |
| Cron jobs auto-disable | Missing `delivery.to` channel ID | [2026-02-26] |
| Dashboard shows "No data" | Wrong gateway methods | [2026-02-21] |
| HAL won't pick up new cards | Misunderstanding of in_progress rule | [2026-02-26] HAL Dispatch |
| Same questions asked repeatedly | No deduplication tracking | [2026-03-15] |
| Repo has exposed credentials | No .gitignore + pre-commit | [2026-02-18] GitHub Token |

---

## How to Add New Learnings

**When you find a bug:**
1. Document it here with timestamp
2. Include: symptom, root cause, fix, prevention
3. Link from relevant ticket/PR
4. Update "Quick Reference" table if it's a common pattern

**Format:**
```markdown
### [YYYY-MM-DD] Bug Title
- **Symptom:** What the user saw
- **Root Cause:** Why it happened
- **Fix:** How we fixed it
- **Prevention:** How to prevent next time
- **Reference:** Link to related docs/code
```

---

**Last Updated:** 2026-03-23  
**Maintained By:** Alfred  
**Review Schedule:** Monthly (audit for patterns)
