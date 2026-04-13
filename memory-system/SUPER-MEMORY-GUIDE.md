# Super Memory Integration Guide

**Last Updated:** Feb 17, 2026

How to implement Super Memory to enhance your current memory setup without losing OpenClaw's built-in memory system.

---

## Current Memory System (OpenClaw Native)

### What You Already Have
- **MEMORY.md**: Long-term curated memory
- **memory/YYYY-MM-DD.md**: Daily logs (raw notes)
- **memory/INDEX.md**: Table of contents
- **Session context**: Automatic message history per session

### How It Works
1. Agent loads MEMORY.md at session start
2. Agent reads daily files as needed
3. Agent appends to memory files as work progresses
4. Memory persists across sessions in local files

### Current Limitations
- **Token cost**: Full MEMORY.md file loaded every session (~$0.02-0.05 per load)
- **Scalability**: As memory grows, token cost grows linearly
- **Search latency**: Must load entire file to search
- **Context window**: Large memory files reduce space for actual work

---

## Super Memory: What It Adds

### How It Works
```
Without Super Memory:
[User request] → Load MEMORY.md (1K-10K tokens) → Search → Respond → Add to MEMORY.md

With Super Memory:
[User request] → Query Super Memory API (100-200 tokens) → Fast search → Respond → Add to Super Memory
```

### Key Differences

| Aspect | OpenClaw Native | Super Memory |
|--------|-----------------|--------------|
| **Storage** | Local files (.md) | Cloud API + vector database |
| **Search** | Linear (load all, search) | Semantic vector search |
| **Token cost per search** | 500-2000 tokens | 100-200 tokens |
| **Persistence** | Session to session via files | Automatic, persistent API |
| **Privacy** | 100% local | Cloud-hosted (third party) |
| **Scalability** | Limited by context window | Unlimited (external DB) |
| **Setup** | Zero setup | Requires API key + account |

---

## How Super Memory Improves Your Setup

### Scenario: Large Memory Base (200KB of notes)

**Without Super Memory:**
```
Session 1: Load MEMORY.md (8K tokens) + daily (2K tokens) = 10K tokens used just for context
Session 2: Reload again = 10K tokens wasted
Session 3: Same = 10K tokens wasted

Monthly cost for memory operations alone: 30 sessions × 10K tokens × $0.003/1K = $0.90/month
(That's with Sonnet; much higher with Opus)
```

**With Super Memory:**
```
Session 1: Query Super Memory API (300 tokens) + OpenClaw native (2K) = 2.3K tokens
Session 2: Query Super Memory API (300 tokens) = 0.3K tokens
Session 3: Query Super Memory API (300 tokens) = 0.3K tokens

Monthly cost for same operations: 30 sessions × 0.3K tokens × $0.003/1K = $0.03/month
Savings: $0.87/month (97% reduction for memory operations)
```

### Real-World Benefits

1. **Semantic search** — Find memories by meaning, not exact keywords
   ```
   Query: "things I learned about AI agents"
   Returns: All relevant memories, even if worded differently
   ```

2. **Persistent learning** — Super Memory learns from your interactions
   ```
   Over time, it builds better summaries and connections
   ```

3. **Multi-agent access** — Share memory between OpenClaw instances
   ```
   Agent A learns something → Super Memory stores it
   Agent B can access it immediately (true multi-agent memory)
   ```

4. **Reduced context bloat** — Keep your token budget for actual work
   ```
   Without Super Memory: 50% of tokens = memory overhead
   With Super Memory: 5% of tokens = memory overhead
   ```

---

## Setup Guide

### Step 1: Create Super Memory Account

1. Go to **https://www.supermemory.ai**
2. Sign in with GitHub or email
3. Create an account (free tier available)

### Step 2: Generate API Key

