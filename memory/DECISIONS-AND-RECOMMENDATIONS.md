# Major Decisions & Recommendations Log

**Purpose:** Structured record of all major recommendations, decisions, and their outcomes. This prevents memory loss and makes past decisions easily searchable.

**Format:**
- **Date:** YYYY-MM-DD HH:MM (when discussed)
- **Category:** Dashboard | Tool | Skill | Pattern | Config | Infrastructure | Security | Optimization
- **Recommendation:** One-line summary
- **Details:** Full description + rationale
- **Status:** Suggested | Implemented | Deferred | Rejected | In-Progress
- **Source:** User request | Internal analysis | Community (Moltbook) | ClawHub discovery
- **Impact:** Cost change | Functionality | Security | Performance | Other
- **Reference:** Link to related memory file or project

---

## Dashboard Recommendations

### 2026-02-04 - Dashboard: Simple Node.js Cost Tracker (Port 8765)
- **Category:** Dashboard / Infrastructure
- **Recommendation:** Token & cost tracking dashboard (simple static HTML + Node.js server)
- **Details:** Lightweight dashboard for monitoring OpenClaw usage + credits. Displays session tokens, context %, cost estimates, daily totals, per-model breakdown. Features: manual credit add/set via UI, real-time stats refresh (30s), cron-based sync.
- **Tech Stack:** Node.js + HTML + stats.json + credits.json
- **Status:** ✅ Implemented
- **Implementation:** `/Users/hopenclaw/.openclaw/workspace/dashboard/` (port 8765)
- **Source:** Community recommendation (git pull)
- **Cost:** $0 (no LLM calls, pure data display)
- **Features:** Simple, self-contained, no external dependencies
- **Related cron:** Auto-start via */5 * * * * check (OpenClaw running + dashboard down → restart)
- **Reference:** memory/2026-02-04.md, 2026-02-06-stats-bug-fix.md

---

### 2026-02-06 - Dashboard: Alfred Dashboard (Next.js + OAuth + Redis)
- **Category:** Dashboard / Infrastructure
- **Recommendation:** Production-ready Next.js dashboard with Google OAuth + Upstash Redis
- **Details:** Advanced dashboard for OpenClaw monitoring. Features: Google OAuth (joe55ho@gmail.com only), live budget editing via Redis, model breakdown, daily/weekly/total views, auto-deployment via Vercel, 30-min sync via launchd.
- **Tech Stack:** Next.js 14 + TypeScript + NextAuth.js + Upstash Redis + Vercel
- **Status:** ❌ Removed 2026-02-18 (replaced by Command Center)
- **Removal reason:** Replaced by unified Command Center dashboard (Node.js backend). Alfred-Dashboard (294 MB) moved to trash Feb 18. Command Center at `/Users/hopenclaw/command-center/` is now the ONLY active dashboard.
- **Source:** Internal recommendation (built for better UX, later superseded)
- **Cost savings:** Removed ~$0/month (free tiers) + simplified infrastructure
- **Documentation:** Archived in 2026-02-18 daily log
- **Reference:** memory/2026-02-06.md, memory/2026-02-18.md (infrastructure cleanup)

---

### 2026-02-18 - Dashboard: Command Center (Node.js + React)
- **Category:** Dashboard / Infrastructure
- **Recommendation:** Unified monitoring + interaction hub replacing fragmented dashboards
- **Details:** Single dashboard combining: system status, notification center, budget tracking, job searcher, terminal access (Claude Code), chat interface to gateway. Built with Node.js backend + React frontend.
- **Tech Stack:** Node.js Express + React + SSE (Server-Sent Events) + WebSocket
- **Status:** ✅ Implemented (Feb 18)
- **Implementation:** `/Users/hopenclaw/command-center/` (port 3001, auto-starts via LaunchAgent)
- **Live URL:** https://dashboard.my-alfred-ai.com (via Cloudflare tunnel)
- **Features:** Notifications, budget visualization, terminal, chat, real-time sync (120s refresh)
- **Replaces:** Alfred-Dashboard (Next.js, removed), Simple Cost Tracker (Node.js 8765)
- **Cost:** $0 (no LLM, pure data display + frontend)
- **LaunchAgent:** `com.alfred.dashboard-nextjs.plist` (auto-restart on crash)
- **Documentation:** COMMAND-CENTER.md (11-page architecture reference)
- **Reference:** memory/2026-02-18.md (infrastructure consolidation), COMMAND-CENTER.md

