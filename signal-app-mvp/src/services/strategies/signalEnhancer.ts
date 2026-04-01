import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength } from '@/services/backtest/engine';
import { getMultiTimeframeConfluence, applyMultiTimeframeModifier } from './multiTimeframe';
import { computeVolumeProfile, applyVolumeProfileModifier } from './volumeProfile';
import { applyOnChainModifier } from './onChainFilter';
import { applyOrderFlowModifier } from './orderFlowFilter';
import { getSignalWinProbability } from '@/services/learning/signalClassifier';

/**
 * Async signal enhancement pipeline.
 *
 * Runs AFTER the synchronous `filterSignals()` from signalFilter.ts.
 * Applies multi-timeframe confluence, volume profile, on-chain data,
 * order flow analysis, and ML win probability modifiers.
 * Each step is independently guarded so a failure in one does not block the others.
 */
export async function enhanceSignals(
  series: PriceSeries,
  signals: SignalWithStrength[],
  symbol: string,
): Promise<SignalWithStrength[]> {
  if (signals.length === 0) return signals;

  let enhanced = [...signals];

  // --- Step 1: Multi-timeframe confluence ---
  try {
    const confluence = getMultiTimeframeConfluence(series);
    enhanced = enhanced.map((s) => applyMultiTimeframeModifier(s, confluence));
  } catch (err) {
    console.warn('[SignalEnhancer] Multi-timeframe confluence failed (non-fatal):', err);
  }

  // --- Step 2: Volume profile ---
  try {
    const profile = computeVolumeProfile(series);
    enhanced = enhanced.map((s) =>
      applyVolumeProfileModifier(s, profile, s.price),
    );
  } catch (err) {
    console.warn('[SignalEnhancer] Volume profile failed (non-fatal):', err);
  }

  // --- Step 3: On-chain data (taker ratio, top trader positioning, MVRV proxy) ---
  try {
    enhanced = await Promise.all(
      enhanced.map((s) => applyOnChainModifier(s, symbol, series.points.map((p) => p.close))),
    );
  } catch (err) {
    console.warn('[SignalEnhancer] On-chain modifier failed (non-fatal):', err);
  }

  // --- Step 4: Order flow (CVD, liquidation levels) ---
  try {
    // Build date-to-index map for order flow lookups
    const dateIndex = new Map<string, number>();
    for (let i = 0; i < series.points.length; i++) {
      const ts = series.points[i].timestamp instanceof Date
        ? series.points[i].timestamp
        : new Date(series.points[i].timestamp as unknown as string);
      dateIndex.set((ts as Date).toISOString().split('T')[0], i);
    }
    enhanced = await Promise.all(
      enhanced.map((s) => {
        const signalDate = s.time instanceof Date ? s.time : new Date(s.time as unknown as string);
        const idx = dateIndex.get(signalDate.toISOString().split('T')[0]) ?? -1;
        if (idx < 0) return Promise.resolve(s);
        return applyOrderFlowModifier(s, symbol, series, idx);
      }),
    );
  } catch (err) {
    console.warn('[SignalEnhancer] Order flow modifier failed (non-fatal):', err);
  }

  // --- Step 5: ML win probability (logistic regression classifier) ---
  try {
    const dateIndex = new Map<string, number>();
    for (let i = 0; i < series.points.length; i++) {
      const ts = series.points[i].timestamp instanceof Date
        ? series.points[i].timestamp
        : new Date(series.points[i].timestamp as unknown as string);
      dateIndex.set((ts as Date).toISOString().split('T')[0], i);
    }
    enhanced = enhanced.map((s) => {
      if (s.type === 'HOLD') return s;
      const signalDate = s.time instanceof Date ? s.time : new Date(s.time as unknown as string);
      const idx = dateIndex.get(signalDate.toISOString().split('T')[0]) ?? -1;
      if (idx < 0) return s;
      const winProb = getSignalWinProbability(symbol, series, idx);
      if (winProb === null) return s; // model not trained yet
      let modifier = 1.0;
      if (s.type === 'BUY') {
        if (winProb < 0.35) modifier = 0.4;       // high loss probability → weaken
        else if (winProb > 0.65) modifier = 1.3;   // high win probability → boost
        else modifier = 0.7 + winProb;              // linear scale 0.7-1.35
      } else if (s.type === 'SELL') {
        // For SELL, low win prob = bearish = strengthen sell
        if (winProb < 0.35) modifier = 1.3;
        else if (winProb > 0.65) modifier = 0.6;
      }
      return { ...s, strength: Math.min(2.0, Math.max(0.1, s.strength * modifier)) };
    });
  } catch (err) {
    console.warn('[SignalEnhancer] ML win probability failed (non-fatal):', err);
  }

  return enhanced;
}
