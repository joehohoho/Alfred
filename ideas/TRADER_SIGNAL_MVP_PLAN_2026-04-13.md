# Trader Signal Post-Mortem — MVP Development Plan

**Target Completion:** 4 weeks (starting 2026-04-13)  
**Development Model:** Solo (Joe) or Joe + agency developer  
**Scope:** Core signal ingestion → outcome tracking → weekly reports  

---

## Week-by-Week Breakdown

### WEEK 1: Foundation & Auth (Apr 13-19)

#### Goal
Get basic infrastructure running:
- User auth flow
- Database schema
- Setup management API
- Basic frontend scaffold

#### Deliverables

**Backend (3 days)**
```
Day 1: Project setup
  ✓ Initialize Node.js + Express repo
  ✓ Setup .env, Docker Compose (local Postgres)
  ✓ Git repo + basic CI/CD scaffold
  
Day 2: Auth implementation
  ✓ JWT token generation/validation
  ✓ POST /auth/register + /auth/login
  ✓ Password hashing (bcrypt)
  ✓ Auth middleware
  
Day 3: Database & Setup API
  ✓ PostgreSQL migrations (users, setups tables)
  ✓ GET /api/setups, POST /api/setups, PUT/DELETE
  ✓ Basic validation + error handling
```

**Frontend (2 days)**
```
Day 2-3: React scaffold + auth flow
  ✓ Create-react-app setup (or Vite)
  ✓ Login + registration pages
  ✓ Layouts (authenticated vs. public)
  ✓ JWT token persistence (localStorage)
  ✓ Navigation skeleton
```

**Database Migrations**
```sql
-- Run migrations via Knex or TypeORM
migrations/001_initial_schema.sql:
  - users table
  - setups table
  - created_at indexes
```

#### Success Criteria
- [x] User can register + login
- [x] JWT tokens work
- [x] User can create/edit setups
- [x] Database is clean, indexed
- [x] Frontend login page works

#### Deployment Target
- Backend: Render/Railway (staging)
- Database: Supabase (free tier)
- Frontend: Vercel (staging)

---

### WEEK 2: Signal Ingestion (Apr 20-26)

#### Goal
Get signals flowing in from TradingView webhooks + manual entry.

#### Deliverables

**Backend (3.5 days)**
```
Day 1: Signal data model + ingestion API
  ✓ PostgreSQL signals + signal_outcomes tables
  ✓ Migrations for new tables
  ✓ Indexes for fast queries (user_id, status, entry_time)
  
Day 2: TradingView webhook receiver
  ✓ POST /api/signals/webhook endpoint
  ✓ Webhook validation (HMAC signature)
  ✓ Alert text parsing (regex for symbol, setup, entry_price, timeframe)
  ✓ Auto-match setup by fuzzy name match
  ✓ Create signal record, set status='pending'
  
Day 3: Manual signal entry API
  ✓ POST /api/signals (manual form submission)
  ✓ Form validation (symbol, entry_price, setup_id)
  ✓ Create signal from UI entry
  ✓ GET /api/signals (list pending signals with filtering)
  
Day 4: CSV import (basic)
  ✓ POST /api/signals/import (CSV upload)
  ✓ Parse CSV (symbol, entry_price, setup, entry_time)
  ✓ Bulk insert signals
  ✓ Return import summary (count, errors)
```

**Frontend (2 days)**
```
Day 1: Signal form + list page
  ✓ Manual signal entry form (symbol, setup, entry price, notes)
  ✓ List pending signals (GET /api/signals with status filter)
  ✓ Signal card component (symbol, entry price, setup, time)
  ✓ Quick actions (review, mark complete)
  
Day 2: CSV import UI
  ✓ File upload component
  ✓ CSV preview table
  ✓ Import confirmation + progress
  ✓ Results summary
```

**Integration**
```
TradingView → Webhook URL
  Example: https://api.signalpost.com/api/signals/webhook
  
Setup in TradingView:
  1. Alert → Create webhook alert
  2. URL: your endpoint
  3. Message format (standardized):
     Symbol: {{ticker}}
     Setup: Bull Flag
     Entry Price: {{open}}
     Timeframe: 4H
     Time: {{timenow}}
```

#### Success Criteria
- [x] TradingView webhook receives alerts (can test with curl)
- [x] Signals are parsed correctly and stored
- [x] User can manually add signals
- [x] CSV import works (at least basic format)
- [x] Signals list page shows pending signals with proper filtering

#### Testing
```bash
# Test webhook
curl -X POST http://localhost:3000/api/signals/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "setup": "Bull Flag Breakout",
    "entry_price": 185.50,
    "conditions": "RSI > 60, Volume +20%",
    "timeframe": "4H"
  }'

# Should return: { signal_id: "...", status: "pending" }
```

---

### WEEK 3: Outcomes & Review Workflow (Apr 27-May 3)

#### Goal
Close the loop: traders log exits, review signals, calculate performance.

#### Deliverables

