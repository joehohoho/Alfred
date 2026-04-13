# Mistakes & Learning Log

**Purpose:** Systematic learning from errors. Alfred reviews this file weekly to identify patterns and improve decision-making.

---

## 2026-04-13

### Mistake: YouTube Transcript Extraction — Script Invocation Complexity
**Date:** 2026-04-13 12:27 ADT  
**Context:** Requested to fetch YouTube transcript using youtube-transcripts skill  
**What Went Wrong:** 
- First attempted: `bash ~/.openclaw/workspace/skills/youtube-transcripts/scripts/fetch_transcript.py` → preflight validation rejected (complex interpreter detected)
- Second attempt: Direct Python invocation → module not installed initially
- Root cause: Assumed script was ready-to-run without checking environment setup

**What I Learned:** 
1. Complex interpreter chains (bash → python → script) fail preflight validation
2. Must validate dependencies before assuming scripts work
3. For Python scripts, use direct interpreter path: `/path/to/venv/bin/python3 script.py` or inline Python blocks

**Fix Applied:** 
- Used inline Python block with existing pipx environment: `/Users/hopenclaw/.local/pipx/venvs/youtube-transcript-api/bin/python3`
- Future: Always check pipx/venv paths before attempting pip installs
- Future: Use inline Python blocks for tool-constrained environments

**Impact:** 2 extra minutes to resolve; deliverable completed successfully  
**Recurrence Risk:** LOW — now documented, will use pipx path in future YouTube transcript tasks

---

## 2026-04-10

### Mistake: Cron Job Auto-Disable Pattern — Invalid Discord Channel IDs
**Date:** 2026-04-10 (discovered); Fixed 2026-03-26  
**Context:** Multiple cron jobs (Evening Routine, Daily Inquiry, Nightly Git, Config Review) auto-disabled after successive runs  
**What Went Wrong:** 
- Root cause (Primary): Jobs referenced invalid Discord channel IDs in delivery config
- Root cause (Secondary): Slack was deprecated (2026-03-25) but 4 jobs still referenced Slack channels
- No validation on cron job creation to check delivery channel existence

**What I Learned:**
1. Cron delivery routing must be validated before job execution
2. Slack deprecation needed immediate cascade update (not gradual)
3. Jobs with invalid delivery targets should fail gracefully (not disable themselves)

**Fix Applied:**
- Updated 4 jobs to `delivery.mode="none"` (silent execution)
- Moved delivery targets from Slack to Discord or disabled entirely
- Created validation script: `scripts/validate-cron-delivery.sh`

**Impact:** 4 cron jobs lost during period (5 days of automation downtime)  
**Recurrence Risk:** MEDIUM — delivery routing still fragile; need pre-execution validation

---

## Learning Patterns (Weekly Summary)

### Pattern 1: Environment Assumptions
**Instances:** 1 (YouTube transcript)  
**Root Cause:** Don't verify dependency state before execution  
**Preventive Measure:** Always run `--check` or dry-run first, or validate explicitly in code

### Pattern 2: Integration Brittleness (Cron/Delivery)
**Instances:** 1 (Cron auto-disable)  
**Root Cause:** Downstream systems (Discord, Slack) not validated at config time  
**Preventive Measure:** Pre-flight validation scripts for all external integrations

### Pattern 3: Cascade Updates on Deprecation
**Instances:** Slack (2026-03-25), others pending  
**Root Cause:** Old configs not audited when systems deprecate  
**Preventive Measure:** Quarterly config audit, automated detection of deprecated integrations

---

## How This Log Is Used

**By Alfred (AI Agent):**
1. Read this file at session start (decision-making context)
2. When making similar decisions, check for patterns in this log
3. Update entries weekly with new learnings
4. Reference specific mistakes in reasoning ("On 2026-04-10, I made a similar assumption about X...")

**By Joe (Human):**
1. Review weekly (optional) to see what Alfred is learning
2. Provide feedback if patterns need deeper investigation
3. Use patterns to suggest process improvements

**Archival:**
- Monthly: Archive previous month's entries to `memory/MISTAKES-ARCHIVE/YYYY-MM.md`
- Keep current month active for pattern detection
- Quarterly: Analyze 3-month trends for systemic issues

---

## Next Mistakes to Log

_Placeholder for upcoming learnings as they occur._

When a mistake happens:
1. I note it immediately in this file (within the session)
2. Describe: context, what went wrong, what I learned, fix applied
3. Reference in future similar decisions
4. Include impact assessment (time lost, severity, recurrence risk)
