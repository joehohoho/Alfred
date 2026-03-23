import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength } from '@/services/backtest/engine';
import { BaseStrategy } from './base';

/**
 * MACD Strategy (Moving Average Convergence Divergence)
 *
 * Signals:
 * - BUY: MACD crosses above signal line OR histogram flips positive
 * - SELL: MACD crosses below signal line OR histogram flips negative
 *
 * Strength based on histogram magnitude and divergence momentum
 */
export class MACDStrategy extends BaseStrategy {
  private readonly fastPeriod = this.params['fastPeriod'] ?? 12;
  private readonly slowPeriod = this.params['slowPeriod'] ?? 26;
  private readonly signalPeriod = this.params['signalPeriod'] ?? 9;

  constructor(params: Record<string, number> = {}) {
    super('MACD', params);
  }

  generateSignals(series: PriceSeries): SignalWithStrength[] {
    const closes = series.points.map((p) => p.close);

    if (closes.length < this.slowPeriod) {
      return [];
    }

    const { macd, signal, histogram } = this.calculateMACD(
      closes,
      this.fastPeriod,
      this.slowPeriod,
      this.signalPeriod
    );

    const signals: SignalWithStrength[] = [];

    for (let i = 1; i < closes.length; i++) {
      const point = series.points[i];
      const prevMACD = macd[i - 1];
      const currMACD = macd[i];
      const prevSignal = signal[i - 1];
      const currSignal = signal[i];
      const currHistogram = histogram[i];
      const prevHistogram = histogram[i - 1];

      // Skip if any values are NaN
      if (isNaN(currMACD) || isNaN(currSignal) || isNaN(currHistogram)) continue;

      // BUY: MACD crosses above signal line
      if (prevMACD <= prevSignal && currMACD > currSignal) {
        // Strength based on histogram magnitude (capped at 1.0)
        const histStrength = Math.min(1, Math.abs(currHistogram) / Math.max(Math.abs(currMACD), 1) * 2);
        signals.push({
          time: point.timestamp,
          type: 'BUY',
          price: point.close,
          strength: histStrength
        });
      }
      // SELL: MACD crosses below signal line
      else if (prevMACD >= prevSignal && currMACD < currSignal) {
        // Strength based on histogram magnitude
        const histStrength = Math.min(1, Math.abs(currHistogram) / Math.max(Math.abs(currMACD), 1) * 2);
        signals.push({
          time: point.timestamp,
          type: 'SELL',
          price: point.close,
          strength: histStrength
        });
      }
      // Secondary signals: histogram flip (momentum confirmation)
      else if (prevHistogram < 0 && currHistogram >= 0 && currMACD > currSignal) {
        // Histogram flipped positive = momentum building for potential reversal
        const strength = 0.5; // Lower confidence secondary signal
        signals.push({
          time: point.timestamp,
          type: 'BUY',
          price: point.close,
          strength
        });
      } else if (prevHistogram > 0 && currHistogram <= 0 && currMACD < currSignal) {
        // Histogram flipped negative = momentum deteriorating
        const strength = 0.5;
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
