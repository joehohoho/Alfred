# Alfred↔HAL Handoff Protocol

**Effective:** 2026-03-09  
**Status:** ✅ LIVE  
**Version:** 1.0

---

## Purpose

Formalize the contract for every task delegated from Alfred to HAL. Eliminates ambiguity, prevents rework, ensures clarity on deliverables + acceptance criteria before work begins.

---

## Quick Start

### For Alfred (Creating a Handoff)

1. **Create handoff JSON** from template:
   ```bash
   cp goals/handoffs/TEMPLATE.json goals/handoffs/card_XXX.json
   ```

2. **Fill in all required fields:**
   - `objective` — one-line goal + constraints (15+ chars)
   - `constraints` — hard boundaries (min 1)
   - `deliverables.code/tests/docs` — exact artifacts (min 1 each)
   - `validation_command` — shell command to prove it's done
   - `success_criteria` — measurable acceptance criteria (min 1)
   - `owner` — who approves (usually "alfred")
   - `deadline` — ISO date (future only)
   - Optional: `estimated_effort.hours` + `context`

3. **Validate the handoff:**
   ```bash
   bash scripts/validate-handoff.sh card_XXX
   ```

4. **Move card to HAL queue** once validated

### For HAL (Accepting a Handoff)

1. **Read the handoff JSON**
   ```bash
   cat goals/handoffs/card_XXX.json
   ```

2. **Verify understanding:**
   - Objective is clear + achievable?
   - Constraints are feasible?
   - Deliverables are specific?
   - Validation command is runnable?

3. **Post acceptance to kanban card:**
   ```
   ✅ **Alfred Handoff Accepted**
   - Objective: [restate in own words]
   - Deliverables understood: [bullet list]
   - Validation ready: [restate validation cmd]
   - Starting at [timestamp]
   ```

4. **If anything unclear:** Post blocker immediately with specific question before starting

5. **Before submitting for review:** Run validation command
   ```bash
   [validation_command from handoff]
   ```

6. **Submit for review:** Move card to "review" column + post completion comment

---

## Schema Details

### Required Fields

**`task_id`** (string, format: `card_XXX`)
- Kanban card ID
- Must match file name: `goals/handoffs/card_XXX.json`

**`objective`** (string, 15–250 chars)
- One-line goal + key constraints
- Specific enough HAL can't misinterpret
- ✅ Good: "Fix HAL dispatch latency without breaking message ordering"
- ❌ Vague: "Improve system"

**`constraints`** (array, ≥1 item)
- Hard boundaries for the task
- Include: scope limits, time/budget, safety rules, compatibility needs
- Examples:
  - "Do NOT modify ~/.openclaw/openclaw.json"
  - "Max 2h execution time"
  - "Preserve backward compatibility"

**`deliverables`** (object)
- **`code`** (array, ≥1 file): Exact paths to create/modify
- **`tests`** (array, ≥1 item): Test commands + expected output
- **`docs`** (array, ≥1 item): Documentation files to write

**`validation_command`** (string)
- Single shell command that proves task is done
- Must exit 0 on success
- Example: `npm test && bash scripts/validate.sh`

**`success_criteria`** (array, ≥1 item)
- Measurable acceptance criteria
- Checked manually by Alfred during review
- Examples:
  - "Preflight latency <3s for all probes"
  - "100% of tasks routed per policy"
  - "No regressions in existing tests"

**`owner`** (string: "alfred" | "hal" | "joe")
- Who approves/signs off
- Usually "alfred" (Alfred reviews before production)
- Use "joe" only for approval-gate tasks

**`deadline`** (string, ISO date: YYYY-MM-DD)
- When task must be complete + reviewed
- Must be future date

### Optional Fields

**`estimated_effort`** (object)
- `hours` (number, 0.25–40): Wall-clock hours
- `model_tier` (string: local|haiku|sonnet|opus): Recommended LLM tier

**`context`** (object)
- `parent_task_id`: Link to parent phase/epic
- `related_cards`: Other cards this depends on/affects
- `memory_refs`: Links to MEMORY.md sections for background
- `acceptance_note`: Personal note from Alfred to HAL on what matters most

