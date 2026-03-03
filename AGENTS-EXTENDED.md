# AGENTS-EXTENDED.md — Overflow for Critical Info

**Purpose:** When AGENTS.md is near its 20,000 char limit, new critical information goes here instead. AGENTS.md contains a permanent reference to this file.

**Rules:**
- Only add info here that WOULD go in AGENTS.md but can't due to size
- Keep entries organized by topic with clear headers
- Each entry should note why it's here (e.g., "Extracted from AGENTS.md" or "New — AGENTS.md at capacity")
- Review periodically — if AGENTS.md shrinks, migrate entries back

**Satellite Files Index:**
| File | Contents | Extracted From |
|------|----------|----------------|
| `GIT-CONFIG.md` | Git commit email config (joesubsho@gmail.com) | AGENTS.md §Git Configuration |
| `GROUP-CHAT-GUIDELINES.md` | Group chat behavior, reactions | AGENTS.md §Group Chats |

---

<!-- New overflow entries go below this line -->

## Code Commit & Push Policy (Standing Directive — 2026-02-26)

**Rule:** After any code update that has been thoroughly tested:
- ✅ **All repos except CoinUsUp** — commit AND push automatically
- ⚠️ **CoinUsUp** — commit locally, but **DO NOT push without Joe's explicit approval** (site is live; a bad push could crash production)
- 📝 **Always** update relevant memory/infrastructure/docs files to document what changed and why

**CoinUsUp push flow:**
1. Make changes + test thoroughly
2. `git commit` locally with clear message
3. Notify Joe: "Ready to push — here's what changed: [summary]. Approve?"
4. Wait for explicit approval before `git push`

**Documentation requirement:** Every non-trivial code change should be reflected in at least one of: daily memory log, LAST-SESSION.md, card comments, or a relevant CHANGELOG/README.

---

## Kanban Idea Quality Standard (Standing Directive — 2026-02-26)

**Rule:** Never add an idea to the Kanban board just to add one. Every idea must be well-researched and genuinely high quality before it gets a card.

**Before creating an Idea card, verify:**
- Real demand exists (not just assumed)
- Fits Joe's stack, goals, or expertise
- Has a credible revenue or value path
- Effort vs. upside has been considered
- Is meaningfully differentiated — not a generic "AI wrapper" idea

**Standard:** If you wouldn't confidently pitch it to Joe knowing he'll ask hard questions, don't post it.

---

## Idle Activity — Self-Improvement (Standing Directive — 2026-02-26)

When Alfred has no active tasks and no Kanban cards to work on, default idle activity is:
**Collaborate with HAL to find and build improvements to how we work together.**

- Research first, build second — must be well thought out before writing code
- If it's worth building, build the whole thing properly (not a prototype)
- Commit locally + write a summary for Joe's review
- Standard: Joe expects to be impressed

---

## Discord Message Formatting (Standing Directive — 2026-02-26)

**Rule:** All Discord messages must be properly formatted for Discord markdown.

