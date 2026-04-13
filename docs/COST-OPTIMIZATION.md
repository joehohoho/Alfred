# OpenClaw Cost Optimization Guide

**Last Updated:** Feb 17, 2026

Based on YouTube research and community best practices. Implement these strategies to reduce token costs by 50-70%.

## The Cost Problem

**Without optimization:**
- Haiku: ~$0.00025 per 1K input tokens
- Sonnet: ~$0.003 per 1K input tokens
- Opus: ~$0.015 per 1K input tokens

**Scenario: Using Opus for everything**
- 8 hours of agent work/day: 50,000 tokens
- Opus 50K tokens/day: ~$0.75/day = **$22.50/month**
- Add 3 heartbeat jobs @ 10K tokens each/day: +$0.45/day
- Monthly total: **$40+ for basic usage**

**With cost optimization (below): ~$10-15/month**

---

## Strategy 1: Dynamic Model Router (ClawRouter)

### What It Does
- Routes tasks to the cheapest appropriate model
- 30+ models available (OpenAI, Anthropic, open-source)
- Local routing decision (no API calls wasted on routing)
- Uses USDC on Base blockchain (crypto, but minimal amounts needed)

### Setup Cost
- **Initial**: $5-10 USDC deposit (covers months of usage)
- **Monthly**: ~$1-3 for token usage

### Implementation Steps

1. **Fund a wallet with USDC**
   ```bash
   # Use any exchange (Coinbase, Kraken, etc.)
   # Send $10 in USDC to Base network
   # Cost: ~$2-5 in gas fees
   ```

2. **Install ClawRouter**
   ```bash
   # In your agent chat:
   "Can you install ClawRouter? Here's the link: https://github.com/claw-router/claw-router"
   # Follow wallet setup instructions
   ```

3. **Configure in AGENTS.md**
   ```markdown
   ## Model Routing

   Use ClawRouter to dynamically select models:
   - Haiku: Simple formatting, summaries, list generation
   - Sonnet: Analysis, writing, moderate complexity
   - Opus: Critical decisions, security audits, complex reasoning
   - Local models (via Ollama): Background analysis, prototyping

   Route based on estimated task complexity, not default to expensive.
   ```

### Savings Potential
- **Baseline (all Opus)**: ~$40/month
- **With ClawRouter**: ~$5-10/month
- **Monthly savings**: $30-35 (80-90% reduction)

### Risks
- New project (1.2K GitHub stars, active development)
- Requires crypto wallet (friction for non-crypto users)
- Blockchain fee variability
- Alternative: Manual model selection (below)

---

## Strategy 2: Manual Dynamic Model Selection

### No Setup Required ✓

**Add to AGENTS.md:**

```markdown
## Model Selection Rules

Apply these rules to optimize cost without ClawRouter:

### Haiku (Cheapest - Use First)
- JSON formatting and parsing
- Simple summaries (< 500 words)
- List generation
- Text classification
- Proofreading
- Simple code generation
- Error message analysis

### Sonnet (Mid-Cost - Default)
- Blog post writing
- Email drafting
- Code review and debugging
- Data analysis
- Complex problem-solving
- Feature brainstorming
- Most general tasks default here

### Opus (Expensive - Rare)
- Security audits
- Critical decisions (money, legal)
- Architecture design for large systems
- Complex reasoning with multiple unknowns
- Only when Sonnet fails on retries

### Rule: Always start with Haiku
When a user request comes in, ASK: "Can Haiku handle this?"
If yes → use Haiku. If no → escalate to Sonnet. Only Sonnet fails → use Opus.

Example: User asks to "write a blog post"
1. Try: Haiku outline + Sonnet full post (saves $0.30/1K tokens vs Opus)
2. Never: "Let me use Opus for this entire blog"
```

### Savings Potential
- **Baseline (all Sonnet)**: ~$20/month
- **With manual selection**: ~$8-12/month
- **Monthly savings**: $8-12 (40-60% reduction)

### Best For
- Non-crypto users
- Teams wanting manual control
- Learning what each model is best at

---

## Strategy 3: QMD Skill (Quick Markdown Search)

