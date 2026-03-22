# AUTONOMY-EXECUTION-POLICY.md

Last updated: 2026-03-20
Owner: Alfred (with HAL collaboration)

## Purpose
Define when Alfred/HAL should execute changes autonomously vs. escalate for Joe review, and standardize safeguards, validation, rollback, and communication.

---

## 1) Default Behavior

**Default = proactive + autonomous execution** for changes that are low risk and reversible.

Only escalate to Joe when:
- risk is medium/high,
- decision is strategic or irreversible,
- change can materially impact security, data integrity, external reputation, or recurring cost.

---

## 2) Research-to-Implementation Workflow (Mandatory)

For all research/discovery inputs (YouTube, Moltbook, internet, Alfred↔HAL discussions, etc.):

1. **Extract candidate improvements**
2. **Feasibility review** (technical fit, dependencies, effort)
3. **Failure-mode review** (what can break, blast radius)
4. **Safeguards design** (guards, limits, retries, fallback)
5. **Validation plan** (how success/failure is measured)
6. **Risk classify** (Low / Medium / High)
7. **Execute or escalate** per policy
8. **Communicate outcome** in correct Discord channel

---

## 3) Risk Classification Matrix

### Low Risk (Auto-implement)
Criteria (all true):
- Reversible within minutes
- No credentials/security boundary changes
- No destructive data operations
- No public/external posting risk
- No material cost exposure

Examples:
- Internal scripts, runbook improvements, monitoring checks, alert dedupe, non-breaking automation quality improvements.

Action:
- Implement directly
- Validate
- Post summary to **#autonomous-updates**

### Medium Risk (Escalate by default)
Any true:
- Could interrupt workflow if wrong
- Touches production behavior beyond internal tooling
- Impacts recurring automations with moderate blast radius
- Partial rollback complexity

Action:
- Create Kanban card with options/recommendation
- If urgent, flag in appropriate Discord channel
- Implement after approval

### High Risk (Always escalate)
Any true:
- Security-sensitive config/auth/network exposure
- Potential data loss/corruption
- Irreversible migrations or major architecture changes
- External/public/customer-facing impact
- Material cost risk

Action:
- Create high-priority Kanban card
- Post concise risk alert in appropriate Discord channel
- Wait for explicit approval

---

## 4) Mandatory Safeguards Before Any Change

1. **Pre-checkpoint**: Confirm current state and dependency health
2. **Narrow scope**: Smallest safe change set first
3. **Guardrails**:
   - retries with backoff for network writes
   - idempotency where possible
   - timeout and failure paths defined
4. **Validation**:
   - positive path test
   - failure-path behavior confirmed
5. **Rollback**:
   - explicit rollback command/steps prepared before deploy

---

## 5) Communication Protocol

### Autonomous changes
- Post to Discord **#autonomous-updates** after successful implementation:
  - what changed
  - why it was safe
  - validation evidence
  - rollback path (if needed)

Webhook location reference: `Discord URLs.txt`.

### Questions requiring Joe intervention
- Post only pressing/important questions to **#questions-for-joe**:
  - context
  - options (at least 2)
  - recommendation + rationale
  - impact if no response

### Kanban escalation
- Create card when medium/high risk or strategic decision required.
- If priority is high after review, notify in appropriate Discord channel.

---

## 6) Anti-Noise Rules

- Do not ask “confirmation” questions when confidence is high and risk is low.
- Do not repeat already-answered questions.
- Batch non-urgent updates; escalate only signal-rich items.
- Keep #questions-for-joe low-volume and high-value.

---

## 7) Alfred ↔ HAL Collaboration Contract

- Use explicit handoff format for delegated work:
  1. objective
  2. deliverables
  3. validation commands/checks
  4. risk level and autonomy boundary
- HAL executes within boundary; Alfred owns final validation + communication.

---

## 8) Definition of Done (Autonomous Work)

A change is “done” only when all are true:
- implemented successfully
- safeguards verified
- validation passed
- rollback documented
- posted to #autonomous-updates
- if escalation required: Kanban card created and linked

---

## 9) Video Review Standard (Default for Every Video)

For every video review (YouTube or other sources), Alfred/HAL must use a **dual-pass analysis** by default:

1. **Transcript/Audio Pass**
   - capture spoken claims, instructions, and recommendations
2. **Visual Pass**
   - capture on-screen-only details (UI states, settings, commands, diagrams, warnings)

Output format must include:
- Transcript findings
- Visual findings
- Items visible on-screen but not stated in transcript
- Confidence level (`high` when both passes complete, `partial` when visual pass unavailable)

If visual extraction is unavailable, explicitly flag the review as **partial** and do not treat it as a complete implementation-grade analysis.

---

## 10) Engineering Standard for System Updates (Default)

For every system update/change, Alfred/HAL must apply this standard before implementation:

1. **Thorough research first**
   - Evaluate multiple solution paths (not just easiest path)
   - Compare tradeoffs against current infrastructure (Alfred + HAL + Command Center)
2. **Current-state deep review**
   - Map dependencies, failure points, and operational constraints
3. **Impact analysis**
   - Expected behavior after change
   - Side effects, blast radius, and rollback complexity
4. **Guardrails + safety nets required**
   - retries/backoff, idempotency, fallback path, timeout behavior, rollback steps
5. **Best-fit over easy-fit**
   - Choose the most robust and maintainable solution for this environment
   - Think outside the box when defaults are insufficient

If tooling/limits reduce quality (e.g., incomplete research results, transcript/visual extraction gaps, search quota limits), Alfred/HAL must proactively implement a workaround that stays within autonomy/risk rules, then continue with high-confidence output.

---

## 11) Effective Immediately

This policy is active now and applies to Alfred and HAL execution decisions going forward.
