# Market Signals App - UI/UX Redesign Plan

**Status:** In Progress  
**Date Started:** 2026-03-23  
**Target Completion:** 2026-03-24

---

## Current State Analysis

### What Works
✅ Clean dark theme (slate-950/slate-900)  
✅ Good color hierarchy (emerald/blue gradients)  
✅ Clear section separation (nav, hero, strategies, features)  
✅ Responsive grid layouts  
✅ Good use of spacing and padding  

### Critical Issues (Redesign Targets)

1. **Homepage is too landing-page focused**
   - Heavy marketing copy ("Scientifically Proven")
   - Emphasis on "learn more" rather than "do something"
   - 5 separate sections before user can act
   - Too much friction to get to actual backtest interface

2. **Test Interface layout is cluttered**
   - Controls on left (symbol, strategy, days, button)
   - Results below (metrics, trades)
   - No clear visual hierarchy for the most important data
   - Trade history takes up too much space for secondary data
   - Metrics are text-only, hard to scan quickly

3. **Navigation is unclear**
   - Home has CTA buttons but they're not obvious
   - Test page has back button but no clear purpose statement
   - No global nav showing user what they can do
   - No breadcrumb or context about what page they're on

4. **Signal metrics not prominent enough**
   - Win rate, Sharpe ratio buried in result cards
   - Confidence score not visible on signals
   - Visual hierarchy doesn't emphasize "actionable signal" vs "boring HOLD"
   - No visual representation of signal strength

5. **User flow is backwards**
   - Home page tells you about features
   - Test page is where the action happens
   - Should integrate them or make test page primary

6. **Backtest results hard to interpret**
   - No visual representation of performance (charts)
   - Trade history is long table, hard to scan
   - No clear "is this good?" guidance
   - Metrics need context (is 50% win rate good? Is 1.2 Sharpe ratio good?)

7. **No real-world integration**
   - Doesn't show how signals would be used
   - No "take action" buttons
   - No integration hint about GST app
   - Feels disconnected from actual trading

---

## Redesign Goals

1. **Reduce friction to testing** → Get user to actionable results in 2 clicks
2. **Make results scannable** → Visual hierarchy emphasizes key metrics
3. **Show signal quality** → Confidence/strength visible at a glance
4. **Provide context** → Help user understand if results are good
5. **Hint at integration** → Show how signals would be used in real trading
6. **Improve navigation** → Clear purpose and context on every page
7. **Better visual hierarchy** → Most important info largest/brightest

---

## New Layout Structure

### Page 1: Dashboard (NEW - becomes default landing)

**Purpose:** Quick overview of app capability, immediate access to testing

**Layout:**
```
┌─────────────────────────────────────────┐
│  Header: Market Signals | Strategy Info │ (sticky)
├─────────────────────────────────────────┤
│                                         │
│  Quick Test Widget (60% width)          │ 
│  - Symbol input (3 quick buttons: BTC,  │
│    ETH, AAPL)                          │
│  - Strategy picker (3 cards)            │
│  - Days slider                          │
│  - RUN button (prominent)               │
│                                         │
│  [Backtest Running... or Results]       │
│                                         │
├─────────────────────────────────────────┤
│  Results Panel (40% width, right side)  │
│  - Key metrics (2x2 grid):              │
│    Win Rate | Sharpe | Profit Factor   │
│    Max Drawdown                         │
│  - Trade list (small, scrollable)       │
│  - Performance chart (small)             │
│                                         │
└─────────────────────────────────────────┘
```

**Key improvements:**
- Symbol quick buttons (BTC/ETH/AAPL) reduce typing
- Strategy cards show icon + name + expected win rate
- Days slider is more intuitive than text input
- Results appear right next to controls
- Metrics cards are large and scannable
- No need to navigate away from testing

### Page 2: Detailed Results (accessed by clicking "View Details" on dashboard)

**Purpose:** In-depth analysis of a backtest run

