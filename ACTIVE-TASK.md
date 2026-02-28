# ACTIVE-TASK.md - Current Work In Progress

**Status:** in_progress
**Last Updated:** 2026-02-27 20:25 AST

## Current Objective
Friday evening session — HAL proactive batch running, delivering results, monitoring infrastructure.

## What Happened Today (2026-02-27)
- Infra health check: Ollama down, disk 77%, dashboard SIGTERM pattern
- CoinUsUp SEO audit: 3 remaining fixes (SSR/prerender, WebP images, internal linking)
- Market Signal Lab code review: 15 findings, 4 critical (RSI inversion, stop-loss gap, signal alignment, MTF params)
- Command Center perf profiling: hal.ts no cache (130ms), uptime.ts reads 2939 files (330ms) — P1 fixes identified
- Dead code sweep: fixes committed to job-tracker, market-signal-lab, command-center (23 React import cleanups)
- Git hygiene: merged branch deleted, 2 stale CoinUsUp remotes + 177 tracked artifacts need Joe approval
- Log analysis: 132 rate-limit errors from concurrent HAL batch — spawn staggering needed
- Security posture: .env permissions fixed (644→600), CoinUsUp .env removed from git (local only, Joe approval needed for push)
- Project Health Command Center Phase 1: BUILT AND LIVE — Postgres + real API + 4 project cards
- Documentation audit: HAL-DIRECTIVES.md numbering fixed, HEARTBEAT.md Slack→Discord updated
- 3x Canada-specific SaaS ideas added to Kanban (Bill 96, CRA Dashboard, ROE Assistant)
- 3x general passive income ideas added (Law Firm notification bot, Trading Signal Digest, Automation Audit SaaS)
- Alfred↔HAL discussion: 2026 market trends posted to Discord
- CoinUsUp code review: 20 findings (2 hook-in-render violations = critical)
- CoinUsUp dependency audit: Capacitor plugins need v6→v8 update (security fix)
- Signal App research: Alpha Vantage + MACD/RSI confluence technique recommended

## Pending Joe Decisions
1. CoinUsUp git history scrub (.env in history) — approve `git filter-repo` + force push?
2. CoinUsUp stale remote branches — delete `origin/GetStarted` + `origin/group-email`?
3. CoinUsUp tracked build artifacts — approve `git rm --cached android/.gradle/ android/app/build/`?
4. Command Center → Vite migration (CRA CVEs) — create Kanban card?
5. CoinUsUp: Queue CriticalReact fixes (hook-in-render violations)?
6. CoinUsUp: Start Capacitor v6→v8 plugin update?

## Infrastructure Issues Logged in Kanban
- HAL subagent spawn staggering (urgent)
- Fix sync-pending-questions.sh ACTIVE-TASK.md write failure
- Session file archival cron

## Next Step
Continue HAL dispatch cycle. sync-pending-questions.sh write failure needs investigation.
