# Alfred Proactive Task Pool

When Alfred has no Kanban work and is idle, he picks tasks from this pool in rotation.
These are research, analysis, and planning tasks suited for Alfred's reasoning strengths.
HAL handles code-heavy tasks (see HAL-PROACTIVE-TASKS.md).

## Rules
- Output goes to Kanban Ideas column (for new ideas) or card comments (for audits/recommendations)
- Never modify production files — produce findings/recommendations only
- Pool index tracked in: .hal-alfred-tracking/alfred-proactive-pool-index.txt
- Rotate through all 8 tasks before repeating
- Each task should be completable in a single focused turn (15–30 min)
- **Before creating any new idea card:** review current board + `rejected` column comments to avoid repeats and learn Joe's rejection patterns
- **New idea quality bar (mandatory):** include demand evidence, competitor snapshot, monetization path, rough profitability estimate, time-to-first-dollar, key risks, and Go/Test/Reject recommendation in card description
- **Value-first filter:** skip tasks that don't produce a concrete artifact with measurable value (revenue impact, risk reduction, time savings, or leverage)

---

## Rotation Pool

1. **Passive income idea scan**
   Research 3 niche SaaS or automation opportunities in Joe's expertise areas: automation, trading signals, law firm tooling, Canadian SMB compliance, AI-assisted workflows. Focus on low-build, low-maintenance, recurring revenue with realistic solo-dev feasibility. For each idea: problem, target market, estimated MRR potential, tech complexity (1–5), competition level, and why Joe is positioned to win. Add top ideas to Kanban Ideas column.

