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

## Historical Scans Archive

Historical workflow efficiency scans from 2026-03-06 through 2026-03-21 have been archived to `memory/ALFRED-PROACTIVE-SCANS-ARCHIVE.md` to reduce working file size and improve task selection clarity. The archive preserves audit trail of past recommendations (many of which have been implemented).

**Active recommendations** that remain unimplemented are documented in individual Kanban cards or the system reliability tracking files.

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


## Workflow Efficiency Scan — 2026-03-15

### Top repetitive patterns and concrete improvements

1. **Pending-question sync is flooding active context (attention thrash)**
   - **Pattern:** Idle loop synced **1863 pending questions** into ACTIVE-TASK state before dispatch.
   - **Impact:** High context-switch cost, slower prioritization, and increased risk that true blockers are buried.
   - **Improvement proposal:** Add a hard cap + triage tiering in `sync-pending-questions.sh`:
     - Keep only top 5 actionable blockers in ACTIVE-TASK.md
     - Auto-archive the rest to `memory/pending-questions-archive.jsonl`
     - Surface one-line counters (`critical`, `needs_decision`, `stale`) instead of full list expansion
   - **Success metric:** Active pending-question display reduced from 1863 to ≤5 in working context, with zero loss of audit trail.

2. **HAL proactive dispatch keeps retrying into unreachable gateway (wasted cycles)**
   - **Pattern:** HAL dispatch logs show repeated EHOSTUNREACH failures with a very high historical failure count (500+), even with backoff.
   - **Impact:** Repeated failed proactive attempts create noise and consume scheduler/runtime attention without productive output.
   - **Improvement proposal:** Add a circuit-breaker tier to `hal-idle-dispatch-cron.sh`:
     - After N consecutive network failures (e.g., 12), enter `degraded_offline` mode for 2 hours
     - In degraded mode, skip HAL dispatch and run local Alfred-only proactive tasks
     - Send one consolidated recovery probe per window; auto-exit on first success
   - **Success metric:** Reduce failed HAL dispatch attempts by 80% during outage windows while maintaining recovery responsiveness.

3. **Null-card stale cleanup remains unresolved and repeats every idle cycle (board hygiene debt)**
   - **Pattern:** `kanban-idle-loop.sh` still reports `STALE: null` entries and moves them repeatedly.
   - **Impact:** False board churn, reduced trust in board state, and potential blockage side effects for dispatch rules.
   - **Improvement proposal:** Enforce schema validation at read boundary:
     - Reject any row missing `card_id` before stale logic
     - Log first occurrence per day to `logs/kanban-anomalies.jsonl` (idempotent)
     - Add a daily repair script that reports root cause source table/file + rows fixed
   - **Success metric:** 0 repeated `STALE: null` events for 7 days and a daily anomaly report with deterministic repairs.

### Recommended implementation order (highest ROI first)
1. Pending-question hard cap + triage tiering (biggest immediate cognitive load reduction)
2. HAL dispatch circuit-breaker for gateway outages (reduces repeated failed work)
3. Kanban row schema gate + daily repair report (stabilizes board truth)


## Workflow Efficiency Scan — 2026-03-16

### Top repetitive patterns and concrete improvements

1. **Checkpoint sync keeps failing due to ACTIVE-TASK marker drift (manual rescue loop)**
   - **Pattern:** `sync-pending-questions.sh` failed again with `Markers not found in ACTIVE-TASK.md`.
   - **Impact:** Session checkpoint automation degrades to manual recovery; pending blockers become stale/inaccurate.
   - **Improvement proposal:** make sync script marker-agnostic with a structured section parser:
     - detect/create `## Pending Questions` if missing (self-heal)
     - support legacy + new marker variants
     - fail-soft (append recovery section) instead of hard exit
   - **Success metric:** 100% successful sync runs for 7 days (no marker-related failures).

2. **Kanban executor enters gateway-down path with invalid JSON (repeat outage handling overhead)**
   - **Pattern:** `kanban-work-executor-phase2.sh` reported `GATEWAY_DOWN: Invalid JSON response (HTTP 200)` and skipped dispatch.
   - **Impact:** Scheduler cycles are consumed without productive work; operator attention is pulled into repeated health triage.
   - **Improvement proposal:** add response contract validation + fast fallback:
     - treat malformed 200 as transport failure in circuit breaker counters
     - cache last-known-good board snapshot for read-only continuity
     - emit one consolidated incident every 30 min (deduped), not per run
   - **Success metric:** reduce duplicate gateway-down alerts by 80% and preserve deterministic no-op behavior during malformed responses.

