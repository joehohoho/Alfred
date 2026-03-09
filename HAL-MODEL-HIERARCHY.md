# HAL Model Hierarchy (Updated 2026-03-09)

**Purpose:** Define optimal model routing for HAL sub-agent (spawned tasks).  
**Status:** DRAFT → Ready for implementation after Joe approval  
**Cost model:** Subscription quota (no API keys required; HAL inherits gateway credentials)

---

## Model Tier Stack (Ordered by Preference)

| Tier | Model | Mode | TPM Budget | Use Case | Notes |
|------|-------|------|-----------|----------|-------|
| **1** | LOCAL (llama3.2:3b) | Free (local) | Unlimited | Simple tasks, logs, parsing, local analysis | Default if <2m ETA; saves quota |
| **2** | Codex | Free (rate-limited) | 500k TPM shared | Code generation, debugging, refactoring, testing ONLY | Fallback if LOCAL too slow; DO NOT use for analysis/file-reading |
| **3** | Haiku (Claude) | Subscription quota | Share of Joe's quota | General-purpose work, default for complex tasks | NEW tier; prevents Codex failures; cost-efficient |
| **4** | Sonnet (Claude) | Subscription quota | Share of Joe's quota | High-complexity, multi-step reasoning, security-sensitive | Escalate when Haiku struggles or context >50% |
| **5** | Opus (Claude) | Subscription quota | Share of Joe's quota | Ultra-high-stakes, novel reasoning, complex decisions | RARE; only when explicitly needed |

---

## Routing Decision Logic

**HAL dispatcher** evaluates each spawned task and chooses model:

### Step 1: Hard Gates (Apply First)
```
IF task.type == "code" AND task.complexity <= 7 AND codex_available:
  USE Codex
ELSE IF task.type == "security" OR task.complexity >= 8:
  USE Sonnet (or Opus if complexity == 10)
ELSE IF task.complexity <= 2 AND output_size < 500_tokens:
  USE LOCAL
ELSE:
  USE Haiku (DEFAULT)
```

### Step 2: Fallback Chain
```
PRIMARY tier → [timeout/failure] → NEXT tier in chain
LOCAL → Codex → Haiku → Sonnet → Opus
```

**Example:** If LOCAL task times out after 15s, dispatcher retries with Codex. If Codex expires/unavailable, retry with Haiku.

### Step 3: Quota Preservation (Monitor)
```
IF subscription_quota_consumed > 70%:
  Aggressively shift to LOCAL/Codex (reduce Haiku/Sonnet usage)
IF quota_consumed > 95%:
  Only use LOCAL until quota resets
```

---

## Implementation for HAL Spawns

**File:** `~/.openclaw/workspace/scripts/hal-spawn.sh` (new or updated)

```bash
#!/bin/bash
# HAL task spawn wrapper with model selection

TASK="$1"
COMPLEXITY="${2:-5}"  # 1-10 scale
TASK_TYPE="${3:-general}"  # general|code|security

# Model selection logic
if [[ "$TASK_TYPE" == "code" ]] && [[ $COMPLEXITY -le 7 ]]; then
  MODEL="codex"
elif [[ "$TASK_TYPE" == "security" ]] || [[ $COMPLEXITY -ge 8 ]]; then
  MODEL="sonnet"
elif [[ $COMPLEXITY -le 2 ]]; then
  MODEL="local"
else
  MODEL="haiku"  # Default
fi

# Spawn HAL with selected model
sessions_spawn \
  --runtime subagent \
  --task "$TASK" \
  --model "$MODEL" \
  --mode run \
  --label "hal-$TASK_TYPE" \
  2>&1

echo "Spawned HAL with model=$MODEL, complexity=$COMPLEXITY"
```

**Usage:**
```bash
# General task (uses Haiku by default)
bash hal-spawn.sh "Implement password reset flow" 6 general

# Code task (uses Codex)
bash hal-spawn.sh "Refactor auth module" 5 code

# Security task (uses Sonnet)
bash hal-spawn.sh "Audit subscription payment flow" 9 security

# Simple task (uses LOCAL)
bash hal-spawn.sh "Parse JSON log file" 2 general
```

---

## Setup Requirements

**Good news:** No additional setup needed for HAL to use Claude models.

### Why:
- HAL is spawned as a **subagent** within the OpenClaw gateway
- Subagents automatically **inherit the parent gateway's model configuration**
- The gateway already has **Anthropic subscription credentials** configured (via `~/.openclaw/openclaw.json`)
- When HAL requests `model="haiku"`, the gateway routes to Anthropic subscription API with your account

### What Already Works:
✅ Anthropic API key in gateway config  
✅ Subscription quota tracking (built into gateway)  
✅ Model fallback chain (gateway handles retries)  
✅ Cost attribution (gateway logs all HAL model usage against your quota)

### Verify Setup (One-Time):
```bash
# Check gateway can reach Anthropic (all models)
curl -s http://localhost:3000/status | jq '.models'

# Should see: anthropic/claude-haiku-4-5, anthropic/claude-sonnet-4-5, etc.
# If missing, check: ~/.openclaw/openclaw.json has valid Anthropic API key
```

### If Anthropic API Key Expires:
1. Refresh at: https://console.anthropic.com/account/keys
2. Update gateway config (gateway will handle restart)
3. HAL will automatically use new key on next spawn

---

## Cost Implications

| Model | Quota Impact | Monthly Est. | Notes |
|-------|--------------|--------------|-------|
| LOCAL | $0 | $0 | Unlimited; use freely |
| Codex | $0 (rate-limited) | $0 | 500k TPM shared; free tier |
| Haiku | ~$0.20/1M tokens | ~$2-5/mo (estimated) | Cheap; NEW default for complex work |
| Sonnet | ~$3.00/1M tokens | ~$5-15/mo (estimated) | Escalation only; high-quality |
| Opus | ~$15.00/1M tokens | $? (rare) | Emergency only; minimal usage |

**Bottom line:** Adding Haiku as tier 3 adds ~$2-5/month to HAL's operating budget (vs failing and needing manual retry). Insurance is worth it.

---

## Monitoring & Adjustment

**Track HAL model usage** (weekly):
```bash
grep "HAL|spawned" memory/YYYY-MM-DD.md | jq '.model' | sort | uniq -c
```

**Adjust if:**
- Haiku success rate drops below 90% → increase Sonnet tier 3 threshold
- Codex timeouts increase → reduce Codex usage for non-code tasks
- Quota burn accelerates → shift more tasks to LOCAL

---

## Timeline for Implementation

- **Today (Mar 9):** Draft approved by Joe
- **Mar 10:** Update `hal-spawn.sh` with new hierarchy
- **Mar 11:** Test with 5-10 HAL tasks across all tiers
- **Mar 12:** Go live with new model hierarchy

---

## FAQs

**Q: Will HAL use my subscription quota or API key?**  
A: Subscription quota. HAL inherits the gateway's credentials; no API key setup needed.

**Q: What if Codex times out?**  
A: Dispatcher retries with Haiku (tier 3). Haiku is always available on subscription.

**Q: Can HAL use a different Anthropic account?**  
A: Not yet. HAL inherits parent gateway account. Isolation would require separate gateway instance (future feature).

**Q: How do I know which model HAL used?**  
A: Check spawn logs or query `sessions_history()` for the spawned HAL session.

---

**Status:** Ready for implementation after Joe approval  
**Proposed by:** Alfred (2026-03-09 13:50 ADT)
