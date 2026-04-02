import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength } from '@/services/backtest/engine';
import { BaseStrategy } from './base';
import { getFundingRate } from '@/services/data/derivativesClient';

/**
 * Funding Rate Strategy
 *
 * Exploits extreme funding rates as a LEADING indicator for corrections and squeezes.
 * When funding is extremely positive, too many longs are paying shorts — a correction
 * is coming. When extremely negative, shorts are overcrowded — a squeeze is likely.
 *
 * Since funding rate data is async (Binance API), the core signal generation uses
 * price-based proxies that mimic funding rate dynamics:
 *   1. Basis proxy: short-term ROC vs medium-term ROC divergence
 *   2. RSI divergence: price/RSI disagreement signals overleverage
 *   3. Bollinger Band %B extremes: squeeze/expansion detection
 *
 * For live/paper trading, use the exported `enhanceWithFundingRate()` async function
 * to overlay actual funding rate data onto signals.
 */
export class FundingRateStrategy extends BaseStrategy {
  private readonly shortRocPeriod: number;
  private readonly mediumRocPeriod: number;
  private readonly rsiPeriod: number;
  private readonly bbPeriod: number;
  private readonly bbStdDev: number;

  constructor(params: Record<string, number> = {}) {
    super('FUNDING_RATE', params);
    this.shortRocPeriod = params.shortRocPeriod ?? 5;
    this.mediumRocPeriod = params.mediumRocPeriod ?? 20;
    this.rsiPeriod = params.rsiPeriod ?? 14;
    this.bbPeriod = params.bbPeriod ?? 20;
    this.bbStdDev = params.bbStdDev ?? 2;
  }

  generateSignals(series: PriceSeries): SignalWithStrength[] {
    const closes = series.points.map((p) => p.close);
    const minBars = Math.max(this.mediumRocPeriod, this.rsiPeriod, this.bbPeriod) + 2;

    if (closes.length < minBars) {
      return [];
    }

    const rsis = this.calculateRSI(closes, this.rsiPeriod);
    const shortRoc = this.calculateROC(closes, this.shortRocPeriod);
    const mediumRoc = this.calculateROC(closes, this.mediumRocPeriod);
    const bb = this.calculateBollingerBands(closes, this.bbPeriod, this.bbStdDev);
    const percentB = this.calculatePercentB(closes, bb.upper, bb.lower);

    const signals: SignalWithStrength[] = [];

    for (let i = 2; i < closes.length; i++) {
      const point = series.points[i];
      const sr = shortRoc[i];
      const mr = mediumRoc[i];
      const rsi = rsis[i];
      const prevRsi = rsis[i - 1];
      const pctB = percentB[i];

      if (isNaN(sr) || isNaN(mr) || isNaN(rsi) || isNaN(prevRsi) || isNaN(pctB)) continue;

      const rsiTurningUp = rsi > prevRsi;
      const rsiTurningDown = rsi < prevRsi;

      // --- Primary signals: ROC divergence + RSI momentum shift ---

      // BUY: Oversold with momentum shift (mimics negative funding squeeze)
      // Short-term falling hard, medium-term falling harder, RSI low and turning up
      if (sr < -3 && mr < -5 && rsi < 35 && rsiTurningUp) {
        const rocMagnitude = Math.min(1, (Math.abs(mr) - 5) / 10); // 0-1 from 5% to 15%
        const rsiDepth = Math.min(1, (35 - rsi) / 25); // deeper oversold = stronger
        const strength = Math.min(1, 0.5 + rocMagnitude * 0.25 + rsiDepth * 0.25);

        signals.push({
          time: point.timestamp,
          type: 'BUY',
          price: point.close,
          strength,
        });
        continue; // one signal per bar
      }

      // SELL: Overbought with momentum shift (mimics positive funding correction)
      // Short-term rising hard, medium-term rising harder, RSI high and turning down
      if (sr > 3 && mr > 5 && rsi > 65 && rsiTurningDown) {
        const rocMagnitude = Math.min(1, (mr - 5) / 10);
        const rsiHeight = Math.min(1, (rsi - 65) / 25);
        const strength = Math.min(1, 0.5 + rocMagnitude * 0.25 + rsiHeight * 0.25);

        signals.push({
          time: point.timestamp,
          type: 'SELL',
          price: point.close,
          strength,
        });
        continue;
      }

      // --- Secondary signals: Bollinger %B extremes ---

      // BUY: Price at extreme bottom of bands (squeeze setup)
      if (pctB < 0.1 && rsiTurningUp && rsi < 40) {
        const depth = Math.min(1, (0.1 - pctB) / 0.1); // how far below 0.1
        const strength = Math.min(1, 0.35 + depth * 0.3 + (40 - rsi) / 80);

        signals.push({
          time: point.timestamp,
          type: 'BUY',
          price: point.close,
          strength,
        });
        continue;
      }

      // SELL: Price at extreme top of bands (overextension)
      if (pctB > 0.9 && rsiTurningDown && rsi > 60) {
        const height = Math.min(1, (pctB - 0.9) / 0.1);
        const strength = Math.min(1, 0.35 + height * 0.3 + (rsi - 60) / 80);

        signals.push({
          time: point.timestamp,
          type: 'SELL',
          price: point.close,
          strength,
        });
        continue;
      }

      // --- Tertiary: RSI divergence detection ---
      // Price making higher high but RSI making lower high (bearish divergence)
      if (i >= 5) {
        const pricePeakNow = closes[i] > closes[i - 1] && closes[i] > closes[i - 2];
        const priceHigherHigh = closes[i] > Math.max(...closes.slice(Math.max(0, i - 10), i - 2));
        const rsiLowerHigh = rsi < Math.max(...rsis.slice(Math.max(0, i - 10), i - 2).filter((r) => !isNaN(r)));

        if (pricePeakNow && priceHigherHigh && rsiLowerHigh && rsi > 55) {
          signals.push({
            time: point.timestamp,
            type: 'SELL',
            price: point.close,
            strength: 0.45,
          });
          continue;
        }

        // Price making lower low but RSI making higher low (bullish divergence)
        const priceTroughNow = closes[i] < closes[i - 1] && closes[i] < closes[i - 2];
        const priceLowerLow = closes[i] < Math.min(...closes.slice(Math.max(0, i - 10), i - 2));
        const rsiHigherLow = rsi > Math.min(...rsis.slice(Math.max(0, i - 10), i - 2).filter((r) => !isNaN(r)));

        if (priceTroughNow && priceLowerLow && rsiHigherLow && rsi < 45) {
          signals.push({
            time: point.timestamp,
            type: 'BUY',
            price: point.close,
            strength: 0.45,
          });
        }
      }
    }

    return signals;
  }

