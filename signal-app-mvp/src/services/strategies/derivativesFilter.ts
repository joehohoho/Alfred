/**
 * Derivatives filter — adjusts signal strength using funding rate, open interest,
 * and long/short account ratio from Binance Futures.
 *
 * Rationale:
 * - Extreme funding rates signal overleveraged positions (mean-reversion risk).
 * - Crowded long/short ratios suggest limited upside/downside.
 * - OI divergence from price reveals whether moves are backed by new money or just position closing.
 */

import type { SignalWithStrength } from '@/services/backtest/engine';
import {
  getFundingRate,
  getOpenInterest,
  getLongShortRatio,
} from '@/services/data/derivativesClient';

/**
 * Apply derivatives-based modifiers to a signal. All API calls are non-fatal:
 * if any fetch fails, that modifier is skipped (signal passes through unchanged).
 */
export async function applyDerivativesModifier(
  signal: SignalWithStrength,
  symbol: string,
): Promise<SignalWithStrength> {
  if (signal.type === 'HOLD') return signal;

  let strength = signal.strength;

  // --- 1. Funding rate modifier ---
  try {
    const fundingHistory = await getFundingRate(symbol);
    if (fundingHistory.length > 0) {
      const latestRate = fundingHistory[fundingHistory.length - 1].rate;

      // Extreme positive funding (> 0.05%): longs are paying — overleveraged longs, crash risk
      if (latestRate > 0.0005 && signal.type === 'BUY') {
        strength *= 0.5;
      }
      // Extreme negative funding (< -0.03%): shorts are paying — overleveraged shorts, squeeze risk
      if (latestRate < -0.0003 && signal.type === 'SELL') {
        strength *= 0.5;
      }
    }
  } catch (err) {
    console.warn('[DerivativesFilter] Funding rate fetch failed (non-fatal):', err);
  }

  // --- 2. Long/Short ratio modifier ---
  try {
    const lsHistory = await getLongShortRatio(symbol);
    if (lsHistory.length > 0) {
      const latest = lsHistory[lsHistory.length - 1];

      // > 68% long: crowd is already long — limited upside for new BUYs
      if (latest.longRatio > 68 && signal.type === 'BUY') {
        strength *= 0.6;
      }
      // < 45% long (i.e., > 55% short): crowd is already short
      if (latest.longRatio < 45 && signal.type === 'SELL') {
        strength *= 0.6;
      }
    }
  } catch (err) {
    console.warn('[DerivativesFilter] Long/Short ratio fetch failed (non-fatal):', err);
  }

  // --- 3. OI divergence modifier ---
  try {
    const oiHistory = await getOpenInterest(symbol);
    if (oiHistory.length >= 2) {
      const recent = oiHistory[oiHistory.length - 1].oi;
      const previous = oiHistory[oiHistory.length - 2].oi;
      const oiRising = recent > previous;
      const oiFalling = recent < previous;

      // We infer price direction from the signal itself:
      // BUY signal = strategy thinks price should go up
      // SELL signal = strategy thinks price should go down
      if (signal.type === 'BUY') {
        if (oiFalling) {
          // Price rising + OI falling: rally driven by short closing, weak
          strength *= 0.7;
        } else if (oiRising) {
          // Price rising + OI rising: new money entering, strong trend
          strength *= 1.3;
        }
      }

      if (signal.type === 'SELL') {
        if (oiFalling) {
          // Price falling + OI falling: drop driven by long closing, weak
          strength *= 0.7;
        }
        // Price falling + OI rising = new short interest, strong — no modifier (already bearish enough)
      }
    }
  } catch (err) {
    console.warn('[DerivativesFilter] OI fetch failed (non-fatal):', err);
  }

  // Clamp to [0, 1]
  strength = Math.max(0, Math.min(1, strength));

  if (strength === signal.strength) return signal;

  return { ...signal, strength };
}