**Do:**
- `**bold**` for emphasis
- ` ```code blocks``` ` for code/commands
- `` `inline code` `` for short commands/values
- `-` or `•` for bullet lists
- `> ` for quotes/callouts
- `**__Title__**` for section headers (no `#` headings — don't render in Discord)

**Don't:**
- Raw `#` markdown headers (they don't render)
- HTML tags
- Slack-style `*bold*` (single asterisk = italics in Discord)

**Check before every Discord send:** Would this look clean in a Discord channel?

---

## CoinUsUp Discord Channel

**Purpose:** All CoinUsUp improvement ideas and recommendations go to this channel.
**Webhook:** `https://discord.com/api/webhooks/1476455827215749160/YTDUoxAIuLovfxnFcoqUJ-hk2RZ4ioFIdVcGNSgq07ClhWR8P7vGjStzMG8pLNWiNfIC`

**Rule:** Any time Alfred identifies a CoinUsUp improvement idea (from audits, codebase reviews, market research, user patterns), post it to this Discord channel using the webhook above.

**Send format:** Use Discord embed with title, category (🔴 Conversion / 🟡 Retention / 🟢 Revenue), effort estimate, and expected impact.

**Script to use:**
```bash
curl -s -X POST "<webhook_url>" \
  -H "Content-Type: application/json" \
  -d '{"username":"Alfred 🎩","embeds":[{"title":"🪙 CoinUsUp Idea: <title>","description":"<description>","color":5814783}]}'
```

*Added: 2026-02-26 — Joe's directive via Kanban comment on task_1771697312744_e31f4023*

---

## HAL Review Protocol — Test Hallucination Guard

**Added:** 2026-03-01 | **Source:** Moltbook m/agents [30↑] — confirmed real failure mode (agent claimed 47 tests passed, no test file ever existed)

When reviewing any HAL code delivery that claims tests were run or pass:

### Mandatory Checklist (non-negotiable)

1. **Verify test files physically exist:**
   ```bash
   find . -name "*.test.*" -o -name "*.spec.*" | head -20
   ```
   If no files returned → HAL hallucinated tests. Flag immediately.

2. **Run the actual test command and capture stdout — never accept HAL's summary:**
   ```bash
   npm test 2>&1 | tail -30
   # or: pytest -v 2>&1 | tail -30
   ```
   Compare actual pass/fail count against what HAL reported.

3. **Spot-check at least 1 test by reading its source:**
   ```bash
   cat <test-file> | head -50
   ```
   Verify the test actually exercises the claimed functionality (not just `expect(true).toBe(true)`).

4. **If HAL claims X tests passed but fewer exist** → note discrepancy in card comment, do not mark as done until resolved.

### When This Applies
- Any HAL delivery mentioning "tests pass", "X tests passing", "test suite green"
- Any PR/commit that adds new features (check for corresponding test additions)
- Security-sensitive changes (auth, payment, data handling)

### Cost
$0 — process change only. Add ~2 min to review time. Prevents shipping broken/untested code.

---

## Multi-Agent Coordination — Backpressure Patterns (Reference)

**Source:** Moltbook m/general [190↑] — Agent cascade failure amplification analysis  
**Added:** 2026-03-02 | **Cost:** $0 (documentation only)  
**Applies to:** Any multi-agent pipeline (A→B→C chains, delegation flows, sub-agent orchestration)

### Problem: Cascading Retry Amplification

Without coordination, a single agent timeout cascades:
- Agent A calls B, waits 60s timeout
- While A waits, A's caller times out
- Caller retries A, creating 2x load
- If C (downstream of B) is also slow, timeouts compound
- Result: **27x failure amplification** across a 3-agent chain

**Solution:** Three complementary patterns to prevent this.

---

### Pattern 1: Reserve Capacity Quotas

**Concept:** Each agent declares a maximum number of concurrent jobs it can handle. When full, it refuses new work immediately with a backpressure signal instead of queuing indefinitely.

**Implementation:**

```javascript
// Agent B configuration
const agentConfig = {
  maxConcurrentJobs: 5,
  queueTimeout: 2000, // ms to wait before backpressure
};

// Upstream (A) calling downstream (B):
try {
  const result = await B.execute(job);
} catch (err) {
  if (err.code === "BACKPRESSURE") {
    // B is at capacity. A's options:
    // 1. Defer job to a queue (e.g., Bull/BullMQ)
    // 2. Reject gracefully to caller
    // 3. Switch to cheaper/faster model
    return deferJobToQueue(job);
  }
  throw err;
}

// B's job execution:
if (this.activeConcurrentJobs >= this.maxConcurrentJobs) {
  throw new Error("BACKPRESSURE: At capacity");
}
```

**Benefit:** Caller knows immediately if downstream is full, avoiding wasted waiting.

---

### Pattern 2: Degradation Chains

**Concept:** If a downstream agent is slow or at capacity, upstream agents degrade gracefully by:
- Switching to a cheaper/faster model tier
- Skipping non-critical steps
- Reducing fidelity (e.g., fewer retries, lower precision)

**Implementation:**

```javascript
// A calling B with fallback degradation
async function callDownstream(job, tier = "normal") {
  const startTime = Date.now();
  
  try {
    // Attempt normal tier first
    const result = await B.execute(job, { model: "sonnet", timeout: 10000 });
    return result;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    
    if (tier === "normal" && (err.code === "BACKPRESSURE" || elapsed > 5000)) {
      // Degrade to fast tier
      console.log("Degrading to fast tier (Haiku)");
      return await B.execute(job, { 
        model: "haiku", 
        timeout: 3000,
        skipNonCritical: true // Skip optional enrichment steps
      });
    }
    
    if (tier === "fast" && elapsed > 2000) {
      // Degrade to local tier
      console.log("Degrading to local tier (Ollama)");
      return await B.execute(job, {
        model: "local",
        timeout: 1000,
        minimal: true // Absolute minimum processing
      });
    }
    
    throw err;
  }
}
```

**Benefit:** System degrades gracefully under load rather than failing completely. Trade quality for availability.

---

### Pattern 3: Deadline Propagation

**Concept:** Pass the original deadline through all agent hops (A→B→C). Each agent checks: "Is there enough time left to complete my work?" If not, abort rather than starting and timing out mid-operation.

**Implementation:**

```javascript
// Job object includes deadline
const job = {
  data: {...},
  deadline: Date.now() + 30000, // 30 sec total budget
  remainingBudget: () => job.deadline - Date.now()
};

// Agent A calls B, passing deadline
async function processWithDeadline(job) {
  // A's work: 5 sec
  const aWork = await doSomeWork(job.data);
  
  // Check if B has time to work
  const timeForB = job.remainingBudget();
  
  if (timeForB < 5000) {
    // Not enough time for B's minimum work
    console.log(`Aborting B call: only ${timeForB}ms left, B needs 5s`);
    return handleTimeoutCase(aWork);
  }
  
  // Call B with remaining budget
  const bResult = await B.executeWithDeadline(aWork, {
    deadline: job.deadline
  });
  
  return bResult;
}

// B does the same check before calling C
async function B.executeWithDeadline(data, opts) {
  const timeRemaining = opts.deadline - Date.now();
  
  if (timeRemaining < 3000) {
    // Not enough time to call C
    return handleQuickResponse(data);
  }
  
  const cResult = await C.executeWithDeadline(data, opts);
  return cResult;
}
```

**Benefit:** Prevents starting work that can't finish in time. Saves compute, reduces cascading timeouts.

---

### When to Use Each Pattern

| Pattern | Best For | Cost | Setup |
|---------|----------|------|-------|
| **Capacity Quotas** | Preventing queue buildup, backpressure signals | Low | Config + exception handling |
| **Degradation Chains** | High availability, graceful degradation under load | Low-Med | Model tier config, fallback logic |
| **Deadline Propagation** | Time-sensitive pipelines, preventing wasted compute | Low | Job object decoration |

**Recommended:** Use all three together. Capacity quotas prevent queue storms. Deadline propagation stops wasted work. Degradation chains let you stay operational under load.

---

### Example: Full 3-Pattern Implementation

```javascript
// A calling B with all three patterns
async function executeWithBackpressure(job) {
  const deadline = Date.now() + 30000;
  
  // Pattern 3: Check deadline
  if (deadline - Date.now() < 5000) {
    return handleQuickReturn(job);
  }
  
  try {
    // Pattern 1: Capacity quota
    // (B enforces this; A catches BACKPRESSURE)
    const result = await B.executeWithDeadline(job, {
      deadline,
      model: "sonnet" // Pattern 2: Start with best quality
    });
    return result;
  } catch (err) {
    // Pattern 2: Degrade on backpressure
    if (err.code === "BACKPRESSURE") {
      console.log("B at capacity, degrading...");
      return await B.executeWithDeadline(job, {
        deadline,
        model: "haiku",
        skipNonCritical: true
      });
    }
    throw err;
  }
}
```

---

### Future Use Cases for Joe

When you build multi-agent pipelines (e.g., HAL + Alfred + specialized sub-agents), implement these patterns to:
- Avoid failure cascades
- Stay efficient under load
- Provide graceful degradation
- Prevent wasted compute on tasks that won't finish in time
