# Stock/Crypto Buy-Sell Signal App (MVP)

## Overview
- **Purpose:** Identify optimal buy/sell timing for stocks and cryptocurrencies using technical analysis and machine learning
- **Tech Stack:** Python (ML + backend) + React/Next.js (frontend) + PostgreSQL (signal database)
- **Status:** Early stage / MVP (active development)
- **GitHub:** [Link to repo - update after confirmation]
- **Live URL:** [Demo/staging URL - update after confirmation]

## Project Goals
1. Generate accurate buy/sell signals for crypto and stock trading
2. Reduce emotional decision-making in trading
3. Backtest strategies against historical data
4. Provide real-time alerts when conditions are met
5. Support multiple timeframes and chart patterns

## Current Phase: MVP Development
**Scope:** Build core signal generation engine + basic web dashboard  
**Timeline:** Q2 2026 (estimated)  
**Owner:** Joe (strategy) + Alfred (automation) + HAL (analysis)

## Architecture

### Frontend
- **Framework:** React or Next.js
- **Port:** 3001 (local) / Production port TBD
- **Key Features:**
  - Signal performance dashboard
  - Live signal alerts
  - Backtest result viewer
  - Strategy configuration UI
  - Historical signal review

### Backend
- **Framework:** Python (FastAPI/Flask) or Node.js
- **Port:** 5001 (local) / Production port TBD
- **Key Services:**
  - Signal generation engine
  - Market data ingestion (Yahoo Finance, Crypto APIs)
  - Backtest runner
  - Alert notification system
  - User portfolio tracking

### Data Layer
- **Type:** PostgreSQL (signals + configuration)
- **External Data:** Yahoo Finance, CoinGecko, Binance, etc.
- **Storage:** Historical price data (local or cloud)

## Database Schema

### Core Tables
```
users
├── id (PK)
├── email
├── name
└── api_keys (encrypted)

strategies
├── id (PK)
├── name
├── description
├── parameters (JSON)
├── status (active/testing/archived)
├── owner_id (FK)
└── created_at

signals
├── id (PK)
├── strategy_id (FK)
├── symbol (AAPL, BTC, etc)
├── signal_type (BUY/SELL/HOLD)
├── confidence (0-1)
├── price_at_signal
├── generated_at
├── expires_at
└── metadata (JSON)

backtest_results
├── id (PK)
├── strategy_id (FK)
├── symbol
├── start_date
├── end_date
├── win_rate
├── total_return
├── max_drawdown
├── sharpe_ratio
├── results_json
└── created_at

alerts
├── id (PK)
├── signal_id (FK)
├── user_id (FK)
├── notification_sent
├── user_action (BUY/SELL/IGNORED)
└── timestamp
```

## API Endpoints

### Signals
- `GET /api/signals` — Get current signals
- `GET /api/signals/:symbol` — Get signals for specific symbol
- `POST /api/signals/generate` — Trigger signal generation (admin)
- `GET /api/signals/:signalId/details` — Get signal details + reasoning

### Strategies
- `POST /api/strategies` — Create new strategy
- `GET /api/strategies` — List user's strategies
- `GET /api/strategies/:strategyId` — Get strategy config
- `PUT /api/strategies/:strategyId` — Update parameters
- `POST /api/strategies/:strategyId/backtest` — Run backtest

### Backtests
- `GET /api/backtests/:strategyId` — Get backtest results
- `GET /api/backtests/:strategyId/equity-curve` — Download equity curve data
- `POST /api/backtests/:strategyId/optimize` — Run parameter optimization

### Market Data
- `GET /api/prices/:symbol` — Get OHLCV data
- `GET /api/technical-indicators/:symbol` — Get calculated indicators

## Deployment

### Local Development
```bash
cd signal-app-mvp
# Backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py  # Runs on port 5001

# Frontend
cd frontend && npm start  # Runs on port 3001
```

### Production Deployment
**[Document deployment process]**
- Environment: [AWS/GCP/Heroku/Other]
- Market data refresh schedule: Hourly/Daily
- Database: Managed PostgreSQL
- Cache layer: Redis (optional, for signal lookups)
- Monitoring: [Logging + alerting setup]

## Technical Details

### Signal Generation Strategy
**Core Indicators (currently implemented or planned):**
- ✅ Moving averages (SMA, EMA, WMA)
- ✅ RSI (Relative Strength Index)
- ✅ MACD (Moving Average Convergence Divergence)
- ✅ ADX (Average Directional Index) - regime filtering
- ⏳ Bollinger Bands
- ⏳ Stochastic oscillator
- ⏳ Volume analysis
- ⏳ Machine learning features (30+ features)

**Confirmation Rules:**
- Multi-timeframe confirmation (daily + 4-hour)
- Volume-scaled entry sizing
- Risk-reward ratio validation (min 2:1)
- Trailing stop implementation
- Short-selling support

