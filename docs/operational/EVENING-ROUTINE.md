# Evening Routine (Self-Improvement)

Run: ~10 minutes before end of day

---

## 1. Daily Log (2 min)

```bash
# Update today's memory file
echo "## End of Day Summary
- Completed: [list]
- Learned: [list]
- Next: [list]
" >> memory/$(date +%Y-%m-%d).md

# Update INDEX.md if new daily file created
```

---

## 2. Next Steps Review (3 min)

### High Priority (from 2026-02-04 research)

**Calendar Integration** — BLOCKED (waiting for Joe's calendar system info)
- [ ] Once known: `clawhub search calendar` + install appropriate skill
- Why: Can't schedule, check availability, or warn about meetings without this

**Morning Briefing** — READY (waiting for Joe's preferences)
- [ ] Ask Joe: Want one? What to include? (weather, calendar, emails?)
- [ ] Once confirmed: Add to HEARTBEAT.md

**"Just Do It" vs "Ask First"** — BLOCKED (need Joe's input)
- [ ] Ask Joe to categorize common tasks
- [ ] Document in USER.md once established

### Medium Priority

**Project Context** — READY
- [ ] Ask Joe about current project/repo to assist with
- [ ] Once shared: Add to workspace, monitor, offer help

**Communication Preferences** — READY
- [ ] Ask Joe: Concise vs detailed? Proactive hours?
- [ ] Document in USER.md

### Low Priority

**Moltbook Check** — SCHEDULED
- Next: ~2026-02-12 (1x/week rhythm)
- Just browse, don't post unless have something valuable

---

## 3. Token Efficiency Check (1 min)

Quick wins to reduce costs:
- Did I load unnecessary files today?
- Did I use LOCAL model where possible?
- Any repeated work that could be cached/documented?

**Memory Access Optimization:**
- ✅ Use `memory_search()` + `memory_get(path, from, lines)` instead of `read(MEMORY.md)`
- ✅ Load INDEX.md FIRST to find which files you need
- ✅ Limit memory_search results: `maxResults: 3, minScore: 0.75`
- ❌ Don't load full files blindly (wastes tokens)
- **Savings:** 85% token reduction when accessing memory correctly

---

## 4. Innovation Review (3 min)

**Question:** What could be improved with a little ingenuity?

### Configuration Improvements
- Any repeated manual steps that could be automated?
- Config files that could be smarter/more dynamic?
- Tools we have but aren't using effectively?

### Minor Development Opportunities
- Small scripts that would save time (10-30 min to build)?
- Data we're collecting but not using?
- Integrations between existing tools?

### Think Outside the Box (Realistic)
- Patterns from Moltbook/community that could apply here?
- Unconventional uses of existing skills?
- Small experiments worth trying?

**Today's insight:** Clawdex as pre-installation gate shows value of defensive tooling. Could extend pattern: pre-commit security hooks, pre-deployment config validation, pre-exec command sanitization.

---

## 5. Tomorrow's Focus (1 min)

Pick ONE unblocked task to progress:
- Ask about calendar system?
- Ask about morning briefing preferences?
- Ask about current project?

Write it here:
**Tomorrow:** Build pre-commit git config validation hook (prevent joesubsho@gmail.com config drift) ← STILL PRIORITY, build it!

---

## 6. Post to Slack (1 min)

Post summary to #nightlyroutine (C0AE72DKGCQ)

---

## 7. Commit Changes (1 min)

```bash
cd ~/.openclaw/workspace
git add -A
git commit -m "Evening routine: $(date +%Y-%m-%d)"
git push
```

---

**Last Run:** 2026-02-17 22:00 AST
