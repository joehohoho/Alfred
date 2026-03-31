import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength } from '@/services/backtest/engine';
import { getMultiTimeframeConfluence, applyMultiTimeframeModifier } from './multiTimeframe';
import { computeVolumeProfile, applyVolumeProfileModifier } from './volumeProfile';

/**
 * Async signal enhancement pipeline.
 *
 * Runs AFTER the synchronous `filterSignals()` from signalFilter.ts.
 * Applies multi-timeframe confluence and volume profile modifiers
 * to refine signal strength. Each step is independently guarded so
 * a failure in one does not block the others.
 *
 * Called from the backtest API route after sync filtering.
 */
export async function enhanceSignals(
  series: PriceSeries,
  signals: SignalWithStrength[],
  _symbol: string,
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

  return enhanced;
}
