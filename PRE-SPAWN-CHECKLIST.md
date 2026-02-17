# PRE-SPAWN-CHECKLIST.md - Before Every Subagent Call

**Use this checklist BEFORE calling `sessions_spawn()`**

---

## Quick Checklist (30 seconds)

- [ ] **Analysis or Implementation?** (Check AGENTS.md decision tree)
  - [ ] If ANALYSIS → Use LOCAL, not Sonnet
  - [ ] If IMPLEMENTATION → Use Codex/Sonnet
- [ ] **Batching opportunity?** (Check TESTING-PROTOCOL.md)
  - [ ] 2+ similar tasks? → Batch into ONE session
  - [ ] 3+ tests/comparisons? → ONE LOCAL batch, not separate calls
- [ ] **Model tier correct?** (Check TOOLS.md routing table)
  - [ ] LOCAL for simple/analysis tasks
  - [ ] Codex for code generation
  - [ ] Sonnet for complex reasoning or critical decisions
- [ ] **Cost estimate reasonable?** (Session status check)
  - [ ] Simple/LOCAL task: Should cost $0
  - [ ] Code generation: Should cost <$0.05
  - [ ] Complex analysis: Should cost <$0.15
  - [ ] If higher: Re-evaluate task scope

---

## Full Decision Flow

```
Question: Should I spawn a subagent?

1. WHAT IS THIS TASK?
   ├─ Exploring/testing/comparing → ANALYSIS (use LOCAL)
   ├─ Building/writing/deploying → IMPLEMENTATION (use Codex/Sonnet)
   └─ Uncertain? → Treat as ANALYSIS (cheaper, lower risk)

2. CAN I BATCH THIS?
   ├─ Are there 2+ similar tasks? 
   │  └─ YES → Combine into one task
   ├─ Are there 3+ tests?
   │  └─ YES → Batch into TESTING-PROTOCOL.md format
   └─ NO → Proceed single task

3. WHICH MODEL?
   ├─ ANALYSIS (exploration) → LOCAL (FREE)
   ├─ CODE GENERATION (pure) → CODEX (FREE-tier)
   ├─ CODE + REASONING → SONNET ($$)
   └─ CRITICAL/COMPLEX → OPUS ($$$)

4. ESTIMATE COST
   ├─ LOCAL: $0
   ├─ Codex: $0.01-0.05
   ├─ Sonnet: $0.05-0.20
   └─ Opus: $0.20+
   
   Cost > expected? → Reduce scope, batch, or re-tier

5. SPAWN WITH CONFIDENCE
   └─ Call sessions_spawn(model="...", task="...")
```

---

## Common Traps (AVOID THESE)

### Trap 1: Analysis Using Sonnet
```javascript
// ❌ WRONG: "Let me use Sonnet to analyze which model is better"
sessions_spawn({
  model: "sonnet",
  task: "Compare Model A vs Model B performance"
})
// Cost: $0.10+

// ✅ RIGHT: "Let me use LOCAL for exploration"
sessions_spawn({
  model: "ollama/llama3.2:3b",
  task: "Compare Model A vs Model B performance"
})
// Cost: $0
```

**Cost difference:** $0.10 per analysis. If you do this 2x/week = ~$10/month waste.

---

### Trap 2: Separate Calls for Related Tests
```javascript
// ❌ WRONG: Testing each model independently
sessions_spawn({ model: "local", task: "Test model A" })
sessions_spawn({ model: "local", task: "Test model B" })
sessions_spawn({ model: "local", task: "Test model C" })
// Cost: $0 (LOCAL), but 3 context switches, messy results, slow

// ✅ RIGHT: Batch all into one comparison
sessions_spawn({
  model: "ollama/llama3.2:3b",
  task: "Test and compare models A, B, C side-by-side"
})
// Cost: $0, 1 session, clear comparison table
```

**Impact:** Prevents missed connections, gives holistic view, faster decision.

---

### Trap 3: Using Sonnet for File Reads
```javascript
// ❌ WRONG: "I'll spawn Sonnet to read 3 files and summarize"
sessions_spawn({
  model: "sonnet",
  task: "Read file1.txt, file2.txt, file3.txt and summarize"
})
// Cost: $0.05-0.10

// ✅ RIGHT: "I'll spawn LOCAL for simple file ops"
sessions_spawn({
  model: "ollama/llama3.2:3b",
  task: "Read file1.txt, file2.txt, file3.txt and summarize"
})
// Cost: $0
```

**Files are simple data extraction = LOCAL task.**

---

### Trap 4: Vague Task Scope
```javascript
// ❌ WRONG: Undefined scope = undefined cost
sessions_spawn({
  model: "sonnet",
  task: "Improve the dashboard"  // Too vague!
})
// Cost: Could be $0.20, could be $1.00 — unclear

// ✅ RIGHT: Defined scope = predictable cost
sessions_spawn({
  model: "sonnet",
  task: "Add 3 specific features to dashboard: [feature 1], [feature 2], [feature 3]"
})
// Cost: ~$0.15 (reasonable estimate)
```

**Rule: More specific = better cost estimation, better results.**

---

## Checklist By Scenario

### Scenario: "I want to compare models"
- [ ] ANALYSIS (not IMPLEMENTATION)
- [ ] Use LOCAL, not Sonnet
- [ ] Batch all models into ONE session (TESTING-PROTOCOL.md)
- [ ] Request comparison table
- [ ] Cost: $0

### Scenario: "I need to audit/review something"
- [ ] ANALYSIS (exploring, not building)
- [ ] Use LOCAL first (if findings are clear)
- [ ] Escalate to Sonnet only if LOCAL analysis needs refinement
- [ ] Cost: $0-0.05

### Scenario: "I want to build a feature"
- [ ] IMPLEMENTATION (building)
- [ ] Use CODEX for code generation (FREE-tier)
- [ ] Use SONNET for multi-step reasoning + code
- [ ] Batch related features into one session
- [ ] Cost: $0-0.10

### Scenario: "I need to debug something"
- [ ] ANALYSIS first (understand the problem with LOCAL)
- [ ] Then IMPLEMENTATION (fix with CODEX/SONNET)
- [ ] Two spawns: analyze → implement
- [ ] Cost: $0 (analysis) + $0.05-0.10 (fix)

---

## Efficiency Scoring

After you spawn, score the decision:

```
Model tier correct? ✓ = +2 pts
Batched opportunities? ✓ = +3 pts
Cost estimate accurate? ✓ = +1 pt
Task scope clear? ✓ = +1 pt

Score 7+ = Good decision
Score 5-6 = OK, could optimize
Score <5 = Room for improvement
```

---

## Memory

Print this and keep in head:

> **ANALYSIS = LOCAL (Free)**  
> **IMPLEMENTATION = CODEX/SONNET (Paid)**  
> **2+ Tests = ONE Batch (TESTING-PROTOCOL.md)**

---

**Adopted:** 2026-02-11  
**ROI:** Prevents ~$0.30+ waste per subagent decision

---

If you violate this checklist, you'll catch it in HEARTBEAT.md (Check 2 flags efficiency trends).
