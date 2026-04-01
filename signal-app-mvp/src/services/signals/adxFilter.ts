/**
 * ADX (Average Directional Index) Trend Filter
 * Identifies strong trends and avoids choppy sideways markets
 * ADX > 25 = strong trend (tradeable)
 * ADX < 20 = weak trend (avoid or reduce position size)
 */

import type { PriceSeries } from '@/models/PriceData';

export interface ADXResult {
  adx: number; // ADX value (0-100)
  plusDI: number; // +DI (directional intensity)
  minusDI: number; // -DI
  trend: 'STRONG_UP' | 'STRONG_DOWN' | 'WEAK' | 'NEUTRAL';
  trendStrength: number; // 0-100, how confident we are in the trend
  isValidTrend: boolean; // ADX > 25 = strong, true; ADX < 20 = weak, false
}

export class ADXFilter {
  /**
   * Calculate ADX and DI values
   * @param series Price series with OHLCV data
   * @param period ADX period (default 14)
   * @returns Latest ADX result
   */
  static calculateADX(series: PriceSeries, period: number = 14): ADXResult {
    if (series.points.length < period + 5) {
      return {
        adx: 0,
        plusDI: 0,
        minusDI: 0,
        trend: 'NEUTRAL',
        trendStrength: 0,
        isValidTrend: false
      };
    }

    const points = series.points.map((p) => ({
      high: p.high ?? p.close,
      low: p.low ?? p.close,
      close: p.close
    }));

    // Calculate True Range and Directional Movements
    const tr: number[] = [];
    const plusDM: number[] = [];
    const minusDM: number[] = [];

    for (let i = 1; i < points.length; i++) {
      const curr = points[i];
      const prev = points[i - 1];

      // True Range = max(high - low, abs(high - prev_close), abs(low - prev_close))
      const tr1 = curr.high - curr.low;
      const tr2 = Math.abs(curr.high - prev.close);
      const tr3 = Math.abs(curr.low - prev.close);
      tr.push(Math.max(tr1, tr2, tr3));

      // Directional Movement
      const upMove = curr.high - prev.high;
      const downMove = prev.low - curr.low;

      let pdm = 0;
      let mdm = 0;

      if (upMove > downMove && upMove > 0) {
        pdm = upMove;
      }
      if (downMove > upMove && downMove > 0) {
        mdm = downMove;
      }

      plusDM.push(pdm);
      minusDM.push(mdm);
    }

    // Calculate smoothed values using Wilder's smoothing
    let sumTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
    let sumPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
    let sumMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

    const atrValues: number[] = [];
    const plusDIValues: number[] = [];
    const minusDIValues: number[] = [];

    for (let i = period; i < tr.length; i++) {
      const atr = sumTR / period;
      atrValues.push(atr);

      const pdI = atr > 0 ? (sumPlusDM / atr) * 100 : 0;
      const mdI = atr > 0 ? (sumMinusDM / atr) * 100 : 0;

      plusDIValues.push(pdI);
      minusDIValues.push(mdI);

      sumTR = sumTR - tr[i - period] + tr[i];
      sumPlusDM = sumPlusDM - plusDM[i - period] + plusDM[i];
      sumMinusDM = sumMinusDM - minusDM[i - period] + minusDM[i];
    }

    // Calculate ADX (smoothed DI difference)
    const diDiff: number[] = [];
    const diSum: number[] = [];

    for (let i = 0; i < plusDIValues.length; i++) {
      const diff = Math.abs(plusDIValues[i] - minusDIValues[i]);
      const sum = plusDIValues[i] + minusDIValues[i];
      diDiff.push(sum > 0 ? (diff / sum) * 100 : 0);
      diSum.push(sum);
    }

    // Smooth the DI difference to get ADX
    let sumDX = diDiff.slice(0, period).reduce((a, b) => a + b, 0);
    let adx = sumDX / period;

    for (let i = period; i < diDiff.length; i++) {
      adx = (adx * (period - 1) + diDiff[i]) / period;
    }

    // Get latest values
    const latestPlusDI = plusDIValues[plusDIValues.length - 1] ?? 0;
    const latestMinusDI = minusDIValues[minusDIValues.length - 1] ?? 0;

    // Determine trend
    let trend: 'STRONG_UP' | 'STRONG_DOWN' | 'WEAK' | 'NEUTRAL' = 'NEUTRAL';
    let trendStrength = 0;
    let isValidTrend = false;

    if (adx > 25) {
      isValidTrend = true;
      trendStrength = Math.min(adx, 100); // Cap at 100

      if (latestPlusDI > latestMinusDI) {
        trend = 'STRONG_UP';
      } else {
        trend = 'STRONG_DOWN';
      }
    } else if (adx > 20 && adx <= 25) {
      // Borderline - use DI to determine direction but mark as WEAK
      trendStrength = Math.min(adx * 1.5, 100);
      trend = latestPlusDI > latestMinusDI ? 'STRONG_UP' : 'STRONG_DOWN';
    } else {
      trend = 'WEAK';
      trendStrength = adx; // Low confidence
    }

    return {
      adx,
      plusDI: latestPlusDI,
      minusDI: latestMinusDI,
      trend,
      trendStrength,
      isValidTrend
    };
  }

