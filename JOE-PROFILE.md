# JOE-PROFILE.md — Living Understanding of Joe

**Purpose:** Deep, evolving model of how Joe thinks, decides, and works. Goes beyond USER.md facts to capture patterns, preferences, and unspoken drivers.

**Maintained by:** Alfred (periodic reflection) + Claude Code (session observations)
**Last reflection:** 2026-02-28 (16:01 AST) — mini touch-up
**Last direct Q&A update:** 2026-02-26 (10:36 AM AST)
**Reflection count:** 4
**Profile version:** 1.5

---

## Communication DNA

How Joe communicates and what his patterns reveal.

### Response Patterns
- **Concise and directive.** Typical responses are 1-3 sentences. Rarely elaborates beyond what's needed. | Source: notification answers (106 Q&A pairs) | Confidence: high
- **"Go ahead" as trust signal.** When approving a plan, Joe says "go ahead" without restating it. Doesn't micromanage once he's seen the plan. | Source: notif_1771399480963, notif_1771401025186 | Confidence: high
- **Provides specific technical details when needed.** Discord setup: gave server IDs, channel IDs, invite URL, token storage preference — all unprompted. | Source: notif_1771403277638 | Confidence: high
- **Gets frustrated by vague or context-free questions.** "I don't have any detail on which Goal you're missing information on so I can't answer these questions." | Source: notif_1771400175659 | Confidence: high
- **Explicitly flags repeat questions.** Called out duplicate daily inquiry questions twice in one week (Feb 27 + Feb 28): "These are repeat questions" / "This looks like a duplicate question list from before." The daily inquiry system needs deduplication — Joe notices and will lose trust in notifications if they repeat. | Source: notif_1772200800167, notif_1772287200145 | Confidence: high
- **Questioning boundary is explicit: ask when stakes are high, otherwise act.** Joe wants questions for major changes, security risks, or truly missing info — but expects autonomous execution when likely answer is already known or discoverable from prior context. | Source: notif_1771768800191_7445de61 (Daily Inquiry, Workflow) | Confidence: high
- **Brief directive mode in technical sessions.** In Claude Code, Joe often uses short command-style prompts ("yes set it up", "commit and push everything", "re-run the failed cron job") and expects execution without hand-holding. | Source: joe-profile-observations.jsonl (2026-02-24) | Confidence: high

### Engagement Triggers
- **Longer responses when providing technical direction.** iMessage goal answer included philosophy ("think outside the box"), constraints ("keep token count low"), and approach ("if a coding solution can be an improvement it's not an issue"). | Source: notif_1771400770968 | Confidence: medium
- **Short responses for approvals and dismissals.** "Go ahead with Option 1", "This was just a test" — quick, no extras. | Source: multiple notifications | Confidence: high

### Predictive Pattern
- "When Alfred presents a structured plan with phases, Joe approves quickly and delegates fully." (4+ occurrences) | Confidence: high

---

## Decision Architecture

How Joe makes decisions — speed, info needs, delegation.

### Decision Speed Spectrum
- **Instant (< 5 min):** Approvals when Alfred provides clear recommendation + options. "Go ahead with Option 1." | Confidence: high
- **Considered (5-30 min):** When Joe needs to gather/provide external info (Discord tokens, server IDs) or evaluate trade-offs. | Confidence: medium
- **Deferred/frustrated:** When insufficient context is provided or question is unclear. Non-response or pushback. | Confidence: high

### Information Requirements
- **Decides fastest when given:** Clear options, a recommendation, and cost/effort estimates.
- **Gets blocked when:** Questions are vague, ask Joe for info Alfred should look up, or lack context for a decision.
- **Golden format:** Problem → Options (numbered) → Recommendation → Cost estimate

### Delegation Patterns
- Delegates freely on all technical/infrastructure work. | Confidence: high
- Wants to review plans before major changes, but approves quickly when format is good. | Confidence: high
- Explicitly wants autonomy: "if there are no major concerns or items that need my decision then go ahead and implement" | Confidence: high
- **Ships in batches when confident.** Prefers "commit and push everything" once a direction is validated rather than prolonged staging/partial rollout in coding sessions. | Source: joe-profile-observations.jsonl (2026-02-24) | Confidence: high