3. **Null stale-card churn still recurring in idle loop (data integrity tax)**
   - **Pattern:** idle run still showed `STALE: null` entries being auto-moved.
   - **Impact:** noisy audits, false transitions, and potential side effects in downstream state logic.
   - **Improvement proposal:** enforce strict ID guard at API ingest boundary:
     - drop rows without valid `id` before stale evaluation
     - write a single daily anomaly digest (`count + sample payload + suspected source`)
     - block moves when card id is null/undefined (hard stop)
   - **Success metric:** zero `STALE: null` move attempts for 7 consecutive days.

### Recommended implementation order (highest ROI first)
1. Fix `sync-pending-questions.sh` self-healing parser (restores checkpoint reliability immediately)
2. Harden malformed-JSON gateway handling + deduped incidents (reduces outage noise/waste)
3. Add hard null-ID move guard + anomaly digest (stabilizes kanban truth)

## Workflow Efficiency Scan — 2026-03-17

### Top repetitive patterns and concrete improvements

1. **Cross-channel delivery failures from unresolved recipient aliases (retry/rework loop)**
   - **Pattern:** Proactive updates attempted with `message(action=send, channel=slack, to="joe")` fail because Slack requires explicit target format (`channel:<id>` / `user:<id>`).
   - **Impact:** Time lost on failed sends, fragmented updates (some logged only in memory), and inconsistent visibility of completed work.
   - **Improvement proposal:** Add a destination resolver layer used before every proactive send:
     - map human aliases (`joe`, `hal-completions`, etc.) → provider-safe IDs in one maintained registry file (e.g., `config/delivery-aliases.json`)
     - preflight validator script (`scripts/resolve-delivery-target.sh`) returns normalized target or hard-fails before send
     - fallback policy: if target unresolved, write to Kanban comment queue instead of retrying message send (applies 24/7, not just quiet hours)
   - **Success metric:** 0 proactive delivery failures due to invalid target format for 14 consecutive days.

2. **Analysis outputs are generated but not consistently converted into trackable Kanban artifacts (insight-to-execution gap)**
   - **Pattern:** High-quality strategy analyses (market trends, collaboration quality, passive income plans) are produced, but conversion to idea cards/comments is inconsistent.
   - **Impact:** Recommendations accumulate in logs/memory without clear owner, due date, or acceptance criteria; repeated rediscovery increases context-switch cost.
   - **Improvement proposal:** Enforce a “publish gate” on proactive completion:
     - every proactive analysis must end with either (a) a new Kanban idea card payload, or (b) a comment on an existing card with next action + owner
     - add `scripts/proactive-publish-gate.sh` to check for `artifact_type={idea_card|card_comment}` before marking run complete
     - include a 3-item action shortlist (`Now / Next / Later`) in each artifact to reduce review friction
   - **Success metric:** ≥80% of proactive analyses produce a Kanban artifact in the same run.

3. **Recurring malformed/stale Kanban records (`STALE: null`) still trigger cleanup churn (board integrity tax)**
   - **Pattern:** Idle loop continues to detect and move `null` stale entries.
   - **Impact:** Noisy audit logs, false board transitions, and reduced trust in dispatch state.
   - **Improvement proposal:** Add hard null-ID suppression + anomaly fingerprinting:
     - block stale-move actions when `card_id` is null/empty (no-op + log)
     - fingerprint anomaly payloads and suppress duplicate logs for 24h
     - run one daily reconciliation report listing source endpoint/table and suggested fix path
   - **Success metric:** zero `STALE: null` move attempts for 7 consecutive days; anomaly log volume reduced by 90%.

### Recommended implementation order (highest ROI first)
1. Delivery target resolver + preflight validation (eliminates immediate send failures)
2. Proactive publish gate to force Kanban artifact creation (turns insight into execution)
3. Null-ID suppression + anomaly fingerprinting in idle loop (stabilizes board truth)

## Workflow Efficiency Scan — 2026-04-08

### Top repetitive patterns and concrete improvements

