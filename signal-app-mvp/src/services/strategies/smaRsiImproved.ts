import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength } from '@/services/backtest/engine';
import { BaseStrategy } from './base';

/**
 * Improved SMA+RSI Strategy
 *
 * Key improvements over baseline:
 * - Less restrictive signal conditions (OR instead of AND)
 * - Better signal strength calculation
 * - Support for adjustable parameters
 * - Configurable thresholds for testing
 */
export class SMARSIImprovedStrategy extends BaseStrategy {
  private readonly shortPeriod = this.params['shortPeriod'] ?? 9;
  private readonly longPeriod = this.params['longPeriod'] ?? 21;
  private readonly rsiPeriod = this.params['rsiPeriod'] ?? 14;
  private readonly rsiBuyThreshold = this.params['rsiBuyThreshold'] ?? 40; // Relaxed from 30
  private readonly rsiSellThreshold = this.params['rsiSellThreshold'] ?? 60; // Relaxed from 70
  private readonly requireRsi = this.params['requireRsi'] ?? 0; // If 0, don't require RSI confirmation

  constructor(params: Record<string, number> = {}) {
    super('SMA_RSI_IMPROVED', params);
  }

  generateSignals(series: PriceSeries): SignalWithStrength[] {
    const closes = series.points.map((p) => p.close);

    if (closes.length < this.longPeriod) {
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

      const bullishCross = prevShortSMA <= prevLongSMA && currShortSMA > currLongSMA;
      const bearishCross = prevShortSMA >= prevLongSMA && currShortSMA < currLongSMA;

      // BUY signals: bullish cross OR oversold RSI (relaxed conditions)
      if (bullishCross || (this.requireRsi === 0 && currRSI < this.rsiBuyThreshold)) {
        let strength = 0;
        if (bullishCross) strength += 0.6;
        if (currRSI < this.rsiBuyThreshold) strength += 0.4;
        strength = Math.min(1, strength);

        signals.push({
          time: point.timestamp,
          type: 'BUY',
          price: point.close,
          strength
        });
      }
      // SELL signals: bearish cross OR overbought RSI (relaxed conditions)
      else if (bearishCross || (this.requireRsi === 0 && currRSI > this.rsiSellThreshold)) {
        let strength = 0;
        if (bearishCross) strength += 0.6;
        if (currRSI > this.rsiSellThreshold) strength += 0.4;
        strength = Math.min(1, strength);

        signals.push({
          time: point.timestamp,
          type: 'SELL',
          price: point.close,
          strength
        });
      }
    }

    return signals;
  }
}