---

## Work Rhythms

Activity patterns and productivity windows.

### Schedule (observed)
- **Active window:** ~9am-4pm AST, then evening until ~11pm
- **Response times:** Notification answers typically within 10-30 min during active hours
- **Weekend patterns:** Still to be observed (need more data)
- **Preference for async:** Slack updates OK, surprises welcome, doesn't need real-time back-and-forth

### Device Context
- Mac mini: Always-on infrastructure (OpenClaw, services)
- Mac laptop: Mobile/flexible work
- Windows gaming laptop: Personal use (pattern TBD)

---

## Values & Motivations

### Stated Values (from USER.md)
1. Family first (children) — PRIMARY
2. Passive income via vibe coding
3. Freedom / enjoy life with family

### Observed Values (inferred from behavior)
- **Efficiency obsession:** Cost reduction focus ($188/mo → $0.22/mo cron optimization), "keep token count low", tiered model strategy. Values doing more with less. | Confidence: high
- **Autonomy for Alfred:** Explicitly wants Alfred to be self-sufficient. Delegates broadly. Frustrated by unnecessary questions. | Confidence: high
- **Learning through building:** Projects (CoinUsUp, Even Us Up, signal app, OpenClaw) are vehicles for learning. The building IS the value, not just the output. | Confidence: medium
- **Surprises welcome:** USER.md says it explicitly. Joe enjoys discovering what Alfred did autonomously. | Confidence: high
- **Pragmatism over perfection:** "Think outside the box and if a coding solution can be an improvement it's not an issue." Solutions over architecture. | Confidence: medium
- **Clear appetite for balanced, measurable execution:** Prefers explicit targets and practical defaults (e.g., balanced risk profile and 15-minute signal cadence in Signal App decision gate). | Source: notif_1771876150552_dab8f40a | Confidence: medium
- **Cares about Alfred's learning loop.** Joe explicitly checks whether Alfred is still learning and wants feedback mechanisms so the system improves from accepted/rejected ideas over time. | Source: joe-profile-observations.jsonl (2026-02-24) | Confidence: high

### Anti-Values (what Joe avoids)
- Unnecessary complexity
- Wasted money/tokens
- Being asked questions Alfred could figure out
- Being asked to review things without sufficient context
- Verbose reports when brief updates suffice

### Idea Evaluation Filter (DIRECT ANSWER — 2026-02-26) ⭐ HIGH CONFIDENCE
Joe's first-pass filter for any new idea, in order:
1. **Obvious demand?** — Is there a real, visible market for this? Don't pitch ideas that require creating demand from scratch.
2. **Buildable without excessive effort?** — Can it be shipped without a massive build? MVP should be achievable in weeks, not months.
3. **Familiarity with the vertical?** — Joe needs domain familiarity. Ideas in completely new verticals with lots of competition = harder AND unfamiliar. Prefer verticals where Joe has experience or natural edge.
4. **Fun + profitable?** — Has to have both. Pure revenue grind without interest isn't motivating. Pure fun without income doesn't serve the north star.

**Implication for Alfred:** Before surfacing any idea, run it through this filter. If it fails #1 or #3, don't surface it. Lead with demand signals and effort estimate — that's what Joe evaluates first.

### Vertical Exclusions (do not suggest ideas in these spaces)
- **Legal software / law firm tools** — not interested, will advise if this changes (2026-02-26)

---

## Technical Identity

### Preferred Stack
- **Frontend:** React + TypeScript
- **Backend:** FastAPI (Python), Node.js/Express
- **AI:** Claude (Anthropic), Ollama (local), Codex
- **Infrastructure:** Mac mini, LaunchAgents, Cloudflare tunnels
- **Hosting:** GitHub, Supabase (CoinUsUp)
- **Communication:** Slack (primary), Discord, iMessage

### Architectural Preferences
- Event-driven over polling (iMessage: cron → native daemon)
- Local-first (privacy, cost)
- Tiered model strategy (cheap first, escalate only when needed)
- Automation via cron jobs and LaunchAgents
- Pragmatic: "vibe coding" — build through AI-assisted development