**Backend (3 days)**
```
Day 1: Outcome data model + API
  ✓ signal_outcomes table (already in schema)
  ✓ POST /api/signals/:id/outcome (log exit)
  ✓ Exit price, exit time, exit reason, quality score
  ✓ Auto-calculate: P&L, R-multiple, duration
  
Day 2: Performance calculation
  ✓ After each outcome, recalculate setup stats
  ✓ Update setup_performance cache table
  ✓ Calculate: win_rate, avg_win, avg_loss, profit_factor
  ✓ GET /api/setups/:id/performance
  
Day 3: Review workflow endpoints
  ✓ GET /api/signals?status=pending (pending review queue)
  ✓ PUT /api/signals/:id/review (mark reviewed, add notes)
  ✓ Update signal status: pending → in_progress → completed
```

**Frontend (3 days)**
```
Day 1: Review workflow page
  ✓ Pending signals queue (list)
  ✓ Signal detail view (entry, conditions, notes)
  ✓ Outcome entry form (exit price, exit time, reason)
  ✓ Quality score slider (1-5)
  
Day 2: Review UI refinement
  ✓ Auto-calculate P&L display
  ✓ Duration shown nicely (e.g., "2 hours 30 min")
  ✓ Setup performance mini-chart (win rate trend)
  ✓ Keyboard shortcuts for quick review
  
Day 3: Setup performance dashboard
  ✓ Cards showing setup stats (total signals, win rate, P&L)
  ✓ Charts: win rate over time, P&L distribution
  ✓ Filters: by symbol, by date range
  ✓ Performance rank (best to worst setups)
```

#### Success Criteria
- [x] User can log exit price + quality score for signals
- [x] P&L calculated correctly
- [x] Setup performance metrics update after each outcome
- [x] Review workflow page is intuitive
- [x] Setup performance dashboard shows correct metrics

#### Example Flow
```
User views pending signal (AAPL, Bull Flag, entry 185.50)
↓
Clicks "Log Outcome"
↓
Enters: exit_price=187.00, exit_reason="profit_target", quality_score=4
↓
System calculates: P&L=$150, duration=2h, win_rate now 71% for Bull Flag
↓
Signal marked complete, setup performance cache updated
↓
Review page shows Bull Flag in top performers
```

---

### WEEK 4: Reports & Polish (May 4-10)

#### Goal
Weekly report generation + frontend polish + deployment.

#### Deliverables

**Backend (2.5 days)**
```
Day 1: Weekly report generation
  ✓ Cron job (every Sunday 6 PM UTC)
  ✓ Algorithm to calculate top/bottom setups for week
  ✓ Generate action items (which setups to focus on)
  ✓ Identify patterns (best days, market conditions)
  ✓ Store in weekly_reports table
  
Day 2: Email delivery
  ✓ Email template (HTML)
  ✓ Nodemailer setup (SendGrid or similar)
  ✓ Send weekly report every Monday 9 AM (user's timezone)
  ✓ Include top setups, insights, action items
  ✓ Unsubscribe link
  
Day 3: Slack integration (optional for MVP)
  ✓ Slack webhook support (optional)
  ✓ POST to user's Slack webhook on Sunday evening
  ✓ Format: threaded message with report sections
```

**Frontend (2 days)**
```
Day 1: Weekly report view
  ✓ Display latest weekly report
  ✓ Charts: setup performance this week vs. last week
  ✓ Top setups card
  ✓ Action items section
  
Day 2: Settings + polish
  ✓ Settings page (email, notification frequency, timezone)
  ✓ Error handling on all pages
  ✓ Loading states + skeleton screens
  ✓ Responsive design (mobile-friendly)
  ✓ Dark mode toggle (optional)
```

**Testing & QA (1 day)**
```
✓ End-to-end flow: add setup → manual signal → outcome → weekly report
✓ TradingView webhook integration test
✓ Performance: report generation < 5 min
✓ Email delivery test
✓ All API endpoints return correct status codes
✓ Frontend no console errors
```

**Deployment**
```
✓ Database migrations run in production
✓ Environment variables set (Stripe later, not needed yet)
✓ Backend running on Render/Railway
✓ Frontend on Vercel
✓ Custom domain setup (optional: signalpost.io)
```

#### Success Criteria
- [x] Weekly report generates correctly
- [x] Email sent successfully to user
- [x] Report shows accurate top/bottom setups
- [x] Frontend displays report
- [x] All pages responsive
- [x] Application deployed + accessible

#### Example Weekly Report

```
📊 Your Signal Performance This Week (Apr 7–13)

🏆 Top Performers:
1. Bull Flag Breakout — 7 signals, 71% win rate, +$4,200 net
2. Support Bounce (200MA) — 5 signals, 60% win rate, +$1,100 net

⚠️ Underperformers:
1. Breakout Above VWAP — 8 signals, 25% win rate, -$600 net

💡 Insights:
• Your setups perform best on high-volume days (ADV > 2M)
• Bull Flags consistently profitable on 4H timeframe
• VWAP breakout needs refinement

🎯 Action Items:
✓ Double down on Bull Flags
✓ Add RSI filter to VWAP breakouts
✓ Stop taking signals on low-volume days
```

