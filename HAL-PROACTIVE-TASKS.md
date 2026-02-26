# HAL Proactive Task Pool

When HAL is idle and no Kanban To Do card qualifies for HAL routing,
Alfred picks from this pool in rotation. Keep tasks small, well-scoped,
and safe to run autonomously.

## Rotation Pool (cycle through in order, reset after last)

1. **Code review: CoinUsUp**
   Scan src/ for common React issues: missing error boundaries, useEffect dependency array bugs, unhandled promise rejections, large unoptimized re-renders. Output: list of findings with file:line references.

2. **Passive income idea scan**
   Research 3 new niche SaaS/automation opportunities in Joe's expertise areas (automation, trading, law firm tooling, SaaS). Focus on low-build, low-maintenance, recurring revenue. Output: 3 ideas with effort/upside estimate — add to Kanban Ideas column.

3. **Dependency audit: CoinUsUp**
   Check package.json for outdated or vulnerable packages using npm outdated logic. Flag major version gaps or known CVEs. Output: summary with recommended updates.

4. **Signal App research**
   Research 1 new open-source market data source or trading signal technique applicable to the Signal App. Focus on free/low-cost data feeds or ML approaches for buy/sell signals. Output: brief findings + implementation recommendation.

5. **Infrastructure health check**
   Check: disk usage, log file sizes, LaunchAgent statuses, Ollama health, cron job last-run timestamps. Flag anything that needs attention. Output: health summary.

6. **CoinUsUp SEO quick wins**
   Review the existing SEO audit (workspace/CoinUsUp/SEO_AUDIT_REPORT.md) and identify the 3 highest-impact remaining fixes that haven't been implemented yet. Output: actionable fix list with estimated effort.

7. **Passive income idea scan (Canada-specific)**
   Focus on Canadian SMB pain points: compliance, payroll, tax deadlines, bilingual requirements. Identify 2–3 niche software opportunities with geography-specific moat. Output: ideas for Kanban.

8. **Code review: Market Signal Lab**
   Review /Users/hopenclaw/market-signal-lab/src for signal quality improvements, edge case handling, or missing backtesting coverage. Output: findings list.

## Rules
- Each task output goes to Kanban Ideas column (for ideas) or as a comment on relevant card (for reviews)
- HAL should never modify production files autonomously — output findings only
- Rotate pool index tracked in: .hal-alfred-tracking/proactive-pool-index.txt
- If HAL produces findings, Alfred reviews before any action is taken
