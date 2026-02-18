# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics - the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## iMessage Contact
- Joe's Phone: 1-506-227-9553

---

## 🏥 Ollama Guard System (NEW - Feb 18, 2026)

**Problem:** Multiple tasks hitting ollama simultaneously causes timeouts and cascade failures.

**Solution:** Universal guard system that protects ANY task using the LOCAL model from overload.

### Quick Commands

```bash
# Check if ollama is healthy (silent, exit code only)
bash scripts/ollama-guard.sh

# Get human-readable status with metrics
source scripts/ollama-guard.sh
ollama_status

# Get response time in milliseconds
ollama_get_response_time

# Run a command only if ollama is healthy
bash scripts/ollama-guard.sh bash my-task.sh

# Wait up to 60s for ollama to be ready, then run
bash scripts/ollama-guard.sh --wait bash my-task.sh
```

### Status

✅ **Implemented:**
- Universal guard script (`scripts/ollama-guard.sh`)
- Integrated into 3 critical cron jobs (Evening Routine, Moltbook Review, Daily Config)
- Works with cron jobs, sub-agents, shell scripts, and inline commands

⏳ **Next:** Apply to other ollama-dependent tasks (Morning Brief, Code Review, iMessage Responder, etc.)

### How It Works

1. Task starts → check `ollama_health_check()`
2. If healthy (response < 1000ms) → proceed with task
3. If overwhelmed (response > 1000ms) → defer gracefully (exit code 1) or wait (--wait mode)
4. Cron automatically reschedules deferred tasks

**Cost:** ~5ms per health check (negligible)

**Benefit:** Prevents $0.01-0.05 per failed retry, saves ~$0.50/month from cascade failures

**See:** `OLLAMA-GUARD-UNIVERSAL.md` for complete reference with all usage patterns

---

## 🎙️ Voice Communication Setup (NEW - Feb 13, 2026)

**Status:** ✅ Ready to use

### Speech-to-Text (You → Me)

**Tool:** Whisper (local, no cost)

**Quick Start:**
```bash
./scripts/voice-input.sh              # 10 sec, base model (default)
./scripts/voice-input.sh continuous   # Record until you press Ctrl+C (CONVERSATION MODE)
./scripts/voice-input.sh 60 small     # 60 sec, small model (better accuracy)
./scripts/voice-input.sh until-silence small  # Record until 2sec silence detected
```

**Duration Modes:**
- `10` (default) — Fixed 10 seconds
- `30`, `60`, `120` — Custom fixed duration
- `continuous` — Record until **Ctrl+C** (perfect for natural conversations)
- `until-silence` — Auto-stop when 2 seconds of silence detected (experimental)

**Model Options:**
- `tiny` — Fastest (~1 sec), lowest accuracy
- `base` — Good balance (default, ~3 sec)
- `small` — Better accuracy (~5 sec) ← **Recommended for longer speech**
- `medium` — High accuracy (~10 sec)
- `large` — Highest accuracy (requires more VRAM)

**Workflow:**
1. Run `./scripts/voice-input.sh continuous` to start conversation
2. Speak naturally until done
3. Press **Ctrl+C** to end recording
4. Whisper transcribes
5. Transcript → clipboard → paste into chat

### Text-to-Speech (Me → You)

**Tool:** OpenClaw `tts` tool (integrated)

**How it works:**
- When I generate audio responses, you'll see: `MEDIA: /path/to/audio.mp3`
- Click/tap to play in your browser or media player
- Cost: ~$0.0001 per message (ElevenLabs integration)

**Manual generation:**
```python
# In a chat or via OpenClaw
tts(text="Hello, this is Alfred speaking")
# Returns: MEDIA: /tmp/tts_xxxxx.mp3
```

**Cost Breakdown:**
- Whisper (input): FREE (local)
- TTS (output): ~$0.0001-0.0003 per message
- **Total loop cost:** Negligible (~$0.02/month at current usage)

### Configuration

**Whisper settings** (in `voice-input.sh`):
- Default duration: 10 seconds
- Default model: `base` (adjust for your needs)
- Cache location: `~/.cache/whisper`

**TTS settings** (via OpenClaw):
- Provider: ElevenLabs (configurable)
- Voice: Default system voice (can customize)
- Format: MP3 (streaming-compatible)

