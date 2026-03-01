# Signal App Research — Market Signal Lab

*Started: 2026-03-01*

---

## Source: atlas_arche_en (Moltbook m/openclaw-explorers, 10↑)

Another OpenClaw operator building a stock monitoring system with:
- **20% profit-take alerts** — fire when position is up 20% from entry
- **8% stop-loss alerts** — fire when position is down 8% from entry

This is a position-tracking alert model, not just a signal-generation model. Key distinction:
- Market Signal Lab currently generates **entry signals** (BUY/SELL based on strategy)
- atlas_arche_en's system generates **position management alerts** (profit-take + stop-loss from a known entry price)

These are complementary, not competing approaches.

---

## Gap Analysis: What MSL Is Missing vs. atlas_arche_en Approach

### 1. Position Tracking (MISSING)
MSL has no concept of an open position. It fires BUY/SELL signals but doesn't track:
- Entry price when a BUY was triggered
- Current P&L vs. entry
- When profit-take or stop-loss thresholds are hit

atlas_arche_en's 20%/8% model implies a position ledger running alongside signal generation.

**Improvement:** Add a simple `positions.json` or DuckDB table that records:
- asset, entry_price, entry_date, strategy, quantity (or % allocation)
- Check on each scan: if current_price >= entry * 1.20 → profit-take alert; if current_price <= entry * 0.92 → stop-loss alert

### 2. Percentage-Based Alert Thresholds (MISSING)
MSL's AlertManager triggers on signal type (BUY/SELL) but not on price movement %.
atlas_arche_en uses fixed % thresholds — simple, interpretable, Joe-friendly.

MSL already has ATR-based stops in the backtest engine but they don't surface as live alerts.

**Improvement:** Add `profit_take_pct` and `stop_loss_pct` config options to `config.yaml` alerts section:
```yaml
alerts:
  position_management:
    enabled: true
    profit_take_pct: 20.0   # alert when up 20%
    stop_loss_pct: 8.0      # alert when down 8%
```

### 3. Entry Price Recording (MISSING)
When MSL fires a BUY signal, there's no mechanism to record "entry was at $X".
Without this, profit-take/stop-loss % calculations are impossible.

**Improvement:** On BUY signal alert dispatch, also write to a positions ledger.
On SELL signal or threshold breach, close the position record.

### 4. Discord Alerts (MISSING — Slack only)
MSL currently alerts via Slack only. Joe's workflow has moved toward Discord.
atlas_arche_en context not confirmed on this but worth noting for MSL.

**Improvement:** Add Discord webhook support to AlertManager alongside Slack.
Can reuse `DISCORD_WEBHOOK_MSL_GENERAL` from `.env`.

---

## What MSL Already Does Well (No Change Needed)
- Multi-strategy signal generation (SMA crossover, RSI, Donchian)
- ATR-based stops in backtest (just not wired to live alerts)
- ADX regime detection (trending vs. ranging filter)
- Multi-timeframe confirmation
- ML feature engineering (30+ features)
- Alternative data (Fear & Greed, funding rates, BTC dominance)

---

## Prioritized Improvement Actions

| Priority | Improvement | Effort | Value |
|----------|------------|--------|-------|
| 1 | Add position ledger (DuckDB table) | Medium | High — enables all % alerts |
| 2 | Add profit-take/stop-loss % alerts to AlertManager | Low | High — direct atlas_arche_en learning |
| 3 | Add Discord webhook to AlertManager | Low | Medium — Joe's preferred channel |
| 4 | Surface ATR stops from backtest into live alerts | Medium | Medium — already computed, just not wired |

---

## Safety Notes
- All improvements are read-only signal generation + alerting — no trade execution
- Position ledger is informational only (no brokerage integration)
- Fully aligned with MSL's "educational/research purposes only" disclaimer

*Last updated: 2026-03-01 by Alfred*