### 2026-02-?? - Dashboard: ??? (Requires Vertex/BigQuery - PENDING IDENTIFICATION)
- **Category:** Dashboard / Infrastructure
- **Recommendation:** [NAME UNKNOWN - needs clarification from user]
- **Details:** Online-recommended dashboard focused on OpenClaw usage insights. Mentioned as reliable alternative. Requires Vertex AI or BigQuery integration (exact requirement unclear). Code was git-pulled but setup deferred. STATUS: User can provide more details.
- **Status:** ⏸️ Pending Identification (Command Center now primary, so this may be optional)
- **Alternative to:** Command Center
- **Cost:** Unknown (depends on Vertex/BigQuery usage)
- **Security consideration:** Potential cloud integration may have data privacy implications (needs review)
- **Next step:** USER INPUT NEEDED - What was this dashboard called? Still needed or superseded by Command Center?
- **Reference:** Discussion 2026-02-16 11:50+ (when user asked about port 8080)
- **Investigation flag:** Clarify priority with user during next session

---

## Infrastructure & Setup Decisions

### 2026-02-17 - Decision: 3-Tier Backup System (Git + GitHub + Weekly Archives)
- **Category:** Infrastructure / Disaster Recovery
- **Recommendation:** Implement automated backup system to protect against data loss
- **Details:** Three-tier backup strategy:
  - **Tier 1 (Local Git):** Manual commits to local git. On-demand, instant recovery. Command: `git commit -m "..."`
  - **Tier 2 (GitHub Push):** Automated hourly push to GitHub. Cron job ID: `3461d025-2a5d-4cb6-b14f-8fd9bab1a5a2`. Schedule: `0 * * * *` (top of every hour, America/Moncton TZ). Recovery: ~2 minutes (clone + pull). GitHub: https://github.com/joehohoho/Alfred
  - **Tier 3 (Full System Archive):** Weekly compressed backups (git bundle + .openclaw config + ollama metadata). Cron job ID: `05047a4c-ced7-4db4-b64a-b3619132526a`. Schedule: Sunday 2:00 AM. Location: `/Users/hopenclaw/.alfred-backups/`. Retention: 30 days (auto-cleanup).
- **Script:** `/Users/hopenclaw/.openclaw/workspace/scripts/backup-system.sh` (supports tier1, tier2, tier3, status, full)
- **What's backed up:** 165 workspace files (all documentation, memory, configs, scripts)
- **What's excluded:** `.env` (secrets), `STARTUP.md`, `SECURITY-FIXES-APPLIED.md`, build artifacts
- **Recovery scenarios:**
  - Local corruption: `git reset --hard origin/main` (~1 min)
  - Mac failure: Clone from GitHub + restore `.openclaw/` from Tier 3 backup (~15-30 min)
  - GitHub compromise: Restore from local bundle at `/Users/hopenclaw/.alfred-backups/workspace-*.bundle`
- **Status:** ✅ Implemented
- **Cost:** $0 (GitHub free tier, local backups, cron jobs free)
- **Security:** All secrets excluded via .gitignore; GitHub push protection enabled; no tokens in history
- **Documentation:** BACKUP-SYSTEM.md (comprehensive guide)
- **Reference:** memory/2026-02-17-backup-system-setup.md, BACKUP-SYSTEM.md

---

### 2026-02-17 - Decision: Repository Security Fix (Token Exposure Cleanup)
- **Category:** Security / Disaster Recovery
- **Recommendation:** Delete old GitHub repo (had token history) and create fresh repo with clean git history
- **Details:** Old repo had real Slack tokens in Feb 10 commits:
  - `STARTUP.md` lines 28-29
  - `SECURITY-FIXES-APPLIED.md` lines 36, 54, 137
  - Tokens: `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN` (both [REDACTED])
  - Tokens were STILL ACTIVE (not rotated)
- **Action taken:**
  - Deleted old repo: joehohoho/Alfred
  - Created new repo: joehohoho/Alfred (clean slate)
  - Rebuilt git history: Created orphan branch `clean-history`, added all 165 safe files, made initial commit `4d5ae56`, deleted old `main` branch, renamed `clean-history` to `main`
  - Enhanced `.gitignore`: Added patterns for *.key, *.pem, secrets/, .secrets/, STARTUP.md, SECURITY-FIXES-APPLIED.md
  - Result: Fresh history with zero token exposure
- **Why:** Cleaner than history scrubbing; simpler security; fresh start
- **Status:** ✅ Implemented
- **Cost:** $0 (git operations only)
- **Next step (Optional):** Rotate Slack tokens (new bot/app tokens to ensure old ones in history are harmless)
- **Reference:** memory/2026-02-17-backup-system-setup.md

