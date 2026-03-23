import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength } from '@/services/backtest/engine';

/**
 * Base class for all trading strategies
 * Implementations should override generateSignals()
 */
export abstract class BaseStrategy {
  constructor(public readonly name: string, protected readonly params: Record<string, number> = {}) {}

  abstract generateSignals(series: PriceSeries): SignalWithStrength[];

  /**
   * Helper: Calculate Simple Moving Average
   */
  protected calculateSMA(values: number[], period: number): number[] {
    const smas: number[] = [];
    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        smas.push(NaN);
      } else {
        const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        smas.push(sum / period);
      }
    }
    return smas;
  }

  /**
   * Helper: Calculate Exponential Moving Average
   */
  protected calculateEMA(values: number[], period: number): number[] {
    const emas: number[] = [];
    const multiplier = 2 / (period + 1);

    for (let i = 0; i < values.length; i++) {
      if (i === 0) {
        emas.push(values[i]);
      } else if (i < period) {
        // Use SMA for first 'period' values
        const sum = values.slice(0, i + 1).reduce((a, b) => a + b, 0);
        emas.push(sum / (i + 1));
      } else {
        emas.push(values[i] * multiplier + emas[i - 1] * (1 - multiplier));
      }
    }
    return emas;
  }

  /**
   * Helper: Calculate RSI (Relative Strength Index)
   */
  protected calculateRSI(values: number[], period: number = 14): number[] {
    const rsis: number[] = [];
    const changes: number[] = [];

    for (let i = 1; i < values.length; i++) {
      changes.push(values[i] - values[i - 1]);
    }

    for (let i = 0; i < values.length; i++) {
      if (i < period) {
        rsis.push(NaN);
      } else {
        let gains = 0;
        let losses = 0;
        for (let j = i - period + 1; j < i; j++) {
          if (changes[j] > 0) gains += changes[j];
          else losses += Math.abs(changes[j]);
        }
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = 100 - 100 / (1 + rs);
        rsis.push(rsi);
      }
    }
    return rsis;
  }

  /**
   * Helper: Calculate MACD (Moving Average Convergence Divergence)
   */
  protected calculateMACD(
    values: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): { macd: number[]; signal: number[]; histogram: number[] } {
    const fastEMA = this.calculateEMA(values, fastPeriod);
    const slowEMA = this.calculateEMA(values, slowPeriod);

    const macd = fastEMA.map((fast, i) => (isNaN(fast) || isNaN(slowEMA[i]) ? NaN : fast - slowEMA[i]));

    const macdFiltered = macd.filter((m) => !isNaN(m));
    const signalEMA = this.calculateEMA(macdFiltered, signalPeriod);

    const signal = macd.map((m, i) => {
      if (isNaN(m)) return NaN;
      const macdIndex = macd.slice(0, i + 1).filter((x) => !isNaN(x)).length - 1;
      return macdIndex < 0 || macdIndex >= signalEMA.length ? NaN : signalEMA[macdIndex];
    });

    const histogram = macd.map((m, i) => (isNaN(m) || isNaN(signal[i]) ? NaN : m - signal[i]));

    return { macd, signal, histogram };
  }

  /**
   * Helper: Calculate Bollinger Bands
   */
  protected calculateBollingerBands(
    values: number[],
    period: number = 20,
    stdDevs: number = 2
  ): { upper: number[]; middle: number[]; lower: number[] } {
    const middle = this.calculateSMA(values, period);
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < values.length; i++) {
      if (i < period - 1) {
        upper.push(NaN);
        lower.push(NaN);
      } else {
        const subset = values.slice(i - period + 1, i + 1);
        const sma = subset.reduce((a, b) => a + b, 0) / period;
        const variance = subset.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        upper.push(sma + stdDev * stdDevs);
        lower.push(sma - stdDev * stdDevs);
      }
    }

    return { upper, middle, lower };
  }

  /**
   * Helper: Detect crossover (a crosses above b)
   */
  protected crossoverUp(a: number[], b: number[]): boolean[] {
    const crossovers: boolean[] = [];
    for (let i = 1; i < Math.min(a.length, b.length); i++) {
      const prevA = a[i - 1];
      const prevB = b[i - 1];
      const currA = a[i];
      const currB = b[i];
      crossovers.push(prevA <= prevB && currA > currB);
    }
    return [false, ...crossovers];
  }

  /**
   * Helper: Detect crossover (a crosses below b)
   */
  protected crossoverDown(a: number[], b: number[]): boolean[] {
    const crossovers: boolean[] = [];
    for (let i = 1; i < Math.min(a.length, b.length); i++) {
      const prevA = a[i - 1];
      const prevB = b[i - 1];
      const currA = a[i];
      const currB = b[i];
      crossovers.push(prevA >= prevB && currA < currB);
    }
    return [false, ...crossovers];
  }
}
