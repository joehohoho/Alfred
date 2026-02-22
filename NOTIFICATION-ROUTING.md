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

## Notification Quality Standards (MANDATORY)

**Joe regularly receives questions that are vague, missing context, or don't propose solutions. This is unacceptable.** Every notification must be self-contained — Joe should be able to read it and respond in under 30 seconds without looking anything up.

### Mandatory Checklist (ALL items required for `question` type)

Before sending any `question` notification, verify it includes ALL of these:

- [ ] **Context** — What is this about? What were you doing when this came up? Reference the specific project, file, or system.
- [ ] **The specific question** — Not vague ("what should I do?") but precise ("should I use approach A or B?")
- [ ] **Options/solutions** — Always propose at least 2 options. Never send a question without proposed answers.
- [ ] **Your recommendation** — Pick one option and explain why. Joe hired you to think, not just ask.
- [ ] **Impact of each option** — What are the trade-offs? Cost, time, risk, complexity.
- [ ] **What happens if no response** — Will you wait? Use a default? Skip the task? State it explicitly.

### Examples

**BAD — Vague, no context, no solutions:**
> "Should I update the app?"

**BAD — Has context but no solutions or recommendation:**
> "CoinUsUp has pending dependency updates. Some are major versions. What should I do?"

**BAD — Too broad, asks Joe to do the thinking:**
> "I'm working on the job tracker and ran into some issues with the scraper. How should I handle this?"

**GOOD — Full context, options, recommendation, trade-offs:**
> "CoinUsUp has 3 pending dependency updates (react 18.3→18.4, supabase 2.40→2.43, tailwind 3.4→4.0). React and Supabase are minor/patch (safe). Tailwind 4.0 is a major version with breaking changes that would require updating all className utilities.
>
> Options:
> 1. Update all three now (~3hr work for Tailwind migration)
> 2. Update React + Supabase now, defer Tailwind (15min, safe)
> 3. Defer all updates until next sprint
>
> Recommendation: Option 2 — gets security patches now, avoids risky Tailwind migration.
> If no response by tomorrow, I'll proceed with Option 2."

**GOOD — Specific question with clear options:**
> "The job tracker scraper is hitting a 403 on LinkedIn job listings (started today, was working yesterday). LinkedIn likely updated their bot detection.
>
> Options:
> 1. Switch to LinkedIn's official API ($0, but requires OAuth app approval, ~1 week wait)
> 2. Add rotating user-agent headers (30min fix, may break again)
> 3. Drop LinkedIn, add ZipRecruiter instead (no auth needed, 30min, good coverage)
>
> Recommendation: Option 3 — most reliable long-term, ZipRecruiter has strong listings for your field.
> If no response in 24hr, I'll implement Option 3."

### Self-Check Before Sending

Ask yourself these questions before calling `send-notification.sh`:
1. **"Could Joe answer this in 30 seconds?"** — If not, add more context.
2. **"Did I propose solutions?"** — If not, think harder. There's always at least 2 options.
3. **"Did I pick a recommendation?"** — If not, make a decision. Joe can override.
4. **"Would I be annoyed receiving this question?"** — If yes, rewrite it.

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
