# Product Requirements Document (PRD)
## Alfred + HAL System Feature Inventory

**Purpose:** Complete inventory of all features + capabilities. Referenced when agents need to understand what's available without searching code.

**Last Updated:** 2026-03-23  
**Owner:** Joe (decisions) + Alfred (features) + HAL (execution)  
**Audience:** Joe, Alfred (self-reference), HAL (capability discovery)

---

## Core Infrastructure

### 1. Memory System (Multi-Layer)
- **Status:** ✅ Active
- **Components:**
  - `MEMORY.md` (3.5KB curated notes)
  - `memory/YYYY-MM-DD.md` (daily logs, append-only)
  - `memory/INDEX.md` (searchable decision index)
  - `ACTIVE-TASK.md` (current task state + pending questions)
  - `LAST-SESSION.md` (structured bridge for continuity)
  - `NOW.md` (emergency checkpoint)
  - `DECISIONS-AND-RECOMMENDATIONS.md` (decision log)
  - `LEARNINGS.md` (bug prevention log)
- **Capability:** Persist context across sessions; prevent repeat questions; track decisions
- **Owner:** Alfred (maintenance + writes)
- **Access:** Daily update cron + manual writes during sessions
- **Cost:** Minimal (text-only, ~500KB total)

---

### 2. Task Management (Kanban Board)
- **Status:** ✅ Active
- **Location:** Command Center dashboard + HTTP API
- **Features:**
  - Create/move tasks between: todo → in_progress → review → done
  - Assign to Alfred or HAL
  - Add comments + track progress
  - Blocking/unblocking (wait state)
  - Priority + scoring
  - Automated transitions (e.g., auto-promote ideas to todo)
- **Capability:** Centralized work tracking; prevent task loss; prioritize work
- **Owner:** Alfred (dispatcher) + Joe (assignments)
- **Scripts:** `kanban-move.sh`, `kanban-blocker.sh`, `kanban-update.sh`
- **Cost:** $0 (local HTTP API)

---

### 3. Command Center Dashboard
- **Status:** ✅ Active
- **Location:** localhost:3000 (local) or custom domain (production)
- **Framework:** Next.js + React
- **Features:**
  - Real-time session overview (active sessions + token costs)
  - Kanban board visualization (4 columns + cards)
  - Cron job status + recent runs
  - Cost tracking (daily, weekly, monthly)
  - Goal management (intake, tracking, completion)
  - Notification hub (unread alerts)
  - Calendar integration (Google Calendar events)
  - Chat transcript viewer
- **Owner:** Alfred (maintenance)
- **Refresh:** `refresh.js` runs hourly (queries gateway + reads logs)
- **Cost:** Hosting + infrastructure (minimal, <$10/mo if cloud)

---

### 4. Scheduled Jobs (Cron System)
- **Status:** ✅ Active
- **Count:** 4-6 daily jobs
- **Types:**
  - **Daily Crons (night-biased, 2-6 AM):**
    - Morning brief (9 AM, summarizes overnight work)
    - Daily config check (validates AGENTS.md vs actual config)
    - Daily backup (to GitHub + archives)
    - Log rotation (cleanup old logs)
    - Prompt sync (validates prompt files)
  - **Periodic Crons:**
    - Work executor (15 min, processes in_progress cards)
    - HAL idle dispatcher (15 min, assigns work to HAL if idle)
    - Session checkpoint (30 min, captures state if context >60%)
    - Health monitor (hourly, checks LaunchAgents)
- **Capability:** Automate routine tasks; prevent manual work
- **Owner:** Alfred (creation + maintenance)
- **Cost:** $0 (local execution) or minimal (if cloud-hosted)

---

### 5. Voice I/O System
- **Status:** ✅ Active
- **Components:**
  - **STT (Speech-to-Text):** OpenAI Whisper (local, no API cost)
  - **TTS (Text-to-Speech):** OpenClaw native TTS tool
- **Capability:** Voice commands + voice replies (hands-free)
- **Owner:** Alfred (routing)
- **Scripts:** `scripts/voice-input.sh` (record + transcribe)
- **Cost:** $0 STT (local Whisper) + cost of TTS calls (cheap)

---

### 6. Git + Backup System (3-Tier)
- **Status:** ✅ Active
- **Tiers:**
  1. **Local Git** (instant recovery, instant access)
     - Repo: `~/.openclaw/workspace/.git`
     - Frequency: Commit after each major task
  2. **GitHub Backup** (cloud, hourly push)
     - Repo: GitHub (private, URL TBD)
     - Frequency: Hourly cron (3461d025)
     - Cost: Free (GitHub free tier)
  3. **Archive Backup** (cold storage, weekly)
     - Location: `/Users/hopenclaw/.alfred-backups/`
     - Frequency: Weekly (Sundays, 2 AM)
     - Retention: 8 weeks rolling
     - Cost: Local storage only
