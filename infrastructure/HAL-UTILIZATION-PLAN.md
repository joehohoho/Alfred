# HAL Utilization Management Plan (2026)

**Author:** Alfred (Project Manager)  
**Date:** March 2, 2026  
**Purpose:** Ensure HAL stays properly assigned, utilized, and productive on high-value work

---

## Executive Summary

Alfred is now **Project Manager** for HAL utilization. Goals:
1. Keep HAL at **70-80% utilization** (high-complexity work)
2. Automatically route high-complexity tasks from **todo → HAL dispatch**
3. Monitor progress and escalate blockers
4. Maintain clean handoff protocol between Alfred and HAL

---

## Task Complexity Classification (Routing Guide)

### ROUTE TO ALFRED (Low-Medium Complexity)
- **1-2 hour tasks** (quick wins, bug fixes, documentation)
- **Analysis & recommendations** (audits, research, planning)
- **Coordination tasks** (kanban management, notifications, status updates)
- **Code reviews & approvals** (HAL deliverable validation)

### ROUTE TO HAL (High Complexity)
- **5+ day projects** (major migrations, feature builds, architecture work)
- **Complex domain logic** (tax automation, trading signals, ML models)
- **Multi-component system work** (CRA→Vite, infrastructure upgrades)
- **Parallel execution needed** (work on multiple apps simultaneously)

### THRESHOLD FOR DISPATCH

Use hal-alfred-route.sh to decide:
```bash
# Example: assess task complexity
bash ~/.openclaw/workspace/scripts/hal-alfred-route.sh \
  --text "migrate command-center from CRA to Vite" \
  --steps 12 \
  --input-kb 500 \
  --files 50 \
  --json
```

**If output shows:**
- `"route":"HAL"` + confidence > 0.70 → **DISPATCH TO HAL**
- `"route":"Alfred"` or confidence < 0.70 → **Keep with Alfred**

---

## HAL Assignment Workflow

### Weekly Cycle (Every Monday, 9 AM AST)

**1. Review Capacity (9:00-9:15 AM)**
- Check if HAL has active subagent runs
- If HAL is idle → move to Step 2
- If HAL is busy → schedule next assignment for 24-48h out

**2. Scan Kanban for High-Complexity Work (9:15-9:30 AM)**
- Filter `todo` column for:
  - Estimated effort > 5 days
  - Complexity keywords: "migrate", "build", "automate", "design", "architecture"
  - Priority = HIGH or URGENT
- Score top 3 candidates using routing script

**3. Dispatch HAL (9:30-10:00 AM)**
```bash
sessions_spawn \
  --runtime subagent \
  --agentId hal \
  --mode run \
  --label "HAL: [brief task name]" \
  --task "Full task description"
```

**4. Post Kanban Assignment (10:00 AM)**
- Move card from `todo` → `in_progress`
- Post comment with:
  - HAL run ID
  - Expected completion timeline
  - Success criteria
  - Key constraints (no push, no breaking changes, etc.)

---

## Current Work Queue

### Active Assignment (Started Mar 2, 3:47 PM)
- **Task:** 🔐 Fix webpack vulns: Migrate command-center from CRA to Vite
- **Run ID:** c7d22601-7287-4271-8a35-3ed10b0ff29f
- **Est. Completion:** Mar 3, 2026 (6-8 hours from start)
- **Status:** Auto-announcing on completion

### Next High-Priority Candidates (Queue Order)
1. **HST/GST Filing Automation MVP** (task_1772460648007_05e7901f)
   - Effort: HIGH (tax domain logic, complex state machine)
   - Timeline: 1-2 weeks
   - Est. Start: Mar 3 or Mar 4

2. **Channel Expansion Pilot** (task_1772199318344_19e8fa66)
   - Effort: MEDIUM-HIGH (market strategy + execution)
   - Timeline: 1-2 weeks
   - Est. Start: Post webpack migration

---

## Alfred's Monitoring Responsibilities

### Daily Check (3 PM AST)
- Review kanban for blockers or stale assignments
- Monitor active HAL progress (if mid-session)
- Post status updates if needed

### Task Handoff Protocol (When HAL Completes)
1. **Review** HAL's commit locally:
   - Verify success criteria met
   - Check for warnings/errors
   - Validate test coverage
