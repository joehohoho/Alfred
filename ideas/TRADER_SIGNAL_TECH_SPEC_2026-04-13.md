# Trader Signal Post-Mortem — Technical Implementation Spec

**Status:** Ready for Build  
**Version:** 1.0  
**Created:** 2026-04-13  

---

## Overview

This document defines the technical architecture, database schema, API contracts, and implementation phases for the Trader Signal Post-Mortem Assistant.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   TradingView Webhooks                  │
│            (Incoming signals: alert text)               │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│           Backend API (Node.js + Express)               │
│  - Webhook receiver                                     │
│  - Signal parsing & ingestion                           │
│  - CRUD for signals, outcomes, setups                   │
│  - Weekly report generation                             │
│  - Auth (JWT)                                           │
└────────┬──────────────────────────────────────┬─────────┘
         │                                      │
         ▼                                      ▼
┌──────────────────┐                  ┌──────────────────┐
│  PostgreSQL DB   │                  │ Slack/Email      │
│  - signals       │                  │ Webhook          │
│  - setups        │                  │ (Reports)        │
│  - outcomes      │                  └──────────────────┘
│  - users         │
└──────────────────┘

         ▲
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│           Frontend (React + TypeScript)                  │
│  - Signal review dashboard                              │
│  - Setup performance charts                             │
│  - Weekly summary view                                  │
│  - Settings + integrations                              │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema (SQL)

### Users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Integration settings
  slack_webhook_url TEXT,
  notification_frequency VARCHAR(20) DEFAULT 'weekly', -- weekly, daily, never
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_email (email)
);
```

### Setups (Signal Patterns)

```sql
CREATE TABLE setups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Setup definition
  name VARCHAR(100) NOT NULL,        -- "Bull Flag", "Support Bounce", etc.
  description TEXT,
  rules_summary TEXT,                -- "Price above 200MA, RSI > 60, Volume +20%"
  
  -- Performance tracking aggregate
  total_signals INT DEFAULT 0,
  winning_signals INT DEFAULT 0,
  current_win_rate DECIMAL(5,2),     -- Cached, updated after each outcome
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, name),
  INDEX idx_user (user_id),
  INDEX idx_created (created_at)
);
```

### Signals (Alert Ingestion)

```sql
CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  setup_id UUID NOT NULL REFERENCES setups(id) ON DELETE CASCADE,
  
  -- Alert data
  symbol VARCHAR(20) NOT NULL,       -- AAPL, BTC/USD, etc.
  timeframe VARCHAR(20),             -- 1m, 5m, 1h, 4h, daily, weekly
  entry_price DECIMAL(15,8) NOT NULL,
  entry_time TIMESTAMP NOT NULL,
  
  -- Source metadata
  source VARCHAR(50),                -- 'tradingview', 'manual', 'csv'
  raw_alert_text TEXT,               -- Original TradingView alert (for debugging)
  conditions_parsed JSONB,           -- Parsed conditions: {condition1, condition2, ...}
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending', -- pending_review, in_progress, completed
  
  -- Outcome reference (set once outcome is logged)
  outcome_id UUID UNIQUE REFERENCES signal_outcomes(id),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_status (user_id, status),
  INDEX idx_setup (setup_id),
  INDEX idx_symbol (user_id, symbol),
  INDEX idx_created (created_at DESC),
  INDEX idx_entry_time (entry_time DESC)
);
```

### Signal Outcomes (Review Data)

```sql
CREATE TABLE signal_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID NOT NULL UNIQUE REFERENCES signals(id) ON DELETE CASCADE,
  
  -- Exit information
  exit_price DECIMAL(15,8),
  exit_time TIMESTAMP,
  exit_reason VARCHAR(50),           -- profit_target, stop_hit, manual, timeout
  
  -- Performance metrics
  pnl_dollars DECIMAL(15,8),         -- Profit/loss in dollars
  pnl_percent DECIMAL(10,4),         -- P&L as % of entry
  r_multiple DECIMAL(10,4),          -- P&L / initial risk (if defined)
  duration_minutes INT,              -- Time held
  
  -- Trader assessment
  quality_score INT,                 -- 1-5 rating (1=poor, 5=excellent)
  follow_through_met BOOLEAN,        -- Did signal behave as expected?
  trader_notes TEXT,                 -- Qualitative feedback
  
  -- Timestamps
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_signal (signal_id),
  INDEX idx_reviewed (reviewed_at)
);
```

### Setup Performance Cache (Materialized View)

```sql
CREATE TABLE setup_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  setup_id UUID NOT NULL REFERENCES setups(id),
  
  -- Time period
  period_type VARCHAR(20),           -- 'all_time', 'month', 'week'
  period_start DATE,
  period_end DATE,
  
  -- Aggregated metrics
  total_signals INT,
  winning_signals INT,
  losing_signals INT,
  win_rate DECIMAL(5,2),             -- %
  
  -- Financial metrics
  total_pnl DECIMAL(15,8),
  avg_win DECIMAL(15,8),
  avg_loss DECIMAL(15,8),
  largest_win DECIMAL(15,8),
  largest_loss DECIMAL(15,8),
  profit_factor DECIMAL(10,4),       -- Sum wins / abs sum losses
  
  -- Quality metrics
  avg_quality_score DECIMAL(5,2),
  consistency_score DECIMAL(5,4),    -- Std deviation of returns
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, setup_id, period_type, period_start),
  INDEX idx_setup (setup_id, period_type)
);
```

### Weekly Reports (Generated Summary)

```sql
CREATE TABLE weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Report period
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  
  -- Content (JSON for flexibility)
  top_setups JSONB,                  -- [{id, name, win_rate, signals, pnl}, ...]
  underperforming_setups JSONB,      -- [{id, name, win_rate, signals, pnl}, ...]
  insights JSONB,                    -- {market_patterns, best_days, worst_days, ...}
  action_items TEXT,
  
  -- Delivery status
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP,
  slack_sent BOOLEAN DEFAULT FALSE,
  slack_sent_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_week (user_id, week_start DESC)
);
```

---

## 3. API Endpoints

### Authentication

```
POST /api/auth/register
  Body: { email, password, first_name, last_name }
  Response: { token, user }

