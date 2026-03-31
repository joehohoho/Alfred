import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength } from '@/services/backtest/engine';
import { BaseStrategy } from './base';

/**
 * Improved SMA+RSI Strategy with Momentum Direction
 *
 * Key improvements:
 * - Momentum-aware: buys dips at support OR breakouts with strong RSI
 * - Generates both long and short signals for bidirectional trading
 * - RSI divergence detection: bullish divergence = strong BUY
 * - Price crossing below short SMA generates SELL signals
 * - Less reliance on lagging SMA crossovers alone
 */
export class SMARSIImprovedStrategy extends BaseStrategy {
  private readonly shortPeriod = this.params['shortPeriod'] ?? 9;
  private readonly longPeriod = this.params['longPeriod'] ?? 21;
  private readonly rsiPeriod = this.params['rsiPeriod'] ?? 14;
  private readonly rsiBuyThreshold = this.params['rsiBuyThreshold'] ?? 40;
  private readonly rsiSellThreshold = this.params['rsiSellThreshold'] ?? 60;
  private readonly momentumLookback = this.params['momentumLookback'] ?? 5;

  constructor(params: Record<string, number> = {}) {
    super('SMA_RSI_IMPROVED', params);
  }

  /**
   * Detect bullish RSI divergence: price makes lower lows but RSI makes higher lows.
   * Looks back over `window` bars for two swing lows.
   */
  private detectBullishDivergence(
    closes: number[],
    rsis: number[],
    idx: number,
    window: number = 20,
  ): boolean {
    if (idx < window) return false;
    const start = idx - window;

    // Find two recent local lows in price
    let firstLow = -1;
    let secondLow = -1;
    for (let i = idx - 2; i > start + 1; i--) {
      if (closes[i] < closes[i - 1] && closes[i] < closes[i + 1]) {
        if (secondLow === -1) {
          secondLow = i;
        } else if (firstLow === -1) {
          firstLow = i;
          break;
        }
      }
    }

    if (firstLow === -1 || secondLow === -1) return false;
    if (isNaN(rsis[firstLow]) || isNaN(rsis[secondLow])) return false;

    // Bullish divergence: price lower low, RSI higher low
    return closes[secondLow] < closes[firstLow] && rsis[secondLow] > rsis[firstLow];
  }

  generateSignals(series: PriceSeries): SignalWithStrength[] {
    const closes = series.points.map((p) => p.close);

    if (closes.length < Math.max(this.longPeriod, this.momentumLookback + 5)) {
      return [];
    }

    const shortSMAs = this.calculateSMA(closes, this.shortPeriod);
    const longSMAs = this.calculateSMA(closes, this.longPeriod);
    const rsis = this.calculateRSI(closes, this.rsiPeriod);

    const signals: SignalWithStrength[] = [];

    for (let i = 1; i < closes.length; i++) {
      const point = series.points[i];
      const prevShortSMA = shortSMAs[i - 1];
      const currShortSMA = shortSMAs[i];
      const prevLongSMA = longSMAs[i - 1];
      const currLongSMA = longSMAs[i];
      const currRSI = rsis[i];
      const close = closes[i];

      const bullishCross = prevShortSMA <= prevLongSMA && currShortSMA > currLongSMA;
      const bearishCross = prevShortSMA >= prevLongSMA && currShortSMA < currLongSMA;

      // Momentum: is price falling or rising over lookback period?
      const momentumChange = i >= this.momentumLookback
        ? (close - closes[i - this.momentumLookback]) / closes[i - this.momentumLookback]
        : 0;
      const isFalling = momentumChange < -0.02;
      const isRising = momentumChange > 0.02;

      // Price position relative to SMAs
      const priceAboveShortSMA = !isNaN(currShortSMA) && close > currShortSMA;
      const priceBelowShortSMA = !isNaN(currShortSMA) && close < currShortSMA;
      const priceCrossedBelowShort = i > 0 && !isNaN(shortSMAs[i - 1]) &&
        closes[i - 1] >= shortSMAs[i - 1] && close < currShortSMA;

      // RSI divergence
      const hasBullishDivergence = this.detectBullishDivergence(closes, rsis, i);

      // ---- BUY SIGNALS ----
      let buyStrength = 0;

      // 1. RSI bullish divergence — strongest buy signal
      if (hasBullishDivergence) {
        buyStrength += 0.5;
      }

      // 2. Buying the dip: price falling + RSI oversold (buying at support)
      if (isFalling && !isNaN(currRSI) && currRSI < this.rsiBuyThreshold) {
        buyStrength += 0.4;
      }

      // 3. Breakout: bullish SMA cross with strong RSI momentum
      if (bullishCross) {
        buyStrength += 0.4;
        if (!isNaN(currRSI) && currRSI > 50 && currRSI < 70) {
          buyStrength += 0.2; // RSI confirms momentum without being overbought
        }
      }

      // 4. Oversold bounce: RSI very low regardless of SMA
      if (!isNaN(currRSI) && currRSI < 30) {
        buyStrength += 0.3;
      }

      if (buyStrength >= 0.3) {
        signals.push({
          time: point.timestamp,
          type: 'BUY',
          price: point.close,
          strength: Math.min(1, buyStrength),
        });
        continue; // Don't generate opposing signal on same bar
      }

      // ---- SELL SIGNALS ----
      let sellStrength = 0;

      // 1. Bearish SMA cross — trend reversal
      if (bearishCross) {
        sellStrength += 0.4;
      }

      // 2. Price crosses below short SMA — early exit / short entry
      if (priceCrossedBelowShort && !bearishCross) {
        sellStrength += 0.3;
      }

      // 3. Overbought RSI — potential reversal
      if (!isNaN(currRSI) && currRSI > this.rsiSellThreshold) {
        sellStrength += 0.3;
        if (currRSI > 70) sellStrength += 0.2; // Extremely overbought
      }

      // 4. Rising momentum stalling: was rising, now stalling below SMA
      if (isRising && priceBelowShortSMA) {
        sellStrength += 0.2;
      }

      if (sellStrength >= 0.3) {
        signals.push({
          time: point.timestamp,
          type: 'SELL',
          price: point.close,
          strength: Math.min(1, sellStrength),
        });
      }
    }

    return signals;
  }
}