2. **Canada-specific passive income scan**
   Focus specifically on Atlantic Canadian and NB SMB pain points: bilingual compliance, HST/GST filing, CRA deadlines, payroll (Ceridian gaps), trades/contractor invoicing, rural connectivity tools. Identify 2–3 software opportunities with geography-specific moat (competitors don't bother with small markets). Output: ideas for Kanban.

3. **CoinUsUp growth audit**
   Review what's known about CoinUsUp (workspace/CoinUsUp/ if exists, or from memory). Identify: top 3 user experience friction points, top 3 missing features users likely want, top 3 growth levers (SEO, virality, monetization). Output: prioritized recommendation list with effort estimates. Post to Kanban Ideas.

4. **Even Us Up growth audit**
   Review Even Us Up (expense sharing app). Identify: top 3 UX friction points, top 3 missing features, top 3 growth levers. Focus on what differentiates it from Splitwise/similar. Output: prioritized list with effort estimates. Post to Kanban Ideas.

5. **Alfred infrastructure improvement scan**
   Audit the current Alfred system: cron jobs, memory architecture, notification routing, HAL dispatch pipeline, Command Center integrations. Identify: gaps, failure modes, missing automation, duplicate effort, or ways to reduce token costs. Output: top 3 improvements not already in Kanban. Add to Kanban Ideas.

6. **Signal App monetization strategy**
   Research monetization models for the Stock/Crypto Buy/Sell Signal App: subscription tiers, freemium, one-time purchase, B2B API licensing. Benchmark 3 competitors. Identify best pricing strategy for early stage with Joe's audience. Output: recommendation with rationale. Post to Kanban Ideas or relevant card comment.

7. **Workflow efficiency scan**
   Identify the top 3 repetitive patterns in Joe's current workflow that Alfred handles (or should handle) better. Look for: tasks Joe does manually that should be automated, scripts that could be improved, notification noise, context-switching costs. Output: concrete improvement proposals. Update ALFRED-PROACTIVE-TASKS.md or post to Kanban Ideas.

8. **Passive income portfolio review**
   Take stock of all current revenue-generating (or potentially revenue-generating) projects: CoinUsUp, Even Us Up, Signal App, Automation Consulting. For each: current status, estimated current/potential MRR, biggest bottleneck to growth. Produce a one-page portfolio snapshot. Post summary to Kanban Ideas as a "portfolio health" card.

9. **Alfred ↔ HAL collaborative discussion**
   Pick the next topic from the Discussion Topics list below. Alfred prepares his own perspective (2–3 key points). Then dispatch HAL via sessions_spawn with the topic + "Provide your technical perspective, key risks, and top 3 actionable recommendations. Be specific." Synthesize both sides into a structured summary and post to Slack channel C0AH4QSA71T. Format: topic, context, Alfred's take, HAL's take, combined top recommendations.

---

## Discussion Topics (rotate in order, track index in .hal-alfred-tracking/discussion-topic-index.txt)

1. Passive income opportunities — top 3 realistic income streams Joe could build in 90 days
2. Signal App strategy — architecture, missing features, monetization, fastest path to first paying user
3. CoinUsUp growth — what's holding it back, top acquisition and retention levers
4. Alfred and HAL self-improvement — concrete upgrades each side proposes for themselves and the other
5. Even Us Up differentiation — how does it win against Splitwise, what features make users switch?
6. Joe's portfolio focus — where to spend energy next quarter for maximum ROI
7. Infrastructure and automation gaps — what's wasteful, missing, or fragile in Alfred/HAL/Command Center
8. Market trends to watch in 2026 — AI/SaaS/automation opportunities for new product ideas
9. Alfred and HAL collaboration quality — what's working, what's rough, what new patterns to try

---

## Passive Income Focus Note
Joe's #1 goal: financial independence via passive income so he can spend more time with family.
When in doubt, default to tasks that advance this goal (tasks 1, 2, 6, 8, 9).

---

## Workflow Efficiency Scan — 2026-03-06

### Top repetitive patterns and concrete improvements

1. **Repeated clarification loops in notifications (high context-switch cost)**
   - **Pattern:** Questions to Joe can still require follow-up because they arrive as one-off asks instead of decision packets with clear defaults.
   - **Impact:** Interruptions + delayed execution when Joe is in deep work.
   - **Improvement proposal:** Add a `scripts/decision-packet.sh` wrapper that enforces a structured template before any question is sent (context, decision needed, 2 options, recommendation, no-response default). Reject send if any field is missing.
   - **Success metric:** Reduce follow-up clarification notifications by 50% in 2 weeks.

2. **Kanban state drift (manual cleanup recurring every day)**
   - **Pattern:** Cards linger in `in_progress`/`review` without owner heartbeat, forcing repeated stale-card sweeps and manual interpretation.
   - **Impact:** Blocks HAL pickup logic, creates false workload picture, and burns cycles on board hygiene.
   - **Improvement proposal:** Add auto-enforcement policy: if a card has no update in 24h and has deliverables attached, move `review → done`; if `in_progress` stale >24h with no active lease, auto-move to `review` with audit comment.
   - **Success metric:** Keep stale `in_progress` count at 0 and reduce manual cleanup runs by 80%.

3. **Duplicate recurring prompts (notification noise)**
   - **Pattern:** Daily inquiry and proactive prompts can repeat near-identical questions/tasks within a short window.
   - **Impact:** Trust erosion + wasted cycles answering/processing duplicates.
   - **Improvement proposal:** Implement a shared dedupe ledger (`memory/automation-dedupe.jsonl`) with `content_hash + last_asked_at + cooldown_days`; skip/swap any item asked in last 7 days.
   - **Success metric:** Zero duplicate daily inquiry questions in a rolling 14-day window.

### Recommended implementation order (highest ROI first)
1. Dedupe ledger (fastest trust win)
2. Decision packet wrapper (cuts interruption overhead)
3. Kanban auto-enforcement policy (stabilizes pipeline)


## Workflow Efficiency Scan — 2026-03-09

### Top repetitive patterns and concrete improvements

1. **Duplicate Kanban reminder/comment batches (rework + noise)**
   - **Pattern:** Connectivity retries replay the same `[KANBAN-COMMENT-BATCH]`, causing duplicate processing passes.
   - **Impact:** Wasted execution cycles and risk of duplicate/conflicting card comments.
   - **Improvement proposal:** Add idempotency guard in comment-batch handler using `batch_hash + processed_at` ledger (`.hal-alfred-tracking/kanban-comment-batch-ledger.jsonl`). If same batch hash appears within 2h, acknowledge + skip reposting.
   - **Success metric:** 0 duplicate batch reprocessing events per week.

2. **Stale/null Kanban records forcing repeated cleanup sweeps**
   - **Pattern:** Idle loop repeatedly finds `null` stale in_progress cards and moves them, indicating upstream data integrity drift.
   - **Impact:** Board hygiene work keeps recurring; false state can block HAL pickup logic.
   - **Improvement proposal:** Add pre-clean validator in `kanban-idle-loop.sh` to detect null-id cards and quarantine them to a `kanban-data-anomalies.log` file, then auto-heal once per day (single batch) instead of each loop.
   - **Success metric:** Reduce stale-card cleanup actions by 70% and eliminate repeated `null` stale alerts.

3. **Ad-hoc model/cost explanations create decision friction**
   - **Pattern:** Same model hierarchy and subscription-quota questions recur during implementation (cost vs quota semantics).
   - **Impact:** Re-clarification overhead and slower approvals.
   - **Improvement proposal:** Add a single source briefing card/template (`HAL-MODEL-FAQ.md`) auto-linked in HAL-related comments: "subscription pool shared, no marginal monthly cost, quota gates at 70/75/85".
   - **Success metric:** Cut follow-up model-cost clarification questions by 50% over next 2 weeks.

### Recommended implementation order (highest ROI first)
1. Comment-batch idempotency guard (fastest/noise reduction)
2. Kanban null-card validator + daily heal batch
3. HAL model FAQ auto-linking in related card comments


## Workflow Efficiency Scan — 2026-03-11

### Top repetitive patterns and concrete improvements

1. **Null-card stale sweeps keep recurring in idle loop (board hygiene loop)**
   - **Pattern:** `kanban-idle-loop.sh` repeatedly reports stale `in_progress` items with `card_id=null` and auto-moves them.
   - **Impact:** Ongoing cleanup churn, unreliable board state, and potential blockage of HAL dispatch logic that depends on accurate `in_progress` status.
   - **Improvement proposal:** Add a strict schema check before stale-card logic (`card_id`, `column`, `updated_at` required). Invalid rows are quarantined to `logs/kanban-anomalies.jsonl` and excluded from move operations. Run a once-daily reconciliation script to repair/delete bad rows in one controlled batch.
   - **Success metric:** 0 `card_id=null` stale events for 7 consecutive days.

2. **Pending-question sync volume is high and likely includes stale asks (attention tax)**
   - **Pattern:** Sync currently pulls a large pending set (e.g., 9 open questions), which can include low-priority or superseded prompts.
   - **Impact:** Higher cognitive load when resuming sessions; important blockers can get buried by old noise.
   - **Improvement proposal:** Add priority+TTL to `sync-pending-questions.sh`: auto-archive non-critical unanswered questions older than 72h, keep only top 3 active blockers in `ACTIVE-TASK.md`, and include a compact “expired backlog” link.
   - **Success metric:** Reduce active pending questions displayed on boot to ≤3 while preserving full audit trail.

3. **Proactive task loop can recycle similar analyses without implementation closure (execution drift)**
   - **Pattern:** Repeated workflow scans generate good recommendations, but some recur across days without explicit owner, due date, or enforcement.
   - **Impact:** Insight accumulates faster than implementation; recurring work feels busy but not compounding.
   - **Improvement proposal:** Add a “proposal graduation gate”: every proactive scan must produce either (a) one new Kanban card with acceptance criteria, or (b) a status update on an existing card proving progress/blocker. If neither, mark task as `SKIP_DUPLICATE`.
   - **Success metric:** At least 70% of proactive scans convert into trackable Kanban actions within 24h.

### Recommended implementation order (highest ROI first)
1. Null-card schema guard + anomaly quarantine (stabilizes board truth)
2. Pending-question priority/TTL filtering (cuts context-switch overhead immediately)
3. Proposal graduation gate for proactive scans (improves execution throughput)


## Workflow Efficiency Scan — 2026-03-12

### Top repetitive patterns and concrete improvements

1. **Idle-loop repeatedly cleaning malformed Kanban rows (`card_id=null`)**
   - **Pattern:** The 09:01 idle run again detected stale `in_progress` entries with null IDs and moved them to `review`.
   - **Impact:** Repeated hygiene work, noisy logs, and risk that dispatch logic trusts corrupted board state.
   - **Improvement proposal:** Add a guardrail in `kanban-idle-loop.sh` to hard-skip rows missing `card_id`, write them once to `logs/kanban-anomalies.jsonl`, and trigger a single daily repair job (`scripts/kanban-anomaly-reconcile.sh`) instead of per-loop remediation.
   - **Success metric:** 0 recurring `STALE: null` events over 7 consecutive days.

2. **Heartbeat health checks surface the same Ollama MLX warning without triage status**
   - **Pattern:** Ollama responds quickly, but health checks keep returning MLX dynamic-library warnings, creating a recurring “is this critical?” decision.
   - **Impact:** Repeated manual interpretation and alert fatigue during routine heartbeat checks.
   - **Improvement proposal:** Add warning classification to heartbeat audit: if latency <1s and model commands succeed, classify as `DEGRADED_NON_BLOCKING`; open/attach one tracked Kanban incident and suppress repeat alerts unless severity changes.
   - **Success metric:** Reduce repeated identical Ollama alerts by 80% while preserving first-occurrence visibility.

3. **Proactive scans are generated frequently, but execution conversion remains inconsistent**
   - **Pattern:** Workflow scans are high quality but often remain in-document recommendations without immediate task ownership.
   - **Impact:** Context-switch cost persists because recommendations are re-discovered rather than implemented.
   - **Improvement proposal:** Enforce a conversion step in `alfred-proactive-check.sh`: on `DO_PROACTIVE`, require output to include either (a) target card ID commented, or (b) auto-created idea card JSON payload ready for `kanban-create.sh`.
   - **Success metric:** ≥75% of proactive scans produce a tracked Kanban artifact within the same run.

### Recommended implementation order (highest ROI first)
1. Null-row hard guard + daily reconciliation batch
2. Heartbeat alert classification + deduped incident tracking
3. Proactive-to-Kanban conversion enforcement
