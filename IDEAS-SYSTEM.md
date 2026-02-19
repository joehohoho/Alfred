# IDEAS-SYSTEM.md — Idea Generation & Incubation

**Purpose:** Alfred's guide for generating, evaluating, and promoting passive income and efficiency ideas for Joe.

---

## How Ideas Work

Ideas live in `goals/ideas.json` and are browsable in the Command Center at `/ideas`. Ideas follow a pipeline:

```
new → researching → evaluated → promoted (becomes a Goal) or archived
```

**Ideas are NOT goals.** Ideas are speculative. Goals are committed. An idea must be evaluated and explicitly promoted before becoming a goal.

---

## Idea Schema

```json
{
  "id": "idea_{timestamp}_{slug}",
  "title": "Short descriptive name",
  "description": "What it is, why it matters, how it connects to Joe's skills/projects",
  "category": "passive-income | efficiency | infrastructure | growth",
  "status": "new | researching | evaluated | promoted | archived",
  "source": "alfred-generated | joe-submitted | claude-code | market-signal",
  "effort": "low | medium | high",
  "potential": "low | medium | high",
  "revenueModel": "How it makes money (if applicable)",
  "synergies": ["CoinUsUp", "Even Us Up", "market-signal-lab", ...],
  "evaluation": { "score": 0-10, "notes": "..." } | null,
  "promotedToGoalId": null | "goal_...",
  "tags": ["saas", "fintech", ...],
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

---

## Weekly Idea Generation (Cron Job)

Every Saturday at 2 PM AST, generate 2-3 new ideas. Process:

### 1. Review Context
- Read JOE-PROFILE.md (understand current interests, skills, aspirations)
- Read goals/ideas.json (avoid duplicates)
- Read goals/goals.json (understand active work)
- Optionally: web search for market trends in Joe's domains

### 2. Generate Ideas
Aim for diversity across these dimensions:
- **Effort level:** Mix of low, medium, high effort
- **Time horizon:** Some quick wins, some long-term plays
- **Category:** At least one passive-income idea per batch
- **Leverage:** Ideas that build on Joe's existing skills, code, or infrastructure

### 3. Evaluate Quality
Before adding, ask:
- Does this leverage Joe's unique background (legal billing, automation, AI)?
- Is the market real (not hypothetical)?
- Can Joe realistically build this alongside current work?
- Does it connect to existing projects (synergies)?

### 4. Save & Notify
- Write new ideas to goals/ideas.json
- Post brief summary to Slack (1 line per idea)

---

## Evaluation Criteria (When Moving to "evaluated")

Score ideas 1-10 on these factors:

| Factor | Weight | Question |
|--------|--------|----------|
| Market fit | 3x | Is there proven demand? |
| Effort/reward | 2x | ROI relative to build time? |
| Joe's edge | 2x | Does Joe have unfair advantage? |
| Synergy | 1x | Builds on existing projects? |
| Passive potential | 2x | Can it generate income without ongoing effort? |

**Score = weighted average.** Ideas scoring 7+ are candidates for promotion to Goals.

---

## Promoting Ideas to Goals

When Joe approves promotion:
1. Create a new Goal via the Goals API with the idea's details
2. Update the idea's `status` to "promoted" and set `promotedToGoalId`
3. The Goal system takes over from there (analysis, tasks, etc.)

---

## Sources of Ideas

1. **Alfred weekly generation** — Saturday 2 PM cron job
2. **Joe submission** — Via Command Center /ideas page or Slack
3. **Claude Code observations** — Drop file observations that suggest opportunities
4. **Market signals** — market-signal-lab data suggesting investment strategy products
5. **Consulting work** — Patterns from automation consulting that suggest productizable solutions

---

*Created: 2026-02-19*
*Maintained by: Alfred + Claude Code*
