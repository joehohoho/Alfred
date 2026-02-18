# COMMUNICATIONS.md - Unified Notification Architecture

**Last Updated:** 2026-02-18  
**Status:** Active tracking across all channels

This file maps ALL communication channels, dashboards, and how to query them for full context before sending notifications.

---

## 1. Command Center Dashboard

**Location:** `/Users/hopenclaw/command-center`  
**URL:** http://localhost:3000  
**Backend API:** http://localhost:3001

### Sections & What They Track

#### A. Chat System (`/chat`)
- **Purpose:** Direct messaging with Alfred
- **API:** `GET /api/messages`, `POST /api/messages`
- **Context needed:** Full conversation history
- **When to check:** Before responding to chat messages

#### B. Notifications & Questions (`/notifications`)
- **Purpose:** Q&A system for urgent decisions
- **Types:** `question`, `goal-analyzed`, `goal-created`, `alert`, `update`
- **API:** `GET /api/notifications`, `POST /api/notifications/:id/answer`
- **Critical:** This is where I send things that need your immediate input
- **Context needed:** The full question/alert context, not just "please review X"

#### C. Goals & Tasks (`/goals`)
- **Purpose:** Goal tracking with auto-generated task breakdown
- **Storage:** `~/.openclaw/workspace/goals/` (goals.json, tasks.json, analyses.json)
- **API:** `GET /api/goals`, `POST /api/goals/:goalId/analysis`
- **Automation:** Daily goal analyzer via cron (`node scripts/goal-analyzer.js`)
- **Key fields:** goalId, title, description, priority, dueDate, tasks[], status

#### D. Dashboard (`/dashboard`)
- **Purpose:** Real-time monitoring of agents, costs, metrics
- **Metrics tracked:**
  - Cost breakdown (daily/monthly/projection)
  - Token usage by model
  - Session list with context %
  - Cron job status
  - Sub-agent runs
  - Gateway health
  - System alerts

#### E. Infrastructure (`/infrastructure`)
- **Purpose:** Cron jobs, gateway status, model availability
- **API:** `GET /api/cron` (list jobs), `POST /api/cron` (create job)
- **What to monitor:** Job schedules, last run times, failures

#### F. Reports (`/reports`)
- **Purpose:** Cost analysis, token usage trends, optimization suggestions
- **Metrics:** Daily/weekly/monthly breakdowns, model comparisons

---

## 2. iMessage

**Integration:** Via `imsg` CLI skill  
**How I access:** `imsg list`, `imsg read <contact>`  
**Context needed:** Actual message thread when referencing iMessage notifications

---

## 3. Slack

**Integration:** Via `slack` tool  
**Channels:** Configured in OpenClaw gateway  
**How I access:** Routing through `message` tool with `channel=slack`  
**Context needed:** Which channel, who mentioned, what conversation

---

## 4. OpenClaw Direct Messages

**Integration:** Via webchat/Telegram/Signal/etc.  
**How I access:** Routing through current session  
**Context needed:** Full message context, not just a notification

---

## 🚨 Critical Rule: Before Sending ANY Notification

**Checklist:**

1. **Identify the source** — Where did this originate? (Command Center, iMessage, Slack, etc.)
2. **Gather full context** — Read the ENTIRE item (full goal, full question, full message, etc.)
3. **Include all details in notification** — Title, description, why it needs action, what decision/input is needed
4. **Provide a way to respond** — Link to dashboard, specific instructions, or expected next step
5. **Never send just the reference** — "Review goal_12345" is incomplete. Include the goal title, status, and what needs to be reviewed.

---

## 📋 Notification Templates (What Full Context Looks Like)

### Example 1: Goal Review Needed
❌ **BAD:**
```
Please review your iMessage goal for updates
```

