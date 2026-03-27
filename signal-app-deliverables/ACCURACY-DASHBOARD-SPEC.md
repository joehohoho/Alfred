# Accuracy Dashboard — Technical & Design Spec

**Status:** READY FOR DEVELOPMENT  
**Last Updated:** 2026-03-27 17:50 ADT  
**Owner:** Alfred (Tech Lead to build)

---

## Purpose & Strategic Value

**Why this matters:**
- Differentiator vs. competitors (most hide accuracy data)
- Trust builder (transparency = higher conversion, lower churn)
- Social proof (public leaderboard + win rates)
- Product insight (identify which signals perform best)

**Expected ROI:**
- 5-10% higher free→Pro conversion (transparency builds trust)
- 3-5% lower Pro churn (users see accuracy trending)
- User-generated marketing (traders share dashboard screenshots)

---

## Core Metrics (What We Display)

### 1. Overall Accuracy (Top of Dashboard)

```
┌─────────────────────────────────────┐
│  SIGNAL PERFORMANCE (Last 90 Days)  │
├─────────────────────────────────────┤
│                                     │
│  Win Rate:          55%             │
│  Total Signals:     147             │
│  Winning Trades:    81              │
│  Losing Trades:     66              │
│                                     │
│  Avg Gain/Winner:   +3.2%           │
│  Avg Loss/Loser:    -1.8%           │
│  Profit Factor:     1.78            │
│                                     │
│  Sharpe Ratio:      1.23            │
│  Max Drawdown:      -8.3%           │
│                                     │
└─────────────────────────────────────┘
```

**Definitions (for tooltip help):**
- **Win Rate**: % of signals that hit their target within 7 days
- **Profit Factor**: Total gain / Total loss (>1.0 = profitable)
- **Sharpe Ratio**: Risk-adjusted return (higher = better); 1.0+ is good
- **Max Drawdown**: Largest cumulative loss during the period

---

### 2. Time Series (Daily Trend)

**Chart type:** Line chart (Win % by day)

```
Win Rate % (Last 30 Days)
┌──────────────────────────────────────┐
│                                  55% │
│ ▲▼▲  ╱╲  ╱▲  ╱╲  ╱▲  ╱╲              │
│ 51% ╱  ╲╱  ╲╱  ╲╱  ╲╱  ╲             │
│     ├─────────────────────────┤      │
│     Mar 1              Mar 30       │
│ 90 days │ 30 days │ 7 days │ 1 day │
└──────────────────────────────────────┘
```

**Purpose:** Show accuracy trends
- Trend up? "Signals improving, upgrade now"
- Trend down? "We had a bad week, here's why"

**Interaction:** 
- Click "90 days" → Shows 3-month data
- Click "30 days" → Shows 1-month data
- Hover on data point → Shows "March 15: 58% (12/21 signals hit)"

---

### 3. Signal Type Breakdown (Segmented Performance)

**Table format:**

| Signal Type | Total | Wins | Loss | Win % | Avg Gain | Sharpe |
|-------------|-------|------|------|-------|----------|--------|
| Long BTC | 38 | 22 | 16 | 58% | +3.5% | 1.4 |
| Long Altcoin | 42 | 23 | 19 | 55% | +3.1% | 1.1 |
| Short BTC | 31 | 17 | 14 | 55% | +3.0% | 1.2 |
| Short Altcoin | 36 | 19 | 17 | 53% | +2.8% | 0.9 |

**Purpose:** Help traders find their edge
- "I trade altcoins, let me see altcoin performance"
- "Which signal type is safest? (Look for highest Sharpe ratio)"

**Interaction:**
- Click signal type row → See all signals of that type with results
- Filter by date range

---

### 4. Monthly Comparison (Trend Visibility)

**Bar chart:**

```
Win Rate by Month
┌────────────────────────────────────┐
│ Jan:  52% ████████████        │    │
│ Feb:  54% █████████████       │    │
│ Mar:  55% ██████████████      │    │
│ Apr:  57% ████████████████    │    │
│        0% 25% 50% 75% 100%        │
└────────────────────────────────────┘
```

**Purpose:** Confidence trend (are we improving?)

---

### 5. Distribution (Risk/Reward Histogram)

**Histogram:**

```
Win/Loss Distribution
┌──────────────────────────────────┐
│  +5%│ ▁▁▂▂▃▃▄▄▅▅ │               │
│  0% │ ░░░░░░░░░░ │ (20 signals)  │
│ -5% │ ▂▂▃▃▄▄▅▅   │               │
│     └─────────────┘               │
│     Wins    Losses               │
└──────────────────────────────────┘
```

