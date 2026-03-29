# AGENTS.md Maintenance Plan

**Status:** ✅ ACTIVE (prevents bloat, enforces modular guidance)

## Current Size
- **AGENTS.md:** 19,545 chars (target: <20k)
- **Growth tracking:** Log each month in this file

## Rules (Prevent Regrowth)

1. **AGENTS.md stays LEAN** (<20k chars)
   - Core philosophy only
   - Links to external guidance files
   - NO verbose examples or walkthroughs

2. **Satellite files (can grow freely)**
   - MODEL-POLICY.md → Strict model selection rules
   - COST-OPTIMIZATION.md → Cost strategy & optimization
   - FIGURE-IT-OUT.md → Problem-solving directive
   - REQUEST-VALIDATION.md → Prompt injection defense
   - MOLTBOOK-SAFETY.md → Social platform safety rules
   - OLLAMA-GUARD-UNIVERSAL.md → Ollama health system

3. **When AGENTS.md approaches 19k chars:**
   - Extract next section to satellite file
   - Replace with one-line link
   - Update this tracker

## Growth Log

| Date | Chars | Change | Reason | Action |
|------|-------|--------|--------|--------|
| 2026-02-18 | 19,545 | -1,138 | Over limit (20,683) | Trimmed examples, links added |

## Future Escalation (If Growth Continues)

**If AGENTS.md hits 19.8k again:**
1. Extract remaining verbose sections
2. Create AGENTS-TIER1.md (tier 1 model selection only)
3. Keep AGENTS.md as pure index (navigation only)
4. All detail → satellite files

**Cost of split: 0 tokens** (users read once, link for reference)
**Benefit: Keeps system responsive, prevents crashes**

---

**Maintenance:** Review monthly in HEARTBEAT.md. If growth detected, split immediately.