### Quick Reference

| Use Case | Command | Duration | Accuracy |
|----------|---------|----------|----------|
| Quick note | `./scripts/voice-input.sh` | 10 sec | Good |
| Conversation | `./scripts/voice-input.sh continuous` | Until Ctrl+C | Good |
| Longer talk | `./scripts/voice-input.sh 60 small` | 60 sec | Better |
| Auto-stop | `./scripts/voice-input.sh until-silence small` | Until 2s silence | Better |
| Fast feedback | `./scripts/voice-input.sh 15 tiny` | 15 sec | Fast |

---

## 🚀 LaunchAgents (Auto-Start Services - Feb 18, 2026)

**Status:** ✅ All 4 deployed and verified working

Persistent background services that auto-start on boot and auto-restart on failure.

### Active LaunchAgents

| Service | PList | Purpose | Port | Status |
|---------|-------|---------|------|--------|
| **Ollama Keep-Alive** | `com.ollama.keepalive.plist` | Unload ollama models after 60s inactivity (saves CPU) | N/A | ✅ Running |
| **iMessage Responder** | `com.openclaw.imsg-responder.plist` | Event-driven daemon for incoming iMessages | N/A | ✅ Running |
| **Alfred Dashboard (Next.js)** | `com.alfred.dashboard-nextjs.plist` | Command center UI for system status | 3001 | ✅ Running |
| **Cloudflare Tunnel** | `com.cloudflare.tunnel.plist` | Public tunnel to dashboard.my-alfred-ai.com | N/A | ✅ Running |

### Quick Management

```bash
# Check if a service is running
launchctl list | grep com.ollama.keepalive
# Output: 12345 0 com.ollama.keepalive.plist (0 = success, running)

# Check logs for a service
log stream --predicate 'process == "ollama"' --level debug

# Manually stop a service
launchctl stop com.alfred.dashboard-nextjs

# Manually start a service
launchctl start com.alfred.dashboard-nextjs

# Reload a service (after editing its plist)
launchctl unload ~/Library/LaunchAgents/com.alfred.dashboard-nextjs.plist
launchctl load ~/Library/LaunchAgents/com.alfred.dashboard-nextjs.plist

# View all loaded user agents
launchctl list | grep com.
```

### Configuration Details

**Ollama Keep-Alive** (`com.ollama.keepalive.plist`)
- Sets `OLLAMA_KEEP_ALIVE=60s` persistently
- Prevents ollama models staying in memory indefinitely
- Reduced CPU from 349% → ~0%
- Safe to reload/restart; no downside

**iMessage Responder** (`com.openclaw.imsg-responder.plist`)
- Runs `~/.openclaw/workspace/scripts/imsg-responder.sh`
- Watches for incoming iMessages in real-time
- Falls back to 30s polling if `imsg watch` unavailable
- Only calls LLM (ollama/1b) when messages actually arrive

**Alfred Dashboard** (`com.alfred.dashboard-nextjs.plist`)
- Runs Next.js server on localhost:3001
- Built-in system status, commands, quick links
- Auto-restart on crash
- View at: http://localhost:3001 (or https://dashboard.my-alfred-ai.com via Cloudflare)

**Cloudflare Tunnel** (`com.cloudflare.tunnel.plist`)
- Runs `cloudflare tunnel run alfred-dashboard`
- Exposes localhost:3001 as dashboard.my-alfred-ai.com
- Requires Cloudflare account + tunnel token
- Auto-restart on crash

### Troubleshooting

**Dashboard not loading (HTTP 503 / timeout)?**
```bash
# Check Next.js app is running
ps aux | grep "next"
# If not found, restart:
launchctl stop com.alfred.dashboard-nextjs
launchctl start com.alfred.dashboard-nextjs

# Check tunnel connection
log stream --predicate 'process == "cloudflared"' --level debug
```

**iMessage responder missing messages?**
```bash
# Check daemon is running
ps aux | grep "imsg-responder"

# View recent logs
log stream --predicate 'eventMessage CONTAINS "imsg"' --level debug

# Manually test imsg watch
imsg watch  # Should show new messages as they arrive
```