### What It Does
- Indexes markdown files for fast searching
- Reduces token usage for file lookups by 70%+
- Prevents reloading full MEMORY.md every turn
- Full-text search without loading all files into context

### Setup Cost
- **One-time**: ~$0.10 (installation)
- **Ongoing**: Negligible (local indexing)

### Implementation

1. **Install the skill**
   ```bash
   # In agent chat:
   "Can you install the QMD skill?"
   # Or from ClawHub: https://clawhub.ai/qmd
   ```

2. **Benefits immediately:**
   - Memory searches are now tokenized, not bulk-loaded
   - Reference file lookups are indexed
   - Large workspace operations cut token usage in half

### Savings Potential
- **Baseline (large workspace, many memory files)**: ~$3-5/month in memory ops
- **With QMD**: ~$0.50-1/month
- **Monthly savings**: $2.50-4 (especially for large projects)

### Best For
- Anyone with >20 memory/reference files
- Frequent memory searches
- Large workspaces (100+ markdown files)

---

## Strategy 4: Multi-Agent Setup with Cheaper Models

### What It Does
- Deploy secondary agents with cheaper models (MiniMax M2.5, Llama, etc.)
- Agents communicate with each other
- Divide tasks by complexity across agent tiers
- 24/7 background work without expensive Opus

### Setup Cost
- **MiniMax M2.5**: $10-20/month (very capable, 1/3 cost of Claude)
- **Ollama (local)**: $0 (runs on your machine)
- **VPS for second agent**: $5-10/month

### Implementation

1. **Deploy second agent on cheaper model**
   ```bash
   # Option A: MiniMax
   agent_id: secondary
   model: minimax/m2.5
   
   # Option B: Ollama (requires local setup)
   agent_id: secondary
   model: ollama/llama2:70b
   ```

2. **Create agent collaboration in AGENTS.md**
   ```markdown
   ## Multi-Agent Collaboration

   Agent Tiers:
   - Primary (Claude Opus): Complex decisions, final output
   - Secondary (MiniMax): Analysis, drafting, research
   - Background (Local Ollama): Indexing, parsing, preprocessing

   Task routing:
   1. Parsing/normalization → Background
   2. Analysis/research → Secondary  
   3. Final decision → Primary
   ```

3. **Enable agent-to-agent messaging**
   ```bash
   # Agents can prompt each other in Discord/Slack
   @secondary "Analyze this document and report findings"
   @primary "Review secondary's analysis and make decision"
   ```

### Savings Potential
- **Baseline (single Opus agent 24/7)**: ~$50-100/month
- **With multi-tier**: ~$15-25/month
- **Monthly savings**: $25-75 (50-75% reduction)
- **Bonus**: Work continues 24/7 without user intervention

### Best For
- Complex workflows needing background processing
- High-volume batch tasks
- Projects where you can tolerate slightly lower quality for cost savings

---

## Strategy 5: Heartbeat Optimization

### The Cost Problem
Every heartbeat job = full model invocation = token burn
```
Example:
- Haiku heartbeat check: 2,000 tokens/run = ~$0.0005/run
- 24 hour heartbeats (4 per day): ~$0.002/day = $0.06/month
- 6 hour heartbeats (4 per day): ~$0.002/day = $0.06/month
- 30 minute heartbeats (48 per day): ~$0.024/day = $0.72/month ← EXPENSIVE!
```

### Optimization Rules

**Rule 1: Use Haiku for heartbeats, never Sonnet/Opus**
```markdown
heartbeat_config:
  model: anthropic/claude-haiku-4-5
  schedule: "0 */6 * * *"  # Every 6 hours, not 30 minutes
```

**Rule 2: Batch checks in single heartbeat**
```markdown
# DON'T: Three separate heartbeats (3x cost)
- Email check (every 2 hours)
- Calendar check (every 4 hours)
- Slack mentions (every 3 hours)

# DO: One heartbeat that checks all three (1x cost)
- Combined check: "Email, calendar, Slack" (every 6 hours)
```

