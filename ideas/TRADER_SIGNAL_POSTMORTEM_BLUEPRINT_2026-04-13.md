# Trader Signal Post-Mortem Assistant — Product Blueprint

**Status:** MVP Specification  
**Created:** 2026-04-13  
**MRR Target:** $1.5k–$6k (50–150 traders at $29–$59/mo)  
**Tech Complexity:** 3/5  

---

## Market Landscape

### Existing Competition
1. **TraderSync** — Full-featured journal + analytics (P&L, win rate, sharpe ratio, drawdown)
2. **Tradervue** — Community-driven journal with social sharing + price chart overlays
3. **Edgewonk** — Psychological pattern tracking + detailed trade analysis
4. **Journalytix** — Real-time risk dashboard (live P&L, risk metrics)
5. **TradingView** — Built-in journal feature (basic, limited automation)

### Market Gap — What's Missing

**The Core Problem:**
- Existing tools track **what happened** (P&L, win rate, drawdown)
- They DO NOT systematically answer: **"Why did this signal work? Why did that setup fail?"**
- Traders collect alerts but rarely review signal **quality by setup type**
- Result: They repeat bad setups, overweight noisy indicators, don't evolve

**Our Differentiator:**
- Focus on **post-trade review workflow** (not just analytics)
- Group signals by **setup pattern** (not just symbol/timeframe)
- Track **follow-through quality** per setup (entry conditions → actual market behavior)
- Generate **decision hygiene reports** (what setups actually worked, when, why)
- Workflow designed for **discovery, not just data entry**

---

## Problem Statement

**Customer Segment:** Retail traders (stocks, futures, crypto, forex)
- Using TradingView alerts or manual signal tracking
- 5–100+ alerts/week collected but rarely reviewed systematically
- Repeat unprofitable setups because signal quality tracking is fragmented
- Lack decision framework: which indicators/setups are actually reliable?

**Pain Points:**
1. **Alert Fatigue** — 50+ alerts/week, unclear which ones matter
2. **Setup Blindness** — "I remember I had a good run with this pattern... was it consistent?"
3. **Decision Decay** — Rules for entry/exit exist but aren't enforced or measured
4. **No Feedback Loop** — Trades logged but not analyzed by setup type
5. **Noisy Indicators** — Overweight indicators that seem to work but don't hold up

---

## Solution Architecture

### Core Features (MVP Phase 1)

#### 1. **Signal Ingestion**
- **TradingView Alerts** → Webhook receiver (parse alert text, extract: symbol, setup name, conditions, timeframe, entry price)
- **Manual Log** → Quick UI form (symbol, setup type, entry, exit, notes)
- **CSV Import** → Support common formats (Symbol, Entry, Exit, Setup, Notes, Timestamp)
- **Data Storage** — PostgreSQL: signals table with metadata (symbol, setup_name, entry_price, entry_time, conditions_text, source)

#### 2. **Setup Pattern Library**
- User-defined setup types (e.g., "Bull Flag", "Support Bounce", "Breakout Above 50MA", "RSI Divergence")
- Tagging system (automated tagging based on keyword match in alert text)
- Persistence of setup definitions + performance history per setup

#### 3. **Trade Outcome Tracking**
- **Entry → Exit Lifecycle**
  - User marks when setup triggered entry (auto-tracked from alerts or manual entry)
  - User logs exit: price + reason (profit target hit, stop hit, exited manually, timed out)
  - Auto-calculate: P&L, R-multiple (if risk defined), duration
- **Follow-Through Metrics per Setup**
  - Win rate % (setups that hit profit target / total setups)
  - Avg winning trade size vs avg losing trade size
  - Duration tracking (how long signals typically run)
  - Consistency score (std deviation of R-multiple across same setup)

#### 4. **Review Workflow**
- **Pending Review Queue** — Signals logged but not yet analyzed
- **Quick Feedback UI** — For each signal:
  - Did entry trigger as planned? (Yes/No/Partial)
  - Did follow-through match expectation? (Yes/No/Exceeded)
  - Quality score: 1-5 (how reliable was this particular instance)
  - Notes: What worked? What didn't?
- **Filtering + Grouping** — By setup, timeframe, symbol, date range, quality score

#### 5. **Weekly Summary Report**
- **"What Worked" Dashboard**
  - Top 3-5 setups by win rate this week
  - Setups to stop using (win rate <30% or low confidence)
  - Highest confidence setups (consistent, repeatable)
- **Trend Analysis**
  - Setup win rate over time (trending up/down?)
  - Seasonal patterns (setup works better in certain markets?)
  - Correlations (does setup X work when Asset Y is strong?)
- **Action Items**
  - Setups to double down on (proven + trending well)
  - Setups to refine or eliminate
  - Market conditions that favor certain setups

