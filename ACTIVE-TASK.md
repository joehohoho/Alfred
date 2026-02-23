# ACTIVE-TASK.md — Write-Ahead Task State

**Purpose:** Persist current task state so it survives context death. Updated BEFORE starting work and AS steps complete.

**Rule:** If this file has content, you have unfinished work. Read it on session start.

---

## Current Task

**Status:** in_progress
**Started:** 2026-02-23 15:46
**Last Updated:** 2026-02-23 15:46

### Objective
**Signal App — Fast Track Launch** (task_1771697313875_722f22e4)

Accelerate market signal detection app to live trading by early April. Three-phase timeline: architecture (Feb), UI/integration (Mar), beta/refinement (Apr).

### Plan
1. **Phase 1 (Feb 23-28):** Finalize architecture + data pipeline
   - Review current market-signal-lab design
   - Confirm data sources (Binance, crypto exchanges, macroeconomic indicators)
   - Validate ML feature set
   - Ensure backtesting framework ready
2. **Phase 2 (Mar):** Build UI + integrate market data + backtesting
   - Frontend (React) for signal dashboard
   - Real-time market data ingestion
   - Backtesting engine integration
   - Performance testing
3. **Phase 3 (Apr):** Beta + refinement
   - Beta user testing
   - Safety/edge case fixes
   - Go live with trading signals

### Progress
_(Starting)_

### Next Step
1. Read market-signal-lab current state (codebase review)
2. List data sources and confirm availability
3. Assess ML feature readiness
4. Create detailed Feb phase checklist

### Context Needed
- market-signal-lab repo state (`/Users/hopenclaw/market-signal-lab/`)
- Current backtesting engine status
- Data pipeline progress
- Joe's target metrics for "live trading ready"

### Pending Questions
<!-- PENDING-Q-START -->
- **Refresh OpenAI Codex OAuth Token** (_alert_, Feb 23 17:50)
  ID: `notif_1771869055670_040cd81d` — The Codex OAuth token expires Feb 28 at 3:42 PM. Run: openclaw configure --section model → select openai-codex → re-auth OAuth flow. If not refreshed,...
<!-- PENDING-Q-END -->

---

## How to Use This File

**Before starting any multi-step task:**
```
Status: in_progress
Started: [timestamp]
Objective: [what you're doing and why]
Plan: [numbered steps]
Progress: [completed steps with results]
Next Step: [what to do next]
Context Needed: [files, decisions, or state the next session needs]
```

**After each step completes:** Update Progress and Next Step.

**When task is done:** Set Status to `idle`, clear all fields.

**On session start:** If Status is `in_progress`, resume from Next Step. **Also check Pending Questions** — if any exist, you sent questions to Joe that haven't been answered yet. Re-read the notification for full context before proceeding.