---

## Validation

### Auto-Validation

Before HAL dispatch, the dispatcher runs:
```bash
bash scripts/validate-handoff.sh card_XXX
```

**What it checks:**
- ✅ File exists at `goals/handoffs/card_XXX.json`
- ✅ Valid JSON
- ✅ All required fields present + non-empty
- ✅ `task_id` format correct + matches filename
- ✅ `objective` length ≥15 chars
- ✅ `constraints` has ≥1 item
- ✅ `deliverables.code/tests/docs` all have ≥1 item
- ✅ `validation_command` non-empty
- ✅ `success_criteria` has ≥1 item
- ✅ `owner` is one of: alfred, hal, joe
- ✅ `deadline` is valid ISO date + future

**If validation fails:** Dispatcher blocks HAL assignment + posts kanban comment with specific error

### Manual Review

Alfred reviews before moving to production:
1. Run validation command → 100% pass rate
2. Check code quality, test coverage, docs completeness
3. Verify success criteria are met
4. Move card to "done"

---

## Dispatcher Gating

**Before assigning card to HAL queue:**

```bash
# Check handoff exists + is valid
handoff_file="goals/handoffs/${card_id}.json"

if [[ ! -f "$handoff_file" ]]; then
  echo "⚠️  No handoff contract. Blocking..."
  bash scripts/kanban-blocker.sh "$card_id" \
    "Missing handoff contract. Use: cp goals/handoffs/TEMPLATE.json $handoff_file"
  exit 0
fi

# Validate schema
if ! bash scripts/validate-handoff.sh "$card_id"; then
  bash scripts/kanban-blocker.sh "$card_id" \
    "Handoff validation failed. Fix constraints/deliverables/validation_command."
  exit 0
fi

# Valid! Dispatch to HAL
echo "✅ Handoff valid. Dispatching to HAL..."
```

---

## Example: Preflight Handshake Task

**File:** `goals/handoffs/card_001.json`

```json
{
  "task_id": "card_001",
  "objective": "Implement preflight handshake for HAL task dispatch: WS auth validation + chat.send probe before queue assignment, with 3-second timeout and fail-fast error handling.",
  "constraints": [
    "Do NOT modify ~/.openclaw/openclaw.json",
    "Probe timeout must be ≤3 seconds (fail fast)",
    "No blocking calls — probes must be async/concurrent",
    "Backward compatible: existing tasks should work without preflight",
    "Must preserve message ordering (no out-of-order deliveries)"
  ],
  "deliverables": {
    "code": [
      "gateway/preflight.js",
      "scripts/route-task.sh",
      "~/dispatcher-gating-logic.js"
    ],
    "tests": [
      "npm test -- gateway/preflight.test.js (expect: 12/12 passing)",
      "bash scripts/test-preflight.sh (expect: all probes work correctly)",
      "bash scripts/test-dispatcher-gating.sh (expect: blocking works)"
    ],
    "docs": [
      "PREFLIGHT-IMPLEMENTATION.md (architecture + examples)",
      "API.md (endpoint schemas)",
      "ROLLBACK.md (revert steps)"
    ]
  },
  "validation_command": "npm test && bash scripts/test-preflight.sh && bash scripts/test-dispatcher-gating.sh",
  "success_criteria": [
    "Both probes (auth + send) succeed <3s latency when healthy",
    "Probes fail gracefully on connectivity issues",
    "Dispatcher blocks HAL assignment if probe fails",
    "Failed tasks retry after 30s (max 3 retries)",
    "No regression in existing task dispatch",
    "Docs include examples of probe response + fallback"
  ],
  "owner": "alfred",
  "deadline": "2026-03-15",
  "estimated_effort": {
    "hours": 6,
    "model_tier": "haiku"
  },
  "context": {
    "parent_task_id": null,
    "related_cards": ["card_002", "card_003"],
    "memory_refs": ["MEMORY.md#Phase-1-Preflight"],
    "acceptance_note": "Get preflight right before routing policy. Focus on latency + error handling."
  }
}
```