#### 6. **Notification System**
- Weekly email/Slack notification: "Top setups this week + what to focus on next week"
- Real-time TradingView webhook processing (instant signal logging)

---

### Data Model

```sql
-- Core Tables

CREATE TABLE setups (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,        -- "Bull Flag", "Support Bounce", etc.
  description TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE signals (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  setup_id UUID NOT NULL REFERENCES setups,
  symbol VARCHAR(20),                -- AAPL, BTC/USD, etc.
  entry_price DECIMAL(15,8),
  entry_time TIMESTAMP,
  entry_source VARCHAR(50),          -- 'tradingview', 'manual', 'csv'
  alert_text TEXT,                   -- Raw TradingView alert (for reference)
  timeframe VARCHAR(20),             -- '1h', '4h', 'daily', 'weekly'
  conditions_summary TEXT,           -- Summarized entry conditions
  status VARCHAR(20),                -- 'pending_review', 'in_progress', 'completed'
  created_at TIMESTAMP
);

CREATE TABLE signal_outcomes (
  id UUID PRIMARY KEY,
  signal_id UUID NOT NULL UNIQUE REFERENCES signals,
  user_quality_score INT,            -- 1-5 rating
  user_notes TEXT,
  exit_price DECIMAL(15,8),
  exit_time TIMESTAMP,
  exit_reason VARCHAR(50),           -- 'profit_target', 'stop_hit', 'manual', 'timeout'
  pnl_dollars DECIMAL(15,8),
  r_multiple DECIMAL(10,4),          -- P&L / initial risk
  duration_minutes INT,
  follow_through_met BOOLEAN,        -- Did signal behave as expected?
  actual_win BOOLEAN,                -- Profitable?
  reviewed_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE setup_performance (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  setup_id UUID NOT NULL,
  time_period VARCHAR(20),           -- 'week', 'month', 'all_time'
  period_start DATE,
  period_end DATE,
  total_signals INT,
  winning_signals INT,
  win_rate DECIMAL(5,2),             -- %
  avg_win DECIMAL(15,8),
  avg_loss DECIMAL(15,8),
  profit_factor DECIMAL(10,4),       -- Total wins / total losses
  confidence_score DECIMAL(5,4),     -- Based on consistency + sample size
  updated_at TIMESTAMP
);

CREATE TABLE weekly_reports (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE,
  week_end DATE,
  top_setups JSONB,                  -- [{setup_name, win_rate, signals_count}]
  underperforming_setups JSONB,
  action_items TEXT,
  market_conditions_summary TEXT,
  generated_at TIMESTAMP
);
```

---

### Technical Stack (Recommended)

**Frontend:**
- React + TypeScript (quick dashboard + review UI)
- TailwindCSS (rapid styling)
- Recharts (weekly summary charts)
- Shadcn/ui (components)

**Backend:**
- Node.js + Express (webhook handling, API)
- PostgreSQL (persistence)
- Bullmq (job queue for weekly report generation)
- OpenAI/Claude API (optional: auto-summarize market conditions from signals)

**Integrations:**
- TradingView webhook (receive alerts)
- Slack/Email webhook (send weekly reports)
- Stripe (payments)

**Hosting:**
- Vercel (frontend)
- Render/Railway (backend)
- Supabase or Railway Postgres (database)

**Estimated Build Time:** 4-6 weeks (one developer)

---

## MVP Feature Set (Phase 1 — 4 weeks)

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| Signal ingestion (manual + TradingView webhook) | P0 | 1 week | Core value |
| Setup library + tagging | P0 | 3 days | Enables grouping |
| Outcome tracking (entry/exit) | P0 | 1 week | Close the loop |
| Review workflow UI | P0 | 1 week | Core UX |
| Basic performance metrics (win rate, P&L) | P1 | 3 days | Analytics baseline |
| Weekly summary email | P1 | 3 days | Notification hook |
| CSV import | P2 | 2 days | Historical data |
| Multi-symbol + timeframe support | P1 | 2 days | Scale beyond single setup |

**Phase 1 Scope:** Everything above except CSV (can be Phase 2)

---

## Go-to-Market Strategy

### Positioning
"Review Workflow for Signal Quality"
- Not a journal (those exist)
- Not a backtester (Trading View / ThinkorSwim have it)
- A focused workflow tool for traders who want to systematically improve their setups

### Pricing Tiers
- **Basic ($29/mo):** 1 user, 500 signals/month, weekly reports
- **Pro ($59/mo):** 3 users, unlimited signals, daily reports + pattern insights
- **Enterprise ($199/mo):** Team features, API access, integrations