1. **Joe-facing decision loops are repeating without triage or expiry (attention drag)**
   - **Pattern:** `OPEN-LOOPS.md`, `ACTIVE-TASK.md`, and `goals/notifications.json` all show the same blocked items resurfacing: CoinUsUp Stripe config, Bill Review scope, and several daily-inquiry questions. Some malformed records (`type: --title`, question fields in `goalId`/`taskId`) also leak into the active queue.
   - **Impact:** Important blockers get buried, Alfred keeps re-syncing noisy pending lists, and Joe sees repeat asks instead of a clean “top decisions only” stack.
   - **Improvement proposal:** Add a pending-question triage layer before sync:
     - normalize malformed notification schema into canonical fields
     - collapse duplicates by topic/card id into one active item with `first_asked_at`, `last_asked_at`, `times_asked`
     - surface only top 3 current blockers in `ACTIVE-TASK.md`, archive the rest to a backlog file
   - **Success metric:** active pending questions shown in working files reduced to ≤3, with zero duplicate asks on the same topic inside 7 days.

2. **Kanban/source-of-truth drift is still creating board hygiene overhead (data integrity tax)**
   - **Pattern:** `OPEN-LOOPS.md` shows multiple active cards as `null | null`, while idle-loop output still runs stale-card cleanup every cycle. That means upstream kanban extraction is still emitting invalid rows that later require cleanup.
   - **Impact:** Board state is less trustworthy, proactive routing can make poor assumptions, and idle-loop time is wasted on recurring hygiene.
   - **Improvement proposal:** add schema validation at kanban ingest, not just during cleanup:
     - reject rows missing id/title before they enter `OPEN-LOOPS.md`
     - write invalid payloads once per day to an anomalies log with source metadata
     - fail the refresh script “softly” with counts, rather than publishing `null` cards into the main dashboard
   - **Success metric:** 0 `null` active-card rows in `OPEN-LOOPS.md` for 7 consecutive days.

3. **Proactive work quality is decent, but closure into action remains inconsistent (execution leak)**
   - **Pattern:** the proactive pool explicitly says outputs should go to Kanban Ideas or a relevant card comment, but many scans live only in memory/task files. Historical scans repeatedly rediscover the same fixes: dedupe, null-card suppression, publish gates, checkpoint hardening.
   - **Impact:** Good analysis compounds more slowly than it should, and Alfred spends cycles rediscovering ideas instead of graduating them into implementation.
   - **Improvement proposal:** make proactive completion require one explicit landing artifact:
     - either append a vetted recommendation to `goals/ideas.json`, or post/update a linked card comment
     - include `problem`, `recommended fix`, `owner`, `trigger to act`, and `expected benefit`
     - if a scan repeats an existing recommendation, update its prior artifact instead of creating a fresh write-up
   - **Success metric:** ≥90% of proactive scans create or update one trackable artifact in the same run.

### Recommended implementation order (highest ROI first)
1. Pending-question triage + dedupe layer
2. Kanban ingest schema validation to block `null` rows upstream
3. Mandatory proactive artifact landing/update rule

## Workflow Efficiency Scan — 2026-04-09

### Top repetitive patterns and concrete improvements

1. **Reminder duplication is still consuming attention and trust (notification fatigue)**
   - **Pattern:** `ACTIVE-TASK.md` and `goals/notifications.json` currently contain multiple parallel reminders for the same two blockers: CoinUsUp Stripe trial config and Bill Review scope. The same topic appears as original question, reminder, unblock-needed reminder, and another reminder again on Apr 8-9.
   - **Impact:** Joe sees repeated asks instead of a single evolving decision packet, and Alfred's working context gets padded with duplicates that are not adding new information.
   - **Improvement proposal:** add a reminder coalescer before notification creation:
     - group by `cardId` or semantic topic hash
     - update the existing open notification instead of creating a new one when the ask is unchanged
     - escalate only when there is genuinely new context, a deadline change, or a stronger recommendation
   - **Success metric:** one active notification per blocker/topic, with zero near-duplicate reminders inside a 7-day window.

2. **Malformed kanban/notification records are leaking into primary dashboards (source-of-truth corruption)**
   - **Pattern:** `OPEN-LOOPS.md` still shows active cards as `null | null`, and `goals/notifications.json` includes malformed entries where `type` is `--title` and the actual question/context has spilled into `goalId`, `taskId`, or `source` fields.
   - **Impact:** Cleanup is happening too late. By the time Alfred sees the data, the working dashboard is already noisy and less trustworthy.
   - **Improvement proposal:** validate and normalize records at write time, not at read time:
     - reject or quarantine kanban rows with missing `id/title`
     - add schema repair for notifications so malformed reminder payloads are rewritten into canonical `{type,title,message,context,cardId}` form
     - publish anomaly counts separately instead of injecting broken rows into `OPEN-LOOPS.md`
   - **Success metric:** 0 `null` rows in `OPEN-LOOPS.md` and 0 malformed reminder records in `goals/notifications.json` for 7 consecutive days.

