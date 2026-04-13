# IMPLEMENTATION PLAN - LOCAL MAC MINI SETUP

**Your Scenario:** Mac mini (local), $25/month API budget, memory curator active, proactive workflows

---

## BUDGET ALLOCATION (Local Setup)

**Monthly breakdown with NO VPS costs:**

| Item | Cost | Notes |
|------|------|-------|
| Claude API (Haiku 80%, Opus 20%) | $15-18 | Primary spend |
| Specialized APIs (Gemini search optional) | $0-3 | Optional; Opus can do search |
| Local computing | $0 | Already have Mac mini |
| Electricity (~8h/day runtime) | $0-2 | Minimal, ~$8/month estimated |
| **TOTAL** | **$15-23/month** | ✅ Well under $25 |

**Advantage over VPS:** You keep the full $25 for intelligent work instead of splitting it. You're paying for thinking, not infrastructure.

---

## MAC MINI-SPECIFIC INTEGRATIONS

**Unique advantages of local running:**

### Deep macOS Access (No VPS can do this)
- ✅ iMessage/SMS (native integration via imsg CLI)
- ✅ Apple Notes (via memo CLI)
- ✅ Apple Reminders (via remindctl CLI)
- ✅ Things 3 (via things CLI)
- ✅ Calendar (native read access)
- ✅ Photos library (image analysis)
- ✅ Finder/file system (no permission headaches)
- ✅ AppleScript for native app control

### Messaging Integration (Recommended)
- **Primary:** iMessage (already on your Mac, zero setup)
- **Secondary:** Telegram (for when away from Mac)
- Set up routing: iMessage for immediate, Telegram for async

### Skills You Can Use Immediately
```
apple-notes          ← Create/manage notes locally
apple-reminders      ← Add/complete tasks
things-mac          ← Works with Things 3 app
imsg                ← Send/receive iMessages
peekaboo            ← macOS UI automation
openai-whisper      ← Local speech-to-text (no API)
```

---

## 30-DAY IMPLEMENTATION PLAN (MAC MINI FOCUS)

### **WEEK 1: Foundation + Memory (Zero cost)**

**Monday:**
```
☐ Enable Memory Flush in OpenClaw settings
☐ Enable Session Memory Search
☐ Verify MEMORY.md and memory/INDEX.md are current
☐ Time: 10 minutes
☐ Cost: $0
```

**Tuesday-Wednesday:**
```
☐ Write detailed brain dump (30 min):
   - Your goals with OpenClaw
   - Daily workflows you want automated
   - Personality/communication style
   - What "proactive" means to you
   - Paste entire thing into OpenClaw with:
     "Here's everything about me. Use this to understand how to help."
☐ Set explicit expectations:
   "I want you to be proactive. Work while I sleep. Surprise me with 
    improvements. Tell me when you need permission, but don't wait 
    for my permission to explore."
☐ Time: 45 minutes
☐ Cost: $0
```

**Thursday:**
```
☐ Start reverse prompting (3x daily for one week):
   - Morning: "What should you focus on today based on my goals?"
   - Afternoon: "What's blocking progress? What do you need from me?"
   - Evening: "What did you learn about my workflow today?"
☐ Expected: Opens more creative task discovery
☐ Time: 5 min/each
☐ Cost: ~$1-2 (API usage for conversations)
```

**Friday:**
```
☐ Review Week 1 memory quality
   - Did memory flush activate? (check logs)
   - Did session search work? (test by asking about prior conversations)
   - Adjust memory settings if needed
☐ Time: 15 minutes
☐ Cost: ~$1 (API usage)
```

**Week 1 Total: ~$2-3 API cost**

---

### **WEEK 2: Mac Integration + Cost Tracking (Low cost)**

**Monday:**
```
☐ Connect iMessage as primary channel:
   - Enable imsg skill in OpenClaw
   - Test: Send yourself test message via OpenClaw
   - Set up response routing (how should it respond to your messages?)
☐ Time: 20 minutes
☐ Cost: $0-1
```

**Tuesday:**
```
☐ Integrate Apple Reminders:
   - Enable remindctl CLI
   - Test: Ask OpenClaw to add a reminder
   - Example: "Remind me to review OpenClaw budget Friday at 5pm"
☐ Time: 10 minutes
☐ Cost: $0
```

**Wednesday:**
```
☐ Set up Apple Notes access:
   - Enable memo CLI
   - Test: "Create a note called 'OpenClaw Ideas' with these thoughts..."
   - Plan to use Notes as your memory capture tool
☐ Time: 10 minutes
☐ Cost: $0
```

