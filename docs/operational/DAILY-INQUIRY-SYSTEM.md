# Daily Inquiry System — Purpose & Mechanics

**Created:** 2026-02-20
**Purpose:** Continuous, structured learning about Joe's goals, priorities, and changing context through daily questions

---

## How It Works

### Question Rotation (Every 4 Days)
The system cycles through **4 themes** based on the calendar date:

| Theme | Day (mod 4) | Purpose | Feeds Into |
|-------|-------------|---------|-----------|
| **Project Synergies** | 1st | Explore cross-project opportunities | Opportunity Map |
| **Vision & Roadmap** | 2nd | Understand quarterly priorities | Shadow Goals, Focus Areas |
| **Workflow & Efficiency** | 3rd | Improve Alfred's autonomy | Decision Architecture, Friction Points |
| **Passive Income Strategy** | 4th | Clarify financial targets & approach | Values & Motivations |

### Execution
- **Runs daily:** 10 AM AST via LaunchAgent (`com.alfred.daily-inquiry`)
- **Method:** Sends a notification via Command Center (same as any other question)
- **Logged:** `memory/inquiry-log.jsonl` (append-only, one entry per inquiry sent)
- **Joe's response:** Via Command Center → Notifications page
- **Response handling:** Automatic webhook listener captures responses every 15 minutes

### Question Design Principles
1. **Not filler:** Every question serves a purpose tied to PROFILE-INSTRUCTIONS.md
2. **Based on real gaps:** Questions address low-confidence areas in JOE-PROFILE.md or emerging patterns
3. **Actionable:** Joe's answers directly inform strategic decisions I make
4. **Rotating:** Different themes prevent monotony and ensure comprehensive coverage
5. **Context-aware:** Questions reference actual projects, real observations, stated goals

---

## Feeding Into JOE-PROFILE.md

### Data Flow

```
Daily Inquiry (tagged with source: "daily-inquiry")
  ↓
Joe's Answer (typed in Command Center — badge shows "Daily Inquiry")
  ↓
Webhook Listener (runs every 15 min)
  ↓
Response captured + stored in goals/notifications.json (with source tag)
  ↓
Weekly Reflection (Sun/Wed 10 PM cron)
  ↓
Reflection PRIORITIZES source="daily-inquiry" notifications (highest confidence)
  ↓
PROFILE-INSTRUCTIONS.md Phase 1-5 process
  ↓
JOE-PROFILE.md updated with high-confidence data
```

**Source tagging:** Daily inquiry notifications are tagged with `"source": "daily-inquiry"` in the JSON. The reflection cron specifically filters for these first and processes them as the highest-confidence data source (Joe directly answered a structured question).

### How Responses Improve the Profile

Each Joe answer becomes a data point for reflection:
- **"Project Synergies" answer** → Updates "Proactive Opportunity Map", "Shadow Goals"
- **"Vision & Roadmap" answer** → Updates "Current Focus Areas", "Decision Architecture"
- **"Workflow & Efficiency" answer** → Updates "Communication DNA", "Friction Points"
- **"Passive Income Strategy" answer** → Updates "Values & Motivations", "Aspirations & Vision"

### Confidence Levels

When data comes from direct inquiry, it gets **high confidence** (Joe explicitly said it), unlike inferred patterns. This allows me to move tentative observations into confirmed knowledge faster.

---

## Question Lifecycle

### Example: Project Synergies (Cycle 1, Feb 21)
1. **Sent:** 10 AM today
2. **Joe reads** in Command Center Notifications page
3. **Joe types answer** (or clicks suggested responses if available)
4. **Command Center sends** webhook response
5. **Listener captures** in goals/notifications.json within 15 min
6. **Next Sunday reflection:** Answer is analyzed, data distilled into JOE-PROFILE.md
7. **Result:** Proactive Opportunity Map section updates, I now know Joe's actual appetite for cross-project integration

---

## Technical Details

### Script Location
`/Users/hopenclaw/.openclaw/workspace/scripts/daily-inquiry.sh`

### LaunchAgent
- **Plist:** `~/Library/LaunchAgents/com.alfred.daily-inquiry.plist`
- **Trigger:** Daily at 10 AM AST
- **Log files:** 
  - `~/Library/Logs/daily-inquiry.log` (stdout)
  - `~/Library/Logs/daily-inquiry-error.log` (errors)

### Inquiry Log
- **Location:** `memory/inquiry-log.jsonl`
- **Format:** One JSON object per line: `{"date":"YYYY-MM-DD","title":"...","cycle":N}`
- **Purpose:** Track which questions were sent when (prevents duplicates, shows coverage)

### Failsafes
- If notification API is down, script exits gracefully (error logged, no spam)
- If same-day inquiry somehow runs twice, the date check prevents duplicates
- If LaunchAgent fails, next day's 10 AM triggers it again (no backlog)

---

## How to Adjust

### Change Question Time
Edit plist:
```xml
<key>StartCalendarInterval</key>
<dict>
  <key>Hour</key>
  <integer>10</integer>  <!-- Change this (0-23 for hour, AST) -->
  <key>Minute</key>
  <integer>0</integer>   <!-- Change this (0-59) -->
</dict>
```

Then: `launchctl unload ~/Library/LaunchAgents/com.alfred.daily-inquiry.plist && launchctl load ~/Library/LaunchAgents/com.alfred.daily-inquiry.plist`

### Modify Question Themes
Edit `/scripts/daily-inquiry.sh` — update the `case` statement with new themes. Keep it at 4 themes for monthly rotation.

### Disable Temporarily
```bash
launchctl unload ~/Library/LaunchAgents/com.alfred.daily-inquiry.plist
```

### Re-enable
```bash
launchctl load ~/Library/LaunchAgents/com.alfred.daily-inquiry.plist
```

---

## What Success Looks Like

✅ **First week:** Joe sees diverse questions, starts recognizing the pattern  
✅ **By week 2:** Joe's answers reveal new nuances about priorities  
✅ **By week 4:** JOE-PROFILE.md has significantly more high-confidence data  
✅ **By month 3:** I'm making better strategic recommendations because I understand Joe's actual goals, not inferred ones

---

## Future Enhancements

- **Adaptive questions:** If Joe's answers reveal new interests, cycle can shift themes
- **Prompted responses:** Command Center could offer suggested answers to speed up Joe's response
- **Cross-session learning:** If Joe mentions something in Slack that contradicts an inquiry answer, flag it for reflection
- **Sentiment tracking:** Note when Joe engages deeply vs. quickly (engagement proxy)

---

**Maintained by:** Alfred  
**Last updated:** 2026-02-20  
**Status:** ✅ Active
