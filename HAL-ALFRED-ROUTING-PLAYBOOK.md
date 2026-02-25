# HAL ↔ Alfred Routing Playbook

**Date:** 2026-02-25  
**Status:** Active  
**Goal:** Send each task to the cheapest/fastest system that can do it reliably.

---

## 1) Ownership Model

### HAL owns (default first pass)
Use HAL when the task is **short, deterministic, local-data-centric**:
- Shell checks, file ops, parsing, transforms
- Small summaries (<= 400 words source)
- Classification/tagging/extraction
- Structured conversions (JSON/CSV/Markdown cleanup)
- Embeddings/retrieval with `nomic-embed-text`
- Privacy-sensitive local-only processing

### Alfred owns
Use Alfred when the task needs **depth, reliability, or larger context**:
- Heavy code generation / refactors / architecture
- Multi-step reasoning and planning
- Large-context synthesis across many files/messages
- Cross-tool orchestration and external integrations
- Final decisioning when HAL confidence is low

---

## 2) Auto-Routing Rules (Deterministic)

Route to **HAL** if ALL are true:
1. Estimated steps <= 4
2. Input size <= ~8 KB text equivalent
3. No high-impact external action (no outbound posting/sending)
4. No security/legal/financial critical decision

Otherwise route to **Alfred**.

---

## 3) Escalation Triggers (HAL → Alfred)

Escalate immediately if ANY trigger fires:

1. **Complexity trigger**
   - Task branches into 2+ plausible strategies with tradeoffs
   - Requires multi-document synthesis or long-horizon planning

2. **Context trigger**
   - Working set exceeds ~8 KB or > 6 files/sections

3. **Reliability trigger**
   - HAL returns low confidence, ambiguous output, or malformed structure
   - Two failed attempts on the same objective

4. **Performance trigger**
   - HAL latency repeatedly > 12s for the same class of task
   - Queue/concurrency pressure detected

5. **Risk trigger**
   - Security-sensitive, compliance-sensitive, or irreversible operations

6. **Code trigger**
   - Refactor spans multiple modules OR introduces new architecture

---

## 4) Return-Downshift Rule (Alfred → HAL)

After Alfred resolves strategy:
- Push repetitive, deterministic follow-up steps back to HAL
- Keep Alfred for only the synthesis/decision checkpoints

This keeps cost low and throughput high.

---

## 5) Task Type Matrix

| Task Type | Primary | Fallback | Notes |
|---|---|---|---|
| File checks / shell diagnostics | HAL | Alfred | HAL default |
| Log parsing + pattern extraction | HAL | Alfred | Escalate if multi-source synthesis |
| Short summarization | HAL | Alfred | <=400 words source |
| Large summarization / comparative analysis | Alfred | — | Multi-source context |
| Simple script edits | HAL | Alfred | Escalate if architecture impact |
| Feature build / refactor | Alfred | — | Keep Alfred primary |
| Embeddings + retrieval | HAL | Alfred | `nomic-embed-text` |
| Security-impact decisions | Alfred | — | No HAL final decisions |
| Final recommendations to Joe | Alfred | — | HAL can prepare evidence |

---

## 6) Handoff Packet Format

When HAL escalates, include this exact payload:

```markdown
[HAL_HANDOFF]
Task: <one-line objective>
Why Escalated: <trigger(s) hit>
What HAL Tried: <attempt 1/2 summary>
Evidence: <key logs/data/paths>
Open Questions: <what needs decision>
Recommended Next Action: <single best next step>
[/HAL_HANDOFF]
```

When Alfred returns work to HAL:

```markdown
[ALFRED_DOWNSHIFT]
Objective: <deterministic subtask>
Inputs: <exact files/data>
Output Contract: <required format>
Validation: <pass/fail checks>
[/ALFRED_DOWNSHIFT]
```

---

## 7) Implementation Now (Phase 1)

1. Adopt these rules as default routing policy.
2. For every escalated task, include `[HAL_HANDOFF]` block.
3. For every delegated deterministic follow-up, use `[ALFRED_DOWNSHIFT]` block.
4. Use routing helper script before execution when task is ambiguous:
   - Manual scoring: `scripts/hal-alfred-route.sh --text "<task>"`
   - Manual + explain gates: `scripts/hal-alfred-route.sh --text "<task>" --explain`
   - JSON mode: `scripts/hal-alfred-route.sh --json --steps <n> --input-kb <n> --files <n> --text "<task>"`
   - Auto-estimation wrapper: `scripts/hal-alfred-route-auto.sh --text "<task>"`
   - Auto + explain: `scripts/hal-alfred-route-auto.sh --text "<task>" --explain`
   - Auto + files JSON: `scripts/hal-alfred-route-auto.sh --text "<task>" --file <path1> --file <path2> --json --explain`
5. Track first 20 routed tasks and measure:
   - HAL completion rate
   - Escalation rate
   - Rework rate
   - Median completion time

---

## 8) Tuning Targets (After 20 Tasks)

- **Target HAL first-pass success:** >= 70%
- **Target unnecessary escalations:** <= 15%
- **Target rework on Alfred outputs:** <= 10%
- **Target median cycle-time reduction:** >= 25% vs Alfred-only baseline

If targets miss:
- Raise/lower input-size threshold (8 KB → 6 KB or 10 KB)
- Tighten/relax step-count rule (<=4)
- Add task-specific exceptions by category

---

## 9) Quick Decision Checklist

- Is it short + deterministic + local? → **HAL**
- Is it deep + ambiguous + high-impact? → **Alfred**
- Unsure? → HAL triage first, Alfred final synthesis.

---

**Owner:** Alfred  
**Approved by:** Joe (2026-02-25)