POST /api/auth/login
  Body: { email, password }
  Response: { token, user }
```

### Setups (Signal Patterns)

```
GET /api/setups
  Auth: Required
  Response: [{id, name, total_signals, win_rate, created_at}, ...]

POST /api/setups
  Auth: Required
  Body: { name, description, rules_summary }
  Response: { id, name, ... }

PUT /api/setups/:id
  Auth: Required
  Body: { name?, description?, rules_summary? }
  Response: { id, name, ... }

DELETE /api/setups/:id
  Auth: Required
  Response: { success: true }

GET /api/setups/:id/performance
  Auth: Required
  Query: period=all_time|month|week
  Response: { win_rate, total_signals, avg_win, avg_loss, ... }
```

### Signals (Alert Ingestion)

```
POST /api/signals/webhook
  Auth: TradingView Token (validate header)
  Body: { symbol, setup, entry_price, conditions, timeframe }
  Response: { signal_id, status: 'pending_review' }

GET /api/signals
  Auth: Required
  Query: status=pending|completed, setup_id=UUID, limit=50, offset=0
  Response: [{ id, symbol, entry_price, status, created_at }, ...]

POST /api/signals
  Auth: Required
  Body: { setup_id, symbol, entry_price, entry_time, notes }
  Response: { id, status: 'pending_review' }

GET /api/signals/:id
  Auth: Required
  Response: { id, symbol, setup, entry_price, conditions, outcome, ... }

PUT /api/signals/:id/review
  Auth: Required
  Body: { quality_score, follow_through_met, notes, status }
  Response: { signal, outcome }
```

### Outcomes (Trade Results)

```
POST /api/signals/:id/outcome
  Auth: Required
  Body: { exit_price, exit_time, exit_reason, quality_score, notes }
  Response: { signal, outcome, updated_setup_performance }

GET /api/signals/:id/outcome
  Auth: Required
  Response: { id, exit_price, pnl, duration, quality_score, ... }