### 20+ Years Background
- Consultant: billing software, data transformation for law firms
- Mix of BA + programming — structured thinking applied to technical work
- Now independent: automation, AI solutions, custom development

---

## Current Focus Areas

Ranked by recent activity (update frequently):

1. **Signal App (market-signal-lab)** — Active priority (Fast Track Launch card in progress; decision gate answered Feb 24)
2. **OpenClaw/Alfred ecosystem** — Ongoing infrastructure and autonomy improvements
3. **Command Center Dashboard** — Active development (Kanban + monitoring workflows)
4. **CoinUsUp** — Primary passive-income target (maintenance + growth candidate)
5. **Even Us Up** — Lower-priority passive-income stream (maintenance mode)
6. **Personal hardware refresh** — Gaming PC/compute search remains relevant
7. **Job Tracker** — Maintenance + automation
8. **Automation Consulting** — Deprioritized currently

---

## Aspirations & Vision

### Core Life Goal (explicitly stated 2026-02-25) ⭐ HIGHEST PRIORITY
**"Stop working."** Joe wants to reach full financial independence through passive income — not client work, not freelancing, not chasing anyone. He wants to work ONLY on personal projects and AI infrastructure improvements, entirely on his own schedule, because passive income covers everything. This is the north star behind every project decision.

- No more clients. No more working for anyone else or for income obligations.
- Passive income must be stable enough to cover life completely.
- Time freed up = personal projects + AI infrastructure on own terms, own schedule.
- **Implication for Alfred:** Every recommendation should be filtered through "does this move Joe closer to financially stable passive income?" If it doesn't contribute directly, deprioritize it.

### Stated Goals
- Build passive income apps ($5k-$10k/month target, growing from there)
- Be more efficient with tedious tasks
- Have Alfred assist with coding/app ideas
- Stay on top of everything

### Project Kill/Keep Threshold (DIRECT ANSWER — 2026-02-26) ⭐ HIGH CONFIDENCE
- **Even Us Up:** Keep indefinitely. It's a personal tool Joe actively uses for his household — it was built to solve a real personal need. Secondary opportunity: package and sell it. Not a revenue pressure, but has market potential.
- **CoinUsUp:** Keep + grow. Significant untapped growth potential. **Critical near-term action: finish and publish to mobile app stores.** Joe needs to complete this before growth can happen. Monitor revenue/engagement to re-evaluate longer term.
- **General kill signal (inferred):** A project would get cut if it required high ongoing maintenance WITHOUT generating income AND wasn't personally useful. Revenue or personal utility is required to stay alive.

### Incident Response Protocol (DIRECT ANSWER — 2026-02-26) ⭐ HIGH CONFIDENCE
**Bugs / Outages:**
- Fix autonomously, fully, and quickly. Don't wait for Joe.
- Report after the fact once resolved.
- "Up and running efficiently, quickly and properly" — quality matters, not just speed.

**Cost Spikes:**
1. **Stop the money burn immediately** — kill the runaway process, disable the expensive call, cap the usage. Do NOT let it keep running while waiting for review.
2. Find a workaround to restore service without the cost.
3. Identify root cause.
4. Notify Joe with full findings.
- **Key reason:** Joe may not be available to react in time. Alfred is the last line of defense on cost. Act first, explain second.
- **Threshold:** Any cost spike that could materially escalate = treat as emergency. Don't wait for a "is this serious enough?" answer.

### Passive Income Strategy (CONCRETE TARGETS — Direct Answer, Daily Inquiry Feb 23)
**Revenue Targets:**
- Initial goal: $5k-$10k/month
- Growth: continue scaling beyond that

**App Revenue Hierarchy (in priority order):**
1. **CoinUsUp** — primary cash cow
2. **Signal App** (Stock/Crypto market signals) — secondary revenue
3. **Even Us Up** — tertiary (lowest priority)

**Time Allocation (Weekly):**
- Maintenance: 5-10 hrs/week (keep systems running with minimal touch)
- New features/building: 10-20 hrs/week (growth work)
- Total: 15-30 hrs/week commitment to passive income projects

