/**
 * Order flow filter — adjusts signal strength using CVD analysis and
 * liquidation level proximity.
 *
 * Rationale:
 * - CVD divergence reveals hidden buying/selling pressure not visible in price.
 * - Liquidation clusters act as price magnets — cascading liquidations accelerate moves.
 * - Aggressive buy/sell ratio shows who is in control right now.
 */

import type { SignalWithStrength } from '@/services/backtest/engine';
import type { PriceSeries } from '@/models/PriceData';
import { computeOrderFlow } from '@/services/data/orderFlowClient';
import { getLiquidationLevels } from '@/services/data/liquidationClient';

/**
 * Apply order flow and liquidation-based modifiers to a signal.
 * Liquidation API calls are non-fatal: if they fail, those modifiers are skipped.
 */
export async function applyOrderFlowModifier(
  signal: SignalWithStrength,
  symbol: string,
  series: PriceSeries,
  signalIndex: number,
): Promise<SignalWithStrength> {
  if (signal.type === 'HOLD') return signal;

  let strength = signal.strength;

  // Extract OHLCV arrays up to signalIndex (inclusive)
  const end = Math.min(signalIndex + 1, series.points.length);
  const lookback = Math.min(20, end); // use up to 20 bars for CVD
  const start = end - lookback;
  const slice = series.points.slice(start, end);

  const opens = slice.map((p) => p.open ?? p.close);
  const closes = slice.map((p) => p.close);
  const highs = slice.map((p) => p.high ?? p.close);
  const lows = slice.map((p) => p.low ?? p.close);
  const volumes = slice.map((p) => p.volume ?? 0);

  // --- 1. CVD analysis ---
  const orderFlow = computeOrderFlow(opens, closes, highs, lows, volumes);

  // Bullish CVD divergence (price falling but CVD rising) + BUY = accumulation
  if (orderFlow.divergence === 'bullish_div' && signal.type === 'BUY') {
    strength *= 1.4;
  }

  // Bearish CVD divergence (price rising but CVD falling) + BUY = distribution
  if (orderFlow.divergence === 'bearish_div' && signal.type === 'BUY') {
    strength *= 0.5;
  }

  // Bearish CVD divergence + SELL = confirms distribution
  if (orderFlow.divergence === 'bearish_div' && signal.type === 'SELL') {
    strength *= 1.4;
  }

  // Bullish CVD divergence + SELL = weakens the sell
  if (orderFlow.divergence === 'bullish_div' && signal.type === 'SELL') {
    strength *= 0.5;
  }

  // Aggressive buy ratio
  if (orderFlow.aggressiveBuyRatio > 1.3 && signal.type === 'BUY') {
    strength *= 1.2;
  }
  if (orderFlow.aggressiveBuyRatio < 0.77 && signal.type === 'SELL') {
    // Inverse: aggressive sellers dominate, confirms SELL
    strength *= 1.2;
  }

  // --- 2. Liquidation level proximity ---
  try {
    const currentPrice = closes[closes.length - 1];
    const liqLevels = await getLiquidationLevels(symbol, currentPrice);

    if (liqLevels) {
      const distToLongLiq =
        (currentPrice - liqLevels.nearestLongLiquidation) / currentPrice;
      const distToShortLiq =
        (liqLevels.nearestShortLiquidation - currentPrice) / currentPrice;

      // Price approaching nearest long liquidation cluster (within 3%) + BUY = cascade risk
      if (distToLongLiq < 0.03 && signal.type === 'BUY') {
        strength *= 0.6;
      }

      // Price approaching nearest short liquidation cluster (within 3%) + BUY = short squeeze likely
      if (distToShortLiq < 0.03 && signal.type === 'BUY') {
        strength *= 1.3;
      }

      // Price approaching nearest short liquidation cluster (within 3%) + SELL = squeeze risk
      if (distToShortLiq < 0.03 && signal.type === 'SELL') {
        strength *= 0.6;
      }

      // Price approaching nearest long liquidation cluster (within 3%) + SELL = cascade confirms
      if (distToLongLiq < 0.03 && signal.type === 'SELL') {
        strength *= 1.3;
      }

      // Magnet direction
      if (liqLevels.magnetDirection === 'up' && signal.type === 'BUY') {
        strength *= 1.15;
      }
      if (liqLevels.magnetDirection === 'down' && signal.type === 'SELL') {
        strength *= 1.15;
      }
    }
  } catch (err) {
    console.warn('[OrderFlowFilter] Liquidation data fetch failed (non-fatal):', err);
  }

  // Clamp to [0.1, 2.0]
  strength = Math.max(0.1, Math.min(2.0, strength));

  if (strength === signal.strength) return signal;

  return { ...signal, strength };
}
