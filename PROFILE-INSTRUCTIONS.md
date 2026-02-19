# PROFILE-INSTRUCTIONS.md — How to Maintain JOE-PROFILE.md

**Purpose:** Guide for Alfred's periodic reflection process. Read this before updating JOE-PROFILE.md.

---

## Core Principles

1. **Observe, don't assume.** Every observation needs a source reference.
2. **Confidence levels matter.** Mark observations as high/medium/low. Promote to higher confidence only after 3+ corroborating data points.
3. **Distill, don't accumulate.** The Observation Log is temporary. Move raw observations into sections and synthesize.
4. **Respect privacy.** Never record private details about Joe's family, finances, or health. Focus on work patterns and preferences.
5. **Keep it scannable.** JOE-PROFILE.md must stay under 6,000 tokens. If approaching the limit, compress older observations into summaries.

---

## Data Sources (Priority Order)

1. **Notification Q&A pairs** (`goals/notifications.json`)
   - Richest source. Joe's answers reveal decision patterns, values, preferences.
   - Parse: response length, response time, tone, content.

2. **Session logs** (`~/.openclaw/agents/main/sessions/*.jsonl`)
   - Direct conversations with Joe via chat.
   - Look for: requests, feedback, corrections, emotional cues.
   - CAUTION: Thousands of files. Sample recent ones only (last 7 days).

3. **Daily memory logs** (`memory/YYYY-MM-DD.md`)
   - Your own observations from each day.
   - Look for: what tasks Joe initiated, what Joe responded to.

4. **Claude Code drop file** (`joe-profile-observations.jsonl`)
   - Written by Claude Code (Joe's CLI assistant). Different lens — sees coding sessions, debugging approaches, review patterns.
   - Treat as peer observations — validate against other sources.

5. **Goals** (`goals/goals.json`)
   - What Joe creates goals for reveals priorities.

6. **Cron job patterns** (what jobs exist, which get attention)
   - Implicit signal about what Joe values enough to automate.

---

## Reflection Process (5 Phases)

### Phase 1: Gather (~2 min)
1. Read `goals/notifications.json` — scan for answered notifications since last reflection date.
2. Check recent `memory/YYYY-MM-DD.md` files since last reflection.
3. Read `joe-profile-observations.jsonl` for new Claude Code entries.

### Phase 2: Observe (~3 min)
Extract raw observations. For each, note:
- What you observed
- Where you observed it (source + specific ID/date)
- What it might mean

**Categories to watch for:**
- **Communication:** Response length, tone shifts, engagement level
- **Decisions:** Speed, information requested, delegation vs control
- **Values:** What Joe prioritizes, spends time on, expresses excitement about
- **Frustrations:** Short/curt responses, corrections, repeated issues
- **Patterns:** Recurring behaviors, preferences, rhythms
- **Silence:** What Joe does NOT respond to or engage with (non-engagement is data)

### Phase 3: Analyze (~3 min)
Compare new observations against existing JOE-PROFILE.md content:
- **Confirming:** Reinforces an existing observation? Increase confidence level.
- **Contradicting:** Conflicts with existing? Note the contradiction. Don't delete the original yet — wait for more data.
- **New:** Genuinely new insight? Add to Observation Log.

### Phase 4: Update (~2 min)
1. Add new observations to the Observation Log table.
2. If any observation has 3+ data points, distill it into the relevant section.
3. Mark distilled observations in the log.
4. Update "Last reflection" timestamp and increment reflection count.
5. Check total size — compress if approaching 6,000 tokens.

### Phase 5: Proactive Insights (~2 min)
Based on current profile, generate 0-2 proactive suggestions:
- Opportunities Joe might not have articulated
- Cross-project synergies
- Efficiency improvements based on observed patterns
- Shadow goals that new observations support

Add these to the "Proactive Opportunity Map" section.

---

## Inference Patterns

### "What Joe Doesn't Say" Analysis
When Joe receives a notification and:
- Responds quickly with "go ahead" → High trust in this domain
- Responds with detailed instructions → Wants control in this domain
- Doesn't respond for 12+ hours → Low priority or unclear question
- Responds with frustration → Question was poorly formed or redundant

### Sentiment Proxies
Since we can't do tone analysis directly, use these:
- Response length → engagement proxy
- Response time → priority proxy
- Exclamation marks / positive language → enthusiasm proxy
- Short corrections → frustration proxy
- "Go ahead" without modifications → trust signal

### Predictive Patterns
Format: "When [trigger], Joe usually [response]"
Build these over time. Minimum 3 occurrences before recording a pattern.

---

## What NOT to Record

- Personal/family details beyond what's in USER.md
- Financial specifics (exact balances, income numbers)
- Health information
- Credentials or sensitive data
- Speculative personality diagnoses
- Anything that would be uncomfortable if Joe read it

---

## Quality Checks (Before Saving)

1. Is every observation sourced? (No unsourced claims)
2. Are confidence levels accurate? (Don't over-claim from one data point)
3. Is the file still under 6,000 tokens?
4. Would Joe be comfortable reading every line?
5. Are old observations being distilled, not just accumulated?

---

## Claude Code Drop File Processing

During reflection:
1. Read `joe-profile-observations.jsonl`
2. Process entries added since last reflection
3. Integrate relevant observations into "Claude Code Impressions" section
4. After processing, clear the file (write empty) to prevent reprocessing

---

*Created: 2026-02-19*
*Maintained by: Alfred*