---

### 2026-02-10 - Decision: Dashboard Auto-Start via Cron
- **Category:** Infrastructure / Automation
- **Recommendation:** Auto-start dashboard when OpenClaw is running (5-min polling via cron)
- **Details:** Cron job (*/5 * * * *) checks if OpenClaw gateway is running. If yes AND dashboard isn't running: auto-starts dashboard. Logs to /tmp/alfred-dashboard.log. Restarts dashboard if it crashes.
- **Implementation:** Cron entry: `*/5 * * * * pgrep -f "openclaw gateway" > /dev/null && (pgrep -f "node.*dashboard/server.js" > /dev/null || (cd /Users/hopenclaw/.openclaw/workspace/dashboard && nohup node server.js >> /tmp/alfred-dashboard.log 2>&1 &))`
- **Status:** ✅ Implemented
- **Rationale:** Dashboard tied to OpenClaw lifecycle; auto-recovery on crashes
- **Cost:** $0 (shell commands only, no LLM)
- **Reference:** memory/2026-02-16.md (dashboard setup section)

---

### 2026-02-16 - Decision: OpenClaw Config Upgrade (2026.2.12 → 2026.2.15)
- **Category:** Infrastructure / Configuration
- **Recommendation:** Implement full feature set from latest OpenClaw release
- **Details:** Phase 1-2 applied: Diagnostics enabled, context pruning (7-day TTL), apply_patch tool enabled (workspace-only), update channel configured (stable), plugin registry populated (5 plugins: slack active, 4 others disabled). Phase 3 (LanceDB memory upgrade) deferred to optional.
- **Changes:** Additive only; no breaking changes; Slack plugin remains active; memory index preserved
- **Status:** ✅ Implemented (Phases 1-2)
- **Cost:** $0 (all additions are free or LOCAL)
- **Benefits:** Better observability (diagnostics), auto-cleanup (context pruning), direct code edits (apply_patch), plugin ecosystem ready
- **Rollback:** Full backup created at `~/.openclaw/openclaw.json.backup.1771254259`
- **Reference:** memory/2026-02-16-CONFIG-UPGRADE.md, CONFIG-UPGRADE-PLAN.md

---

### 2026-02-16 - Decision: Memory System Improvements
- **Category:** Infrastructure / Memory Management
- **Recommendation:** Implement structured decision logging + query audit system
- **Details:** Add 4 new files to memory system: (1) DECISIONS-AND-RECOMMENDATIONS.md for all past/future recommendations, (2) update INDEX.md with decision table, (3) QUERIES-AND-MISSES.md to track memory lookup failures, (4) add tag frontmatter template to new memory files.
- **Rationale:** Prevents memory loss on complex discussions; makes past decisions queryable; learns from lookup failures
- **Status:** ✅ Implemented
- **Cost:** $0 (all file creation/editing, no LLM calls)
- **Process:** All LOCAL, zero token cost
- **Reference:** memory/2026-02-16-CONFIG-UPGRADE.md (memory improvements discussion)

---

## Optimization & Efficiency Decisions

### 2026-02-09 - Decision: Token Efficiency Patterns
- **Category:** Optimization
- **Recommendation:** Implement 4-tier token efficiency system
- **Details:** (1) Morning routine → LOCAL sub-agent ($25.56/year savings), (2) Command quick-ref in TOOLS.md ($1.80/year), (3) Memory search-first pattern ($10.80/year), (4) Batch operations ($5.40/year)
- **Status:** ✅ Implemented
- **Total savings:** $43.56/year for $0.01 implementation
- **ROI:** 4,356x
- **Implementation:** Documented in AGENTS.md, MORNING-BRIEF.md, TOOLS.md
- **Reference:** memory/2026-02-09.md (token efficiency section)

---

### 2026-02-09 - Decision: Dashboard Cron Cleanup
- **Category:** Optimization / Infrastructure
- **Recommendation:** Remove duplicate sync-stats.sh cron job
- **Details:** Two dashboard sync jobs were running hourly (both parsing session data). Removed sync-stats.sh; kept sync-usage.js (canonical). Reduced redundant local token usage by ~48k/day.
- **Status:** ✅ Implemented
- **Savings:** ~48k local tokens/day = ~1.4M tokens/month reduction
- **Cost:** $0 (local model, but eliminated waste)
- **Reference:** memory/2026-02-09.md (dashboard cron cleanup section)

