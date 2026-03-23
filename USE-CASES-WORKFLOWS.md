# Use Cases & Workflows
## Common Patterns, How They Work, Where They Live

**Purpose:** Document the workflows Alfred, HAL, and Joe execute regularly. When questions arise about "how do we do X?", this file is the reference.

**Last Updated:** 2026-03-23  
**Owner:** Alfred (documentation + execution)  
**Audience:** Joe (understand the system), Alfred (execute patterns), HAL (reference for collaboration)

---

## Use Case 1: Morning Standup & Daily Brief

**Time:** Daily at 9 AM AST (or on session start if after 9 AM)  
**Trigger:** Cron job `morning-brief.sh`  
**Owner:** Alfred

### Workflow

1. **Gather overnight state:**
   - Read logs from previous 8h (8 PM - 4 AM)
   - Check kanban board for new cards + moves
   - Check ACTIVE-TASK.md for pending questions
   - Read OPEN-LOOPS.md (if exists, auto-generated daily)

2. **Compile summary:**
   - Overnight work completed (kanban cards moved)
   - System issues encountered + resolved
   - Pending blockers (cards in "blocked" state)
   - Decisions made (from LEARNINGS.md)

3. **Deliver:**
   - Post to Discord #general (or #admin)
   - Format: Markdown, <500 chars
   - Example:
     ```
     🌅 **Morning Brief — Monday**
     
     **Overnight:** Even Us Up discovery complete (3 features + handoff contract). Signal App prompt files ready for Phase 2.
     
     **Pending:** Joe decision on Even Us Up implementation approach.
     
     **Blockers:** None.
     ```

### When to Run
- Automatically at 9 AM
- Can be triggered manually: `bash scripts/morning-brief.sh`

### Files Involved
- `scripts/morning-brief.sh` (executes)
- `logs/` (source of overnight events)
- `OPEN-LOOPS.md` (high-level pending work)
- `ACTIVE-TASK.md` (pending questions)
- Discord #general or #admin (delivery)

---

## Use Case 2: Evening Routine & Day Summary

**Time:** Daily ~10 PM AST  
**Trigger:** Cron job or manual  
**Owner:** Alfred

### Workflow

1. **Capture day's work:**
   - What was completed (kanban cards moved to done)
   - What's in progress (review cards + blockers)
   - Decisions made today (add to LEARNINGS.md)
   - Bugs found or patterns observed

2. **Update state files:**
   - `ACTIVE-TASK.md` — current objective + progress + next step
   - `LAST-SESSION.md` — structured handoff for next session
   - `NOW.md` — emergency checkpoint (if context >60%)
   - `memory/YYYY-MM-DD.md` — append session notes

3. **Post summary:**
   - Discord #general or #admin
   - Format: Markdown, <500 chars
   - Example:
     ```
     🌙 **Evening Routine — Monday**
     
     **Completed:** YouTube video review (21KB doc), Phase 1 documentation (5 files created).
     
     **In Progress:** Phase 2 (model-specific prompts). Phase 3 scope (security enhancements).
     
     **Blockers:** None.
     
     **Tomorrow:** Create USE-CASES.md, then Phase 2 prompting setup.
     ```

### Files Involved
- `ACTIVE-TASK.md` (update state)
- `LAST-SESSION.md` (session bridge)
- `NOW.md` (checkpoint)
- `memory/YYYY-MM-DD.md` (daily log)
- `LEARNINGS.md` (add bugs/patterns)
- Discord #general or #admin (delivery)

---

## Use Case 3: HAL Async Task Dispatch

**Trigger:** Joe creates or assigns kanban card to HAL  
**Owner:** Alfred (dispatcher) + HAL (executor)  
**Duration:** 1h - 3 days

### Workflow

1. **Alfred reads card:**
   - Title, description, estimated effort
   - Any constraints or context