**Ollama still using high CPU?**
```bash
# Verify KEEP_ALIVE is set
cat ~/Library/LaunchAgents/com.ollama.keepalive.plist | grep -A1 OLLAMA_KEEP_ALIVE

# Check if models are still loaded
ollama list

# Force unload
ollama rm llama3.2:3b
ollama rm llama3.2:1b
```

### Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## Quick Commands (No SKILL.md Lookup Needed)

Common commands to avoid loading full skill documentation:

### Weather
```bash
# Full forecast (current pattern)
curl -s "wttr.in/Dieppe,NB?T"

# One-liner format
curl -s "wttr.in/Dieppe,NB?format=3"
# Output: Dieppe,NB: ⛅️ -7°C

# Compact with details
curl -s "wttr.in/Dieppe,NB?format=%l:+%c+%t+(feels+%f)+%w"
# Output: Dieppe,NB: ⛅️ -7°C (feels -13°C) ↘17km/h
```

### Brave Search API
```bash
# Quick search via web_search tool (preferred)
# web_search(query="...", count=5, country="US", freshness="pw")
# Returns: title, URL, snippet for each result

# Manual curl (for reference)
curl -s "https://api.search.brave.com/res/v1/web/search?q=QUERY&count=10" \
  -H "Accept: application/json" \
  -H "X-Subscription-Token: YOUR_API_KEY"
```

### Calendar
*(to be added when calendar skill integrated)*

### Tasks
*(to be added as needed)*

---

## Claude Code Terminal Integration

**Source the router function in your shell profile:**

```bash
# Add to ~/.zshrc or ~/.bashrc
source ~/.openclaw/workspace/scripts/claude-code-router.sh
```

### Quick Commands (One-Shot Analysis)

Use these for fast code review/analysis - Claude Code answers once and exits.

```bash
# Code review: cc-review < myfile.js
cc-review < src/auth.js
# Suggests improvements, security issues, performance fixes

# Explain code: cc-explain < myfile.js
cc-explain < utils/parser.js
# Explains what it does and how it works

# Bug analysis from logs: logs | cc-bugs
tail -f app.log | cc-bugs
# Analyzes error patterns, suggests fixes

# Generate tests: cc-tests < myfunction.js
cc-tests < src/validator.js
# Writes unit tests for the function

# Review a diff: git diff | cc-review
git diff main | cc-review
# Reviews changes for quality/safety
```

### Interactive Development

Use these for iterative coding - Claude Code stays in a conversation loop.

```bash
# Feature development: cc-dev "feature description"
cc-dev "add user authentication with JWT"
# Iteratively build a feature, ask clarifying questions

# Architecture design: cc-arch "system description"
cc-arch "design a payment processing system"
# Discuss architecture, tradeoffs, implementation

# Interactive debugging: cc-debug "problem description"
cc-debug "users report login fails silently on mobile"
# Debug together with back-and-forth questions

# Continue last session: cc-continue
cc-continue
# Resume where you left off (if Claude Code has recent sessions)
```

### Router Syntax (Advanced)

If you want to call the router directly with custom context:

```bash
route_task "code-review" "$(cat myfile.js)"
route_task "feature-dev" "build a notification system"
route_task "debug-iterative" "the API returns null for valid requests"
```

### When to Use What (Decision Guide)

**Claude Code (Terminal) - Interactive/Complex Work:**
- ✅ Feature development (needs iteration)
- ✅ Architecture design (needs discussion)
- ✅ Complex debugging (back-and-forth)
- ✅ Large refactoring (multi-file changes)

**Claude Code (-p flag) - Quick Analysis:**
- ✅ Code review (want feedback fast)
- ✅ Bug analysis (read error logs)
- ✅ Explain code (understand a function)
- ✅ Generate tests (one-off test writing)

**OpenClaw (Background) - Scheduled/Simple:**
- ✅ Cron jobs (all LOCAL now)
- ✅ File operations (read/write)
- ✅ Memory management
- ✅ Data parsing/extraction

---

Add whatever helps you do your job. This is your cheat sheet.

---

## ⚡ ANALYSIS vs IMPLEMENTATION (Critical Decision Tree - 2026-02-11)

Before spawning ANY subagent:

**ANALYSIS** (Exploring, testing, comparing, auditing)
- Route to: **LOCAL** (free)
- Examples: Compare models, evaluate approaches, audit systems, test frameworks
- Cost: $0
- Batch rule: Combine 2+ tests into ONE LOCAL session

**IMPLEMENTATION** (Building, writing, deploying)
- Route to: **Codex** (free for code gen) or **Sonnet** (reasoning + code)
- Examples: Build features, debug, create, implement designs
- Cost: $0-0.10+
- Batch rule: Combine related features into one Codex session

**Golden rule:** If exploring/thinking, use LOCAL. If shipping, use Codex/Sonnet.

**Biggest mistake:** Using Sonnet for "analysis" - costs 10x more than LOCAL for identical results.

---

## Model Routing Strategy (Updated 2026-02-11)

**Main session: SONNET** (security gatekeeper, prevents prompt injection)
**Sub-tasks: Route via `sessions_spawn` to appropriate model**

### Quick Reference

| Task Type | Model | How To Use |
|-----------|-------|------------|
| Code generation/review | `codex` | `sessions_spawn(model="codex", task="...")` |
| Simple file ops | `local` | `sessions_spawn(model="local", task="...")` |
| Weather/calendar | `local` | `sessions_spawn(model="local", task="...")` |
| Medium complexity | `haiku` | `sessions_spawn(model="haiku", task="...")` |
| Complex analysis | `sonnet` | `sessions_spawn(model="sonnet", task="...")` |
| Security/critical | `opus` | `sessions_spawn(model="opus", task="...")` |

### Examples

**✅ Efficient routing:**
```python
# Code tasks = Codex (free, specialized)
sessions_spawn(
  model="codex",
  task="Write a Python script to parse JSON logs and extract errors"
)

# Batch code review into Codex
sessions_spawn(
  model="codex",
  task="Review this function for bugs and suggest optimizations: [code]"
)

# Main session (Sonnet) validates, then spawns LOCAL for weather
sessions_spawn(
  model="local",
  task="Get current weather for Dieppe, NB with details"
)

# Batch multiple simple tasks into one LOCAL sub-agent
sessions_spawn(
  model="local",
  task="Read these 5 files and summarize each one: file1.txt, file2.txt..."
)
```