1. Dashboard → **API Keys**
2. Click **Create New Key**
3. Name it: `openclaw-integration`
4. **Copy the key** (you won't see it again)

### Step 3: Add to Your Config (SECURELY)

**❌ DON'T:**
```bash
# Never paste API key directly in chat or git
super_memory:
  api_key: "sk-xxx-your-actual-key-xxx"
```

**✅ DO: Use environment variables**

1. **Create a `.env` file in your workspace:**
   ```bash
   cd /Users/hopenclaw/.openclaw/workspace
   echo "SUPER_MEMORY_API_KEY=<your-key-here>" >> .env
   ```

2. **Update your OpenClaw config:**
   ```yaml
   # In your config.yml or agents config
   super_memory:
     api_key: ${SUPER_MEMORY_API_KEY}
     enabled: true
   ```

3. **Verify it's in .gitignore:**
   ```bash
   echo ".env" >> .gitignore
   ```

### Step 4: Install Super Memory Skill

**In your agent chat:**

```
Can you install the Super Memory skill from ClawHub?
Link: https://clawhub.ai/super-memory

This should:
1. Load the skill definition
2. Test the API connection
3. Ask for API key (paste the environment variable reference, not the actual key)
4. Enable persistent memory operations
```

### Step 5: Verify It's Working

In agent chat, ask:
```
"Show me your Super Memory status. What's stored there?"
```

Expected response:
```
✓ Super Memory API: Connected
✓ Persistent memory available
✓ Recent memories indexed: [list of topics]
```

---

## How to Use It Alongside Native Memory

### Recommended Hybrid Approach

| Type | Storage | Purpose | Checked |
|------|---------|---------|---------|
| **Session notes** | OpenClaw native (MEMORY.md) | Quick reference in current session | Every turn |
| **Long-term learnings** | Super Memory API | Persistent memory across all sessions | On demand |
| **Daily logs** | memory/YYYY-MM-DD.md | Raw notes for this day | During maintenance |
| **Project docs** | AGENTS.md, SOUL.md | Agent-specific config | Session start |

### Workflow

**At start of session:**
```
1. Load AGENTS.md (soul, identity, rules)
2. Brief Super Memory query if needed ("Remind me of my current projects")
3. Continue with task
```

**During session:**
```
1. Use native memory for "what did I do last session?"
2. Use Super Memory for "general knowledge I've learned"
3. Add new findings to MEMORY.md at session end
```

**At session end:**
```
1. Update MEMORY.md with today's learnings
2. Super Memory auto-syncs (if configured with hooks)
3. Continue next session
```

---

## Configuration Examples

### Minimal Setup (Just Super Memory)

```yaml
super_memory:
  enabled: true
  api_key: ${SUPER_MEMORY_API_KEY}
  collections:
    - name: "general_knowledge"
      auto_add: true
    - name: "projects"
      auto_add: true
```

### Advanced Setup (Hybrid Native + Super Memory)

```yaml
memory:
  native:
    enabled: true
    paths:
      - memory/YYYY-MM-DD.md
      - MEMORY.md
      - AGENTS.md
  super_memory:
    enabled: true
    api_key: ${SUPER_MEMORY_API_KEY}
    collections:
      - name: "persistent_knowledge"
        sync_from: MEMORY.md  # Sync our best insights
        auto_add: true
      - name: "daily_logs"
        retention_days: 90
      - name: "project_context"
        auto_add: true
  
  # Strategy: Use native for quick access, Super Memory for deep search
  search_strategy: "hybrid"  # Query both, merge results
```

---

## Cost Analysis

### Super Memory Pricing (as of Feb 2026)

| Tier | Monthly Cost | Use Case |
|------|--------------|----------|
| **Free** | $0 | <1,000 API calls/month (testing) |
| **Pro** | $10 | <10,000 API calls/month (1-2 agents) |
| **Team** | $50 | <100,000 API calls/month (5+ agents) |

### Token Savings Calculation

**Scenario: 2 agents, 30 sessions/month, 200KB memory**

**Without Super Memory:**
- Memory load per session: 8,000 tokens × 30 = 240,000 tokens
- Cost (Sonnet @ $3/1M): 240K × $0.003 = **$0.72/month** (memory alone)

**With Super Memory ($10/month):**
- Super Memory API calls: 300 tokens × 30 = 9,000 tokens  
- Cost: 9K × $0.003 = **$0.03/month** (memory alone)
- Total with Super Memory fee: $10.03/month
- **Breakeven**: Yes! If you have 100+ KB of memory

---

## Troubleshooting

### Issue: "Super Memory API connection failed"

**Solution:**
1. Verify API key is correct: `echo $SUPER_MEMORY_API_KEY`
2. Check API key format (should be `sk-...`)
3. Test at https://www.supermemory.ai/api/test
4. Regenerate key if needed

### Issue: "Memory isn't persisting"

**Solution:**
1. Check if skill is properly installed: Agent → ask "What skills do you have?"
2. Verify sync is enabled in config: `auto_add: true`
3. Check Super Memory dashboard at supermemory.ai to see if data is storing

### Issue: "Token usage is higher with Super Memory"

**This shouldn't happen.**
- If it does, you're likely querying Super Memory AND loading MEMORY.md
- Disable native memory loading when Super Memory is active
- Adjust config: `native.enabled: false` (if you trust Super Memory)

---

## Migration from Pure Native Memory

If you already have 6 months of memory in MEMORY.md:

### Step 1: Export existing memory
```bash
cp MEMORY.md /tmp/memory-backup.md
```

### Step 2: Upload to Super Memory
**In agent chat:**
```
"Please read the contents of this file and upload it to my Super Memory as background knowledge:

[paste MEMORY.md contents]

This should create a 'migrated_memory' collection with all my past learnings."
```

### Step 3: Keep native memory as fallback
Keep MEMORY.md but update less frequently (just top-level summaries). Super Memory becomes primary for detailed queries.

---

## Best Practices

1. **Privacy consideration**: Super Memory is cloud-hosted; don't store extremely sensitive data
2. **Sync strategy**: Decide: "Real-time sync" vs "Daily sync" vs "Manual sync"
3. **Collection organization**: Organize by topic (projects, learnings, contacts, etc.)
4. **Backup**: Export Super Memory periodically via their API
5. **Cost monitoring**: Check API call counts weekly to avoid surprise bills

---

## When NOT to Use Super Memory

Skip Super Memory if:
- ✗ Your workspace is <50KB of memory (overhead not worth it)
- ✗ You have sensitive/private data (stays fully local with native)
- ✗ You have no internet connectivity (native is air-gapped)
- ✗ You're on a tight budget ($10/month adds up)

In these cases, stick with OpenClaw's native memory system—it's excellent.

---

## References

- Super Memory: https://www.supermemory.ai
- Super Memory API Docs: https://docs.supermemory.ai
- ClawHub Super Memory Skill: https://clawhub.ai/super-memory

---

**Implementation time: 15-20 minutes**
**Recommended**: Yes, if you have 100KB+ of notes or run multiple agents