2. **Create handoff contract:**
   - File: `goals/handoffs/task_[ID]_[UUID].json`
   - Content:
     ```json
     {
       "card_id": "C123",
       "title": "Backtest signal strategy: Dual EMA + RSI",
       "objective": "Generate backtest results for Mar 15-20 period, identify best parameters",
       "constraints": "Use historical data only (no future-looking), 2h time limit",
       "deliverables": [
         "Backtest results (JSON format)",
         "Parameter optimization (best performing values)",
         "Summary: win rate + Sharpe ratio"
       ],
       "validation": [
         "Results file exists + is valid JSON",
         "Metrics match expected scale (0-1 for win rate, -2 to 5 for Sharpe)",
         "Summary posted to Discord C0AH4QSA71T"
       ],
       "owner_alfred_notes": "HAL can use local Qwen for this; high compute but no API cost"
     }
     ```

3. **Dispatch to HAL:**
   - Check HAL health: `ws://192.168.2.79:18789` reachable?
   - If healthy: spawn with task + handoff contract
   - If unhealthy: log failure + alert Joe

4. **HAL executes:**
   - Performs work autonomously
   - Posts status updates to Discord during work
   - Delivers results in deliverables format

5. **Alfred reviews + moves card:**
   - Check deliverables against validation criteria
   - If complete: move card to "review" column
   - If incomplete: post blocker + wait for HAL fix

6. **Joe approves/rejects:**
   - Reviews in kanban UI
   - Approves → card moves to "done" + HAL notified
   - Rejects → card moves back to "in progress" + feedback posted

### When Used
- Multi-hour analysis work (backtesting, strategy evaluation)
- Parallel execution (Alfred works on project A, HAL works on project B)
- Research synthesis (HAL collects data, Alfred makes decisions)

### Files Involved
- `goals/handoffs/` (contracts)
- Kanban board (card lifecycle)
- Discord (status updates + delivery)
- `memory/YYYY-MM-DD.md` (document dispatch + results)

### Cost
- $0 (HAL is local Qwen model, only electricity)

---

## Use Case 4: Code Review & Fix Cycle

**Trigger:** Joe pushes code to GitHub, or Alfred finds a bug  
**Owner:** Claude Code (primary) or Alfred  
**Duration:** 15 min - 2 hours

### Workflow

1. **Setup:**
   - Clone repo or navigate to local workspace
   - Run tests: `npm test` or `pytest tests/`
   - If tests fail → move to step 2; if pass → done

2. **Investigation (if failing):**
   - Read error message carefully
   - Check git log for recent changes
   - Reproduce error locally with minimal example
   - Document hypothesis in comment or LEARNINGS.md

3. **Fix:**
   - Write fix (code change)
   - Re-run tests
   - If pass → move to step 4
   - If fail → update hypothesis, try again

4. **Commit & Push:**
   - `git add -A && git commit -m "fix: [description]"`
   - Commit message format: `type: description` (fix/feat/refactor/docs)
   - `git push origin feature-branch`

5. **PR + Review:**
   - Create PR on GitHub (if applicable)
   - Link to kanban card (if applicable)
   - Code review by Joe (or automated via linter)
   - Merge on approval

6. **Deploy:**
   - If production repo: automatic deployment (Vercel/similar)
   - If local: verify live functionality
   - Post completion to Discord #wins

### Files Involved
- Git repo (code)
- GitHub PR (review)
- LEARNINGS.md (document pattern)
- Discord #wins (celebration)

### Common Patterns
- **Bug + Fix:** Run tests → identify root cause → fix → test → commit
- **Feature:** Write code → add tests → git commit → push → PR
- **Refactor:** Identify improvement → implement → test → commit → document in LEARNINGS.md why the change

---

## Use Case 5: Cron Job Setup & Maintenance

**Trigger:** Joe needs a new recurring task  
**Owner:** Alfred (setup) + LaunchAgent (execution)  
**Duration:** 15 min - 1 hour setup, then recurring

### Workflow

1. **Define task:**
   - What should run? (bash script, Python, cron job)
   - When? (specific time, recurring interval)
   - Success criteria? (what indicates success)
   - Failure notification? (who to alert + how)