**Definition of "Passive":**
- Minimal effort required once built
- 5 hrs/week maintenance is acceptable baseline
- System should generate income with low ongoing effort

**Implication for Alfred:**
- Prioritize automation and operational excellence for existing apps (maintenance → closer to 5 hrs/week, not 10)
- Focus recommendation/build suggestions on CoinUsUp and Signal App
- Ideas that fit 5-10 hrs/week maintenance profile are good bets
- Avoid high-maintenance or fragile-system recommendations

### Shadow Goals (inferred, not yet articulated)
- **Full automation of personal infrastructure:** The OpenClaw setup IS the vision — Joe is building toward a system where Alfred handles everything autonomously. Each new feature (Discord, iMessage, notifications, goals) extends this. | Confidence: medium
- **Income diversification:** Multiple apps = portfolio approach to passive income. Not putting all eggs in one basket. | Confidence: medium
- **Time freedom:** Every efficiency gain is really about buying time back for family. The $188→$0.22 optimization isn't about money — it's about sustainability so the system runs forever without attention. | Confidence: medium
- **AI-native life operating system:** Joe isn't just using AI tools — he's building an AI-first system for managing his entire professional life. | Confidence: low (emerging pattern)

---

## Friction Points

### Observed Frustrations
- **Vague questions without context.** "I don't have any detail on which Goal you're missing information on" — Alfred asked Joe for info it should have provided. | Source: notif_1771400175659 | Confidence: high
- **Being asked to review without substance.** "I don't have anything to review" / "You need to provide me with the discord plan so that I can review it" — Joe expects content, not placeholders. | Source: notif_1771400167582, notif_1771398291802 | Confidence: high
- **Cost overruns.** The $188/month cron incident. Joe is cost-conscious and expects Alfred to be too. | Confidence: high
- **Repeated issues.** Git config drift happened 3x before being solved systematically. Joe values once-and-done fixes. | Confidence: medium

---

## Relationship with Alfred

### Trust Level: HIGH (and growing)
- "if there are no major concerns... go ahead and implement" | Source: notif_1771399480963
- "Be proactive in finding out new solutions or tools to use" | Source: notif_1771390305276
- Broad autonomous action boundaries in USER.md
- Provides credentials/tokens directly when needed

### Preferred Interaction Style
- Alfred acts, Joe reviews results
- Questions come with options + recommendation
- Brief updates, not verbose reports
- Surprises are welcome — overnight execution valued
- Joe provides direction, not hand-holding
- **Alfred should make implementation decisions autonomously** — "if there are no major concerns, go ahead and determine when is a good time to move ahead" (notif_1771399480963)
- **Wants transparency after autonomous decisions.** If Alfred makes an easy/confident call, Joe prefers execution without delay plus visible decision logs/updates (not pre-approval). | Source: notif_1772114400186_8815537c (Daily Inquiry) | Confidence: high
- **Rejects speculative suggestions** — Joe wants actionable work with clear problems/solutions, not "you could explore if..." exploration

---

## Proactive Opportunity Map

### Identified Opportunities

**🎮 Gaming PC as LLM Offloading Hub (EMERGING)**
- Joe is actively shopping for a 12GB+ VRAM gaming PC on a strict budget
- Initial assumption: gaming. But 12GB VRAM + interest in local LLM work + OpenClaw focus suggests this may be for running larger models locally (llama3.1:8b, etc.)
- Opportunity: Once acquired, could set up as dedicated LLM compute node for all projects
- Confidence: Medium (needs clarification from Joe)

### Cross-Project Synergies (EXPLICITLY REJECTED)
- **⚠️ NOTE:** Joe rejected all proposed synergies between Signal App/CoinUsUp, Job Tracker/consulting, and Command Center as universal hub (notif_1771605868238_53174470)
- Meaning: Joe prefers focused, single-purpose projects over integrated platforms
- **Learning:** Don't propose speculative synergies; wait for Joe to articulate his own integration ideas

### Portfolio Execution Opportunity (NEW)
- In Vision daily inquiry, Joe confirmed all major tracks are valid and asked for implementation strategy across them rather than choosing one (`notif_1771682401703_36df658b`).
- Opportunity: run a parallel roadmap with explicit weekly capacity caps (maintenance 5-10h, build 10-20h), and bias Alfred recommendations toward actions that reduce maintenance load while accelerating Signal App and CoinUsUp outcomes.
- Confidence: high

