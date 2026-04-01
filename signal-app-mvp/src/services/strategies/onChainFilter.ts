/**
 * On-chain filter — adjusts signal strength using taker buy/sell ratio,
 * top trader positioning, MVRV proxy, and taker trend.
 *
 * Rationale:
 * - Taker buy/sell ratio reflects aggressive order flow (smart money direction).
 * - Top trader positioning at extremes suggests crowded trades (contrarian edge).
 * - MVRV proxy (price/200SMA) gauges overvaluation / undervaluation.
 * - Sustained taker selling trend confirms SELL signals.
 */

import type { SignalWithStrength } from '@/services/backtest/engine';
import { getOnChainMetrics } from '@/services/data/onChainClient';

/**
 * Apply on-chain-based modifiers to a signal. All API calls are non-fatal:
 * if the fetch fails, the signal passes through unchanged.
 */
export async function applyOnChainModifier(
  signal: SignalWithStrength,
  symbol: string,
  closes?: number[],
): Promise<SignalWithStrength> {
  if (signal.type === 'HOLD') return signal;

  let strength = signal.strength;

  try {
    const metrics = await getOnChainMetrics(symbol, closes);
    if (!metrics) return signal;

    const { takerBuySellRatio, topTraderLongRatio, mvrvProxy, takerTrend } = metrics;

    if (signal.type === 'BUY') {
      // --- Taker buy/sell ratio ---
      if (takerBuySellRatio > 1.2) {
        // Smart money buying aggressively — confirms BUY
        strength *= 1.3;
      } else if (takerBuySellRatio < 0.8) {
        // Smart money selling aggressively — weakens BUY
        strength *= 0.6;
      }

      // --- Top trader positioning (contrarian) ---
      if (topTraderLongRatio > 60) {
        // Crowded long — limited upside
        strength *= 0.7;
      } else if (topTraderLongRatio < 40) {
        // Contrarian buy — crowd is short
        strength *= 1.3;
      }

      // --- MVRV proxy ---
      if (mvrvProxy > 3.0) {
        // Extremely overvalued relative to 200SMA — heavy discount
        strength *= 0.4;
      } else if (mvrvProxy < 1.0) {
        // Extremely undervalued — strong buy confirmation
        strength *= 1.5;
      }
    }

    if (signal.type === 'SELL') {
      // --- Taker buy/sell ratio (inverted for sells) ---
      if (takerBuySellRatio < 0.8) {
        // Smart money selling — confirms SELL
        strength *= 1.3;
      } else if (takerBuySellRatio > 1.2) {
        // Smart money buying — weakens SELL
        strength *= 0.6;
      }

      // --- Top trader positioning (contrarian for sells) ---
      if (topTraderLongRatio < 40) {
        // Crowded short — limited downside
        strength *= 0.7;
      } else if (topTraderLongRatio > 60) {
        // Contrarian sell — crowd is long
        strength *= 1.3;
      }

      // --- MVRV proxy for sells ---
      if (mvrvProxy < 1.0) {
        // Extremely undervalued — weaken SELL
        strength *= 0.4;
      } else if (mvrvProxy > 3.0) {
        // Extremely overvalued — confirm SELL
        strength *= 1.5;
      }

      // --- Sustained taker selling trend ---
      if (takerTrend === 'selling') {
        // 3+ days of taker selling — strong SELL confirmation
        strength *= 1.3;
      }
    }
  } catch (err) {
    console.warn('[OnChainFilter] On-chain modifier failed (non-fatal):', err);
    return signal;
  }

  // Clamp to [0.1, 2.0]
  strength = Math.max(0.1, Math.min(2.0, strength));

  if (strength === signal.strength) return signal;

  return { ...signal, strength };
}
