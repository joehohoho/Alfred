# JOE-PROFILE.md — Living Understanding of Joe

**Purpose:** Deep, evolving model of how Joe thinks, decides, and works. Goes beyond USER.md facts to capture patterns, preferences, and unspoken drivers.

**Maintained by:** Alfred (periodic reflection) + Claude Code (session observations)
**Last reflection:** 2026-02-20 (10:00 PM AST)
**Reflection count:** 1
**Profile version:** 1.1

---

## Communication DNA

How Joe communicates and what his patterns reveal.

### Response Patterns
- **Concise and directive.** Typical responses are 1-3 sentences. Rarely elaborates beyond what's needed. | Source: notification answers (106 Q&A pairs) | Confidence: high
- **"Go ahead" as trust signal.** When approving a plan, Joe says "go ahead" without restating it. Doesn't micromanage once he's seen the plan. | Source: notif_1771399480963, notif_1771401025186 | Confidence: high
- **Provides specific technical details when needed.** Discord setup: gave server IDs, channel IDs, invite URL, token storage preference — all unprompted. | Source: notif_1771403277638 | Confidence: high
- **Gets frustrated by vague or context-free questions.** "I don't have any detail on which Goal you're missing information on so I can't answer these questions." | Source: notif_1771400175659 | Confidence: high

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

### Anti-Values (what Joe avoids)
- Unnecessary complexity
- Wasted money/tokens
- Being asked questions Alfred could figure out
- Being asked to review things without sufficient context
- Verbose reports when brief updates suffice

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

1. **OpenClaw/Alfred ecosystem** — Daily, highest engagement (Discord + iMessage integration complete Feb 18)
2. **Command Center Dashboard** — Active development (Kanban board deployed Feb 20)
3. **Personal hardware refresh** — Gaming PC search in progress (Feb 20)
4. **Job Tracker** — Maintenance + automated code review
5. **Stock/Crypto Signal App** — Early stage (market-signal-lab)
6. **CoinUsUp** — Maintenance mode (no active goals)
7. **Even Us Up** — Maintenance mode (no active goals)
8. **Automation Consulting** — Deprioritized (no active goals)

---

## Aspirations & Vision

### Stated Goals
- Build passive income apps
- Be more efficient with tedious tasks
- Have Alfred assist with coding/app ideas
- Stay on top of everything

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

---

## Observation Log (Recent)

Last 10 observations, newest first. Older observations distill into sections above.

| Date | Observation | Source | Distilled? |
|------|-------------|--------|------------|
| 2026-02-20 | Joe rejects speculative cross-project synergies; prefers focused, single-purpose projects | notif_1771605868238_53174470 (Daily Inquiry) | Yes |
| 2026-02-20 | Gaming PC search (12GB+ VRAM, strict budget, open to used/refurbished) — possible LLM offloading use case | 2026-02-20-gaming-pc.md | Partial |
| 2026-02-20 | Joe authorizes autonomous implementation decisions ("if no major concerns, go ahead and determine timing") | notif_1771399480963, notif_1771400770968 | Yes |
| 2026-02-20 | Current focus shifted to infrastructure (Discord, iMessage, Kanban complete); passive income apps deferred | goals/goals.json, 2026-02-20.md daily | Yes |
| 2026-02-19 | Bootstrap: Profile created from 106 notification Q&A pairs + USER.md + SOUL.md + Claude Code impressions | Initial analysis | Yes |

---

## Reflection Metadata

| Metric | Value |
|--------|-------|
| Total reflections run | 1 |
| Last reflection | 2026-02-20 22:00 AST |
| Observations distilled | 16 |
| Profile version | 1.1 |