```

### Reports

```
GET /api/reports/weekly
  Auth: Required
  Query: week_start=DATE
  Response: { week_start, week_end, top_setups, insights, action_items }

GET /api/reports/weekly/latest
  Auth: Required
  Response: { (most recent weekly report) }

POST /api/reports/generate
  Auth: Required + Admin
  Query: week_start=DATE
  Response: { id, status: 'generating' } (async)
```

### Settings

```
GET /api/settings
  Auth: Required
  Response: { timezone, notification_frequency, slack_webhook_url, ... }

PUT /api/settings
  Auth: Required
  Body: { timezone?, notification_frequency?, slack_webhook_url? }
  Response: { updated settings }
```

---

## 4. Signal Parsing Algorithm

### TradingView Alert Format Recognition

**Input:**
```
Symbol: AAPL
Setup: Bull Flag Breakout
Entry Price: 185.50
Conditions: Price broke above 200-day MA, RSI > 60, Volume +20%
Timeframe: 4H
```

**Algorithm:**

```python
def parse_tradingview_alert(alert_text):
    """Parse TradingView alert text into structured data."""
    
    lines = alert_text.split('\n')
    parsed = {
        'symbol': None,
        'setup': None,
        'entry_price': None,
        'conditions': [],
        'timeframe': None
    }
    
    for line in lines:
        if line.startswith('Symbol:'):
            parsed['symbol'] = line.split(':', 1)[1].strip()
        elif line.startswith('Setup:'):
            parsed['setup'] = line.split(':', 1)[1].strip()
        elif line.startswith('Entry Price:'):
            parsed['entry_price'] = float(line.split(':', 1)[1].strip())
        elif line.startswith('Conditions:'):
            parsed['conditions'] = [
                c.strip() for c in line.split(':', 1)[1].split(',')
            ]
        elif line.startswith('Timeframe:'):
            parsed['timeframe'] = line.split(':', 1)[1].strip()
    
    return parsed

def ingest_signal(parsed_data, user_id):
    """Create signal record and auto-match setup."""
    
    # Auto-match setup by name (fuzzy match)
    setup = fuzzy_match_setup(parsed_data['setup'], user_id)
    
    if not setup:
        # Create new setup if not found
        setup = create_setup(
            user_id=user_id,
            name=parsed_data['setup'],
            rules_summary=', '.join(parsed_data['conditions'])
        )
    
    # Create signal record
    signal = Signal.create(
        user_id=user_id,
        setup_id=setup.id,
        symbol=parsed_data['symbol'],
        entry_price=parsed_data['entry_price'],
        entry_time=datetime.now(UTC),
        timeframe=parsed_data['timeframe'],
        conditions_parsed=parsed_data['conditions'],
        status='pending'
    )
    
    return signal
```

---

## 5. Weekly Report Generation

### Trigger

- **Cron Job:** Every Sunday 6 PM UTC
- Generates reports for all users in their timezone (Monday 9 AM local)

### Algorithm

```python
def generate_weekly_report(user_id, week_start, week_end):
    """Generate weekly summary report for trader."""
    
    # 1. Fetch all signals + outcomes for the week
    signals = Signal.find({
        'user_id': user_id,
        'entry_time': {'$gte': week_start, '$lt': week_end},
        'outcome_id': {'$ne': None}  # Only completed signals
    })
    
    # 2. Group by setup, calculate performance
    setup_stats = {}
    for signal in signals:
        outcome = signal.outcome
        setup_id = signal.setup_id
        
        if setup_id not in setup_stats:
            setup_stats[setup_id] = {
                'signals': [],
                'wins': 0,
                'losses': 0,
                'total_pnl': 0
            }
        
        setup_stats[setup_id]['signals'].append(signal)
        if outcome.pnl_dollars > 0:
            setup_stats[setup_id]['wins'] += 1
        else:
            setup_stats[setup_id]['losses'] += 1
        setup_stats[setup_id]['total_pnl'] += outcome.pnl_dollars
    
    # 3. Rank setups
    ranked = sorted(
        setup_stats.items(),
        key=lambda x: (x[1]['wins'] / len(x[1]['signals']), x[1]['total_pnl']),
        reverse=True
    )
    
    # 4. Build report
    top_setups = [{
        'id': setup_id,
        'name': Setups.find(id=setup_id).name,
        'signals': len(stats['signals']),
        'win_rate': stats['wins'] / len(stats['signals']) * 100,
        'total_pnl': stats['total_pnl']
    } for setup_id, stats in ranked[:5]]
    
    underperforming = [{...} for setup_id, stats in ranked[-3:]]
    
    # 5. Identify patterns
    insights = {
        'best_day': find_best_day_of_week(signals),
        'best_setup': top_setups[0]['name'] if top_setups else None,
        'market_conditions': summarize_market_impact(signals)
    }
    
    # 6. Generate action items
    action_items = generate_action_items(top_setups, underperforming, insights)
    
    # 7. Create report record
    report = WeeklyReport.create(
        user_id=user_id,
        week_start=week_start,
        week_end=week_end,
        top_setups=top_setups,
        underperforming_setups=underperforming,
        insights=insights,
        action_items=action_items
    )
    
    # 8. Send notifications
    send_email(user_id, report)
    send_slack(user_id, report)
    
    return report