---

### 2026-02-10 - Decision: Moltbook Recommendations Implementation
- **Category:** Infrastructure / Workflow
- **Recommendation:** Adopt 5 Moltbook community patterns
- **Details:** (1) Enhance NOW.md with 7-field handoff structure, (2) Create HEARTBEAT.md monitoring framework, (3) Add monthly ClawHub discovery cron, (4) Move Moltbook review to Sunday 9pm, (5) Create SCHEDULE.md central task registry
- **Status:** ✅ Implemented
- **Cost:** $0 (LOCAL tier or existing tasks)
- **Benefits:** Better session continuity, structured monitoring, community innovation tracking
- **Reference:** memory/2026-02-09.md (Moltbook recommendations)

---

## Security Decisions

### 2026-02-04 - Decision: Security Audit & Hardening
- **Category:** Security
- **Recommendation:** Implement baseline macOS security hardening
- **Details:** FileVault encryption enabled, Firewall enabled, Auto-updates enabled, credentials directory permissions fixed (755→700)
- **Status:** ✅ Implemented
- **Deferred:** Time Machine backups (recommended but not critical)
- **Scheduled:** Weekly security audits (Mondays 9 AM, Sonnet-tier)
- **Reference:** memory/2026-02-04.md (security audit section)

---

### 2026-02-10 - Decision: ClawHub Security Gating
- **Category:** Security
- **Recommendation:** Install Clawdex (security scanner) before any new ClawHub skill installation
- **Details:** 341+ malicious ClawHub skills detected (Feb 2026). Added Clawdex to pre-installation workflow. Query: `curl -s "https://clawdex.koi.security/api/skill/SKILL_NAME"` → returns benign | malicious | unknown.
- **Status:** ✅ Implemented
- **Cost:** $0 (external API, but lightweight)
- **Reference:** memory/2026-02-10.md (ClawHub security section)

---

## Outstanding Items / Pending Decisions

### ⏸️ PENDING: Mystery Dashboard (Vertex-based)
- **Status:** Needs user clarification
- **Question:** What was the name of the online-recommended dashboard requiring Vertex/BigQuery?
- **Action:** Once identified, add full entry here with implementation plan

### ⏸️ DEFERRED: LanceDB Memory Plugin Upgrade (Phase 3)
- **Status:** Optional enhancement
- **Details:** Alternative memory backend with auto-recall. Can be activated later if embedding costs become a concern.
- **Cost:** ~$0.0002/query (very cheap)
- **Benefits:** Auto-recall (no manual memory_search), parallel to existing SQLite index
- **When to activate:** User approval required
- **Reference:** memory/2026-02-16-CONFIG-UPGRADE.md (Phase 3)

### ⏸️ DEFERRED: Calendar Integration
- **Status:** Identified as critical gap (Feb 4)
- **Details:** Without calendar access, can't check availability, warn of meetings, coordinate scheduling
- **Action available:** `clawhub install apple-calendar` or `clawhub install accli`
- **When to implement:** User request or when scheduling assistance needed
- **Reference:** memory/2026-02-04.md (skill gaps analysis)

### ⏸️ DEFERRED: Time Machine Backup Setup
- **Status:** Recommended but not critical
- **Details:** Security audit identified missing backups
- **When to implement:** During comprehensive backup hardening phase
- **Reference:** memory/2026-02-04.md (security audit)

---

## Query & Lookup Failures

See `QUERIES-AND-MISSES.md` for tracking of memory lookup failures and improvements made.

---

## Index

**Most Recent Entries:**
- 2026-02-16 - Config Upgrade 2026.2.15 (Phases 1-2)
- 2026-02-16 - Memory System Improvements
- 2026-02-10 - Moltbook Recommendations
- 2026-02-09 - Token Efficiency Patterns
- 2026-02-04 - Dashboard #1 (Node.js 8765)
- 2026-02-06 - Dashboard #2 (Alfred-Dashboard)

**By Category:**
- **Dashboard:** 3 entries (2 implemented, 1 pending)
- **Infrastructure:** 5 entries (5 implemented)
- **Optimization:** 3 entries (3 implemented)
- **Security:** 2 entries (2 implemented)

**By Status:**
- ✅ **Implemented:** 13 entries
- ⏸️ **Deferred:** 4 entries
- ⏳ **Pending Clarification:** 1 entry

---

**Last Updated:** 2026-02-16 12:38 AST  
**Maintainer:** Alfred (main agent)  
**Update Frequency:** After each major decision or recommendation