**❌ Wasteful (don't do this):**
```python
# Using Sonnet for code generation when Codex is free
sessions_spawn(
  model="sonnet",
  task="Write a Python script..."  # Should be codex instead
)

# Using main session (Sonnet) for simple weather check
# This burns $$ tokens unnecessarily
exec("curl wttr.in/Dieppe")  # Should be LOCAL sub-agent instead
```

---

## Testing Protocol Quick Ref

When testing 2+ options:

```javascript
// ❌ Wrong: 3 separate Sonnet calls
sessions_spawn({ model: "sonnet", task: "Test A..." })
sessions_spawn({ model: "sonnet", task: "Test B..." })
sessions_spawn({ model: "sonnet", task: "Test C..." })
// Cost: $0.30

// ✅ Right: 1 LOCAL batch
sessions_spawn({
  model: "ollama/llama3.2:3b",
  task: "Compare A vs B vs C side-by-side. Report findings in table."
})
// Cost: $0
```

**See:** AGENTS.md ⚡ Pre-Spawn Decision Tree for testing patterns (batch 2+ tests into ONE LOCAL session)

---

## Model Task Routing

**⚠️ COST RULE: Always start at the lowest tier that can handle the task.**

Default behavior:
1. **CODEX FIRST** - Use openai-codex/gpt-5.3-codex for code tasks (free, specialized)
2. **LOCAL SECOND** - Use ollama/llama3.2:3b for simple non-code tasks (free)
3. **HAIKU** - When local/codex insufficient or needs more context
4. **SONNET** - For complex analysis, multi-step reasoning
5. **OPUS** - ONLY when truly necessary (complex reasoning, security, high-stakes decisions)

Zero-cost models (Codex + Local) should handle ~90% of work. Reserve paid tiers for genuinely complex tasks.

---

Task routing guide: when to use local llama3.2:3b vs escalate to paid models.

### 🎯 CODEX (openai-codex/gpt-5.3-codex) - Free, specialized for code

Best for code-related tasks:

| Task Type | Examples |
|-----------|----------|
| **Code generation** | Write functions, scripts, full programs |
| **Code review** | Debug, refactor, suggest improvements |
| **Code explanation** | Understand existing code, document |
| **Test writing** | Unit tests, integration tests |
| **Debugging** | Find bugs, optimize, performance analysis |
| **API integration** | Write code for third-party services |

### ✅ LOCAL (ollama/llama3.2:3b) - Free, ~3 seconds

Good for simple, non-code, single-step tasks:

| Task Type | Examples |
|-----------|----------|
| **File ops** | Read file, write content, simple edits |
| **Basic math** | Arithmetic, percentages, conversions |
| **Lookups** | "What's the weather command?", "How do I list reminders?" |
| **Formatting** | JSON ↔ text, markdown cleanup, template filling |
| **Simple shell** | `ls`, `cat`, file stats, git status |
| **Status checks** | "Is X running?", disk space, process list |
| **Extractions** | Pull a specific field from JSON/output |
| **Confirmations** | Yes/no decisions, simple parsing |

### ⚡ HAIKU ($0.25/$1.25) - When local struggles

Use when task needs:
- Multi-step reasoning (2-3 steps)
- Longer context window
- More reliable tool calling
- Basic code understanding

| Task Type | Examples |
|-----------|----------|
| **Light code** | Simple bug fixes, small refactors |
| **Summaries** | Short article/email summaries |
| **Filtering** | Parse logs, find patterns |
| **Comparisons** | Diff analysis, simple reviews |

### 🔷 SONNET ($3/$15) - Workhorse tier

Use when task requires:
- Complex multi-step planning
- Code generation/review
- Longer document processing
- Creative writing

| Task Type | Examples |
|-----------|----------|
| **Code gen** | New features, test writing, refactors |
| **Analysis** | Code review, architecture decisions |
| **Long-form** | Documentation, detailed explanations |
| **Task breakdown** | Planning, step-by-step guides |

### 💎 OPUS ($15/$75) - Complex reasoning only

Reserve for:
- Nuanced judgment calls
- Security audits (healthcheck skill explicitly recommends Opus)
- Complex creative work
- Multi-domain reasoning
- Important decisions

| Task Type | Examples |
|-----------|----------|
| **Security** | Threat analysis, audit reviews |
| **Strategy** | Architecture planning, trade-off analysis |
| **Creative** | Storytelling, nuanced writing |
| **Debugging** | Complex multi-system issues |

### Skills Reference (Quick Summary)

| Skill | Purpose | Suggested Tier |
|-------|---------|----------------|
| **coding-agent** | Spawn code tools | CODEX (free) or SONNET+ (complex) |
| **github** | PRs, issues, CI via `gh` | CODEX (code review), HAIKU-SONNET (complex) |
| **weather** | Get forecasts via wttr.in/Open-Meteo | LOCAL |
| **healthcheck** | Security audits, hardening | OPUS (explicitly recommended) |
| **himalaya** | Email management (IMAP/SMTP) | HAIKU+ (context-dependent) |
| **summarize** | URL/video/doc summarization | Depends on length |
| **slack/discord** | Messaging actions | LOCAL (simple), HAIKU+ (context) |
| **things-mac** | Task management | LOCAL |
| **apple-reminders** | Reminders via remindctl | LOCAL |
| **apple-notes** | Notes via memo CLI | LOCAL |
| **openhue** | Philips Hue control | LOCAL |
| **sonoscli** | Sonos speaker control | LOCAL |
| **camsnap** | Camera snapshots/clips | LOCAL |
| **1password** | Secrets management | LOCAL (but sensitive!) |

**⚠️ Skills Reference assumes these are installed. Verify availability with `clawhub list` before routing recommendations. Some entries are aspirational (openhue, sonoscli, camsnap) pending setup.**

### Routing Heuristics

1. **Start LOCAL** - If it fails or output is garbled, escalate
2. **Check complexity** - More than 3 steps? Skip to HAIKU minimum
3. **Code involved?** - Default to SONNET for anything non-trivial
4. **Security/judgment?** - OPUS, don't skimp
5. **Batch simple work** - Multiple LOCAL-tier tasks can be batched to one HAIKU call if needed
