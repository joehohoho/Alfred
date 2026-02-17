import pool from './client';
import type { Signal } from '@/models/Signal';

export async function insertSignal(signal: Signal): Promise<void> {
  await pool.query(
    `
      INSERT INTO signals
      (symbol, asset_type, signal_type, strategy, short_sma, long_sma, rsi, price, confidence, rationale, generated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `,
    [
      signal.symbol,
      signal.assetType,
      signal.signalType,
      signal.strategy,
      signal.shortSma,
      signal.longSma,
      signal.rsi,
      signal.price,
      signal.confidence,
      signal.rationale,
      signal.generatedAt
    ]
  );
}

export async function getLatestSignals(limit = 20) {
  const { rows } = await pool.query(
    `SELECT * FROM signals ORDER BY generated_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function upsertUserAlert(userId: string, symbol: string, threshold: number, enabled: boolean) {
  await pool.query(
    `
      INSERT INTO user_alerts (user_id, symbol, threshold, enabled)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (user_id, symbol)
      DO UPDATE SET threshold = EXCLUDED.threshold, enabled = EXCLUDED.enabled, updated_at = NOW()
    `,
    [userId, symbol.toUpperCase(), threshold, enabled]
  );
}

export async function listUserAlerts(userId: string) {
  const { rows } = await pool.query(
    `SELECT * FROM user_alerts WHERE user_id = $1 ORDER BY symbol ASC`,
    [userId]
  );
  return rows;
}
