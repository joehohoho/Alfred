# TESTING-PROTOCOL.md - How to Batch Tests Efficiently

**Problem:** Testing multiple models/options independently → 3+ separate Sonnet calls → $0.30+ waste

**Solution:** Batch all tests into ONE LOCAL sub-agent → $0 cost

---

## When to Use Testing Protocol

- Comparing 2+ models
- Evaluating multiple approaches
- Exploring implementation options
- Auditing or assessing something
- Any analysis work before committing to a decision

---

## Batching Pattern (Template)

### ❌ Anti-Pattern (What NOT to do)

```javascript
// This costs $0.10-0.30 for the same analysis
sessions_spawn({ model: "sonnet", task: "Test Model A..." })
// Spawns, waits, gets response (~$0.10)

sessions_spawn({ model: "sonnet", task: "Test Model B..." })
// Spawns AGAIN, waits, gets response (~$0.10)

sessions_spawn({ model: "sonnet", task: "Test Model C..." })
// Spawns AGAIN, waits, gets response (~$0.10)

// Total: 3 Sonnet calls, $0.30, 3 context switches
```

### ✅ Correct Pattern (What to do)

```javascript
// This costs $0 for the same analysis
sessions_spawn({
  model: "ollama/llama3.2:3b",  // LOCAL = FREE
  task: `Perform side-by-side comparison:
  
TEST SUITE: Model Comparison
=========================

1. MODEL A (Model Name)
   - Install/pull if needed
   - Run on test prompt: [PROMPT]
   - Measure: response time, output quality, errors
   - Report: [metric 1], [metric 2], [metric 3]

2. MODEL B (Model Name)
   - Install/pull if needed
   - Run on test prompt: [PROMPT]
   - Measure: response time, output quality, errors
   - Report: [metric 1], [metric 2], [metric 3]

3. MODEL C (Model Name)
   - Install/pull if needed
   - Run on test prompt: [PROMPT]
   - Measure: response time, output quality, errors
   - Report: [metric 1], [metric 2], [metric 3]

FINAL COMPARISON TABLE
=====================
Model | Metric 1 | Metric 2 | Metric 3 | Verdict
------|----------|----------|----------|--------
A     | [value]  | [value]  | [value]  | [winner?]
B     | [value]  | [value]  | [value]  | [winner?]
C     | [value]  | [value]  | [value]  | [winner?]

Recommendation: [Which model is best and why]`
})

// Total: 1 LOCAL call, $0, single session, all results in one response
```

---

## Real Example: Local Model Testing (2026-02-11)

### ❌ What I Did (Wrong)

```
Test 1: Nous Hermes 2 7B (spawned separately) → Hung, killed → $0.05
Test 2: Nous Hermes 2 7B retry (spawned separately again) → Hung, killed → $0.05
Test 3: Qwen 2.5 3B (spawned separately) → Hung, killed → $0.05
Total: 3 separate spawns, $0.15 wasted, same failure pattern repeated
```

### ✅ What I Should Have Done (Right)

```
One LOCAL batch test covering all three:
- Pull Nous Hermes 2 7B, test with "2+2"
- If hangs: note pattern, move to next
- Pull Qwen 2.5 3B, test with "2+2"
- If hangs: note pattern, move to next
- Compare results in single report
- Conclusion: All local models > 3B incompatible with 32GB Intel Mac

Total: 1 LOCAL session, $0, all info extracted at once
Savings: $0.15 on this one batch alone
```

---

## Template: Model Comparison Batch

```javascript
sessions_spawn({
  model: "ollama/llama3.2:3b",
  task: `Compare these 3 models on 32GB Intel Mac mini:

MODELS TO TEST:
1. Nous Hermes 2 7B (4.4GB)
2. Qwen 2.5 3B (1.9GB)
3. Mistral 7B (4.3GB)

TEST PROCEDURE:
- Pull each model with \`ollama pull [model]\`
- Run same test prompt: "2+2"
- Measure: response time, output quality, CPU usage
- Note: Timeout after 60 seconds if no response

REPORT FORMAT:
Model | Size | Status | Response Time | Output | Usable?
------|------|--------|---------------|--------|--------
[...] | [...] | [...] | [...] | [...] | YES/NO

Conclusion: Which models are viable for this hardware?`
})
```

---

## Testing Protocol Checklist

Before you start a test/analysis:

- [ ] Collect all tests/comparisons into a single list
- [ ] Write as ONE batch task, not 3 separate spawns
- [ ] Use LOCAL model (free) unless analysis requires reasoning
- [ ] Use a clear report format (table preferred)
- [ ] Request final verdict/recommendation in same batch
- [ ] Spawn once, wait for complete analysis
- [ ] Extract recommendation, proceed with decision

---

## Cost Comparison

| Approach | Tests | Cost | Time | Efficiency |
|----------|-------|------|------|------------|
| **Anti-pattern** (3 Sonnet calls) | 3 | $0.30 | 3 min | Low (repeated info) |
| **Correct pattern** (1 LOCAL batch) | 3 | $0.00 | 2 min | High (all at once) |
| **Savings** | - | $0.30 | -1 min | 100% ↑ |

**Annual savings if 2x testing per week:** ~$31/year from just this pattern

---

## Decision Rule (Simple Version)

**When you catch yourself thinking:** "I should test multiple [things]..."

**Stop and ask:**
- "Am I testing 2+ things?"
- "Can these be compared in one session?"
- "Should this be one batch, not separate spawns?"

**Answer "yes" to any?** → Use TESTING-PROTOCOL.md

---

## When NOT to Batch

- If tests are interdependent (Test 2 depends on Test 1 result)
- If analysis requires real-time decision-making
- If each test needs different model tier
- If tests are hours apart in time

(Most analysis scenarios don't fit these exceptions.)

---

## Implementation Notes

- This protocol prevents ~$0.25-0.50 waste per testing session
- Cost savings compound over months
- Prevents context pollution (one batch = one mental context)
- Easier to document findings (single report, not scattered replies)

**Adopted:** 2026-02-11 after token audit identified repeat testing waste
