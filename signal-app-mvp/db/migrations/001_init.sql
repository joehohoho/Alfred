-- Signal App MVP Database Schema

CREATE TABLE IF NOT EXISTS signals (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  asset_type VARCHAR(10) NOT NULL CHECK (asset_type IN ('crypto', 'stock')),
  signal_type VARCHAR(10) NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'HOLD')),
  strategy VARCHAR(50) NOT NULL,
  short_sma DECIMAL(12, 4) NOT NULL,
  long_sma DECIMAL(12, 4) NOT NULL,
  rsi DECIMAL(5, 2) NOT NULL,
  price DECIMAL(18, 8) NOT NULL,
  confidence DECIMAL(5, 4) NOT NULL,
  rationale TEXT,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signals_symbol ON signals(symbol);
CREATE INDEX idx_signals_generated_at ON signals(generated_at DESC);
CREATE INDEX idx_signals_signal_type ON signals(signal_type);

CREATE TABLE IF NOT EXISTS user_alerts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  threshold DECIMAL(5, 4) NOT NULL DEFAULT 0.5,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

CREATE INDEX idx_user_alerts_user_id ON user_alerts(user_id);
CREATE INDEX idx_user_alerts_enabled ON user_alerts(enabled);

CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  asset_type VARCHAR(10) NOT NULL CHECK (asset_type IN ('crypto', 'stock')),
  side VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
  quantity DECIMAL(18, 8) NOT NULL,
  price DECIMAL(18, 8) NOT NULL,
  executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  signal_id INTEGER REFERENCES signals(id) ON DELETE SET NULL
);

CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_executed_at ON trades(executed_at DESC);