- **Capability:** Disaster recovery; version history; rollback
- **Owner:** Alfred (cron) + Joe (manual commits)
- **Pre-commit Hook:** Validates no secrets are committed

---

## Communication & Notifications

### 7. Multi-Channel Messaging
- **Status:** ✅ Active
- **Channels:**
  - Discord (primary, multiple channels + threads)
  - Telegram (optional, group threads)
  - iMessage (1-506-227-9553, urgent/blockers only)
  - Email (via Gmail)
  - Slack (deprecated as of 2026-03-20)
- **Capability:** Multi-platform async communication
- **Owner:** Alfred (router)
- **Rules:** 
  - Discord: findings, research, updates, code reviews
  - iMessage: urgent/blockers during work hours (9am-11pm)
  - Quiet hours (11pm-9am): no direct messages to Joe, but continue posting to Discord
- **Cost:** $0 (all free platforms)

---

### 8. Notification Management
- **Status:** ✅ Active
- **Features:**
  - Batch low-priority alerts (every 3 hours)
  - Batch medium-priority alerts (every hour)
  - Immediate delivery for critical alerts (system down, quota exceeded, etc.)
  - Unread count tracking in Command Center
- **Capability:** Reduce notification fatigue; stay on top of issues
- **Owner:** Alfred (batching) + LaunchAgents (delivery)
- **Cost:** $0

---

## Project Management

### 9. Goal Management System
- **Status:** ✅ Active
- **Location:** `goals/` directory + Command Center /goals endpoint
- **Features:**
  - Goal intake (capture + prioritize)
  - Goal breakdown into tasks
  - Sub-agent analysis (HAL analyzes feasibility)
  - Progress tracking
  - Completion + archival
- **Schema:**
  - `goals.json` (all goals, status tracked)
  - `tasks.json` (goal tasks + assignments)
  - `analyses.json` (HAL analysis results)
  - `handoffs/` (formal contracts for HAL work)
- **Capability:** Organize long-term + ad-hoc work; delegate to HAL
- **Owner:** Alfred (intake + HAL dispatch)
- **Cost:** $0

---

### 10. Decision Tracking
- **Status:** ✅ Active
- **Location:** `DECISIONS-AND-RECOMMENDATIONS.md` + `memory/`
- **Features:**
  - Capture all decisions (what, why, when, status)
  - Track implementation status
  - Link to related files + commits
  - Guard against repeat questions (same question <7 days = skip)
- **Capability:** Prevent repeated questioning; provide decision rationale
- **Owner:** Alfred (logging + maintenance)
- **Cost:** $0

---

### 11. Project Documentation
- **Status:** ✅ Active
- **Components:**
  - CoinUsUp/README.md (architecture, API, deployment)
  - Expense_Sharing/README.md (Even Us Up project docs)
  - signal-app-mvp/README.md (Stock/Crypto signal app docs)
  - PRD.md (this file, feature inventory)
  - USE-CASES-WORKFLOWS.md (workflow patterns)
  - LEARNINGS.md (bug log + prevention)
- **Capability:** Prevent agents from "forgetting" project details
- **Owner:** Joe (strategy docs) + Alfred (technical docs)
- **Cost:** $0

---

## AI & Model Management

### 12. Multi-Model Routing
- **Status:** ✅ Active
- **Models:**
  - **Codex** (free via subscription, code generation primary)
  - **Haiku 4.5** ($, lightweight analysis, formatting)
  - **Sonnet 4.5** ($$, complex reasoning, multi-step)
  - **Opus 4.6** ($$$, security decisions, architecture)
- **Selection Logic:** Defined in AGENTS.md + MODEL-POLICY.md
- **Capability:** Optimize cost + performance; use right tool for task
- **Owner:** Alfred (model selection per task)
- **Cost:** Depends on usage; budget ~$50-150/mo for active use

---

### 13. Model-Specific Prompting (PLANNED)
- **Status:** ⏳ In Development (Phase 2)
- **Features:**
  - `/prompts/opus-4-6.md` (optimized for Opus, per Anthropic best practices)
  - `/prompts/gpt-5-4.md` (optimized for GPT, per OpenAI best practices)
  - Nightly sync cron (validates prompts match best practices)
- **Capability:** Improve model output quality + efficiency 15-25%
- **Owner:** Alfred (prompts + sync)
- **Cost:** $0 (local prompts)

