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

