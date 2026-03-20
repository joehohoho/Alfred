# Dashboard Changelog

## 2026-02-09 - Enhanced Visibility

### Changes Made

1. **Free Model (Local) Visibility**
   - Local model (ollama/llama3.2:3b) now visible in Model Usage section
   - Shows token count and session count across Total/This Week/Today views
   - Clearly marked as "FREE" cost

2. **Regular Runs Section**
   - New section displaying all active cron jobs
   - Shows for each job:
     - Name and status (Active/Disabled)
     - Model used (local/sonnet/haiku/opus)
     - Estimated tokens per run
     - Estimated monthly cost
     - Schedule (cron expression or interval)
   - Auto-refreshes every 2 minutes
   - Filters out disabled jobs for clean view

### Current Cron Jobs

| Job | Model | Tokens/Run | Cost/Month | Frequency |
|-----|-------|------------|------------|-----------|
| dashboard-sync (2x) | local | 2k | FREE | hourly |
| Evening Routine | sonnet | 8k | $4.32 | daily |
| Daily Config Review | sonnet | 6k | $3.24 | daily |
| Moltbook Weekly Review | sonnet | 15k | $1.16 | weekly |
| Security Audit | sonnet | 5k | $0.39 | weekly |

**Total Monthly Cost (Cron):** ~$9.11

### Technical Implementation

**Frontend (index.html):**
- Added `.cron-item`, `.cron-header`, `.cron-details` CSS classes
- JavaScript `renderCronJobs()` function to display jobs
- Fetches from `/api/cron/jobs` endpoint every 2 minutes
- Model badges color-coded (local/sonnet/haiku/opus)

**Backend (server.js):**
- New GET `/api/cron/jobs` endpoint
- Calls `openclaw cron list --json` via child_process
- Returns job list with schedule, model, and status

**Token Impact:**
- Implementation: ~500 tokens (this update)
- Ongoing: 0 tokens (read-only, no AI calls)
- Dashboard loads: No increase (static HTML/JS)
- **Net impact: Negligible**

### Benefits

- **Cost visibility:** Track how much each automated task costs
- **Free model tracking:** See how effectively local model is being used
- **Budget planning:** Monthly estimates help stay within $60 budget
- **Optimization:** Identify high-cost jobs for potential model downgrade

### Future Enhancements

- Historical charts for model usage trends
- Cost projections based on current burn rate
- Alert when cron jobs exceed token budget
- Click-to-disable jobs directly from dashboard
