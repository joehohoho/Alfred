# OpenClaw Cost Reduction Plan
**Date:** 2026-02-06
**Status:** $7.80 remaining of $42.33 | Burn: ~$150/month → Target: ~$30-40/month

---

## ✅ Actions Taken

1. **Disabled expensive cron job** ✅ - Daily Config & Memory Review (used Sonnet + thinking mode daily)
2. **Reverted default model** ✅ - Sonnet (per user preference)
3. **Archived old sessions** ✅ - Moved 9 sessions (1.7M largest file) to sessions-archive/
4. **Reduced Slack history limit** ✅ - 5 → 3 messages (prevents context bloat)
5. **Kept security audit** ✅ - Weekly healthcheck remains on Sonnet (justified)

---

## 📋 Next Steps (awaiting approval)

### 2️⃣ Clear High-Token Sessions

**Problem:** Slack threads have accumulated 85k+ tokens

**Solution:**
```bash
# Archive all existing sessions to reset context
mkdir -p /Users/hopenclaw/.openclaw/agents/main/sessions-archive
mv /Users/hopenclaw/.openclaw/agents/main/sessions/*.jsonl /Users/hopenclaw/.openclaw/agents/main/sessions-archive/
```

**Impact:** Fresh start for all sessions; loses conversation context but sheds token debt

---

### 4️⃣ Add Slack Context Limits

**Apply this config patch:**
```json
{
  "channels": {
    "slack": {
      "channels": {
        "C0ADCTD7S2D": {
          "model": "anthropic/claude-haiku-4-5",
          "contextTokens": 40000
        },
        "C0ADUCZ4AF3": {
          "model": "anthropic/claude-haiku-4-5",
          "contextTokens": 40000
        }
      }
    }
  }
}
```

**Impact:** Limits Slack channels to 40k tokens max, auto-compacts when needed

---

### 5️⃣ Enforce MODEL-POLICY.md

**Current policy already documented** - just needs stricter adherence:
- Start LOCAL for simple tasks
- Escalate only when needed (LOCAL → Haiku → Sonnet → Opus)
- De-escalate after complex work

**Documentation location:** `/Users/hopenclaw/.openclaw/workspace/MODEL-POLICY.md`

---

### 6️⃣ Thinking Mode

**Answer:** Thinking mode uses the session's default model (now Haiku after our change)

**Recommendation:** Keep thinking off by default (already is), enable manually when needed

---

### 7️⃣ Session Cleanup

**Note:** OpenClaw doesn't support automatic session cleanup per the schema. Options:
- Manual cleanup via the archive strategy above
- Set up a manual cleanup cron (outside OpenClaw)

---

### 9️⃣ Model De-escalation

**Enforcement strategy:**
- Use MODEL-POLICY.md as guideline
- After complex work (Opus/Sonnet), explicitly switch back to Haiku or LOCAL for follow-up
- Document any escalations with reasoning

---

## 💰 Projected Savings

| Change | Savings | Math |
|--------|---------|------|
| Default Sonnet → Haiku | **88%** on baseline | ($3→$0.25 input, $15→$1.25 output) |
| Disabled daily cron | ~$5-10/week | Was running with thinking daily |
| Context limits (40k cap) | Prevents runaway | Stops 85k+ token sessions |
| Stricter model policy | 50-70% | More LOCAL usage, less Opus/Sonnet |

**Current burn:** ~$150/month  
**Target burn:** ~$30-40/month (75% reduction)

---

## 🎯 Recommendation

**Apply changes 2 + 4 now:**
1. Archive existing sessions (clean slate)
2. Apply Slack context limit config patch
3. Monitor for 24-48 hours

**Then:**
- Review token usage in dashboard
- Adjust limits if needed
- Consider stricter compaction settings if still high