2. **Create script:**
   - File: `scripts/[task-name].sh`
   - Include logging: `echo "[message]" >> $LOG_FILE`
   - Include error handling: `if [[ $? -ne 0 ]]; then echo "ERROR"; exit 1; fi`
   - Make executable: `chmod +x scripts/[task-name].sh`

3. **Configure cron or LaunchAgent:**
   - For simple bash: add to `crontab -e`
   - For complex/frequent: create LaunchAgent plist
   - Set to off-hours (night, not during work hours)
   - Add to AGENTS.md documentation

4. **Test:**
   - Run manually: `bash scripts/[task-name].sh`
   - Check output + logs
   - Verify success criteria met

5. **Deploy + Monitor:**
   - Enable cron/LaunchAgent
   - Check execution next day
   - Verify logs for errors
   - Add to daily config check (validates it ran)

### Example: Daily Backup Cron

```bash
# File: scripts/daily-backup.sh
#!/bin/bash
DATE=$(date +%Y-%m-%d)
LOG="/Users/hopenclaw/.openclaw/logs/backup-${DATE}.log"

echo "Starting daily backup..." >> "$LOG"

# Step 1: Git push to GitHub
cd ~/.openclaw/workspace
git push origin main >> "$LOG" 2>&1 || echo "ERROR: git push failed" >> "$LOG"

# Step 2: Archive to backup location
tar -czf ~/.alfred-backups/workspace-${DATE}.tar.gz ~/.openclaw/workspace >> "$LOG" 2>&1 || echo "ERROR: archive failed" >> "$LOG"

echo "Backup complete" >> "$LOG"
```

**Crontab entry:**
```
0 2 * * * /Users/hopenclaw/.openclaw/workspace/scripts/daily-backup.sh
```
(Runs daily at 2 AM)

### Files Involved
- `scripts/[task-name].sh` (script)
- Crontab or LaunchAgent config (scheduling)
- AGENTS.md (documentation)
- Log files (monitoring)

---

## Use Case 6: Project Documentation Update

**Trigger:** Project structure changes, new feature added, deployment process changes  
**Owner:** Joe (content) + Alfred (formatting)  
**Duration:** 30 min - 1 hour

### Workflow

1. **Identify what changed:**
   - New API endpoint? → Update API section in README
   - Database schema change? → Update schema diagram
   - Deployment process changed? → Update deployment steps
   - New known bug? → Add to "Known Issues" section

2. **Locate documentation:**
   - Project README (e.g., `CoinUsUp/README.md`)
   - Update relevant section

3. **Update:**
   - Add/edit content (use template format)
   - Keep structure consistent (other projects use same template)
   - Include examples where helpful
   - Verify links still work

4. **Commit:**
   - `git add README.md`
   - `git commit -m "docs: [what changed]"`
   - `git push`

5. **Notify:**
   - Post summary to Discord #wins or #admin
   - Example: "Updated CoinUsUp README — added 3 new API endpoints, fixed deployment steps"

### Files Involved
- Project README (content)
- Git (version control)
- Discord (notification)

### Documentation Templates
All project READMEs follow this structure:
1. Overview (purpose, tech stack, status)
2. Architecture (frontend, backend, database)
3. Database Schema
4. API Endpoints
5. Deployment
6. Known Issues
7. Features & Status
8. Recent Changes & Decisions
9. Access & Credentials
10. Development Workflow

---

## Use Case 7: Decision Logging & Pattern Prevention

**Trigger:** Alfred or Joe discovers a bug, makes a decision, or finds a useful pattern  
**Owner:** Alfred (logging)  
**Duration:** 5-10 min

### Workflow

1. **Identify what to log:**
   - Bug found? → Add to LEARNINGS.md
   - Decision made? → Add to DECISIONS-AND-RECOMMENDATIONS.md
   - Pattern observed? → Add to LEARNINGS.md "Pattern Findings"

2. **Document bug (format):**
   ```markdown
   ### [YYYY-MM-DD] Bug Title
   - **Symptom:** What the user saw
   - **Root Cause:** Why it happened
   - **Fix:** How we fixed it
   - **Prevention:** How to prevent next time
   - **Reference:** Link to related code/docs
   ```