**Purpose:** Show risk/reward consistency
- Are wins big and losses small? (Good risk management)
- Or are wins small and losses big? (Bad risk management)

---

## Data Architecture

### Data Sources

**Where does accuracy data come from?**

1. **Live Signal Data**
   - Signal sent: timestamp, price, direction, target, stop loss
   - From: Signal engine (your backend)
   - Updates: Real-time (new signal every 5-30 minutes)

2. **Price Feed**
   - Current price for each coin (BTC, ETH, etc.)
   - From: Binance API (free tier, 1000 requests/day)
   - Updates: Every 5 minutes

3. **Signal Verification**
   - Did signal hit? (price reached target within 7 days?)
   - Did signal miss? (price hit stop loss first?)
   - Computed: Nightly job (compare signal target vs. price history)

### Database Schema

```sql
-- Signals table
CREATE TABLE signals (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP,
  coin STRING,
  direction STRING ('long', 'short'),
  entry_price DECIMAL,
  target_price DECIMAL,
  stop_loss DECIMAL,
  confidence INT (1-100),
  signal_type STRING ('momentum', 'support/resistance', etc)
);

-- Signal Results table
CREATE TABLE signal_results (
  signal_id TEXT PRIMARY KEY,
  created_at TIMESTAMP,
  signal_sent_at TIMESTAMP,
  result STRING ('hit', 'miss'),
  actual_peak_price DECIMAL,
  peak_timestamp TIMESTAMP,
  gain_pct DECIMAL,
  hit_target_days INT,
  updated_at TIMESTAMP
);

-- Index: For dashboard queries
CREATE INDEX idx_signal_results_created ON signal_results(created_at DESC);
CREATE INDEX idx_signal_results_type ON signals(signal_type);
```

### Update Job (Nightly)

**Job name:** `compute-signal-accuracy`

**Frequency:** Every night at 11 PM (after market close)

**What it does:**
1. Get all signals sent in past 90 days
2. For each signal:
   - Get current price from Binance
   - Check if target was hit in past 7 days (from price history)
   - Check if stop loss was hit
   - Mark as 'hit' or 'miss'
3. Recompute aggregate metrics (win %, sharpe, drawdown)
4. Update dashboard cache

**Pseudocode:**

```python
def compute_signal_accuracy():
    signals = db.query("""
        SELECT * FROM signals 
        WHERE created_at > NOW() - 90 days
        ORDER BY created_at DESC
    """)
    
    for signal in signals:
        # Get price history for this signal
        price_history = binance_api.get_candles(
            symbol=signal.coin,
            start_time=signal.created_at,
            end_time=signal.created_at + 7.days
        )
        
        # Determine if signal hit
        max_price = max([c.high for c in price_history])
        min_price = min([c.low for c in price_history])
        
        if signal.direction == 'long':
            hit = max_price >= signal.target_price
            stop = min_price <= signal.stop_loss
        else:
            hit = min_price <= signal.target_price
            stop = max_price >= signal.stop_loss
        
        # Record result
        db.insert('signal_results', {
            'signal_id': signal.id,
            'result': 'hit' if hit and not stop else 'miss',
            'gain_pct': calculate_gain(signal, max_price, min_price),
            'updated_at': now()
        })
    
    # Recompute dashboard metrics
    cache.set('dashboard_metrics', compute_aggregate_metrics())
```

---

## Frontend Implementation

### Page Structure