**Layout:**
```
┌────────────────────────────────────────────┐
│ Header: BTC | SMA+RSI | 90 days | Run time │
├────────────────────────────────────────────┤
│                                            │
│  Metrics Grid (4x2):                       │
│  ┌──────┬──────┬──────┬──────┐           │
│  │ W.R. │Sharpe│Profit│Draw- │           │
│  │ 60%  │ 1.2  │ 2.1x │ 18%  │           │
│  └──────┴──────┴──────┴──────┘           │
│                                            │
│  Performance Chart (full width):           │
│  - Equity curve (line)                     │
│  - Drawdown chart (area)                   │
│  - Buy/sell markers on chart               │
│                                            │
│  Trade-by-Trade Analysis:                  │
│  ┌───┬──────┬──────┬──────┬──────┬────┐  │
│  │ # │Entry │Exit  │Profit│ %    │Days│  │
│  │ 1 │30200 │31100 │+900  │ +3.0%│  2 │  │
│  │ 2 │31050 │30900 │-150  │ -0.5%│  1 │  │
│  │ 3 │30700 │32500 │+1800 │ +5.9%│  3 │  │
│  └───┴──────┴──────┴──────┴──────┴────┘  │
│                                            │
│  Strategy Notes:                           │
│  - Parameters used                        │
│  - When this strategy works               │
│  - When it struggles                      │
│                                            │
└────────────────────────────────────────────┘
```

**Key improvements:**
- Metrics are large and prominent
- Performance chart shows equity curve + drawdown
- Trade table is scannable with profit/loss highlighted
- Context notes help interpret results

### Page 3: Strategy Comparison (NEW)

**Purpose:** Compare all 3 strategies on same symbol

**Layout:**
```
┌──────────────────────────────────────────┐
│ Header: Compare Strategies | Symbol: BTC  │
├──────────────────────────────────────────┤
│                                          │
│ Strategy 1: SMA+RSI      Strategy 2: MACD │
│ ┌────────────────┐      ┌──────────────┐│
│ │ Win Rate: 60%  │      │ Win Rate: 62%││
│ │ Sharpe: 1.2    │      │ Sharpe: 1.3  ││
│ │ Profit: 2.1x   │      │ Profit: 2.3x ││
│ │ Drawdown: 18%  │      │ Drawdown: 20%││
│ └────────────────┘      └──────────────┘│
│                                          │
│           Strategy 3: Bollinger           │
│           ┌──────────────────────────┐   │
│           │ Win Rate: 65%            │   │
│           │ Sharpe: 1.4              │   │
│           │ Profit: 2.4x             │   │
│           │ Drawdown: 15%            │   │
│           └──────────────────────────┘   │
│                                          │
│ Performance Comparison Chart (overlay)   │
│                                          │
│ Recommendation: Bollinger is best        │
│ (highest Sharpe, lowest drawdown)       │
│                                          │
└──────────────────────────────────────────┘
```

**Key improvements:**
- All 3 strategies visible at once
- Easy to compare metrics side-by-side
- Overlay chart shows actual performance difference
- Recommendation highlights best performer

### Page 4: Integration Guide (NEW)

**Purpose:** Show how to use signals in real trading

**Layout:**
```
┌─────────────────────────────────────┐
│ Integration Guide: Use Signals Fully │
├─────────────────────────────────────┤
│                                     │
│ Step 1: Run Backtest                │
│ ✓ Test strategy on your symbol      │
│ ✓ Review historical performance     │
│ ✓ Adjust if needed                  │
│                                     │
│ Step 2: Connect to GST App           │
│ ✓ GST App uses live signal scores   │
│ ✓ Signals with 60%+ confidence      │
│ ✓ Auto-alerts when new signals arise│
│                                     │
│ Step 3: Execute Trades              │
│ ✓ GST handles position sizing       │
│ ✓ Automatic stop-loss/take-profit   │
│ ✓ Track P&L per trade               │
│                                     │
│ Step 4: Monitor Performance         │
│ ✓ Compare actual vs backtest        │
│ ✓ Adjust parameters if needed       │
│ ✓ Continuous improvement            │
│                                     │
│ [GO TO GST APP] button              │
│                                     │
└─────────────────────────────────────┘
```

**Key improvements:**
- Shows complete workflow
- Explains purpose of each component
- Links signals to real trading
- Clear CTA to GST app integration

---

## Component Changes

### New/Redesigned Components

1. **QuickTestWidget**
   - Symbol quick buttons (BTC, ETH, AAPL, etc.)
   - Strategy cards (visual, not select)
   - Days slider (0-365)
   - Prominent RUN button
   - Inline loading state

2. **MetricsCard** (improved)
   - Large metric number
   - Small metric label
   - Color coding (green for good, red for bad)
   - Comparison to baseline (is this good?)
   - Tooltip with explanation