3. **Document decision (format):**
   ```markdown
   | Decision | Category | Date | Status |
   |---|---|---|---|
   | [Name] | [Type] | [Date] | ✅ Implemented |
   ```

4. **Commit & close loop:**
   - `git add LEARNINGS.md` or `git add DECISIONS-AND-RECOMMENDATIONS.md`
   - `git commit -m "log: [what was logged]"`
   - Post to Discord: "Logged: [bug title]" or "Decision recorded: [title]"

### Files Involved
- `LEARNINGS.md` (bugs + patterns)
- `DECISIONS-AND-RECOMMENDATIONS.md` (decisions)
- Git (version control)
- Discord (notification)

### Why This Matters
- Next time same issue occurs, Alfred looks in LEARNINGS.md → "I've seen this before, here's the fix"
- Prevents repeat questions (guards in DECISION-MEMORY.md)
- Builds system knowledge over time

---

## Use Case 8: Goal Intake & Sub-Agent Analysis

**Trigger:** Joe has an idea or goal they want evaluated  
**Owner:** Alfred (intake + dispatch) + HAL (analysis)  
**Duration:** 15 min (intake) + 1-2h (analysis)

### Workflow

1. **Joe mentions goal in chat:**
   - "We should explore X"
   - "Can we build Y?"
   - "What if we did Z?"

2. **Alfred captures:**
   - Create Kanban card (or add to goals/) 
   - Record goal, Joe's intent, any constraints
   - File: `goals/goals.json` (append entry)

3. **Alfred evaluates + dispatches to HAL:**
   - Quick assessment: Is this worth analyzing?
   - If yes: Dispatch to HAL with analysis prompt
   - Handoff contract: `goals/handoffs/goal_[ID].json`
   - HAL analyzes: feasibility, time estimate, resource needs, synergies

4. **HAL responds:**
   - Posts analysis to Discord
   - Includes: Recommendation (go/no-go), reasoning, blockers

5. **Alfred synthesizes + presents to Joe:**
   - Summary: "HAL analysis suggests [recommendation] because [reason]"
   - If go: Create Kanban card for implementation
   - If no-go: Archive in ideas backlog

### Example Flow

```
Joe: "What if we productized the CoinUsUp billing system for other SaaS companies?"

Alfred: 
1. Capture goal in goals/goals.json
2. Check LEARNINGS.md + JOE-PROFILE.md for similar patterns
3. Recognize: "Joe rejected consulting productization twice (Mar 9, Mar 19)"
4. Decision: Score low (Joe's pattern = focus on own apps, not external sales)
5. Response: "Archived — aligns with your focus on CoinUsUp/Even Us Up/Signal App over external products"

Joe: "Yeah that's right, I want to focus on building my own stuff."

Alfred: Updated decision guard to skip similar questions for 30 days.
```

### Files Involved
- `goals/goals.json` (intake)
- `goals/handoffs/` (contracts)
- `LEARNINGS.md` (pattern tracking)
- `JOE-PROFILE.md` (decision context)
- Discord (async discussion)
- Kanban board (if goal is accepted)

---

## Use Case 9: Token Budget Monitoring & Cost Optimization

**Trigger:** Daily morning, or when spending spikes  
**Owner:** Alfred (monitoring)  
**Duration:** 5 min (check) + varies (optimize)

### Workflow

1. **Daily check (9 AM):**
   - `session_status` → view token usage for current session
   - Check previous day's spend (from Command Center)
   - Compare to budget ($X/day target)

2. **If within budget:**
   - No action
   - Post summary to #admin (optional)