### Shadow Goals to Watch
- **Infrastructure-first mode:** Current work (Discord, iMessage, Kanban, gateway improvements) suggests Joe is building a robust personal operating system FIRST, before expanding to passive income apps. This is patient, strategic work.
- **Autonomous Alfred:** The broader pattern is Joe testing whether Alfred can make good implementation decisions independently. Every "go ahead and implement" is gathering data on Alfred's autonomy threshold.

---

## Claude Code Impressions

Observations from the CLI assistant's direct sessions with Joe.

### Working Style
- **Ambitious scope, trusts the process.** Joe takes on complex multi-system tasks (gateway debugging, full dashboard builds, cron overhauls) and expects the AI to handle the complexity. Doesn't shy away from big asks. | Source: Claude Code sessions (Feb 18-19) | Confidence: high
- **Debugging by context, not guesswork.** When issues arise, Joe provides specific error messages, log paths, and system context. Expects targeted investigation, not trial-and-error. | Confidence: medium
- **Iterates fast.** Moves from idea → implementation → testing quickly. Doesn't over-plan when working directly in Claude Code. | Confidence: medium

### How Joe Uses Claude Code vs Alfred
- **Claude Code:** Hands-on technical work — debugging, building features, system administration. Direct and specific instructions.
- **Alfred:** Strategic direction, autonomous work, monitoring, overnight tasks. Higher-level delegation.
- The two tools serve different roles — Claude Code is the workbench, Alfred is the autonomous agent.

### Recent Claude Code Signals (Feb 24)
- **Approves large-scope execution quickly.** Joe greenlit a 31-file optimization plan without hesitation once rationale was clear, indicating high trust in parallelized implementation. | Confidence: high
- **Cost hierarchy awareness remains active.** Joe asked for model hierarchy optimization to reduce token cost while preserving quality, reinforcing ongoing cost-discipline in technical workflows. | Confidence: high
- **Feedback-loop mindset.** When shown an idea pipeline without explicit rejection tracking, Joe immediately wanted a reject/learn mechanism added. | Confidence: medium

---

## Observation Log (Recent)

Last 10 observations, newest first. Older observations distill into sections above.

| Date | Observation | Source | Distilled? |
|------|-------------|--------|------------|
| 2026-02-25 | Claude Code: Joe approves ambitious multi-file refactors quickly when plan is credible | joe-profile-observations.jsonl (2026-02-24) | Yes |
| 2026-02-25 | Claude Code: "commit and push everything" preference indicates batch shipping over prolonged staging | joe-profile-observations.jsonl (2026-02-24) | Yes |
| 2026-02-25 | Claude Code: Joe wants explicit rejection/feedback loops so Alfred can learn from outcomes | joe-profile-observations.jsonl (2026-02-24) | Yes |
| 2026-02-25 | No new answered Daily Inquiry notifications since last reflection; Feb 24/25 prompts currently unanswered | goals/notifications.json, memory/inquiry-log.jsonl | Yes |
| 2026-02-24 | Signal App remained top execution focus; no scope change, decision gate/execution path held steady | memory/2026-02-24.md | Yes |
| 2026-02-20 | Joe rejects speculative cross-project synergies; prefers focused, single-purpose projects | notif_1771605868238_53174470 (Daily Inquiry) | Yes |
| 2026-02-20 | Gaming PC search (12GB+ VRAM, strict budget, open to used/refurbished) — possible LLM offloading use case | 2026-02-20-gaming-pc.md | Partial |
| 2026-02-20 | Joe authorizes autonomous implementation decisions ("if no major concerns, go ahead and determine timing") | notif_1771399480963, notif_1771400770968 | Yes |

---

## Reflection Metadata

| Metric | Value |
|--------|-------|
| Total reflections run | 3 |
| Last reflection | 2026-02-25 11:27 AST |
| New observations added this reflection | 5 |
| Observations distilled (cumulative) | 21 |
| Profile version | 1.3 |