3. **PerformanceChart** (NEW)
   - Equity curve (line chart)
   - Drawdown overlay (area chart)
   - Buy/sell markers
   - Hover for trade details
   - Legend and legend controls

4. **TradeTable** (redesigned)
   - Entry/exit as cells with price + date
   - Profit column with color coding
   - % return column
   - Duration (days) column
   - Sortable columns
   - Pagination (show 10 at a time)

5. **StrategyCard**
   - Icon
   - Name
   - Description
   - Expected metrics
   - Select/use button

6. **GlobalNav** (NEW)
   - Logo + brand
   - Breadcrumb (Dashboard > Results > Detailed)
   - Quick links
   - Settings/about

---

## Color & Visual Hierarchy

### Metrics Color Coding
- **Green (#10b981)**: Good (high win rate, positive P&L, good Sharpe)
- **Blue (#3b82f6)**: Neutral/Info
- **Yellow (#f59e0b)**: Warning (high drawdown, low win rate)
- **Red (#ef4444)**: Critical (negative returns, very high risk)

### Font Sizes (new)
- **Page title**: 32px, bold
- **Section title**: 24px, bold
- **Metric label**: 14px, dim
- **Metric value**: 32px, bright
- **Metric card**: 18px value, 12px label

### Spacing (new)
- Card padding: 24px
- Card gap: 16px
- Section gap: 32px
- Nav height: 64px

---

## Implementation Phases

### Phase 1: Dashboard Redesign (6h)
- [ ] Create new Dashboard page layout
- [ ] Implement QuickTestWidget
- [ ] Add symbol quick buttons
- [ ] Add strategy cards
- [ ] Add days slider
- [ ] Move backtest controls to primary position
- [ ] Display results inline (right panel)

### Phase 2: Results Page (4h)
- [ ] Create detailed results page
- [ ] Implement MetricsCard (4-up grid)
- [ ] Add performance chart (Recharts/Chart.js)
- [ ] Redesign trade table
- [ ] Add strategy explanation notes

### Phase 3: Strategy Comparison (3h)
- [ ] Create comparison page
- [ ] Display 3 strategies side-by-side
- [ ] Add comparison chart
- [ ] Add recommendation logic
- [ ] Create best-practices filter

### Phase 4: Integration & Polish (4h)
- [ ] Create Integration Guide page
- [ ] Update GST app link
- [ ] Add global navigation
- [ ] Improve responsive design
- [ ] Add animations/transitions
- [ ] Test on mobile

### Phase 5: Testing (2h)
- [ ] Manual testing on desktop/tablet/mobile
- [ ] Verify backtest API still works
- [ ] Check all user flows
- [ ] Performance check

---

## User Flow (Redesigned)

**Old Flow:**
Home → See features → Click "Start Testing" → Test page → Run backtest → See results

**New Flow:**
Dashboard → (1) Enter symbol (2) Pick strategy (3) Click RUN → See results inline

**Reduced steps:** 7 → 3  
**Reduced clicks:** 5 → 3  
**Time to first result:** ~30s → ~8s

---

## Files to Create/Modify

### New Files
- `src/app/dashboard/page.tsx` (main redesigned page)
- `src/app/results/[id]/page.tsx` (detailed results)
- `src/app/compare/page.tsx` (strategy comparison)
- `src/app/integration/page.tsx` (guide)
- `src/components/QuickTestWidget.tsx`
- `src/components/MetricsCard.tsx`
- `src/components/PerformanceChart.tsx`
- `src/components/TradeTable.tsx`
- `src/components/StrategyCard.tsx`
- `src/components/GlobalNav.tsx`

### Modified Files
- `src/app/page.tsx` (home → redirect to dashboard or simplified landing)
- `src/app/test/page.tsx` (keep but reposition)
- `src/app/layout.tsx` (add global nav)

---

## Success Criteria

✅ User can run backtest in <10 seconds  
✅ Metrics are scannable in <5 seconds  
✅ Visual hierarchy is clear (what's important stands out)  
✅ Works on mobile, tablet, desktop  
✅ No loss of functionality (backtest still works)  
✅ Results feel actionable  
✅ User understands how to use signals in trading  

---

## Next Steps

1. Start Phase 1: Dashboard redesign
2. Test backtest API still works with new layout
3. Move to Phase 2: Results page detail
4. Iterate based on functionality
