import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength } from '@/services/backtest/engine';
import { BaseStrategy } from './base';

/**
 * RSI Extreme Strategy
 * 
 * Generates signals based on RSI oversold/overbought conditions ONLY
 * (independent of price action, crosses, or other indicators)
 * 
 * Key points:
 * - BUY when RSI crosses above oversold level
 * - SELL when RSI crosses below overbought level
 * - Tunable thresholds for different market conditions
 * - Good for mean-reversion trading
 */
export class RSIExtremeStrategy extends BaseStrategy {
  private readonly rsiPeriod = this.params['rsiPeriod'] ?? 14;
  private readonly buyThreshold = this.params['buyThreshold'] ?? 30;  // Oversold
  private readonly sellThreshold = this.params['sellThreshold'] ?? 70; // Overbought
  private readonly midpoint = 50;

  constructor(params: Record<string, number> = {}) {
    super('RSI_EXTREME', params);
  }

  generateSignals(series: PriceSeries): SignalWithStrength[] {
    const closes = series.points.map((p) => p.close);

    if (closes.length < this.rsiPeriod + 1) {
      return [];
    }

    const rsis = this.calculateRSI(closes, this.rsiPeriod);
    const signals: SignalWithStrength[] = [];

    for (let i = 1; i < closes.length; i++) {
      const point = series.points[i];
      const prevRSI = rsis[i - 1];
      const currRSI = rsis[i];

      if (isNaN(prevRSI) || isNaN(currRSI)) continue;

      // BUY signal: RSI crosses above oversold level
      if (prevRSI <= this.buyThreshold && currRSI > this.buyThreshold) {
        // Strength increases with how deep it was oversold
        const depth = Math.max(0, this.buyThreshold - prevRSI) / 30; // 0-1 scale
        const strength = Math.min(1, 0.5 + depth * 0.5); // 0.5 to 1.0
        
        signals.push({
          time: point.timestamp,
          type: 'BUY',
          price: point.close,
          strength
        });
      }

      // SELL signal: RSI crosses below overbought level
      if (prevRSI >= this.sellThreshold && currRSI < this.sellThreshold) {
        // Strength increases with how high it was overbought
        const height = Math.max(0, prevRSI - this.sellThreshold) / 30; // 0-1 scale
        const strength = Math.min(1, 0.5 + height * 0.5); // 0.5 to 1.0

        signals.push({
          time: point.timestamp,
          type: 'SELL',
          price: point.close,
          strength
        });
      }

      // Secondary signals: Divergence from midpoint (momentum shifts)
      // BUY when RSI bottoms out and bounces
      if (i >= 2 && currRSI > prevRSI && prevRSI < this.midpoint && currRSI <= this.buyThreshold) {
        const strength = 0.4; // Lower confidence for secondary signals
        signals.push({
          time: point.timestamp,
          type: 'BUY',
          price: point.close,
          strength
        });
      }

      // SELL when RSI tops out and falls
      if (i >= 2 && currRSI < prevRSI && prevRSI > this.midpoint && currRSI >= this.sellThreshold) {
        const strength = 0.4;
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