**Thursday:**
```
☐ Build cost-tracking dashboard:
   - Ask OpenClaw: "Build me a simple tool to track API usage and budget"
   - Specify: "Store in /workspace, update weekly, alert at $20/month"
   - Expected: Gets a script + setup instructions
☐ Time: 30 minutes (mostly OpenClaw working)
☐ Cost: $2-3 (code generation via Codex/Opus)
```

**Friday:**
```
☐ Review Week 2 integrations
   - iMessage working? (test 2-3 conversations)
   - Reminders functional? (check a few created)
   - Cost tracking active? (run dashboard script)
   - Adjust as needed
☐ Time: 20 minutes
☐ Cost: $1
```

**Week 2 Total: ~$3-5 API cost**

---

### **WEEK 3: Workflow Automation (Higher API cost)**

**Monday:**
```
☐ Pick ONE workflow to automate (start simple):
   Examples:
   - Email management (read, categorize, summarize daily)
   - Research capture (web search, summarize findings)
   - Task generation (convert emails to Things 3 tasks)
   - Reminder follow-ups (check overdue reminders, suggest completions)

☐ Brief OpenClaw: "I want to automate [workflow]. Here's how I currently do it..."
☐ Have it suggest a plan
☐ Time: 30 minutes (planning only, no execution yet)
☐ Cost: $1-2
```

**Tuesday-Wednesday:**
```
☐ Implement the workflow:
   - Have OpenClaw build the necessary scripts/tools
   - Test with 2-3 examples (manual run, not scheduled yet)
   - Debug any issues
☐ Time: 1-2 hours
☐ Cost: $3-5 (code generation)
```

**Thursday:**
```
☐ Set up scheduled execution via cron or AppleScript:
   - For hourly: `cron` job via gateway
   - For app-based: Shortcuts app integration
   - Test once, watch for errors
☐ Time: 30 minutes
☐ Cost: $1-2 (setup assistance)
```

**Friday:**
```
☐ Monitor for 24 hours:
   - Is the workflow running automatically?
   - Are results useful or noisy?
   - Adjust parameters if needed
☐ Time: 15 minutes (checking only)
☐ Cost: $0
```

**Week 3 Total: ~$6-10 API cost**

---

### **WEEK 4: Expansion + Optimization (Fine-tuning)**

**Monday:**
```
☐ Review Week 3 workflow:
   - Is it actually saving you time?
   - Any false positives/negatives?
   - Ready to automate a second workflow?
☐ Time: 20 minutes
☐ Cost: $1
```

**Tuesday-Wednesday:**
```
☐ Build second workflow (same process as Week 3):
   - Example: If first was email, pick reminders or research
   - Plan → Build → Test → Schedule
☐ Time: 2 hours
☐ Cost: $4-6
```

**Thursday:**
```
☐ Optimize model routing:
   - Review API usage from dashboard
   - Check: Which tasks used Opus vs Haiku?
   - Adjust config to use Haiku for more tasks
   - Target: 80% Haiku, 20% Opus
☐ Time: 20 minutes (review + adjust config)
☐ Cost: $0
```

**Friday:**
```
☐ Month 1 review:
   - Total API spend: target $18-24
   - Workflows automated: 2+
   - Time saved: estimate hours/week
   - Memory quality: good? improving?
   - Update memory/INDEX.md and MEMORY.md
☐ Time: 30 minutes
☐ Cost: $1-2
```

**Week 4 Total: ~$6-9 API cost**

---

## MONTHLY TOTAL: $17-27 (Target: Stay under $25)

**If you exceed $25:**
- Pause new automations mid-month
- Switch more tasks to Haiku
- Reduce OpenAI Whisper usage (if using)
- Wait for next month's budget reset

---

## MODEL ROUTING CONFIG FOR MAC MINI

**Set in your OpenClaw config (or ask to auto-configure):**

```yaml
models:
  default: haiku  # Haiku is your workhorse
  reasoning: sonnet  # Complex planning/analysis
  code: codex  # Code generation (free if available)
  fallback: sonnet  # When Haiku struggles

model_routing:
  file_operations: haiku
  email_processing: haiku
  web_search: gemini  # Or Opus if not paying for Gemini
  code_review: sonnet  # Or Codex
  task_generation: haiku
  conversation: sonnet  # Main brain (but still cheaper than all Opus)
  automation_logic: haiku
```

**Cost impact:**
- All Opus: ~$40-50/month
- This mix: ~$15-18/month ✅

---

## MAC MINI-SPECIFIC TIPS

**Keep It Running Smoothly:**