```
┌────────────────────────────────────────────┐
│  [Logo] Accuracy Dashboard         [Login] │
├────────────────────────────────────────────┤
│                                            │
│  Time Range Selector:                     │
│  [90 days] [30 days] [7 days] [1 day]    │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │ OVERALL METRICS                      │ │
│  │ Win Rate: 55%  Win Count: 81         │ │
│  │ Sharpe Ratio: 1.23  Max DD: -8.3%   │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │ WIN RATE TREND (Line chart)          │ │
│  │   [Chart shows daily win %]          │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │ PERFORMANCE BY SIGNAL TYPE           │ │
│  │ [Table: Long BTC, Altcoins, etc]    │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │ MONTHLY TREND                        │ │
│  │ [Bar chart: Jan-Apr win rates]       │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │ ALL SIGNALS (Searchable Table)       │ │
│  │ Date | Coin | Direction | Result |  │ │
│  │ [List of all signals with results]  │ │
│  └──────────────────────────────────────┘ │
│                                            │
└────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React (component library: Material-UI or Shadcn)
- Chart library: `recharts` or `chart.js` (line/bar charts)
- Table: `react-table` (searchable, sortable)

**Backend API:**
- GraphQL endpoint: `GET /api/accuracy-dashboard`
- Returns:
  - Overall metrics
  - Time series data
  - Signal type breakdown
  - All signals (paginated)

**Caching:**
- Cache dashboard metrics in Redis (expires 1x/day after update job)
- Cache individual signal data (expires 1x/day)
- Rationale: Dashboard doesn't need real-time updates; nightly is fine

### Key Features

1. **Time Range Selector** (90/30/7/1 days)
   - Changes all charts + tables
   - Stored in URL query params (shareable: `?range=30`)

2. **Searchable Signals Table**
   - Search by coin (BTC, ETH, etc.)
   - Filter by result (hit/miss)
   - Sort by date, gain, etc.
   - Pagination (50 signals/page)

3. **Hover Tooltips**
   - Hover on metric → Show definition
   - Hover on chart point → Show exact value
   - Example: "March 15: 58% win rate (12 of 21 signals hit)"

4. **Mobile Responsive**
   - Charts scale down to mobile
   - Table collapses to card layout on mobile
   - Touch-friendly (no hover-only interactions)

5. **Public vs. Authenticated Views**
   - **Public** (no login required):
     - Overall metrics (win %, Sharpe, max DD)
     - Time series chart (30-day trend)
     - Signal type breakdown (summary)
   - **Authenticated** (Pro users only):
     - Full 90-day data
     - All signals table (search + filter)
     - Export to CSV

---

## Design Notes (UI/UX)

### Color Palette
- **Win** (background): Light green (#f0fdf4)
- **Loss** (background): Light red (#fef2f2)
- **Metric boxes**: Light gray (#f3f4f6)
- **Text**: Dark gray (#1f2937)
- **Charts**: Green for wins, red for losses

### Typography
- **Heading (Overall Metrics)**: 24px, bold
- **Metric value (55%)**: 32px, bold, green
- **Metric label (Win Rate)**: 14px, gray
- **Table text**: 14px, regular
- **Tooltip**: 12px, gray

### Spacing
- Top section (metrics): 24px padding
- Chart section: 32px padding
- Table section: 24px padding
- Column gaps: 16px

### Interactions
- Hover metric box → Slight shadow (lift effect)
- Click time range button → Highlight active state + fade inactive
- Hover table row → Highlight row, show "view signal" link
- Click signal → Show detailed view (price history, entry, exit)

---

## Content Strategy (Messaging)

### Good Week (Win Rate >55%)
**Headline:** "Signals on track 🎯"  
**Subtext:** "This week's 58% win rate is above our 90-day average (55%)."  
**CTA:** "Upgrade to Pro to act on signals in real-time"

### Bad Week (Win Rate <50%)
**Headline:** "Signals underperformed 📉"  
**Subtext:** "We had a rough week (48% win rate). Here's why: [market analysis]"  
**CTA:** "This is normal. Long-term accuracy is 55%. See 90-day view →"

### Messaging Rules
- Always show context (is this week better/worse than normal?)
- Always explain underperformance (don't hide it)
- Always link to next action (upgrade to Pro, check community, read analysis)

---

## Data Privacy & Security

**What data is public?**
- Win rate %, counts, Sharpe ratio, max drawdown
- Signal type breakdown (aggregate only, no individual signals)
- Time trend (daily win rates)

**What data is private (Pro users only)?**
- Individual signal details (which coin, entry price, target)
- Full signal history (all 90 days)
- Export to CSV

**Why?**
- Protects signal quality (competitors can't reverse-engineer your signals)
- Incentivizes Pro upgrade (pay $19.99 to see full signal list)

---

## Launch Checklist

- [ ] Database schema created (signals + signal_results tables)
- [ ] Nightly update job deployed (runs at 11 PM)
- [ ] API endpoint built (`GET /api/accuracy-dashboard`)
- [ ] Frontend components built (metrics, charts, tables)
- [ ] Public view tested (shows metrics, not individual signals)
- [ ] Pro view tested (shows full history + search)
- [ ] Mobile responsive tested
- [ ] Dashboard embedded on pricing page (public view)
- [ ] Dashboard accessible from app home (authenticated view)
- [ ] First week's data populated (backfilled from signal backtests)

---

## Success Metrics

| Metric | Target | How to Track |
|--------|--------|-------------|
| Dashboard page views | 1,000+/month | Google Analytics |
| Bounce rate | <30% | GA |
| Time on page | >2 minutes | GA |
| Free→Pro conversion (from dashboard) | 3% | Segment/Mixpanel tracking |
| Public view CTR to upgrade | 5% | Click tracking |
| Mobile usage | >40% of traffic | GA device breakdown |

---

**Next Step:** Tech lead builds dashboard. Estimated time: 8-10 hours (DB + API + frontend)

*Accuracy dashboard spec complete and ready for development.*