**Validation:**
```bash
$ bash scripts/validate-handoff.sh card_001
✅ Handoff validation PASSED for card_001
   📌 Objective: Implement preflight handshake...
   🎯 Owner: alfred
   📅 Deadline: 2026-03-15
   ⏱️  Estimated: 6 hours
```

---

## HAL Acceptance Flow

When HAL receives handoff (card_001):

1. **Read:** `cat goals/handoffs/card_001.json`
2. **Understand:** Can I deliver this by 2026-03-15? Are constraints feasible?
3. **Post to kanban:**
   ```
   ✅ **Alfred Handoff Accepted**
   
   **Objective (restated):** Implement WS auth + chat.send probes with 
   3s timeout, async/concurrent, backward compatible, no ordering breakage.
   
   **Deliverables I'll produce:**
   - gateway/preflight.js (WS auth + send probes)
   - scripts/route-task.sh (routing engine)
   - dispatcher-gating-logic.js (retry budget)
   - Tests (3 suites: preflight, dispatcher, integration)
   - Docs (IMPLEMENTATION.md, API.md, ROLLBACK.md)
   
   **Validation I'll run:**
   npm test && bash scripts/test-preflight.sh && bash scripts/test-dispatcher-gating.sh
   
   **Starting:** 2026-03-09 18:00 UTC | **Target completion:** 2026-03-14
   ```

4. **If unclear:** Post blocker with specific question (before starting)
5. **When done:** Run validation command → should exit 0
6. **Submit for review:** Move to "review" + post comment:
   ```
   ✅ **Complete — Ready for Alfred Review**
   
   **Validation results:** [validation_command output]
   
   **What I delivered:**
   - [list of code files + line counts]
   - [test coverage %]
   - [docs created]
   
   **Success criteria met:** All 6 ✅
   
   Ready for production merge.
   ```

---

## Rejection & Rework

If Alfred reviews + finds issues:

1. **Move card back to "In Progress"**
2. **Post comment with specific feedback:**
   ```
   ❌ **Validation Failed — Rework Needed**
   
   **Issues:**
   1. Preflight latency is 4.2s (spec: <3s) — optimize concurrent calls
   2. ROLLBACK.md missing — add revert steps
   3. Test coverage only 82% (target: 90%+)
   
   **Next steps:** Fix issues + re-run validation. When all criteria pass, 
   re-submit for review.
   ```

3. **HAL reworks + re-submits**

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Handoff clarity** | 100% of HAL tasks use valid handoff | Dispatcher validation pass rate |
| **Rework reduction** | <5% of tasks rejected on first review | Review feedback → rework rate |
| **Deadline hit rate** | >95% of tasks complete by deadline | Date delivered vs deadline |
| **Validation success** | 100% of validation commands pass | Test exit code = 0 |

---

## Related Files

- **Template:** `goals/handoffs/TEMPLATE.json`
- **Schema:** `schemas/handoff.json`
- **Validator:** `scripts/validate-handoff.sh`
- **Examples:** `goals/handoffs/card_*.json`
- **Integration:** See "Dispatcher Gating" section in kanban-idle-loop.sh

---

## Questions?

If handoff creates ambiguity or seems unfeasible:
1. Post kanban blocker immediately (before starting work)
2. Specific question (not vague)
3. 2+ proposed solutions (show thinking)
4. Recommendation (what you think should happen)

Example blocker:
```
❌ **Handoff Clarification Needed**

**Issue:** Objective says "3-second timeout" but also "no blocking calls" 
+ concurrent probes. If both network + websocket probes run together, 
worst-case latency could exceed 3s total.

**Options:**
1. Sequential probes (one after other) — 3s per probe, safer but slower
2. Parallel probes (current spec) — may exceed 3s on slow networks
3. Hybrid (auth first, only send if auth OK) — best latency but requires ordering

**My recommendation:** Option 3 (hybrid). Auth tells us if gateway is alive; 
send probe only if auth passes. Keeps "fast fail" + respects 3s total SLA.

**What's your call?**
```

---

**Document version:** 1.0 (2026-03-09)  
**Last updated:** 2026-03-09  
**Maintained by:** Alfred