### Acquisition Channels
1. **Twitter/Reddit** — Post weekly: "Top 3 setups this week from 50,000+ trades" (anonymized data from users)
2. **Niche Communities** — Trader forums (BabyPips, Elite Trader, Reddit r/RealDayTrading)
3. **YouTube/TikTok** — Show real trader workflow ("How I review 50 alerts/week")
4. **Partnerships** — TradingView script developers, alert vendors

### Unit Economics (Projected)
- **CAC:** $50–$100 (organic/community)
- **LTV:** $400–$600 (at 12-month retention, $30–$50/mo avg)
- **LTV:CAC:** 4–8x (healthy)

---

## Competitive Advantages

1. **Workflow Focus** — Not just data storage; actual review process
2. **Signal Grouping by Setup** — TraderSync journals trades individually; we group by pattern
3. **Follow-Through Tracking** — Answers "Did this signal behave as expected?"
4. **Simplicity** — Narrower scope than full journals → easier to use, faster to get value
5. **Joe's Domain Expertise** — Joe understands trader pain + already has signal product ideas

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| Low market size (niche traders only) | Medium | Pre-sell to 5–10 traders; validate demand before full build |
| TradingView API changes break webhook | Low | Fallback to manual entry; document webhook contract |
| Traders don't stick with review process | Medium | Gamification, weekly wins, easy UI, Slack integration for reminders |
| Competing features added to TraderSync/Tradervue | Medium | Faster iteration, better UX, stronger focus on setup patterns |

---

## Success Metrics (Phase 1)

- [ ] MVP launches with signal ingestion + review workflow
- [ ] 10–20 beta users onboarded
- [ ] 80% of signals reviewed within 1 week of entry
- [ ] Users report at least 1 actionable insight from weekly report
- [ ] NPS > 40 (strong willingness to recommend)
- [ ] <5% churn rate (first 100 days)

---

## Next Steps

1. **Validate demand** — Reach out to 10 traders, show mockup, get feedback
2. **Build MVP** — 4-week sprint (Joe + 1 developer, or Joe solo with agency help)
3. **Private beta** — 5–10 traders, 2-week test cycle, iterate on feedback
4. **Launch & iterate** — Public launch week 6, monitor NPS + usage, refine based on data

---

## Appendix: User Personas

### Persona 1: "Pattern Trader"
- Runs 3–5 defined setups (e.g., Bull Flag, Support Bounce, RSI Divergence)
- Generates 20–50 alerts/week
- Pain: Can't remember which setup is most reliable → repeats losers
- Wants: Clear performance data by setup type
- Willing to pay: $30–$50/mo

### Persona 2: "Alert Collector"
- Subscribes to 5–10 alert services + personal TradingView alerts
- Gets 100+ alerts/week, ignores most
- Pain: Alert fatigue, no way to filter noise
- Wants: A way to review alerts retrospectively, discover which sources are worth following
- Willing to pay: $50–$100/mo

### Persona 3: "SMA Optimizer"
- Builds/backtests many setups in TradingView
- Wants real live data to compare backtest vs. reality
- Pain: Can't easily compare live signal performance against backtest assumptions
- Wants: Setup-grouped journal with backtester comparison
- Willing to pay: $100+/mo (high-value user)

---

## Appendix: TradingView Alert Webhook Example

**Incoming Alert (from TradingView):**
```
Symbol: AAPL
Setup: Bull Flag Breakout
Entry Price: 185.50
Conditions: Price broke above 200-day MA, RSI > 60, Volume +20%
Timeframe: 4H
Time: 2026-04-13 14:30 UTC
```

**Our Processing:**
1. Parse alert text (regex + NLP)
2. Extract: symbol, setup name, entry price, conditions
3. Create signal record + auto-tag setup
4. Store in PostgreSQL
5. Notify user: "New Bull Flag Breakout signal: AAPL @ 185.50"

---

## Appendix: Weekly Report Example

```
📊 Your Top Setups This Week (Apr 7–13)

🏆 Best Performers:
1. Bull Flag Breakout — 7 signals, 71% win rate, +$4,200 net
2. Support Bounce (200MA) — 5 signals, 60% win rate, +$1,100 net
3. RSI Divergence (4H) — 3 signals, 67% win rate, +$800 net

⚠️ Underperformers (consider refining):
- Breakout Above VWAP — 8 signals, 25% win rate, -$600 net
- Channel Breakout (daily) — 4 signals, 50% win rate, -$200 net

🎯 Action Items for Next Week:
- Double down: Bull Flag setups on 4H are rock solid. Focus on high-volume days.
- Refine: VWAP breakout needs tighter entry — consider adding RSI filter
- Pause: Channel Breakout underperforming; skip until you understand why

💡 Insight:
Your setups perform 40% better on high-volume days. Filter for ADV > 2M next week.
```

---

**End of Blueprint**
