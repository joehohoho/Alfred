/**
 * Order flow analysis — Cumulative Volume Delta (CVD) and divergence detection
 * from OHLCV data. No external API needed.
 *
 * CVD approximation from candles:
 * - Green candle (close > open): buy volume ~ volume * (close - low) / (high - low)
 * - Red candle (close < open):   sell volume ~ volume * (high - close) / (high - low)
 * - Doji (close == open):        split 50/50
 *
 * CVD = cumulative sum of (buy_volume - sell_volume)
 */

// --- Types ---

export interface OrderFlowData {
  cvd: number[];                                          // cumulative volume delta series
  cvdTrend: 'bullish' | 'bearish' | 'neutral';           // 5-bar CVD slope
  divergence: 'bullish_div' | 'bearish_div' | 'none';    // price vs CVD divergence
  aggressiveBuyRatio: number;                             // recent buy vs sell volume ratio
}

// --- Core computation ---

/**
 * Compute order flow metrics from OHLCV arrays (all same length).
 * Returns null-safe defaults if arrays are too short.
 */
export function computeOrderFlow(
  opens: number[],
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[],
): OrderFlowData {
  const len = opens.length;

  if (len < 2) {
    return {
      cvd: [],
      cvdTrend: 'neutral',
      divergence: 'none',
      aggressiveBuyRatio: 1,
    };
  }

  // --- 1. Compute per-bar buy/sell volume and CVD ---
  const cvd: number[] = [];
  let cumDelta = 0;
  let recentBuyVol = 0;
  let recentSellVol = 0;
  const recentBars = Math.min(10, len); // last 10 bars for ratio

  for (let i = 0; i < len; i++) {
    const open = opens[i];
    const close = closes[i];
    const high = highs[i];
    const low = lows[i];
    const vol = volumes[i] || 0;

    const range = high - low;

    let buyVol: number;
    let sellVol: number;

    if (range === 0) {
      // No range — split evenly
      buyVol = vol / 2;
      sellVol = vol / 2;
    } else if (close >= open) {
      // Green candle: buying pressure approximation
      buyVol = vol * ((close - low) / range);
      sellVol = vol - buyVol;
    } else {
      // Red candle: selling pressure approximation
      sellVol = vol * ((high - close) / range);
      buyVol = vol - sellVol;
    }

    cumDelta += buyVol - sellVol;
    cvd.push(cumDelta);

    // Accumulate recent volumes for aggressive buy ratio
    if (i >= len - recentBars) {
      recentBuyVol += buyVol;
      recentSellVol += sellVol;
    }
  }

  // --- 2. CVD trend (slope of last 5 bars) ---
  const trendBars = Math.min(5, cvd.length);
  const cvdTrend = computeCvdTrend(cvd, trendBars);

  // --- 3. Divergence detection (last 10 bars) ---
  const divBars = Math.min(10, len);
  const divergence = detectDivergence(
    closes.slice(-divBars),
    cvd.slice(-divBars),
  );

  // --- 4. Aggressive buy ratio ---
  const aggressiveBuyRatio =
    recentSellVol > 0 ? recentBuyVol / recentSellVol : recentBuyVol > 0 ? 2 : 1;

  return { cvd, cvdTrend, divergence, aggressiveBuyRatio };
}

// --- Helpers ---

function computeCvdTrend(
  cvd: number[],
  bars: number,
): 'bullish' | 'bearish' | 'neutral' {
  if (cvd.length < 2) return 'neutral';

  const slice = cvd.slice(-bars);
  // Simple linear regression slope
  const n = slice.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += slice[i];
    sumXY += i * slice[i];
    sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Normalize slope relative to CVD magnitude
  const magnitude = Math.max(Math.abs(slice[0]), Math.abs(slice[n - 1]), 1);
  const normalizedSlope = slope / magnitude;

  if (normalizedSlope > 0.02) return 'bullish';
  if (normalizedSlope < -0.02) return 'bearish';
  return 'neutral';
}

function detectDivergence(
  prices: number[],
  cvdSlice: number[],
): 'bullish_div' | 'bearish_div' | 'none' {
  if (prices.length < 4) return 'none';

  const n = prices.length;
  const mid = Math.floor(n / 2);

  // Compare first half vs second half trends
  const priceFirst = prices[mid] - prices[0];
  const priceLast = prices[n - 1] - prices[mid];
  const cvdFirst = cvdSlice[mid] - cvdSlice[0];
  const cvdLast = cvdSlice[n - 1] - cvdSlice[mid];

  // Bullish divergence: price making lower lows but CVD making higher lows
  if (priceLast < 0 && cvdLast > cvdFirst && cvdLast > 0) {
    return 'bullish_div';
  }

  // Bearish divergence: price making higher highs but CVD making lower highs
  if (priceLast > 0 && cvdLast < cvdFirst && cvdLast < 0) {
    return 'bearish_div';
  }

  // Alternative: overall trend divergence
  const priceSlope = prices[n - 1] - prices[0];
  const cvdSlope = cvdSlice[n - 1] - cvdSlice[0];

  if (priceSlope < 0 && cvdSlope > 0) return 'bullish_div';
  if (priceSlope > 0 && cvdSlope < 0) return 'bearish_div';

  return 'none';
}