3. **Proactive scans still land in notes more reliably than in execution systems (follow-through gap)**
   - **Pattern:** today’s proactive task again required a manual choice of where to write findings, and the easiest path was appending to `ALFRED-PROACTIVE-TASKS.md`. That preserves thinking, but it does not by itself create an owned implementation path.
   - **Impact:** Good recommendations accumulate, but they compete with older scans and are easier to rediscover than to execute.
   - **Improvement proposal:** add a publish gate for proactive work:
     - require each proactive run to either create/update a Kanban idea artifact or append to an existing tracked recommendation with status
     - include `problem`, `proposed fix`, `expected benefit`, `owner`, and `next trigger`
     - if the recommendation already exists, update the prior artifact rather than creating another scan section
   - **Success metric:** 100% of proactive runs produce or update one trackable artifact beyond the scan log itself.

### Recommended implementation order (highest ROI first)
1. Reminder coalescer for blocker notifications
2. Write-time schema validation/repair for kanban + notifications
3. Proactive publish gate tied to a trackable artifact

## Workflow Efficiency Scan — 2026-04-11

### Top repetitive patterns and concrete improvements

1. **Blocker reminders are duplicating instead of evolving (high trust + attention cost)**
   - **Pattern:** `ACTIVE-TASK.md` currently shows multiple separate asks for the same two blockers, especially CoinUsUp Stripe trial setup and Bill Review MVP scope. The reminders vary slightly in wording, but they are operationally the same decision request resurfacing every day.
   - **Impact:** Joe gets repeat prompts instead of one clean decision packet, Alfred's active context is padded with duplicates, and true new blockers compete with old unresolved ones.
   - **Improvement proposal:** implement a blocker-thread model for reminders:
     - one open reminder per topic/card
     - subsequent reminders update `last_asked_at`, `times_asked`, and append new evidence instead of creating a fresh notification
     - escalation ladder: `gentle reminder` -> `strong unblock note` -> `archive as waiting on Joe`, with cooldown windows between each stage
   - **Success metric:** reduce active duplicate blocker reminders to **1 per topic** and eliminate same-topic reminder duplication inside a 7-day window.

2. **Malformed kanban and notification records are still leaking into source-of-truth views (recurring board hygiene tax)**
   - **Pattern:** `OPEN-LOOPS.md` still contains `null | null` active cards, and `ACTIVE-TASK.md` includes malformed pending-question entries (`Untitled`, `?`, `--title`). This means invalid records are reaching the main working files before validation happens.
   - **Impact:** Alfred spends recurring cycles cleaning and reinterpreting broken state, board trust drops, and routing logic works from partially corrupted inputs.
   - **Improvement proposal:** add strict write-time normalization plus quarantine:
     - reject or repair records missing required fields (`id`, `title`, `type`, `message`)
     - write bad payloads once to `logs/kanban-notification-anomalies.jsonl`
     - publish anomaly counts separately, never directly into `OPEN-LOOPS.md` or `ACTIVE-TASK.md`
     - add a daily reconcile step that attempts repair in batch and reports source script/file responsible
   - **Success metric:** **0 malformed rows** in `OPEN-LOOPS.md` and **0 placeholder pending-question records** in `ACTIVE-TASK.md` for 7 consecutive days.

3. **Analysis work still lands in notes faster than in execution systems (follow-through leak)**
   - **Pattern:** proactive scans repeatedly identify useful fixes, but the easiest landing zone is often this file or memory logs. That preserves thinking, but it does not guarantee an owner, acceptance criteria, or implementation path.
   - **Impact:** recommendations are rediscovered instead of compounded, and workflow-improvement work stays advisory longer than it should.
   - **Improvement proposal:** enforce a tracked-output gate for proactive work:
     - every proactive scan must either create/update a Kanban idea artifact or add a comment to an existing card
     - required fields: `problem`, `proposed fix`, `expected benefit`, `owner`, `next trigger`
     - if a recommendation already exists, update its status instead of appending a new freeform scan
   - **Success metric:** **100% of proactive scans** produce or update one trackable artifact outside the scan log itself.

### Recommended implementation order (highest ROI first)
1. Blocker-thread reminder coalescing (fastest trust win)
2. Write-time validation + anomaly quarantine for kanban/notifications
3. Proactive tracked-output gate to force follow-through
