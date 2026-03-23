# Model-Specific Prompts Directory

**Purpose:** Store and maintain optimized system prompts for each frontier model (Opus, GPT).

**Why separate prompts?** Different models have different optimal prompt structures. Anthropic recommends different patterns than OpenAI. This directory keeps them organized and validated.

---

## Files in This Directory

### Best Practices Guides (Source of Truth)

- **`opus-best-practices.md`** — Anthropic's official best practices for Claude (Opus)
  - Source: https://docs.anthropic.com/claude/docs/system-prompts
  - Purpose: Reference for optimizing Opus prompts
  - Updated: [Manual - check quarterly for Anthropic updates]

- **`gpt-best-practices.md`** — OpenAI's official best practices for GPT
  - Source: https://platform.openai.com/docs/guides/prompt-engineering
  - Purpose: Reference for optimizing GPT prompts
  - Updated: [Manual - check quarterly for OpenAI updates]

### Production Prompts (Used by Alfred/System)

- **`opus-4-6.md`** — Production system prompt for Claude Opus 4.6
  - Optimized per Anthropic best practices
  - Used when model selection = Opus
  - Updated nightly by `scripts/sync-prompts.sh`

- **`gpt-5-4.md`** — Production system prompt for OpenAI GPT-5.4 (if available)
  - Optimized per OpenAI best practices
  - Used when model selection = GPT
  - Updated nightly by `scripts/sync-prompts.sh`

---

## How Prompts Are Selected

**AGENTS.md defines the logic:**

```
IF model_selected == opus:
  LOAD prompts/opus-4-6.md
ELSE IF model_selected == gpt:
  LOAD prompts/gpt-5-4.md
ELSE:
  LOAD default system prompt (SOUL.md)
```

**Who selects the model?** Alfred's task router (MODEL-POLICY.md):
- **Opus:** Security decisions, critical logic, complex reasoning
- **Sonnet:** Multi-step analysis, code review, synthesis
- **Haiku:** Formatting, light analysis, simple tasks
- **Codex:** Code generation (free tier)

---

## Maintenance: Nightly Sync Cron

**File:** `scripts/sync-prompts.sh`  
**Schedule:** 2 AM daily  
**Purpose:** Validate prompts stay aligned with best practices

**What it does:**
1. Validates both `opus-4-6.md` and `gpt-5-4.md` exist
2. Checks file sizes (should be similar, ±50 lines)
3. Compares against latest best practices
4. Git commits if changes detected

**Example output:**
```
✅ Prompts synced + committed (2026-03-23)
Opus: 450 lines | GPT: 435 lines | Status: aligned
```

---

## How to Update Prompts

### When Best Practices Change
1. Download latest from Anthropic/OpenAI
2. Save to appropriate `*-best-practices.md` file
3. Review differences
4. Run `scripts/sync-prompts.sh` manually (or wait for nightly cron)
5. Commit changes: `git add prompts/ && git commit -m "update: [what changed]"`

### When You Find a Better Pattern
1. Test the change in a session with that model
2. If it improves quality/speed, update the production prompt
3. Document why in a comment in the file
4. Commit with explanation

### Validation Checklist
- [ ] Prompt file is valid UTF-8
- [ ] No credentials hardcoded (check for API keys, tokens)
- [ ] Follows model-specific best practices (Anthropic for Opus, OpenAI for GPT)
- [ ] Is under 4000 tokens (optimal for system prompts)
- [ ] Covers all core directives from SOUL.md + AGENTS.md

---

## Current Status

| Metric | Value |
|--------|-------|
| Opus best practices | ✅ Downloaded (2026-03-23) |
| GPT best practices | ✅ Downloaded (2026-03-23) |
| Opus production prompt | ✅ Ready (opus-4-6.md) |
| GPT production prompt | ✅ Ready (gpt-5-4.md) |
| Sync cron | ✅ Active (2 AM daily) |
| Last sync | 2026-03-23 16:40 |

---

## References

- **Model Selection:** See AGENTS.md "MODEL-POLICY.md" section
- **Best Practices:** Anthropic docs + OpenAI docs (linked above)
- **System Prompt Guide:** See SOUL.md (core directives that all models follow)
- **Prompt Optimization:** See `scripts/sync-prompts.sh` (validation logic)

---

**Last Updated:** 2026-03-23  
**Maintained By:** Alfred  
**Next Quarterly Review:** 2026-06-23
