# HAL ↔ Alfred Routing Playbook

> **⚠️ HAL: Load `HAL-DIRECTIVES.md` at the start of every session. It contains standing rules on commit/push policy, Discord formatting, and escalation gates that apply to ALL tasks.**



**Date:** 2026-02-28
**Status:** Active
**Goal:** Maximize HAL utilization — HAL runs Qwen 2.5 Coder 14B locally (zero API cost). Send everything HAL can handle to HAL; only escalate to Alfred what truly requires it.

---

## 1) Ownership Model

### HAL owns (default first pass — bias toward HAL)
HAL runs locally at zero API cost. **Send to HAL unless there's a clear reason not to.**
- Shell checks, file ops, parsing, transforms
- Summaries and analysis (any size that fits context)
- Classification/tagging/extraction
- Structured conversions (JSON/CSV/Markdown cleanup)
- Embeddings/retrieval with `nomic-embed-text`
- Privacy-sensitive local-only processing
- **Single-file bug fixes and code patches**
- **Test writing and test coverage expansion**
- **Code review and linting (per-file)**
- **Refactors within 1-2 files**
- **Dependency updates (non-breaking)**
- **Dead code removal, unused import cleanup**
- **Documentation updates and comment fixes**
- **Simple feature additions (single component/module)**

### Alfred owns
Use Alfred only when the task **clearly requires** depth beyond HAL's capability:
- Multi-file architecture changes (3+ files with interdependencies)
- Cross-system orchestration and external integrations
- Tasks requiring reasoning across 10+ interconnected files
- Security/compliance decisions with business impact
- Final decisioning when HAL has failed or expressed low confidence

---

## 2) Auto-Routing Rules (Deterministic)

Route to **HAL** if ALL are true:
1. Estimated steps <= 12
2. No input size limit (Qwen has 128K context — send large files freely)
3. No high-impact external action (no outbound posting/sending)
4. No security/legal/financial critical decision
5. Touches <= 3 files (for code changes)

Otherwise route to **Alfred**.

**Philosophy:** HAL attempt first, self-escalate on failure. The cost of a failed HAL attempt is just time (no API spend). Better to try HAL and escalate than to skip HAL and consume Alfred's API quota.

---

## 3) Escalation Triggers (HAL → Alfred)

Escalate immediately if ANY trigger fires:

1. **Complexity trigger**
   - Task branches into 3+ plausible strategies with significant tradeoffs
   - Requires multi-document synthesis across 10+ files

2. **Reliability trigger**
   - HAL returns low confidence, ambiguous output, or malformed structure
   - Two failed attempts on the same objective

3. **Performance trigger**
   - HAL latency repeatedly > 30s for the same class of task
   - Queue/concurrency pressure detected

4. **Risk trigger**
   - Security-sensitive, compliance-sensitive, or irreversible operations

5. **Code trigger**
   - Refactor spans 4+ modules OR introduces new cross-cutting architecture

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
| Log parsing + pattern extraction | HAL | Alfred | Escalate if 10+ sources |
| Summarization (any size) | HAL | Alfred | Qwen handles large context |
| Code review (per-file) | HAL | Alfred | HAL reads + comments |
| Bug fix (1-2 files) | HAL | Alfred | HAL attempts first |
| Test writing / coverage | HAL | Alfred | HAL writes, Alfred reviews if complex |
| Refactor (1-3 files) | HAL | Alfred | Escalate if cross-cutting |
| Dependency updates | HAL | Alfred | Non-breaking only |
| Dead code / import cleanup | HAL | Alfred | HAL commits directly (non-CUU) |
| Documentation updates | HAL | Alfred | HAL default |
| Simple feature (single module) | HAL | Alfred | Escalate if multi-module |
| Multi-file architecture change | Alfred | — | 4+ interdependent files |
| Embeddings + retrieval | HAL | Alfred | `nomic-embed-text` |
| Security-impact decisions | Alfred | — | No HAL final decisions |
| Cross-system orchestration | Alfred | — | External APIs / integrations |
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

- **Target HAL first-pass success:** >= 75%
- **Target unnecessary escalations:** <= 10%
- **Target rework on Alfred outputs:** <= 10%
- **Target HAL utilization:** >= 60% of dispatch windows active

If targets miss:
- Tighten/relax step-count rule (<=12)
- Tighten/relax file-count rule (<=3)
- Add task-specific exceptions by category
- Adjust Qwen temperature/context settings

---

## 9) Quick Decision Checklist

- Can HAL reasonably attempt it? → **HAL** (zero cost to try)
- Is it deep + multi-file + high-impact? → **Alfred**
- Unsure? → **HAL first.** Escalate if it fails. The cost of a failed HAL attempt is only time.

---

**Owner:** Alfred
**Approved by:** Joe (2026-02-28)
**Note:** HAL now runs on remote gateway (192.168.2.79) with Qwen 2.5 Coder 14B — zero API cost. Routing aggressively biased toward HAL.
