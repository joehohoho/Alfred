# Monthly Growth Review Cadence

## Cadence
- **Weekly (30 min):** KPI pulse + experiment check-in
- **Monthly (90 min):** Full growth review using `monthly-growth-kpi-dashboard.md`
- **Quarterly (2 hrs):** Strategy reset + KPI target recalibration

## Monthly Review Agenda (90 min)

### 1) KPI Scorecard (20 min)
- Review MRR, NRR, CAC payback, activation rate, experiment velocity
- Mark each KPI: Green / Yellow / Red
- Identify 1 leading and 1 lagging signal per KPI

### 2) Funnel & Segment Diagnostic (25 min)
- Where drop-off changed most MoM?
- Which segment drove gains/losses? (region, plan, source)
- Validate instrumentation quality before conclusions

### 3) Experiment Portfolio Review (20 min)
- # launched vs target
- Win rate and median lift
- Time-to-decision per experiment
- Archive dead experiments; promote winners to default

### 4) Retention/Revenue Mechanics (15 min)
- Expansion/contraction/churn decomposition for NRR
- Churn reasons top 3 + confidence level
- Win-back performance

### 5) Commitments (10 min)
- Define next month targets and top 3 growth bets
- Assign owner + due date per bet

## Meeting Artifacts (required)
1. Filled KPI dashboard file
2. Experiment ledger updated
3. Decision log (what changed and why)
4. Next-month commitments with owners

## Quality Gate
Do **not** finalize monthly decisions if:
- KPI definitions changed mid-period
- event tracking had major outages
- segment data is incomplete/unreconciled

## KPI Dashboard Build Spec
Use these widgets in your dashboard tool (Supabase SQL/BI):
1. KPI cards: MRR, NRR, CAC payback, Activation, Experiment velocity
2. 6-month trend lines for each KPI
3. Funnel conversion chart
4. Segment heatmap (region x plan x source)
5. Experiment table (status, lift, decision)

This template is intended to be copied monthly into `reports/growth/YYYY-MM-growth-review.md`.