### Backtesting Engine
- Historical data: Yahoo Finance (stocks) + CoinGecko (crypto)
- Slippage modeling: [% or ticks]
- Commission: [per-trade or %]
- Drawdown tracking: Peak-to-trough
- Performance metrics: Win rate, Sharpe ratio, Calmar ratio, etc.

### Alert System
- Real-time signal notifications via:
  - Email
  - Discord/Telegram
  - SMS (optional)
  - In-app notification
- Alert batching: Avoid notification spam

## Known Issues & Limitations

### Current Limitations
- ❌ No live trading execution (signal-only, user must execute)
- ❌ Crypto signals only tested on Binance (not multi-exchange)
- ⚠️ Drawdown calculation may lag during extreme volatility
- ⚠️ ML models require retraining (every 3 months recommended)

### Known Bugs
- [ ] Bug #1: [Description] (Status: Open/In Progress)
- [ ] Bug #2: [Description]

### Performance Notes
- Backtesting 5+ years of data: ~2-5 min per symbol
- Real-time signal generation: <2 sec per symbol
- Database indexes needed on: signals.symbol, signals.generated_at

## Features & Status

### MVP (Current)
- ✅ Technical indicator calculation
- ✅ Multi-timeframe signal confirmation
- ✅ Backtest framework
- ✅ Basic dashboard
- ⏳ Real-time alerts (in progress)
- ⏳ Strategy parameter optimization (in progress)

### v1.0 (Next phase)
- Live Telegram/Discord alerts
- Strategy performance leaderboard
- Community signal sharing
- Advanced backtesting (Monte Carlo, walk-forward)

### v1.1+ (Roadmap)
- Live paper trading (simulate execution)
- Portfolio tracking + correlation analysis
- Sentiment analysis integration
- Alternative data feeds (on-chain metrics, etc.)

## Recent Development

### [2026-03-20] Discovery Phase Results
- Scope identified: Core signal engine + basic UI
- Tech difficulty: 2/5 (achievable)
- Data models: Complete
- UIs: Still needed
- Estimated implementation: 3 weeks (with HAL parallel work)

### [2026-02-20] Market Signal Lab Integration
- Integrated with Command Center dashboard (port 8002)
- Added 10 major improvements:
  - ADX regime filtering
  - Multi-timeframe confirmation
  - Vectorized strategies
  - 30+ ML features
  - Trailing stops
  - Short selling support
  - Volume-scaled sizing
  - Alternative data pipeline
  - ATR-scaled targets
  - 8 new technical indicators

## Access & Credentials

### GitHub
- **Repo:** [URL]
- **Branch:** main (stable), develop (active), feature/* (WIP)
- **Access:** [Who has access]

### Data Sources
- **Yahoo Finance:** Free API, no auth needed
- **CoinGecko:** Free API, rate limit 10 calls/min
- **Binance:** API key stored in `.env` (encrypted)
  - Location: `~/.openclaw/workspace/.env.trading`
  - Permissions: Read-only (no trading)

### Databases
- **Production:** [Connection string - keep secure]
- **Backups:** [Retention policy]

## Development Workflow

### Getting Started
1. Clone repo: `git clone [repo-url]`
2. Setup Python environment: `python -m venv venv && source venv/bin/activate`
3. Install deps: `pip install -r requirements.txt`
4. Setup frontend: `cd frontend && npm install`
5. Copy config: `cp config.example.json config.json` and fill in API keys
6. Run tests: `pytest tests/`
7. Start dev server: `python main.py`

### Testing
```bash
pytest tests/               # Run all tests
pytest tests/signals/       # Run signal tests only
pytest --cov               # Coverage report
python -m pytest -vvs      # Verbose output
```

### Backtesting Locally
```bash
python scripts/backtest.py --strategy=macd --symbol=AAPL --years=5
python scripts/optimize.py --strategy=rsi --symbol=BTC --param=threshold
```

## Monitoring & Maintenance

### Daily Tasks
- [ ] Check signal generation ran successfully
- [ ] Verify alert delivery (count + success rate)
- [ ] Monitor API rate limits (avoid overages)

### Weekly Tasks
- [ ] Review signal win rate + accuracy
- [ ] Check database size + cleanup old data (>6 months)
- [ ] Verify backtest engine performance

### Monthly Tasks
- [ ] Retest all strategies with latest data
- [ ] Update market data sources (check for API changes)
- [ ] Performance review meeting (signal accuracy trends)

## Contact & Support

**Primary Owner:** Joe (strategy + vision)  
**Technical Lead:** Alfred (automation + deployment)  
**Research:** HAL (backtesting + analysis)  
**Slack Channel:** #signal-app (if applicable)  
**Issue Tracking:** GitHub Issues  

---

**Last Updated:** 2026-03-23  
**Status:** MVP Development (Early Stage)  
**Next Milestone:** Complete signal engine + UI (Q2 2026)
