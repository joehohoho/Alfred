import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength } from '@/services/backtest/engine';

// ---- Types ----

export interface VolumeProfileBin {
  price: number;   // Midpoint of the bin
  volume: number;  // Total volume in this bin
}

export interface VolumeProfile {
  poc: number;            // Point of Control — price level with highest volume
  valueAreaHigh: number;  // Upper bound of the Value Area (70% of volume)
  valueAreaLow: number;   // Lower bound of the Value Area
  bins: VolumeProfileBin[];
}

// ---- Volume Profile computation ----

/**
 * Compute a volume profile from a price series.
 *
 * Divides the price range into N equal bins, sums volume per bin,
 * and identifies the Point of Control and Value Area (70% of total volume).
 */
export function computeVolumeProfile(series: PriceSeries, numBins: number = 50): VolumeProfile {
  const points = series.points;

  if (points.length === 0) {
    return { poc: 0, valueAreaHigh: 0, valueAreaLow: 0, bins: [] };
  }

  // Find overall high and low across the series
  let overallHigh = -Infinity;
  let overallLow = Infinity;

  for (const p of points) {
    const h = p.high ?? p.close;
    const l = p.low ?? p.close;
    if (h > overallHigh) overallHigh = h;
    if (l < overallLow) overallLow = l;
  }

  // Edge case: flat price
  if (overallHigh === overallLow) {
    const singleBin: VolumeProfileBin = {
      price: overallHigh,
      volume: points.reduce((sum, p) => sum + (p.volume ?? 0), 0),
    };
    return {
      poc: overallHigh,
      valueAreaHigh: overallHigh,
      valueAreaLow: overallLow,
      bins: [singleBin],
    };
  }

  const binSize = (overallHigh - overallLow) / numBins;
  const bins: VolumeProfileBin[] = [];

  // Initialize bins
  for (let i = 0; i < numBins; i++) {
    bins.push({
      price: overallLow + binSize * (i + 0.5), // Midpoint
      volume: 0,
    });
  }

  // Distribute volume into bins
  // For each candle, we use the typical price (H+L+C)/3 to assign volume
  for (const p of points) {
    const vol = p.volume ?? 0;
    if (vol === 0) continue;

    const typical = ((p.high ?? p.close) + (p.low ?? p.close) + p.close) / 3;
    const binIndex = Math.min(
      numBins - 1,
      Math.max(0, Math.floor((typical - overallLow) / binSize)),
    );
    bins[binIndex].volume += vol;
  }

  // Find Point of Control (bin with highest volume)
  let pocIndex = 0;
  let maxVolume = 0;
  for (let i = 0; i < bins.length; i++) {
    if (bins[i].volume > maxVolume) {
      maxVolume = bins[i].volume;
      pocIndex = i;
    }
  }

  const poc = bins[pocIndex].price;

  // Find Value Area: expand outward from POC until 70% of total volume is captured
  const totalVolume = bins.reduce((sum, b) => sum + b.volume, 0);
  const valueAreaTarget = totalVolume * 0.7;

  let vaVolume = bins[pocIndex].volume;
  let vaLow = pocIndex;
  let vaHigh = pocIndex;

  while (vaVolume < valueAreaTarget && (vaLow > 0 || vaHigh < numBins - 1)) {
    const volumeBelow = vaLow > 0 ? bins[vaLow - 1].volume : 0;
    const volumeAbove = vaHigh < numBins - 1 ? bins[vaHigh + 1].volume : 0;

    // Expand toward the side with more volume
    if (volumeBelow >= volumeAbove && vaLow > 0) {
      vaLow--;
      vaVolume += bins[vaLow].volume;
    } else if (vaHigh < numBins - 1) {
      vaHigh++;
      vaVolume += bins[vaHigh].volume;
    } else if (vaLow > 0) {
      vaLow--;
      vaVolume += bins[vaLow].volume;
    } else {
      break;
    }
  }

  const valueAreaLow = bins[vaLow].price - binSize / 2;   // Lower edge of the low bin
  const valueAreaHigh = bins[vaHigh].price + binSize / 2;  // Upper edge of the high bin

  return { poc, valueAreaHigh, valueAreaLow, bins };
}

// ---- VWAP computation ----

/**
 * Compute rolling VWAP (Volume Weighted Average Price) across a price series.
 *
 * VWAP = cumulative(typical_price * volume) / cumulative(volume)
 * Returns an array of VWAP values aligned to each point in the series.
 */
export function computeVWAP(series: PriceSeries): number[] {
  const points = series.points;
  const vwap: number[] = [];

  let cumulativeTPV = 0; // cumulative (typical_price * volume)
  let cumulativeVol = 0;

  for (const p of points) {
    const typical = ((p.high ?? p.close) + (p.low ?? p.close) + p.close) / 3;
    const vol = p.volume ?? 0;

    cumulativeTPV += typical * vol;
    cumulativeVol += vol;

    if (cumulativeVol === 0) {
      // No volume data yet — use typical price as fallback
      vwap.push(typical);
    } else {
      vwap.push(cumulativeTPV / cumulativeVol);
    }
  }

  return vwap;
}

// ---- Signal modifier ----

/** "Near" threshold: within 2% of a level */
const NEAR_PCT = 0.02;

function isNear(price: number, level: number): boolean {
  return Math.abs(price - level) / level <= NEAR_PCT;
}

/**
 * Apply volume profile modifier to a signal's strength.
 *
 * - BUY near/below POC or Value Area Low: strength * 1.3 (buying at high-volume support)
 * - BUY above Value Area High: strength * 0.7 (buying in thin air)
 * - SELL near/above POC or Value Area High: strength * 1.3 (selling at high-volume resistance)
 * - SELL below Value Area Low: strength * 0.7 (selling into support)
 */
export function applyVolumeProfileModifier(
  signal: SignalWithStrength,
  profile: VolumeProfile,
  currentPrice: number,
): SignalWithStrength {
  if (signal.type === 'HOLD') return signal;

  // Skip if profile is empty or degenerate
  if (profile.bins.length === 0 || profile.poc === 0) return signal;

  let strength = signal.strength;

  if (signal.type === 'BUY') {
    // Buying near or below POC / Value Area Low = high-volume support zone
    if (
      currentPrice <= profile.valueAreaLow ||
      isNear(currentPrice, profile.valueAreaLow) ||
      isNear(currentPrice, profile.poc)
    ) {
      strength *= 1.3;
    }
    // Buying above Value Area High = thin volume, risky
    else if (currentPrice > profile.valueAreaHigh) {
      strength *= 0.7;
    }
  } else if (signal.type === 'SELL') {
    // Selling near or above POC / Value Area High = high-volume resistance zone
    if (
      currentPrice >= profile.valueAreaHigh ||
      isNear(currentPrice, profile.valueAreaHigh) ||
      isNear(currentPrice, profile.poc)
    ) {
      strength *= 1.3;
    }
    // Selling below Value Area Low = selling into support, risky
    else if (currentPrice < profile.valueAreaLow) {
      strength *= 0.7;
    }
  }

  // Clamp strength to [0, 1]
  strength = Math.max(0, Math.min(1, strength));

  return { ...signal, strength };
}