✅ **GOOD:**
```
Goal: "Implement push notifications feature"
Status: In Progress (5 of 7 tasks done)
Priority: High
Due: Feb 22, 2026

Task blocking progress:
- "Fix authentication edge case" — Blocked, waiting on security review

Action needed: Review blocked task, unblock if possible, or adjust timeline.
Link: http://localhost:3000/goals
```

### Example 2: Question Requires Answer
❌ **BAD:**
```
I need feedback on the architecture approach
```

✅ **GOOD:**
```
Architecture Decision: Should we use Redis or RabbitMQ for task queuing?

Considerations:
- Redis: Faster, simpler ops, less durable
- RabbitMQ: More reliable, better for long-running tasks, heavier

Project context: Building high-throughput task system with <1hr durability window

Your input needed: Which approach fits your use case better?
Link: http://localhost:3000/notifications
```

### Example 3: Cost Alert
❌ **BAD:**
```
Cost spike detected
```

✅ **GOOD:**
```
Cost Alert: Daily spend 2x normal

Today's cost: $2.40 (vs average $1.10)
Cause: Sub-agent spawned Sonnet model for analysis (3x cost)

Recommendation: Batch small analysis tasks into LOCAL model, save ~$0.80/day

Details: http://localhost:3000/reports
```

---

## 🔄 Query Workflow (Before Sending Notification)

### For Command Center Notifications

```javascript
1. Identify item → `GET /api/goals/:goalId` (or notifications, etc.)
2. Fetch full data → Include title, description, priority, status, tasks
3. Format notification → Include all context + action needed
4. Send via API → POST to command center notifications endpoint
```

### For iMessage/Slack Notifications

```javascript
1. Read the full conversation → `imsg read <contact>` or slack API
2. Extract relevant info → Summarize the key points
3. Format notification → Include the actual message/info, not just a reference
4. Send to user → Via message tool
```

---

## 🎯 What Information I Should Have Before Sending Notification

| Channel | Information I Must Have |
|---------|------------------------|
| **Goals** | Goal ID, title, description, priority, due date, task status, what needs review |
| **Notifications** | Full question/alert text, context, why asking, what answer format expected |
| **Cron Jobs** | Job name, schedule, last run time, status, error if failed |
| **Cost Alerts** | Daily cost, average, variance, cause, recommendation |
| **iMessage** | Full message thread, contact, actual text, context |
| **Slack** | Channel, thread, actual message, context, who's involved |

---

## 🔗 API Endpoints Reference

### Goals System
```
GET /api/goals                    # List all goals
GET /api/goals/:goalId            # Get goal + tasks + analysis
POST /api/goals                   # Create goal
PATCH /api/goals/:goalId          # Update goal
POST /api/goals/:goalId/analysis  # Store analysis
```

### Notifications
```
GET /api/notifications            # List all notifications
POST /api/notifications           # Send notification
POST /api/notifications/:id/answer # Answer notification
```

### Other Dashboards
```
GET /api/agents                   # List agents
GET /api/metrics                  # Global metrics
GET /api/events                   # All events
GET /api/cron                     # Cron jobs
```

---

## ⚠️ Common Mistakes (NEVER DO THIS)

❌ Send notification without checking source first  
❌ Reference item by ID only (e.g., "goal_12345")  
❌ Send vague "please review" messages  
❌ Forget to include the actual content/context  
❌ Fail to explain WHY the user should care  
❌ Miss that the item is in a dashboard they should check  

---

## ✅ Memory Maintenance

**This file is my source of truth for:**
- Where all your communication channels are
- How to query them for full context
- What information is required before sending notifications
- Notification format standards

**Update this when:**
- A new communication channel is added
- API endpoints change
- Notification requirements change
- A new dashboard or tracking system is implemented

---

## 🧠 Memory Trigger

**When user mentions:** "Check my goals", "Review notifications", "Any messages?", "Status update"  
**What I do:** Query relevant endpoint, pull full context, present complete information (not references)

**When I send a notification:** ALWAYS include full context from the source, not just a reference.
