# NOTIFICATION-ROUTING.md — How to Route Questions to Joe

## Rule

**Whenever you have a question for Joe — about ANY task, cron job, Slack update, goal, or decision — send it to the Command Center notifications system.** Do not leave questions only in Slack messages or logs. The Command Center is Joe's primary inbox for questions that need answers.

## How to Send a Notification

Use the `send-notification.sh` script:

```bash
bash ~/.openclaw/workspace/scripts/send-notification.sh <type> <title> <message> [goalId] [taskId]
```

### Parameters

| Param   | Required | Values                           | Description                                      |
|---------|----------|----------------------------------|--------------------------------------------------|
| type    | Yes      | `question`, `alert`, `update`    | `question` = needs Joe's answer. `alert` = FYI urgent. `update` = FYI informational. |
| title   | Yes      | Short string                     | Brief subject line (e.g., "CoinUsUp Deploy?")    |
| message | Yes      | Detailed string                  | Full context Joe needs to answer. Include options if applicable. |
| goalId  | No       | Goal ID from goals.json          | Link to a specific goal if relevant               |
| taskId  | No       | Task ID                          | Link to a specific task if relevant                |

### Example

```bash
bash ~/.openclaw/workspace/scripts/send-notification.sh \
  "question" \
  "Job Tracker: Add LinkedIn Scraper?" \
  "During code review I noticed the job tracker only scrapes Indeed and Glassdoor. LinkedIn has better listings for Joe's field.\n\nOptions:\n1. Add LinkedIn scraper (requires cookies/auth, ~2hr work)\n2. Add ZipRecruiter instead (no auth needed, ~30min)\n3. Skip for now\n\nRecommendation: Option 2 (ZipRecruiter) — low effort, good coverage."
```

## When to Send Notifications

### ALWAYS send a notification when:
- You need Joe's approval or decision before proceeding
- A cron job produces results that need Joe's input
- You encounter something in Slack that requires Joe's response
- A task is blocked waiting for a human decision
- You discover a security issue or anomaly
- Token spend exceeds $5 in a single session
- An external action is needed (deploy, payment, account change)

### ALSO send notifications for Slack-originated questions:
- When Joe or someone messages a Slack channel with a question for you
- When a Slack update contains information that changes a task and Joe needs to weigh in
- When a code review finding needs Joe's decision

### DO NOT send notifications for:
- Routine status updates (use Slack for those)
- Things you can figure out yourself (check SOUL.md — be resourceful first)
- Confirming you completed a task (use Slack announcements)

## What Makes a Good Notification

**Include everything Joe needs to respond without looking anything up:**
- What the question is about (context)
- What the options are (if applicable)
- Your recommendation (if you have one)
- What happens if no response (timeout behavior)
- Any relevant data (costs, file paths, error messages)

**Bad:** "Should I update the app?"
**Good:** "CoinUsUp has 3 pending dependency updates (react 18.3→18.4, supabase 2.40→2.43, tailwind 3.4→4.0). React and Supabase are minor/patch (safe). Tailwind 4.0 is a major version with breaking changes. Recommend: update React + Supabase now, defer Tailwind. Approve?"

## How Joe Responds

1. Joe sees the notification in Command Center → Notifications page
2. Joe types an answer and clicks "Submit Answer"
3. The answer is automatically sent back to you via the gateway WebSocket
4. The webhook listener cron (every 15 min) also picks up answered notifications as backup

## Kanban Blocker Flow (Task-Specific Questions)

For questions tied to a specific Kanban card/task, use the **Kanban blocker API** instead of (or in addition to) the notification script. This moves the card to the Blocked column and Joe can answer directly from the card detail modal.

```bash
# Add a blocker to a Kanban card (moves card to Blocked column)
curl -X POST http://localhost:3001/api/kanban/<cardId>/blocker \
  -H "Content-Type: application/json" \
  -d '{"message": "Your question for Joe with full context"}'
```

**When Joe answers:**
- Joe opens the blocked card in Kanban → types answer → clicks "Answer & Unblock"
- Card moves back to In Progress
- `[KANBAN-UNBLOCK]` message sent to Alfred via gateway with Joe's answer

**When to use which:**
- **Notification script** → General questions not tied to a specific task
- **Kanban blocker** → Questions about a task that's already on the board (keeps question + answer linked to the card)
- **Both** → Critical questions where you want redundancy (blocker for task context + notification for visibility)

---

## API Details (for reference)

### Notifications API
- **Endpoint:** `POST http://localhost:3001/api/notifications`
- **Body:** `{ "type": "question", "title": "...", "message": "..." }`
- **Response:** `201` with notification object including `id`

### Kanban Blocker API
- **Add blocker:** `POST http://localhost:3001/api/kanban/:cardId/blocker` with `{ "message": "..." }`
- **Unblock (Joe):** `POST http://localhost:3001/api/kanban/:cardId/unblock` with `{ "answer": "..." }`