**Rule 3: Skip unnecessary heartbeats**
```markdown
# If something is event-driven (webhooks), don't use heartbeat
# Only heartbeat for truly time-based checks

# Good: Email inbox at 9am (event-based: @mention webhook)
# Bad: Polling email every 30 minutes (expensive heartbeat)
```

### Savings Potential
- **Naive heartbeats** (30min, 3 separate): ~$2-3/month
- **Optimized heartbeats** (6hr batched, Haiku): ~$0.15/month
- **Monthly savings**: $1.85-2.85

---

## Strategy 6: Super Memory Strategic Use

### What It Does
- Persistent, searchable memory outside normal context window
- Reduces token usage for memory recall
- API-based (small monthly cost)

### Cost Breakdown
- **Free tier**: Limited API calls, fine for testing
- **Paid tiers**: $10-50/month depending on usage
- **Token savings**: Reduces memory.md reload by 50-70% per session

### When It's Worth It
```
If you have:
- 100+ memory files
- Multiple daily memory searches
- Long-running sessions (>50 messages/session)

Then Super Memory ROI:
- Cost: $20/month (mid-tier)
- Token savings: ~$30/month
- Net savings: +$10/month
```

### Implementation
```bash
# 1. Create SuperMemory account
# 2. Generate API key
# 3. Add to config via environment variable (DON'T paste in chat!)
# 4. Install super-memory skill from ClawHub
```

---

## Recommended Optimization Stack

### Tier 1: Easy (0 friction, 40-60% savings)
1. ✅ Manual model selection (AGENTS.md rules)
2. ✅ Install QMD skill
3. ✅ Heartbeat optimization (6hr, batched, Haiku)

**Expected monthly savings: 40-60%**
**Setup time: 30 minutes**

### Tier 2: Medium (some friction, 70-80% savings)
1. ✅ Everything from Tier 1
2. ✅ Deploy MiniMax M2.5 secondary agent ($15/month)
3. ✅ Enable agent-to-agent collaboration
4. ✅ Super Memory for large workspaces ($20/month)

**Expected monthly savings: 70-80%**
**Setup time: 2-3 hours**

### Tier 3: Advanced (crypto friction, 80-90% savings)
1. ✅ Everything from Tier 2
2. ✅ Install and fund ClawRouter ($10 one-time)
3. ✅ Let ClawRouter auto-optimize model selection

**Expected monthly savings: 80-90%**
**Setup time: 4-5 hours**
**Risk: Crypto wallet management, new unproven tool**

---

## Cost Tracking & Monitoring

### Add to HEARTBEAT.md
```markdown
## Monthly Cost Check

Every 1st of month, check:
1. Model usage breakdown (which models consumed tokens?)
2. Heartbeat job costs (are 30-min heartbeats costing too much?)
3. Skill usage (is Super Memory saving money or costing more?)
4. Token burn trends (month-over-month comparison)

Tool: `openclaw gateway token-report` (if available) or log API bills manually
```

### Expected Baselines

| Strategy | Monthly Cost | Savings vs Default |
|----------|--------------|-------------------|
| Default (all Opus) | $50-100 | 0% |
| Tier 1 only | $20-30 | 60% |
| Tier 1 + MiniMax | $15-25 | 75% |
| Tier 1 + MiniMax + QMD | $12-20 | 80% |
| Tier 1 + MiniMax + ClawRouter | $5-15 | 85-90% |

---

## Implementation Roadmap

**Week 1: Quick Wins**
- Add model selection rules to AGENTS.md
- Install QMD skill
- Optimize heartbeat schedule

**Week 2: Secondary Agent**
- Deploy MiniMax M2.5 on VPS ($10/month)
- Set up agent collaboration

**Week 3: Advanced**
- Evaluate ClawRouter (test or skip if crypto is friction)
- Consider Super Memory if workspace is large

---

## References

- ClawRouter: https://github.com/claw-router/claw-router
- ClawHub Skills: https://clawhub.ai
- MiniMax M2.5: https://www.minimaxi.com
- Ollama: https://ollama.ai

---

**Last reviewed:** Feb 17, 2026
**Estimated ROI:** +$20-80/month savings with minimal setup