2. **Approve** by posting kanban comment: "✅ REVIEWED & APPROVED — Ready to push"
3. **Move card** to `done` (per Kanban auto-move rule from Feb 27)
4. **Optional Push** (if Joe hasn't already):
   - Git push origin main
   - Notify Joe via Discord webhook if high-impact work

### Blocking Issues
- If HAL hits a blocker → **ESCALATE to Joe immediately**:
  ```bash
  bash ~/.openclaw/workspace/scripts/send-notification.sh \
    "question" \
    "HAL Blocked: [Task]" \
    "[Description of blocker + context]" \
    "" "" "hal-blocked"
  ```

---

## Utilization Targets

### Healthy Utilization
- **HAL running:** 70-80% of available time
- **Idle between tasks:** 5-10% (intentional gap for transitions)
- **Blocked:** <5% (immediate escalation if exceeded)

### Weekly Throughput
- **Complex tasks:** 1-2 per week (5-15 day effort each)
- **Simple tasks:** 0-1 (Alfred handles most of these)
- **Concurrent tasks:** Up to 2 parallel (if spawning new sessions)

### Quality Gates
- **Code quality:** No console errors/warnings in builds
- **Test coverage:** HAL responsible for own testing
- **Documentation:** Every commit includes migration/setup notes
- **Security:** All work must pass `npm audit` (0 vulns) or equivalent

---

## Long-Term Growth Plan (Q2 2026)

### Phase 1: Stabilize (Weeks 1-2)
- ✅ HAL on webpack migration (in progress)
- Complete next 2-3 high-complexity tasks
- Measure time-to-delivery for similar tasks
- Refine routing thresholds

### Phase 2: Expand (Weeks 3-4)
- Assign 2 concurrent HAL tasks (run parallel sessions)
- Explore multi-module work (e.g., Signal App + CoinUsUp simultaneously)
- Build reusable automation/deployment templates

### Phase 3: Optimize (Week 5+)
- Autonomous task discovery (HAL suggests high-priority work)
- Self-healing error recovery (HAL restarts failed builds)
- Continuous monitoring (HAL health checks its own output)

---

## Decision Log

### Decision 1: Alfred = Project Manager (Mar 2, 3:47 PM)
**Rationale:** Alfred coordinates HAL work while handling tactical tasks. Clear separation of concerns improves throughput.
**Implementation:** Weekly cycle starting Monday 9 AM AST.

### Decision 2: HAL Runs in `run` Mode (No Session Mode)
**Rationale:** Run mode auto-announces completion; no polling needed. Clean handoff without continuous monitoring.
**Tradeoff:** No back-and-forth feedback loop (design confirmed upfront in task description).

### Decision 3: Strict Local Commit Policy
**Rationale:** All HAL work committed locally first. Alfred reviews before push. Prevents accidental pushes and enforces quality gates.
**Implementation:** Task description explicitly forbids push; Alfred reviews + approves in kanban comment.

---

## File Locations

- This plan: `~/.openclaw/workspace/HAL-UTILIZATION-PLAN.md`
- Routing script: `~/.openclaw/workspace/scripts/hal-alfred-route.sh`
- Kanban board: `http://localhost:3001/kanban`
- Active task log: `~/.openclaw/workspace/ACTIVE-TASK.md`
- Daily memory: `~/.openclaw/workspace/memory/2026-03-02.md` (and future dates)

---

## Quick Reference: HAL Assignment Template

Use this when creating new HAL tasks:

```markdown
**ASSIGNMENT: [Task Title]**

PRIORITY: HIGH | Kanban: [card_id] | Timeline: [days]

## Objective
[One sentence goal]

## Current State
[What exists now]

## Target State
[What should exist after]

## Work Plan
[Phases: 1. Setup, 2. Build, 3. Test, 4. Commit]

## Success Criteria (All Required)
✓ [Requirement 1]
✓ [Requirement 2]
✓ [Requirement 3]

## Key Constraints
- [Constraint 1]
- [Constraint 2]

## Timeline
Target: Complete within [X hours/days].

Execute now.
```

---

## Next Action

**Alfred's immediate tasks:**
1. ✅ Dispatch HAL on webpack migration (DONE at 3:47 PM)
2. ⏳ Monitor for HAL completion (auto-announce expected)
3. ⏳ Review HAL's commit when ready
4. ⏳ Prepare HST/GST Filing task for dispatch (next in queue)

**Cycle repeats:** Every time HAL completes a task, Alfred immediately moves to the next high-priority candidate from the queue.

---

*Last updated: Mar 2, 2026 — 3:48 PM AST*
