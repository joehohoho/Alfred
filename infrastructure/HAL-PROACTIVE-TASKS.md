# HAL Proactive Task Pool

When HAL is idle and no Kanban To Do card qualifies for HAL routing,
Alfred picks from this pool in rotation. Keep tasks small, well-scoped,
and safe to run autonomously.

## Rotation Pool (cycle through in order, reset after last)

1. **Code review: CoinUsUp**
   Scan src/ for common React issues: missing error boundaries, useEffect dependency array bugs, unhandled promise rejections, large unoptimized re-renders. Output: list of findings with file:line references.

2. **Passive income idea scan**
   Research 3 new niche SaaS/automation opportunities in Joe's expertise areas (automation, SaaS). BANNED verticals: financial/trading/tax, legal industry. Focus on low-build, low-maintenance, recurring revenue. For EACH idea you MUST: (a) web search to prove real demand exists (competitors, forums, search volume), (b) identify revenue model and rough pricing, (c) verify Joe can build it (Node.js/React/TypeScript/Python). If you can't find demand evidence, DO NOT create the idea. Schema: include `researchEvidence` (URLs/data) and `demandValidation` (1-2 sentence proof) fields. Format description with sections: Problem, Solution, Revenue Model, Why Joe, Evidence. Output: only VALIDATED ideas — add to Kanban Ideas column.

3. **Dependency audit: CoinUsUp**
   Check package.json for outdated or vulnerable packages using npm outdated logic. Flag major version gaps or known CVEs. Output: summary with recommended updates.

4. **Signal App research**
   Research 1 new open-source market data source or trading signal technique applicable to the Signal App. Focus on free/low-cost data feeds or ML approaches for buy/sell signals. Output: brief findings + implementation recommendation.

5. **Infrastructure health check**
   Check: disk usage, log file sizes, LaunchAgent statuses, Ollama health, cron job last-run timestamps. Flag anything that needs attention. Output: health summary.

6. **CoinUsUp SEO quick wins**
   Review the existing SEO audit (workspace/CoinUsUp/SEO_AUDIT_REPORT.md) and identify the 3 highest-impact remaining fixes that haven't been implemented yet. Output: actionable fix list with estimated effort.

7. **Passive income idea scan (Canada-specific)**
   Focus on Canadian SMB pain points: bilingual requirements, seasonal business challenges, rural connectivity. BANNED: tax/CRA/HST/payroll/financial apps (rejected 16+ times). For EACH idea: web search to prove demand, identify competitors + pricing, verify Joe's stack fit. Include `researchEvidence` and `demandValidation` fields. Format: Problem, Solution, Revenue Model, Why Joe, Evidence sections. Only create ideas with proven demand.

8. **Code review: Market Signal Lab**
   Review /Users/hopenclaw/market-signal-lab/src for signal quality improvements, edge case handling, or missing backtesting coverage. Output: findings list.

9. **System monitoring report**
   Check CPU usage, memory pressure, disk usage, running processes, and service health across all LaunchAgents. Verify gateway, dashboard, job-tracker are responsive. Output: health summary with any issues flagged.

10. **Documentation freshness audit**
    Review workspace docs (MEMORY.md, AGENTS.md, TOOLS.md, HEARTBEAT.md, HAL-DIRECTIVES.md) for stale info — wrong file paths, outdated instructions, references to removed features. Output: list of stale sections with suggested fixes. Commit fixes directly for non-CUU repos.

11. **Test coverage review: CoinUsUp**
    Analyze /Users/hopenclaw/CoinUsUp/src and /Users/hopenclaw/CoinUsUp/tests to identify untested code paths, missing edge case tests, or components without test files. Output: prioritized list of missing tests with suggested test cases.

12. **Performance profiling: Command Center**
    Profile Command Center backend API endpoints — check response times, identify slow routes, look for N+1 queries or excessive file reads. Review frontend bundle size. Output: performance report with specific optimization recommendations.

13. **Dead code & cleanup sweep**
    Scan all repos (command-center, job-tracker, market-signal-lab, agent-sdk) for unused imports, dead functions, orphaned files, unreferenced CSS classes. Output: cleanup list. Commit+push fixes for non-CUU repos.

14. **Git hygiene**
    Check all repos for: merged branches that should be deleted, large files that shouldn't be tracked, missing .gitignore entries, stale branches. Clean up merged branches. Output: summary of actions taken.

15. **Log analysis & anomaly detection**
    Parse recent gateway logs, dashboard logs, and cron run logs. Look for error patterns, unusual frequencies, failed deliveries, timeout clusters. Output: anomaly report with severity ratings.

16. **Security posture check**
    Review all repos for: outdated dependencies with known CVEs (npm audit), exposed secrets in code, overly permissive file permissions, missing input validation. Output: security findings with severity and remediation steps. Commit+push non-breaking dependency updates for non-CUU repos.

## Rules
- Each task output goes to Kanban Ideas column (for ideas) or as a comment on relevant card (for reviews)
- **Non-CUU repos** (command-center, job-tracker, market-signal-lab, agent-sdk): HAL may commit AND push obvious fixes (unused imports, dead code, dependency updates, typo fixes, missing error handling, test additions)
- **CoinUsUp**: Output findings only — commit locally but never push without Joe approval
- Create Kanban cards for larger changes that need human review
- Rotate pool index tracked in: .hal-alfred-tracking/proactive-pool-index.txt
- **Before creating any new idea card:** check existing board + rejected cards/comments to avoid duplicate/recycled ideas
- **New idea quality bar (mandatory):** include demand signal, competitor scan, monetization path, rough margin/profitability, speed-to-first-dollar, risks, and Go/Test/Reject recommendation. MUST populate `researchEvidence` (URLs/data proving demand) and `demandValidation` (1-2 sentence proof) fields in the idea JSON. Ideas without these fields will be auto-archived during evaluation. Format descriptions with sections: **Problem**, **Solution**, **Revenue Model**, **Why Joe**, **Evidence** — never one big paragraph.
- **Value-first filter:** prefer tasks with concrete deliverables that improve revenue, reliability, or operator leverage
