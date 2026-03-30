# Monthly Growth KPI Dashboard (Template)

**Period:** {{YYYY-MM}}  
**Owner:** {{Name}}  
**Reviewed on:** {{Date}}

## North-Star Snapshot

| KPI | Current | Previous Month | Target | Trend | Status |
|---|---:|---:|---:|---|---|
| MRR | {{mrr_current}} | {{mrr_prev}} | {{mrr_target}} | {{mrr_trend_pct}} | {{on_track?}} |
| Net Revenue Retention (NRR) | {{nrr_current}}% | {{nrr_prev}}% | {{nrr_target}}% | {{nrr_trend_pp}} pp | {{on_track?}} |
| CAC Payback (months) | {{cac_payback_current}} | {{cac_payback_prev}} | {{cac_payback_target}} | {{cac_payback_trend}} | {{on_track?}} |
| Activation Rate | {{activation_current}}% | {{activation_prev}}% | {{activation_target}}% | {{activation_trend_pp}} pp | {{on_track?}} |
| Experiment Velocity | {{experiments_shipped}} /mo | {{experiments_prev}} /mo | {{experiments_target}} /mo | {{velocity_trend}} | {{on_track?}} |

---

## KPI Definitions (locked)

1. **MRR** = Sum of monthly-recurring subscription revenue active at month end (normalized to monthly).
2. **NRR** = (Starting MRR + Expansion − Contraction − Churn) / Starting MRR.
3. **CAC Payback** = CAC / Monthly gross margin per new customer.
4. **Activation Rate** = % new signups in month who complete activation milestone within 14 days.
5. **Experiment Velocity** = # experiments launched to production in month (with hypothesis + result artifact).

> Activation milestone (recommended): Created organization + first campaign + first event + first donation/checkout intent.

---

## Segment Cut (required)

| Segment | MRR | NRR | Activation | Trial→Paid | Notes |
|---|---:|---:|---:|---:|---|
| Region: US | {{}} | {{}} | {{}} | {{}} | {{}} |
| Region: CA | {{}} | {{}} | {{}} | {{}} | {{}} |
| Plan: Free→Basic | {{}} | {{}} | {{}} | {{}} | {{}} |
| Plan: Basic→Pro | {{}} | {{}} | {{}} | {{}} | {{}} |
| Acquisition: Organic | {{}} | {{}} | {{}} | {{}} | {{}} |
| Acquisition: Paid | {{}} | {{}} | {{}} | {{}} | {{}} |

---

## Funnel Health (monthly)

| Funnel Step | Count | Conversion |
|---|---:|---:|
| Visitors | {{visitors}} | — |
| Signup Started | {{signup_started}} | {{signup_started_cv}} |
| Signup Completed | {{signup_completed}} | {{signup_completed_cv}} |
| Activated (D14) | {{activated}} | {{activation_cv}} |
| Checkout Started | {{checkout_started}} | {{checkout_started_cv}} |
| Paid | {{paid}} | {{trial_to_paid_cv}} |

---

## Experiment Ledger (this month)

| Experiment | Hypothesis | Segment | Result | Lift | Decision |
|---|---|---|---|---:|---|
| {{exp_1}} | {{}} | {{}} | {{win/lose/inconclusive}} | {{}} | {{ship/iterate/stop}} |
| {{exp_2}} | {{}} | {{}} | {{}} | {{}} | {{}} |
| {{exp_3}} | {{}} | {{}} | {{}} | {{}} | {{}} |

---

## Risks & Blockers

1. {{risk_1}}
2. {{risk_2}}
3. {{risk_3}}

## Next Month Commitments

- **MRR Goal:** {{}}
- **Activation Goal:** {{}}
- **NRR Goal:** {{}}
- **Experiment Goal:** {{}}
- **Top 3 bets:**
  1) {{}}
  2) {{}}
  3) {{}}