3. **If over budget:**
   - Identify cause:
     - Backtest run? (expected, high compute)
     - Slow API responses? (quota throttled)
     - Loop detected? (bug)
   - Log in LEARNINGS.md
   - Adjust strategy:
     - Reduce model tier (Opus → Sonnet → Haiku)
     - Batch work to off-hours
     - Cache results (don't re-run)

4. **Weekly review:**
   - Sum daily spends (Mon-Sun)
   - Compare to monthly budget
   - If trending over: reduce scope or defer low-priority work

### Example Alert

```
⚠️ Over budget: $180 spent (budget $150/month)

Cause:
- Backtest runs (80h compute): +$120
- Cron jobs (normal): +$40
- Interactive sessions: +$20

Action:
- Defer non-critical backtests to HAL (local, $0)
- Batch cron jobs in fewer, larger calls
- Use Haiku for formatting tasks
```

### Files Involved
- Session status (current session)
- Command Center dashboard (historical)
- LEARNINGS.md (log patterns)
- Discord #admin (alerts)

---

## Use Case 10: HAL ↔ Alfred Collaborative Discussion

**Trigger:** Decision needs both human judgment + multiple perspectives  
**Owner:** Alfred (orchestration) + HAL (analysis)  
**Duration:** 1-2 hours

### Workflow

1. **Alfred identifies need:**
   - Complex decision with unclear best approach
   - Example: "Should we launch Signal App MVP early or continue perfecting algorithm?"

2. **Form own perspective (Alfred):**
   - 2-3 key points
   - Example:
     - "Launching now lets users validate signals in real environment"
     - "But quality issues could damage credibility if not ready"
     - "Recommend: 4-week polish cycle, then launch with disclaimer"

3. **Dispatch to HAL:**
   - Provide full context (goal, constraints, Joe's preferences)
   - Ask for: "Technical perspective, key risks, top 3 actionable recommendations"

4. **HAL responds:**
   - Provides independent analysis
   - Highlights points Alfred missed
   - Proposes alternatives

5. **Synthesize:**
   - Combine perspectives
   - Identify consensus + disagreements
   - Present to Joe with both views

6. **Post to Discord:**
   - Format: "🤝 **Alfred ↔ HAL Synthesis: [Topic]**"
   - Alfred's view | HAL's view | Recommendation

### Example Output

```
🤝 **Alfred ↔ HAL Synthesis: Signal App MVP Launch Timing**

**Alfred's Take:**
- Launch now (rough): Validate signals + iterate
- Risk: User frustration if quality is low
- Recommendation: 4-week polish, then launch with transparency

**HAL's Take:**
- Algorithm improvements would unlock 15-20% win rate gain
- Early launch doesn't capture that upside
- Recommendation: Complete Phase 2 (parameter optimization), then launch

**Synthesis:**
- Both agree quality before launch is critical
- HAL's algorithm work (4 weeks) overlaps with Alfred's polish (4 weeks)
- Recommendation: Parallel work, reconvene Mar 30 for launch decision
```

### Files Involved
- Discord C0AH4QSA71T (delivery)
- ACTIVE-TASK.md (if decision is pending)
- Goal/decision files (if documented)

---

## Quick Reference: Which Workflow When?

| Goal | Workflow | Owner | Time |
|------|----------|-------|------|
| Summarize today's work | Evening Routine (UC2) | Alfred | 15 min |
| Assign work to HAL | HAL Async Dispatch (UC3) | Alfred | 30 min setup + varies execution |
| Fix a bug | Code Review Cycle (UC4) | Claude Code or Alfred | 15 min - 2h |
| Add recurring task | Cron Job Setup (UC5) | Alfred | 15 min - 1h |
| Update project docs | Project Doc Update (UC6) | Alfred | 30 min - 1h |
| Track bug pattern | Decision Logging (UC7) | Alfred | 5-10 min |
| Evaluate new idea | Goal Intake (UC8) | Alfred + HAL | 15 min + 1-2h analysis |
| Monitor spending | Budget Monitoring (UC9) | Alfred | 5 min daily |
| Complex decision | HAL ↔ Alfred Discussion (UC10) | Alfred + HAL | 1-2h |

---

## Workflow Evolution & Improvements

This document evolves as new patterns emerge. If you discover a useful workflow:

1. Document it here with title, trigger, owner, duration
2. Add to "Quick Reference" table
3. Commit to git
4. Post to Discord: "New workflow documented: [name]"

**Next Review:** Monthly (first Monday of month)  
**Maintained By:** Alfred  
**Feedback To:** Add suggestions in kanban Ideas column or Discord #admin