```

---

## 6. Implementation Phases

### Phase 1: MVP (4 weeks)

**Week 1: Foundation**
- [ ] User auth (signup/login)
- [ ] Database schema + migrations
- [ ] Setup CRUD API

**Week 2: Signal Ingestion**
- [ ] TradingView webhook receiver
- [ ] Signal parsing + ingestion API
- [ ] Manual signal creation UI

**Week 3: Outcome & Review**
- [ ] Outcome logging API
- [ ] Review workflow UI (pending queue)
- [ ] Performance calculation

**Week 4: Reports & Polish**
- [ ] Weekly report generation
- [ ] Email/Slack delivery
- [ ] Frontend dashboard (review + charts)

### Phase 2: Enhancement (2 weeks)

- [ ] CSV import
- [ ] Advanced filtering (symbol, timeframe, date range)
- [ ] Pattern recognition (auto-tag similar setups)
- [ ] Mobile responsive UI

### Phase 3: Growth (Ongoing)

- [ ] Team collaboration
- [ ] API for third-party integrations
- [ ] Advanced analytics (correlation analysis, seasonal patterns)
- [ ] Mobile app

---

## 7. Security Considerations

### Authentication
- JWT tokens with 7-day expiry + refresh tokens
- Password hashing: bcrypt

### Authorization
- User can only access their own data
- API endpoints validate user_id from JWT

### Webhook Security
- TradingView webhook validation: HMAC signature verification
- Slack webhook: URL stored encrypted in database

### Data Privacy
- No sensitive data logged (passwords, tokens)
- Alert text stored for reference but not indexed/searched

---

## 8. Performance Targets

| Metric | Target |
|--------|--------|
| Signal ingestion latency | < 100ms |
| Review workflow page load | < 1s |
| Weekly report generation | < 5 min (async) |
| Database query (signals list) | < 200ms |
| API response (any endpoint) | < 500ms |

---

## 9. Error Handling & Retry Logic

### Signal Ingestion Failures

```
- Parse failure → Log error, alert user, allow manual correction
- Database insert failure → Retry 3x with exponential backoff
- Outcome calculation failure → Log error, mark signal as review_error
```

### Report Generation Failures

```
- Email send failure → Retry via job queue, alert admin
- Database write failure → Rollback, alert user
- Slack send failure → Log, retry next cycle
```

---

## 10. Monitoring & Observability

### Metrics to Track
- Signal ingestion rate (signals/day/user)
- Report generation success rate
- API error rate by endpoint
- Database query latency (p50, p95, p99)
- User engagement (% completing reviews)

### Logging
- All API requests (method, endpoint, user, status, latency)
- Signal ingestion (source, parse status, errors)
- Report generation (start time, end time, email/slack status)

### Alerting
- Report generation fails 3+ times
- Webhook response time > 1s (sustained)
- Database query > 2s
- Email delivery failure rate > 5%

---

**End of Technical Specification**
