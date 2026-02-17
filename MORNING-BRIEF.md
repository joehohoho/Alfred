# MORNING-BRIEF.md - Daily Morning Routine

**Purpose:** Efficient morning brief using LOCAL sub-agent (FREE tokens)

**Cost comparison:**
- Main session (Sonnet): ~$0.07/morning → ~$2.10/month
- Sub-agent (LOCAL): $0.00/morning → **$0.00/month**

---

## Pattern: Spawn LOCAL Sub-Agent

Instead of running morning brief in main session, use:

```javascript
sessions_spawn({
  model: "ollama/llama3.2:3b",
  task: "Run morning brief for Dieppe, NB. Include:
  
  WEATHER (winter format):
  - Current conditions with wind chill
  - Snowfall amount + timing if expected today
  - Wind/gusts throughout the day
  - High temp with wind chill factor
  - Current morning feel with wind factor
  
  OVERNIGHT WORK:
  - Check memory/YYYY-MM-DD.md (today's date) for overnight activity
  - Summarize completed work, decisions made, blockers
  - Format as brief bullet points
  
  Use commands:
  - Weather: curl -s 'wttr.in/Dieppe,NB?T'
  - Memory: read memory/2026-02-09.md (adjust date as needed)"
})
```

---

## Manual Trigger (If Needed)

If morning routine didn't run automatically, can trigger manually:

**Via exec:**
```bash
curl -s "wttr.in/Dieppe,NB?T"
cat memory/$(date +%Y-%m-%d).md
```

**Via sub-agent (preferred):**
Use sessions_spawn pattern above.

---

## Integration with HEARTBEAT.md

**Option A:** Add to heartbeat checks
- Run once per day, 8:30am AST
- Only trigger if not run yet (check heartbeat-state.json)

**Option B:** Separate cron job
- More predictable timing
- Isolates morning brief from other checks
- See SCHEDULE.md for cron setup

**Current approach:** Manual trigger or heartbeat-based (no separate cron yet)

---

## Seasonal Variations

**Winter (Nov-Mar):**
- Emphasize snowfall amounts + timing
- Wind chill is critical
- Ice/freezing rain warnings

**Summer (Jun-Aug):**
- UV index highs
- Humidity
- Heat warnings

**Spring/Fall (Apr-May, Sep-Oct):**
- Rain probability
- Temperature swings
- General conditions

---

## Output Format

```
☀️ Morning Brief - [Day], [Date]

🌤️ Weather for Dieppe, NB
- Current: [temp]°C (feels like [windchill]°C)
- Wind: [direction] [speed] km/h, gusts to [max] km/h
- Snowfall: [amount] mm expected [timing] (or "No snowfall expected")
- High: [temp]°C (feels like [windchill]°C)

🌙 Overnight Work Summary
- [Summary of completed tasks]
- [Decisions made]
- [Blockers or next steps]
```

---

## Notes

- LOCAL model (llama3.2:3b) is sufficient for this task
- Weather API (wttr.in) is free, no key needed
- Reading memory files is simple file operation
- No complex reasoning required → perfect LOCAL tier task

**Token efficiency:** Saves ~$2.10/month by avoiding Sonnet for routine morning checks.