1. **Energy Settings:**
   - Disable sleep for Mac mini (or set to 8 hours)
   - Let display sleep (saves power)
   - Keep OpenClaw process in Activity Monitor (verify daily)

2. **Monitoring:**
   - Check logs weekly: `/Users/hopenclaw/.openclaw/workspace/logs/`
   - Watch for crashes/restarts
   - If process dies: Add to startup items or LaunchAgent

3. **Backups:**
   - MEMORY.md and memory/ folder are critical
   - Git commit daily (or setup auto-backup cron job)
   - Keep a backup copy on external drive monthly

4. **Network:**
   - Mac mini should stay on same WiFi network
   - If on different SSID, may need credential update
   - Keep internet connection stable (open `openclaw status` to verify)

5. **Security:**
   - Firewall ON (System Preferences → Security)
   - Only allow incoming from trusted networks
   - Don't expose OpenClaw port to internet (keep it local-only)
   - Review 18 vulnerabilities before enabling external access

---

## MESSAGING STRATEGY

**Local Mac mini lets you use iMessage as primary:**

**Setup:**
```
iMessage (immediate)  ← Default when at Mac
     ↓
Telegram (optional)   ← Fallback when away
     ↓
Email                ← For formal/documented tasks
```

**Workflow:**
- Send OpenClaw quick tasks via iMessage while at desk
- Get async results via Telegram when away
- Review detailed work via Notes/Reminders
- No need for VPS-based web interface

**Example:**
```
You: "Summarize my morning emails and add any follow-ups to Reminders"
OpenClaw (iMessage): "Done! 3 emails, 2 follow-ups created"
You (later): Check Reminders app to see the tasks
```

---

## SKILLS PRIORITY FOR MAC MINI

**Week 1-2 (Get working immediately):**
- ✅ apple-reminders — add/complete tasks
- ✅ apple-notes — capture ideas
- ✅ imsg — receive/send messages
- ✅ things-mac — integrate with Things 3 (if you use it)

**Week 3+ (As you automate workflows):**
- coding-agent — if automating code-related tasks
- github — if tracking code projects
- weather — if you want daily forecasts
- himalaya — if you want email automation

**Skip for now (VPS-specific):**
- clawhub, gog (Google workspace), healthcheck, slack
- Can revisit when you grow

---

## QUICK REFERENCE: YOUR SETUP

| Aspect | Your Choice |
|--------|------------|
| **Hardware** | Mac mini (local) |
| **Primary messaging** | iMessage |
| **Secondary messaging** | Telegram (optional) |
| **Monthly budget** | $25 API only (no hosting) |
| **Model strategy** | Haiku default, Sonnet for reasoning, Codex for code |
| **Memory system** | Memory Flush + Your Curator approach |
| **Workflows automated** | Start with 1, add 1/week if budget allows |
| **Security** | Local-only, firewall ON, regular backups |
| **Runtime** | 8h/day (adjust based on your schedule) |

---

## SUCCESS METRICS (30 days)

**You've won if:**
- [ ] Memory features working (Flush + Search active)
- [ ] iMessage integration stable (receive/send reliably)
- [ ] Reverse prompting yielding useful task ideas
- [ ] 1-2 workflows automated (email or reminders)
- [ ] API spending under $25/month
- [ ] MEMORY.md and INDEX.md up-to-date
- [ ] Time savings noticeable (3-5 hours/week minimum)

**Red flags to fix:**
- [ ] API costs exceeding $25 → switch more to Haiku
- [ ] Memory quality degrading → check Flush settings
- [ ] Workflows failing silently → add logging
- [ ] Mac mini crashing → check logs, restart OpenClaw
- [ ] iMessage spam → adjust routing logic

---

## COST COMPARISON: YOUR ACTUAL SETUP

**Scenario A: Unoptimized (Opus for everything)**
- API costs: $40-50/month
- Over budget: $15-25/month
- **Not viable**

**Scenario B: Your Optimized Setup**
- Mac mini (one-time cost) ✅
- iMessage (built-in) ✅
- Haiku + Sonnet routing: $15-18/month ✅
- Cost tracking active: $0/month ✅
- **Total: $15-18/month → Under budget!** ✅

**Bonus:** You're actually set up to keep growing. Month 2-3, you could add specialized APIs (Gemini for search) or more workflows within the same budget.

---

## WHAT TO DO RIGHT NOW

1. **Today:** Reply with "Ready" when you're set to begin
2. **This week:** Start Week 1 (memory features + brain dump)
3. **By end of Month 1:** One workflow automated, under budget

Let me know which workflow you want to tackle first in Week 3 (email, research, reminders, or something else), and I'll tailor the automation plan.