---

### 14. Token Budget & Cost Tracking
- **Status:** ✅ Active
- **Features:**
  - Session status shows real-time costs
  - Daily cost reports in Command Center
  - Weekly cost summaries (email/Discord)
  - Quota monitoring (alerts at 80%+ usage)
  - Per-model cost breakdown
- **Capability:** Control spending; prevent bill surprises; optimize model selection
- **Owner:** Alfred (tracking) + Joe (approval on overages)
- **Cost:** Tracking only ($0)

---

## Security & Safety

### 15. Request Validation & Injection Defense
- **Status:** ✅ Active
- **Layers:**
  1. Text sanitation (deterministic checks for common injection patterns)
  2. Frontier model scanner (Opus reviews suspicious input, planned)
  3. PII redaction (aggressive redaction before external sends)
  4. Permission scoping (granular permissions per action)
  5. Approval system (destructive actions need approval)
  6. Runtime governance (spending caps, rate limits, loop detection, planned)
- **Documentation:** REQUEST-VALIDATION.md, SECURITY-GATEKEEPER-GUIDE.md
- **Owner:** Alfred (enforcement)
- **Cost:** $0 (built-in)

---

### 16. Data Protection
- **Status:** ✅ Active
- **Features:**
  - No credentials in git (pre-commit hook)
  - Encrypted .env files (not tracked)
  - Backup retention policy (8 weeks local, unlimited GitHub)
  - Audit logs (activities tracked in LEARNINGS.md)
- **Capability:** Prevent credential exposure; maintain audit trail
- **Owner:** Alfred (enforcement)
- **Cost:** $0

---

### 17. System Hardening
- **Status:** ✅ Active
- **Features:**
  - LaunchAgent watchdog (restarts services if they crash)
  - Health monitoring cron (checks all services running)
  - Update checker (checks OpenClaw releases daily)
  - Log rotation (prevents disk fill)
  - Rate limiting (prevent quota overages)
- **Capability:** Maintain uptime; prevent cascading failures
- **Owner:** Alfred (scripts)
- **Cost:** $0

---

## Analytics & Optimization

### 18. Logging & Audit Trail
- **Status:** ⚠️ Partial (core logs exist, centralization needed)
- **Components:**
  - LaunchAgent logs (stdout/stderr)
  - Cron execution logs
  - API call logs (via OpenClaw)
  - Task completion logs (via kanban)
- **Capability:** Debug issues; audit activity
- **Owner:** Alfred (collection + analysis)
- **Cost:** Minimal (text logs, <1GB/2mo)

---

### 19. Performance Monitoring
- **Status:** ✅ Active
- **Metrics:**
  - Token usage per session
  - Cost per task
  - Model tier distribution
  - Context utilization %
  - API response times
- **Capability:** Identify optimization opportunities; track trends
- **Owner:** Alfred (calculations)
- **Cost:** $0

---

### 20. Decision Guard (Duplicate Prevention)
- **Status:** ⏳ Partial (documented, not fully automated)
- **Idea:** Skip questions asked <7 days ago
- **Status:** Documented in MEMORY.md; awaiting implementation
- **Capability:** Reduce token waste + user frustration
- **Owner:** Alfred (implementation)
- **Cost:** $0

---

## AI Assistant Integration

### 21. Alfred (Primary Agent)
- **Status:** ✅ Active
- **Capabilities:**
  - Task execution (coding, research, analysis)
  - System maintenance (cron management, backups)
  - Communication routing (Discord, email, etc.)
  - Decision making (within autonomy boundaries)
  - HAL dispatch (assign work to HAL)
- **Autonomy:** Tech work, coding, infrastructure changes (no user approval needed)
- **Approval Required:** External actions, large costs, major config changes
- **Owner:** Joe (directs) + System (executes)
- **Cost:** Included in model costs

---

### 22. HAL Integration (Remote AI Assistant)
- **Status:** ✅ Active
- **Gateway:** ws://192.168.2.79:18789 (Windows PC, local Qwen model)
- **Capabilities:**
  - Parallel task execution (while Alfred works, HAL works independently)
  - Code analysis + review
  - Data analysis + research
  - Backtesting (trading signals, strategies)
  - Long-running tasks (prefer HAL for 1h+ work)