---

## Development Checklist (4-Week Build)

### Week 1
- [ ] Project scaffold (git, Postgres, .env)
- [ ] User auth (register, login, JWT)
- [ ] Setup CRUD
- [ ] Frontend auth pages + layout
- [ ] Deploy to staging

### Week 2
- [ ] Signal ingestion (manual + webhook)
- [ ] Signal list page
- [ ] CSV import (basic)
- [ ] TradingView integration test
- [ ] Deploy to staging

### Week 3
- [ ] Outcome logging
- [ ] Performance calculation
- [ ] Review workflow UI
- [ ] Setup performance dashboard
- [ ] Deploy to staging

### Week 4
- [ ] Weekly report generation + email
- [ ] Settings page
- [ ] Polish + bug fixes
- [ ] QA testing
- [ ] Production deployment

---

## Tech Stack (Finalized)

### Backend
- **Language:** TypeScript + Node.js
- **Framework:** Express
- **Database:** PostgreSQL (Supabase)
- **ORM:** TypeORM or Prisma (easier migrations)
- **Job Queue:** Bull/BullMQ (cron for weekly reports)
- **Email:** Nodemailer + SendGrid
- **Hosting:** Render or Railway

### Frontend
- **Framework:** React 18 + TypeScript
- **Styling:** TailwindCSS
- **UI Components:** Shadcn/ui
- **Charts:** Recharts
- **Hosting:** Vercel

### Deployment
- **CI/CD:** GitHub Actions (simple: test → build → deploy)
- **Monitoring:** Sentry (error tracking) + Simple Analytics (usage)

---

## Resource Allocation

### If Solo (Joe)
- **Week 1-2:** Backend focus (auth, signals, ingestion)
- **Week 3-4:** Shared backend/frontend (outcomes, reports, UI)
- **Estimated Time:** 8-10 hours/day for 4 weeks
- **Risk:** Tight schedule, limited buffer for bugs

### If Joe + 1 Agency Developer
- **Joe:** Product, frontend, integrations
- **Developer:** Backend, database, API
- **Parallel:** Speeds up weeks 1-3 significantly
- **Estimated:** 4-6 hours/day each, 4 weeks
- **Risk:** Lower (good split of responsibilities)

**Recommendation:** If budget allows, bring in a backend developer for weeks 1-3. Worth ~$3k-$5k investment to reduce risk and accelerate.

---

## Key Milestones

| Milestone | Date | Success Criteria |
|-----------|------|-----------------|
| Week 1 Complete | Apr 19 | Auth working, setups CRUD, staging deployed |
| Signal Ingestion | Apr 26 | Manual entry + webhook working, CSV import basic |
| Outcomes & Review | May 3 | Exit logging, performance calculation, review UI |
| MVP Complete | May 10 | Weekly reports, email delivery, production deploy |
| Beta Launch | May 11 | 5-10 beta users testing |

---

## Post-MVP (Phase 2)

After MVP ships, prioritize:

1. **User feedback loop** (first 2 weeks)
   - Daily check-ins with beta users
   - Track: signal completion rate, time-to-outcome, NPS
   - Iterate UI based on friction points

2. **High-value features** (next 4 weeks)
   - Advanced filtering (multi-symbol, timeframe comparison)
   - Pattern recognition (auto-tag similar setups)
   - Correlation analysis (setup performance vs. market conditions)
   - Mobile responsive polish

3. **Monetization** (week 8+)
   - Stripe integration
   - Pricing page
   - Onboarding flow for paid users
   - Usage tracking (signals/month quota)

---

## Risk & Mitigation

| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| TradingView webhook format changes | Low | Document format, handle fallback to manual entry |
| Schema needs redesign mid-build | Medium | Use migrations; design carefully upfront (done) |
| Performance issues (large signal count) | Medium | Add indexes early, benchmark with 10k+ signals |
| Deployment issues | Low | Practice deploy early (week 1), automate via CI/CD |
| Scope creep (too many features) | High | Stick to MVP checklist, defer Phase 2 to later |

---

## Definition of "MVP Complete"

✅ User can:
1. Sign up + log in
2. Create signal setups
3. Ingest signals (TradingView webhook + manual entry)
4. Log trade outcomes (exit price, quality score)
5. View setup performance (win rate, P&L, charts)
6. Receive weekly email report
7. View latest weekly report in app

✅ System:
- Generates accurate performance metrics
- Sends weekly reports reliably
- Handles 1,000+ signals/user without slowdown
- Deployed to production

❌ Not needed for MVP:
- CSV import (can add week 2)
- Slack integration (can add later)
- Mobile app (responsive web is enough)
- Advanced pattern recognition
- Team features

---

**End of MVP Plan**

Next step: Start Week 1 development immediately.
