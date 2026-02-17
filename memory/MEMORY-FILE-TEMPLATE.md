# Memory File Template

Use this template when creating new memory files (e.g., `memory/YYYY-MM-DD.md`).

---

## Copy-Paste Template

```markdown
---
date: 2026-02-16
author: Alfred
tags: [tag1, tag2, tag3]
decisions: [decision-slug-1, decision-slug-2]
references: [related-file-or-project]
---

# 2026-02-16 — Session Title

## Work Completed

### 1. First Task
- Details here

### 2. Second Task
- Details here

## Decisions Made

- Decision 1 (reference to DECISIONS-AND-RECOMMENDATIONS.md)
- Decision 2

## Questions or Blockers

- Any open items?

## Next Steps

- What to do next?

---

**Session Duration:** X minutes  
**Context Used:** X%  
**Tokens Spent:** LOCAL/Haiku/Sonnet/etc.  
**Cost:** $X.XX
```

---

## Frontmatter Fields

### Required
- **date:** YYYY-MM-DD (ISO format)
- **author:** Who created this entry

### Optional but Recommended
- **tags:** List of searchable tags (array format)
- **decisions:** Decision slugs from DECISIONS-AND-RECOMMENDATIONS.md
- **references:** Related files, projects, or memory entries

---

## Tag Examples

### Category Tags
- `dashboard` — Dashboard-related work
- `config` — Configuration changes
- `infrastructure` — System setup/ops
- `optimization` — Performance/cost improvements
- `security` — Security work
- `tool` — Tool/skill management
- `pattern` — Workflow patterns
- `memory` — Memory system work

### Workflow Tags
- `cron` — Scheduled tasks
- `automation` — Automated workflows
- `integration` — Third-party integrations
- `api` — API/external service work

### Status Tags
- `bug-fix` — Bug fixes
- `investigation` — Research/investigation
- `decision` — Major decision
- `experiment` — Experimental work
- `deferred` — Work punted to later

### Specificity Tags
- `voice` — Voice communication work
- `slack` — Slack integration
- `git` — Git/GitHub work
- `token-tracking` — Token usage/monitoring
- `heartbeat` — Heartbeat monitoring

---

## Example: Filled-Out Template

```markdown
---
date: 2026-02-16
author: Alfred
tags: [infrastructure, memory, decision, config]
decisions: [memory-system-improvements, decisions-and-recommendations-creation]
references: [DECISIONS-AND-RECOMMENDATIONS.md, QUERIES-AND-MISSES.md, INDEX.md]
---

# 2026-02-16 — Memory System Improvements Implementation

## Work Completed

### 1. Created DECISIONS-AND-RECOMMENDATIONS.md
- Structured decision log with 11 entries (10 implemented, 1 pending)
- Each entry includes: date, category, details, status, cost, source, reference
- Replaces narrative-only memory with queryable index
- Cost: $0 (file creation only)

### 2. Created QUERIES-AND-MISSES.md
- Audit log for memory lookup failures
- Tracks root causes and fixes applied
- Patterns analysis for system improvement
- Cost: $0 (file creation only)

### 3. Updated memory/INDEX.md
- Added Decisions table (11 decisions + status)
- Added infrastructure reference section
- Added query strategy guide
- Added quick stats summary
- Cost: $0 (file editing only)

## Decisions Made

- Decision: Implement 4-part memory system upgrade (DECISIONS-AND-RECOMMENDATIONS.md, QUERIES-AND-MISSES.md, INDEX.md enhancements, frontmatter template)
- Status: ✅ Complete

## Questions or Blockers

- Mystery dashboard: User asked about Vertex-based dashboard from mid-Feb discussion. Added as "PENDING" in DECISIONS log. Awaiting user clarification on name.

## Next Steps

1. Add frontmatter to all new memory files going forward
2. Update DECISIONS-AND-RECOMMENDATIONS.md when mystery dashboard is identified
3. Monitor QUERIES-AND-MISSES.md for patterns in memory lookup failures
4. Quarterly review of decision log to identify trends

---

**Session Duration:** 15 minutes  
**Context Used:** 12%  
**Tokens Spent:** LOCAL (file operations only)  
**Cost:** $0.00
```

---

## How This Helps

With this template, each memory file becomes:
1. **Searchable** — tags allow quick lookup
2. **Traceable** — decisions linked to DECISIONS-AND-RECOMMENDATIONS.md
3. **Contextual** — references show relationships to other work
4. **Auditable** — metadata makes pattern analysis possible

---

**Created:** 2026-02-16 12:38 AST  
**Purpose:** Standardize memory file format for better indexing and searchability
