# Goal Intake Policy - Smart Notification Rules

**Last Updated:** 2026-02-18 04:19 AST  
**Version:** 1.0

## Core Principle

**Only notify on goals that require user input or decision-making.**

If a goal has a clear, self-contained directive that I can execute, execute it silently without notification.

---

## Decision Tree for Goal Notifications

When a goal notification arrives:

### Step 1: Parse Goal Description
- Read the goal title and description
- Check for explicit action directives

### Step 2: Classify Goal Type

#### TYPE A: Self-Contained Test/Directive Goals
**Pattern:** Description explicitly states action to take on it

Examples:
- "delete once reviewed"
- "mark complete once read"
- "this is a test goal, delete it"
- "testing only, do not process"

**Action:** Execute the directive silently, **NO notification**

#### TYPE B: Goals Requiring Planning
**Pattern:** Goal is real, needs breakdown into phases/tasks

Example:
- "Setup Discord integration"
- "Find efficient iMessage monitoring solution"

**Action:** Create a detailed plan, then notify user with plan for review

#### TYPE C: Incomplete/Ambiguous Goals
**Pattern:** Missing context, unclear scope, needs clarification

Examples:
- No description provided
- Description is vague ("work on something")
- Missing key information (acceptance criteria, deadline)

**Action:** Ask clarifying questions, **notify user** with questions needed to proceed

#### TYPE D: Blocked/High-Risk Goals
**Pattern:** Goal has identifiable blockers or risks

Example:
- "Integrate system that requires external API key I don't have"
- "Refactor code but codebase is unstable"

**Action:** Identify blockers, notify user with blocker list and options

---

## Execution Rules

### For TYPE A (Test/Directive Goals)
1. ✅ Verify directive is unambiguous
2. ✅ Execute action (delete, mark complete, etc.)
3. ✅ Update goals.json
4. ✅ **Do NOT create notification**
5. Log action in memory: "Goal {id} marked {action} per directive"

### For TYPE B (Planning Goals)
1. ✅ Evaluate goal scope (small, medium, large)
2. ✅ Create detailed phase breakdown (typically 5 phases)
3. ✅ Estimate effort and cost
4. ✅ Identify potential blockers
5. ✅ **Notify user** with complete plan for review
6. Wait for user feedback before proceeding to implementation

### For TYPE C (Ambiguous Goals)
1. ✅ Identify missing information
2. ✅ Formulate specific questions
3. ✅ **Notify user** with questions required to proceed
4. **Block** further action until user provides clarification

### For TYPE D (Blocked Goals)
1. ✅ Identify each blocker
2. ✅ Suggest mitigation strategies (2-3 options per blocker)
3. ✅ **Notify user** with blockers and options
4. **Block** implementation until user decides on mitigation approach

---

## Notification Format

### TYPE B: Planning Goal
```
**GOAL PLAN READY FOR REVIEW**

Goal: {title}
Priority: {priority}
Estimated Effort: {hours} hours
Cost: ${cost}

PHASE 1: [description] ({time})
PHASE 2: [description] ({time})
...

POTENTIAL BLOCKERS:
- Blocker 1
- Blocker 2

NEXT STEP: Approve plan or provide feedback
```

### TYPE C: Ambiguous Goal
```
**NEED CLARIFICATION TO PROCEED**

Goal: {title}

Missing Information:
1. {Question 1} - [why needed]
2. {Question 2} - [why needed]

Please provide: {specific example format}
```

### TYPE D: Blocked Goal
```
**BLOCKERS IDENTIFIED - DECISION NEEDED**

Goal: {title}

Blocker 1: {description}
  Option A: [solution]
  Option B: [solution]

Blocker 2: {description}
  Option A: [solution]

Please choose approach for each blocker
```

---

## Cost & Token Efficiency

**TYPE A (Directives):** $0 (LOCAL analysis only)  
**TYPE B (Planning):** $0-0.15 (use LOCAL unless complex, escalate to HAIKU if needed)  
**TYPE C (Questions):** $0 (LOCAL analysis only)  
**TYPE D (Blockers):** $0 (LOCAL analysis only)  

**Total monthly impact:** ~$0.10-0.30 (for TYPE B plans)

---

## Examples

### ✅ CORRECT: Test Goal with Directive
```json
{
  "title": "Test Goal",
  "description": "Testing, this goal should be deleted once reviewed."
}
```
**My action:** Delete silently, no notification  
**Result:** Goal removed from goals.json, no notification to user

### ✅ CORRECT: Real Goal Requiring Plan
```json
{
  "title": "Discord Integration",
  "description": "Setup the ability to use Discord"
}
```
**My action:** Create 5-phase plan, send notification with plan  
**Result:** User sees detailed breakdown, can approve or provide feedback

### ✅ CORRECT: Ambiguous Goal
```json
{
  "title": "Improve Performance",
  "description": "Make things faster"
}
```
**My action:** Ask questions (what system? what metric? what's baseline?)  
**Result:** User provides context, then I create plan

---

## Implementation Status

**Adopted:** 2026-02-18 04:19 AST  
**Applied to:** All future goal notifications  
**Retroactive updates:** None (existing goals already processed)

---

## Revision History

| Date | Change | Reason |
|------|--------|--------|
| 2026-02-18 | Initial policy | User feedback: avoid unnecessary notifications for test/directive goals |