- **Cost:** $0 (local model, only electricity)
- **Autonomy:** Health checked before dispatch; failures logged
- **Handoff Protocol:** Formal contracts (goals/handoffs/*.json) required
- **Owner:** Alfred (dispatcher) + HAL (executor)

---

### 23. Sub-Agent Spawning (ACP Harness)
- **Status:** ✅ Available
- **Capability:** Spawn Claude Code, Codex, or Pi agents for specialized work
- **Uses:**
  - Interactive coding sessions (Claude Code preferred)
  - Large refactoring (with Codex)
  - Complex analysis (with applicable model)
- **Cost:** Per-model pricing (Codex free, others paid)
- **Owner:** Alfred (dispatcher)

---

## Workflow & Automation

### 24. Alfred ↔ HAL Discussion Protocol
- **Status:** ✅ Active
- **Trigger:** Collaborative decision needed
- **Process:**
  1. Alfred forms opinion (2-3 key points)
  2. Spawns HAL with task + context
  3. Awaits HAL response
  4. Synthesizes both views
  5. Posts structured summary to Discord
- **Cost:** $0 (HAL local) + Discord posting cost
- **Owner:** Alfred (orchestration)

---

### 25. Morning Brief
- **Status:** ✅ Active
- **Time:** Daily 9 AM (or on session start if later)
- **Content:**
  - Overnight work summary (from logs + kanban)
  - Pending questions (from notifications)
  - Today's priorities (from OPEN-LOOPS.md)
  - Blocked items (from kanban)
- **Output:** Discord post + text file (MORNING-BRIEF-LATEST.md)
- **Owner:** Alfred (cron)
- **Cost:** $0

---

### 26. Evening Routine
- **Status:** ✅ Active
- **Time:** Daily ~10 PM
- **Content:**
  - Day summary (tasks completed, decisions made)
  - Lessons learned (add to LEARNINGS.md)
  - Tomorrow preview (what's coming)
  - Blockers (what needs Joe input)
- **Output:** Discord post + state files updated (ACTIVE-TASK.md, LAST-SESSION.md)
- **Owner:** Alfred (cron)
- **Cost:** $0

---

### 27. Idle Loop (Proactive Idea Execution)
- **Status:** ✅ Active
- **Trigger:** No active user work (in_progress empty)
- **Behavior:**
  - Runs every 30 min (capped: 36 activities/day)
  - Auto-promotes high-scoring ideas from backlog
  - Executes 5-10 min activities (research, analysis, cleanup)
  - Posts results to Discord
- **Capability:** Continuous improvement without user input
- **Owner:** Alfred (execution)
- **Cost:** Minimal (batched lightweight tasks)

---

### 28. Quiet Hours Protocol
- **Status:** ✅ Active
- **Time:** 11 PM - 9 AM
- **Rules:**
  - **NO** direct messages to Joe (iMessage, Discord DM)
  - **YES** post to Discord channels (findings, updates, summaries)
  - **YES** run crons + background tasks (normal schedule)
  - **YES** execute all automation (no pause)
- **Rationale:** Joe is sleeping; don't ping. But work continues.
- **Owner:** Alfred (scheduling)
- **Cost:** $0

---

## Integration Points

### 29. GitHub Integration
- **Status:** ✅ Active
- **Capability:**
  - Push/pull code
  - View commits + history
  - Create/manage PRs (future)
  - Monitor CI/CD (future)
- **Owner:** Alfred (git commands)
- **Cost:** $0

---

### 30. Google Workspace Integration
- **Status:** ✅ Active (partial)
- **Services:**
  - Gmail (read + search)
  - Google Calendar (read events)
- **Capability:** Check email + calendar in Alfred context
- **Owner:** Alfred (queries)
- **Cost:** $0 (via Google OAuth)

---

### 31. Discord Integration
- **Status:** ✅ Active
- **Capability:**
  - Post messages to channels
  - Read message history
  - React to messages
  - Thread management
- **Owner:** Alfred (posting) + Joe (messaging)
- **Cost:** $0

---

### 32. Telegram Integration
- **Status:** ✅ Available (optional)
- **Capability:**
  - Post messages to groups
  - Receive commands via bot
  - Voice message support
- **Owner:** Alfred (router)
- **Cost:** $0

---

## Project-Specific Features

### 33. CoinUsUp Features
- **Status:** ✅ Active
- **Capabilities:**
  - Subscription management (recurring donations)
  - Stripe integration
  - Atlantic Contractor client portal
  - Bill review + invoice audit
- **Documentation:** CoinUsUp/README.md
- **Owner:** Joe (business) + Alfred (maintenance)

---

### 34. Even Us Up (Expense_Sharing) Features
- **Status:** ✅ Active (feature development)
- **Capabilities:**
  - Group expense tracking
  - Custom split rules
  - Settlement calculation
  - Bill history + audit
- **Planned (Q2):**
  - Recurring expense templates
  - Reusable split rules
  - Debt simplification algorithm
- **Documentation:** Expense_Sharing/README.md
- **Owner:** Joe (product vision)

---

### 35. Stock/Crypto Signal App Features
- **Status:** ⏳ MVP Development
- **Capabilities:**
  - Technical indicator calculation (SMA, EMA, RSI, MACD, ADX, etc.)
  - Multi-timeframe signal confirmation
  - Backtest framework (5+ years of data)
  - Real-time alerts (Telegram/Discord)
- **Planned (v1.0+):**
  - Strategy optimization
  - Community signal sharing
  - Advanced backtesting (Monte Carlo)
- **Documentation:** signal-app-mvp/README.md
- **Owner:** Joe (strategy)

---

### 36. Market Signal Lab Features
- **Status:** ✅ Active
- **Location:** ~/market-signal-lab/ (port 8002)
- **Capabilities:**
  - Trading signal analysis + visualization
  - Multi-indicator confirmation
  - 30+ ML features
  - Vectorized strategy evaluation
  - Short-selling support
  - Volume-scaled position sizing
  - ADX regime filtering
  - Trailing stop management
- **Owner:** Alfred (maintenance) + HAL (analysis)

---

### 37. Automation Consulting Services
- **Status:** ✅ Active
- **Capability:** Consulting projects for clients (external revenue)
- **Documentation:** ACTIVE-TASK.md (current project)
- **Owner:** Joe (lead) + Alfred (research/support)

---

## Reporting & Analytics

### 38. Daily Cost Report
- **Status:** ✅ Active
- **Time:** Daily morning
- **Content:** Spend breakdown by model + project
- **Delivery:** Email or Discord
- **Owner:** Alfred

---

### 39. Weekly Goal Review
- **Status:** ✅ Active
- **Content:** Progress on Q1/Q2 goals, blockers, next week priorities
- **Owner:** Alfred (compilation) + Joe (decisions)

---

### 40. Monthly Performance Review
- **Status:** ⏳ Planned
- **Content:** System reliability, efficiency trends, recommendations
- **Owner:** Alfred (analysis)

---

## Systems Not Yet Implemented

### ❌ Items in Backlog

| Feature | Priority | Est. Effort | Status |
|---------|----------|-------------|--------|
| Frontier model scanner for incoming data | MEDIUM | 3h | Scoped |
| Enhanced PII redaction (comprehensive) | MEDIUM | 2h | Scoped |
| Runtime governance (spending caps + loop detection) | HIGH | 3h | Scoped |
| LanceDB super memory integration | LOW | 4h | Evaluated |
| ClawRouter cost optimization | LOW | 2h | Evaluated |
| Multi-exchange crypto signal support | LOW | 5h | Backlog |
| Live paper trading (simulation) | LOW | 6h | Backlog |
| Calendar integration (write events) | LOW | 2h | Backlog |

---

## System Stats & Capacity

| Metric | Value |
|--------|-------|
| Daily crons | 6 |
| Active projects | 4 (CoinUsUp, Even Us Up, Signal App, Consulting) |
| Team members | 2 (Joe + Alfred) + 1 optional (HAL) |
| Kanban cards (typical) | 10-20 active |
| Daily token budget | ~500K (subscription) |
| Monthly token cost | ~$50-150 (variable) |
| Memory files | 20+ daily logs + core docs |
| Git history | 100+ commits |
| Backups retained | 8 weeks local + unlimited GitHub |

---

## Quick Reference: Find a Feature

**Q: Where is [feature X]?**

Use this table to locate feature documentation:

| Feature | Location | Owner | Cost |
|---------|----------|-------|------|
| Memory/notes | MEMORY.md | Alfred | $0 |
| Task tracking | Command Center | Alfred | $0 |
| Model selection | AGENTS.md + MODEL-POLICY.md | Alfred | Included |
| Git backups | GitHub + local | Alfred | $0 |
| Voice input | scripts/voice-input.sh | Alfred | $0 |
| Cron jobs | crontab + /etc/cron.d/ | Alfred | $0 |
| HAL dispatch | goals/handoffs/ + kanban | Alfred | $0 |
| CoinUsUp | CoinUsUp/ | Joe | Client revenue |
| Even Us Up | Expense_Sharing/ | Joe | TBD |
| Signal App | signal-app-mvp/ | Joe | TBD |
| Consulting | ACTIVE-TASK.md | Joe | Client revenue |

---

**Last Updated:** 2026-03-23  
**Next Review:** 2026-04-20 (monthly cycle)  
**Feedback:** Update Joe if features missing or documentation gaps found