  /**
   * Get ADX history for charting
   */
  static calculateADXHistory(series: PriceSeries, period: number = 14): ADXResult[] {
    if (series.points.length < period + 5) {
      return [];
    }

    const points = series.points.map((p) => ({
      high: p.high ?? p.close,
      low: p.low ?? p.close,
      close: p.close
    }));

    // Similar calculations as above, but return array of ADX values
    const results: ADXResult[] = [];

    // Calculate TR and DM for all points
    const tr: number[] = [];
    const plusDM: number[] = [];
    const minusDM: number[] = [];

    for (let i = 1; i < points.length; i++) {
      const curr = points[i];
      const prev = points[i - 1];

      const tr1 = curr.high - curr.low;
      const tr2 = Math.abs(curr.high - prev.close);
      const tr3 = Math.abs(curr.low - prev.close);
      tr.push(Math.max(tr1, tr2, tr3));

      const upMove = curr.high - prev.high;
      const downMove = prev.low - curr.low;

      let pdm = 0;
      let mdm = 0;

      if (upMove > downMove && upMove > 0) {
        pdm = upMove;
      }
      if (downMove > upMove && downMove > 0) {
        mdm = downMove;
      }

      plusDM.push(pdm);
      minusDM.push(mdm);
    }

    // Calculate smoothed values
    let sumTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
    let sumPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
    let sumMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

    for (let i = period; i < tr.length; i++) {
      const atr = sumTR / period;
      const pdI = atr > 0 ? (sumPlusDM / atr) * 100 : 0;
      const mdI = atr > 0 ? (sumMinusDM / atr) * 100 : 0;

      const diDiff = pdI + mdI > 0 ? (Math.abs(pdI - mdI) / (pdI + mdI)) * 100 : 0;
      const adx = i === period ? diDiff : (results[results.length - 1].adx * (period - 1) + diDiff) / period;

      results.push({
        adx,
        plusDI: pdI,
        minusDI: mdI,
        trend: adx > 25 ? (pdI > mdI ? 'STRONG_UP' : 'STRONG_DOWN') : 'WEAK',
        trendStrength: Math.min(adx, 100),
        isValidTrend: adx > 25
      });

      sumTR = sumTR - tr[i - period] + tr[i];
      sumPlusDM = sumPlusDM - plusDM[i - period] + plusDM[i];
      sumMinusDM = sumMinusDM - minusDM[i - period] + minusDM[i];
    }

    return results;
  }

  /**
   * Should we trade based on ADX? (Checks if trend is strong enough)
   */
  static shouldTrade(adxResult: ADXResult): boolean {
    return adxResult.isValidTrend; // ADX > 25
  }

  /**
   * Adjust position size based on trend strength
   * Strong trend (ADX > 30) = 100% position size
   * Medium trend (ADX 25-30) = 75% position size
   * Weak trend (ADX < 20) = 25% position size (or skip trade)
   */
  static positionSizeAdjustment(adxResult: ADXResult): number {
    if (adxResult.adx > 30) return 1.0; // 100% position
    if (adxResult.adx > 25) return 0.75; // 75% position
    if (adxResult.adx > 20) return 0.5; // 50% position
    return 0.25; // Skip or minimal position
  }
}

export default ADXFilter;
