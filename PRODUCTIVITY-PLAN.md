# PRODUCTIVITY-PLAN.md — Value-First Productivity (Low Idle, Low Waste)

## Objective
Increase productive output while minimizing idle time **without** burning API credits or hitting Anthropic subscription limits.

## Success Criteria
- Less idle time, but only with meaningful output
- Higher % of tasks that ship a concrete artifact
- Fewer repeated/rejected ideas
- Model spend proportional to delivered value

---

## 1) Value-First Task Selection
When no assigned Kanban work is active, select work in this order:
1. Revenue acceleration (Signal App, CoinUsUp, deploy blockers, conversion levers)
2. Reliability/risk reduction (bugs, flaky automations, failed jobs)
3. Reusable leverage (scripts, templates, workflows)
4. Research-backed ideas (only if evidence supports demand/profitability)

If a task cannot be tied to one of the above, skip it.

---

## 2) Pre-Execution Value Gate (Mandatory)
Before starting a proactive task, capture:
- Expected artifact (card/comment/spec/script/report)
- Value type (revenue, risk, time savings, leverage)
- Time-to-value estimate
- Stop condition (what makes this not worth continuing)

Do not proceed if value is vague.

---

## 3) Model Cost Guardrails
Default routing:
- Local/Codex first
- Haiku only if local/codex insufficient
- Sonnet only for complex high-impact reasoning
- Opus only for high-stakes decisions

Rules:
- Batch related analysis into one pass
- Reuse prior outputs/checkpoints; avoid repeated re-analysis
- Escalate model tier only when expected value gain is clear

---

## 4) Anthropic Subscription-Limit Aware Behavior
- Prefer short verification passes over repeated deep analysis
- Avoid recursive “re-think” loops on same prompt/context
- Keep ideation evidence-focused and concise
- Pause/escalate to Joe only when high uncertainty blocks real progress

---

## 5) Idea Quality Standard (Mandatory Before Card Creation)
For every new idea card, include in description:
- Demand evidence (buyer pain, trend/search signal, competitor activity)
- Monetization path (pricing model + realistic first pricing hypothesis)
- Profitability estimate (build + run cost vs margin potential)
- Speed-to-first-dollar
- Key risks/constraints (legal/data/distribution)
- Recommendation: Go / Test / Reject

No evidence = no card.

---

## 6) Duplicate & Rejection Learning Protocol
Before creating a new idea:
1. Review current board for similar titles/themes
2. Review `rejected` cards and comments
3. Filter out ideas matching rejection patterns

Operationalized safeguards:
- `scripts/kanban-create.sh` blocks duplicate titles across all columns by default
- Joe rejection comments are treated as hard learning signals for future filtering

---

## 7) Integrate Existing Idle Systems
Existing systems to use (not replace):
- `scripts/kanban-idle-loop.sh` (30-min loop)
- `ALFRED-PROACTIVE-TASKS.md` rotation pool
- `HAL-PROACTIVE-TASKS.md` rotation pool

Directive overlay:
- Choose highest-value eligible task from pools
- Prioritize tasks with tangible deliverables
- Post evidence-backed output only

---

## 8) Output Quality Bar (Definition of “Productive”)
A proactive cycle is productive only if it delivers one of:
- A decision-ready recommendation with evidence
- A working artifact (script/spec/implementation patch)
- A measurable improvement (time saved, risk reduced, conversion/revenue uplift path)

Status-only activity does not count as productivity.

---

## 9) Lightweight Review Cadence
At end of day (or checkpoint), review:
- What was shipped
- Value produced
- Token/cost efficiency
- Any repeated low-value patterns to eliminate

Adjust next-day queue accordingly.

---

## Immediate Operating Defaults (Active)
1. No duplicate/recycled idea cards
2. Rejected-comment learning mandatory
3. Evidence-backed ideation mandatory
4. Cost-aware model routing mandatory
5. Busy ≠ productive; output must show real value
