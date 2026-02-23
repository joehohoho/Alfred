# ACTIVE-TASK.md — Write-Ahead Task State

**Purpose:** Persist current task state so it survives context death. Updated BEFORE starting work and AS steps complete.

**Rule:** If this file has content, you have unfinished work. Read it on session start.

---

## Current Task

**Status:** idle
**Started:** —
**Last Updated:** —

### Objective
_(none)_

### Plan
_(none)_

### Progress
_(none)_

### Next Step
_(none)_

### Context Needed
_(none)_

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