  // --- Indicator helpers ---

  /** Rate of Change: (close - close[n]) / close[n] * 100 */
  private calculateROC(values: number[], period: number): number[] {
    const roc: number[] = new Array(values.length).fill(NaN);
    for (let i = period; i < values.length; i++) {
      if (values[i - period] !== 0) {
        roc[i] = ((values[i] - values[i - period]) / values[i - period]) * 100;
      }
    }
    return roc;
  }

  /** Bollinger %B: (price - lower) / (upper - lower), 0 = at lower band, 1 = at upper band */
  private calculatePercentB(
    closes: number[],
    upper: number[],
    lower: number[],
  ): number[] {
    return closes.map((c, i) => {
      const range = upper[i] - lower[i];
      if (isNaN(upper[i]) || isNaN(lower[i]) || range === 0) return NaN;
      return (c - lower[i]) / range;
    });
  }
}

// --- Async enhancement for live/paper trading ---

/**
 * Enhances a signal with actual Binance funding rate data.
 * Call this for live/paper trading where the API is available.
 *
 * - Funding > +0.03% + BUY signal  -> strength * 0.5  (correction risk)
 * - Funding > +0.05% + SELL signal -> strength * 1.5  (strong sell confirmation)
 * - Funding < -0.03% + SELL signal -> strength * 0.5  (squeeze risk)
 * - Funding < -0.05% + BUY signal  -> strength * 1.5  (squeeze likely)
 */
export async function enhanceWithFundingRate(
  signal: SignalWithStrength,
  symbol: string,
): Promise<SignalWithStrength> {
  try {
    const rates = await getFundingRate(symbol);
    if (!rates || rates.length === 0) return signal;

    // Use the most recent funding rate
    const latestRate = rates[rates.length - 1].rate;

    let multiplier = 1;

    if (signal.type === 'BUY') {
      if (latestRate > 0.0005) {
        // Funding > +0.05% — extreme positive, correction imminent, weaken buy
        multiplier = 0.5;
      } else if (latestRate > 0.0003) {
        // Funding > +0.03% — moderately positive, correction risk
        multiplier = 0.5;
      } else if (latestRate < -0.0005) {
        // Funding < -0.05% — extreme negative, squeeze likely, strengthen buy
        multiplier = 1.5;
      } else if (latestRate < -0.0003) {
        // Funding < -0.03% — moderately negative, squeeze possible
        multiplier = 1.2;
      }
    } else if (signal.type === 'SELL') {
      if (latestRate < -0.0005) {
        // Funding < -0.05% — extreme negative, squeeze risk, weaken sell
        multiplier = 0.5;
      } else if (latestRate < -0.0003) {
        // Funding < -0.03% — moderately negative, squeeze risk
        multiplier = 0.5;
      } else if (latestRate > 0.0005) {
        // Funding > +0.05% — extreme positive, strong sell confirmation
        multiplier = 1.5;
      } else if (latestRate > 0.0003) {
        // Funding > +0.03% — moderately positive, sell confirmation
        multiplier = 1.2;
      }
    }

    return {
      ...signal,
      strength: Math.min(1, signal.strength * multiplier),
    };
  } catch {
    // API failure is non-fatal — return original signal
    return signal;
  }
}
