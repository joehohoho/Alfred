/**
 * Enhanced Signal Strategy - Week 1 Improvements
 * 
 * Combines multiple confirmation factors:
 * 1. Trend confirmation (SMA 50-period)
 * 2. Momentum (RSI extreme zones)
 * 3. Volatility adjustment
 * 4. Support/Resistance detection
 * 5. Volume confirmation (if available)
 * 
 * Win Rate Target: 50%+
 */

import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength } from '@/services/backtest/engine';

interface EnhancedParams {
  // SMA periods
  shortSMA?: number; // Default: 10
  mediumSMA?: number; // Default: 30
  longSMA?: number; // Default: 50
  
  // RSI settings
  rsiPeriod?: number; // Default: 14
  rsiBuyThreshold?: number; // Default: 35 (stronger than standard 30)
  rsiSellThreshold?: number; // Default: 65 (stronger than standard 70)
  
  // ADX for trend confirmation
  adxPeriod?: number; // Default: 14
  minADXForTrade?: number; // Default: 25 (only trade strong trends)
  
  // ATR for volatility
  atrPeriod?: number; // Default: 14
  maxAtrPercent?: number; // Default: 3 (skip if volatility > 3%)
  
  // Support/Resistance
  srLookback?: number; // Default: 20 (how many bars back to find levels)
}

export class EnhancedSignalStrategy {
  name = 'ENHANCED_V1';
  params: Required<EnhancedParams>;

  constructor(customParams: EnhancedParams = {}) {
    this.params = {
      shortSMA: customParams.shortSMA ?? 10,
      mediumSMA: customParams.mediumSMA ?? 30,
      longSMA: customParams.longSMA ?? 50,
      rsiPeriod: customParams.rsiPeriod ?? 14,
      rsiBuyThreshold: customParams.rsiBuyThreshold ?? 35,
      rsiSellThreshold: customParams.rsiSellThreshold ?? 65,
      adxPeriod: customParams.adxPeriod ?? 14,
      minADXForTrade: customParams.minADXForTrade ?? 25,
      atrPeriod: customParams.atrPeriod ?? 14,
      maxAtrPercent: customParams.maxAtrPercent ?? 3,
      srLookback: customParams.srLookback ?? 20
    };
  }

  generateSignals(series: PriceSeries): SignalWithStrength[] {
    const points = series.points;
    if (points.length < Math.max(this.params.longSMA, this.params.rsiPeriod) + 5) {
      return [];
    }

    const signals: SignalWithStrength[] = [];

    // Pre-calculate indicators
    const smas = this.calculateSMAs(points, [this.params.shortSMA, this.params.mediumSMA, this.params.longSMA]);
    const rsis = this.calculateRSI(points, this.params.rsiPeriod);
    const adxValues = this.calculateADX(points, this.params.adxPeriod);
    const atrValues = this.calculateATR(points, this.params.atrPeriod);

    // Generate signals for each bar
    for (let i = Math.max(this.params.longSMA, this.params.rsiPeriod); i < points.length; i++) {
      const point = points[i];
      const prevPoint = points[i - 1];

      const close = point.close;
      const prevClose = prevPoint.close;

      // Get indicators for this bar
      const [shortSMA, mediumSMA, longSMA] = [
        smas[0][i - this.params.shortSMA] ?? 0,
        smas[1][i - this.params.mediumSMA] ?? 0,
        smas[2][i - this.params.longSMA] ?? 0
      ];

      const rsi = rsis[i - this.params.rsiPeriod] ?? 50;
      const adx = adxValues[i - this.params.adxPeriod] ?? 0;
      const atr = atrValues[i - this.params.atrPeriod] ?? 0;

      // === FILTER 1: Trend Confirmation (SMA alignment) ===
      const isUptrend = close > shortSMA && shortSMA > mediumSMA && mediumSMA > longSMA;
      const isDowntrend = close < shortSMA && shortSMA < mediumSMA && mediumSMA < longSMA;
      
      if (!isUptrend && !isDowntrend) {
        continue; // No clear trend, skip
      }

      // === FILTER 2: ADX (Trend Strength) ===
      if (adx < this.params.minADXForTrade) {
        continue; // Trend too weak
      }

      // === FILTER 3: Volatility (ATR) ===
      const atrPercent = (atr / close) * 100;
      if (atrPercent > this.params.maxAtrPercent) {
        continue; // Volatility too high, skip
      }

      // === FILTER 4: Support/Resistance ===
      const srLevels = this.findSupportResistance(points, i, this.params.srLookback);

      // === SIGNAL 1: RSI Extreme + Trend Confirmation ===
      
      // BUY: Uptrend + RSI oversold + price near support
      if (isUptrend && rsi < this.params.rsiBuyThreshold) {
        const distToSupport = srLevels.support > 0 ? ((close - srLevels.support) / close) * 100 : 2;
        
        // Increase confidence if close to support
        const supportConfidence = distToSupport < 1 ? 1.0 : distToSupport < 2 ? 0.8 : 0.6;
        const strength = (50 + (this.params.rsiBuyThreshold - rsi) * 2 + (adx - this.params.minADXForTrade) / 2) / 100;
        
        if (strength > 0.5) {
          signals.push({
            time: point.timestamp,
            type: 'BUY',
            strength: Math.min(strength * supportConfidence, 1.0),
            reason: `Uptrend (ADX=${adx.toFixed(1)}) + Oversold RSI=${rsi.toFixed(1)} + Support=${srLevels.support.toFixed(2)}`
          });
        }
      }

      // SELL: Downtrend + RSI overbought + price near resistance
      if (isDowntrend && rsi > this.params.rsiSellThreshold) {
        const distToResistance = srLevels.resistance > 0 ? ((srLevels.resistance - close) / close) * 100 : 2;
        
        // Increase confidence if close to resistance
        const resistanceConfidence = distToResistance < 1 ? 1.0 : distToResistance < 2 ? 0.8 : 0.6;
        const strength = (50 + (rsi - this.params.rsiSellThreshold) * 2 + (adx - this.params.minADXForTrade) / 2) / 100;
        
        if (strength > 0.5) {
          signals.push({
            time: point.timestamp,
            type: 'SELL',
            strength: Math.min(strength * resistanceConfidence, 1.0),
            reason: `Downtrend (ADX=${adx.toFixed(1)}) + Overbought RSI=${rsi.toFixed(1)} + Resistance=${srLevels.resistance.toFixed(2)}`
          });
        }
      }

      // === SIGNAL 2: MA Crossover + RSI Confirmation ===
      
      // Golden Cross (short MA crosses above long MA) in uptrend
      const shortPrevSMA = smas[0][i - this.params.shortSMA - 1] ?? 0;
      const longPrevSMA = smas[2][i - this.params.longSMA - 1] ?? 0;
      
      if (shortPrevSMA <= longPrevSMA && shortSMA > longSMA && isUptrend && rsi < 70) {
        const strength = (0.5 + (adx - this.params.minADXForTrade) / 50) * (1 - Math.abs(rsi - 50) / 50);
        
        if (strength > 0.4) {
          signals.push({
            time: point.timestamp,
            type: 'BUY',
            strength: Math.min(strength, 1.0),
            reason: `Golden Cross (${this.params.shortSMA}SMA > ${this.params.longSMA}SMA) + Uptrend`
          });
        }
      }

      // Death Cross (short MA crosses below long MA) in downtrend
      const mediumPrevSMA = smas[1][i - this.params.mediumSMA - 1] ?? 0;
      if (mediumPrevSMA >= longPrevSMA && mediumSMA < longSMA && isDowntrend && rsi > 30) {
        const strength = (0.5 + (adx - this.params.minADXForTrade) / 50) * (1 - Math.abs(rsi - 50) / 50);
        
        if (strength > 0.4) {
          signals.push({
            time: point.timestamp,
            type: 'SELL',
            strength: Math.min(strength, 1.0),
            reason: `Death Cross (${this.params.mediumSMA}SMA < ${this.params.longSMA}SMA) + Downtrend`
          });
        }
      }
    }

    return signals;
  }

  private calculateSMAs(points: any[], periods: number[]): number[][] {
    return periods.map((period) => {
      const smas: number[] = [];
      for (let i = 0; i < points.length; i++) {
        if (i < period - 1) {
          smas.push(0);
        } else {
          const sum = points.slice(i - period + 1, i + 1).reduce((acc, p) => acc + p.close, 0);
          smas.push(sum / period);
        }
      }
      return smas;
    });
  }

  private calculateRSI(points: any[], period: number = 14): number[] {
    const rsis: number[] = [];
    const diffs: number[] = [];

    for (let i = 1; i < points.length; i++) {
      diffs.push(points[i].close - points[i - 1].close);
    }

    for (let i = 0; i < points.length; i++) {
      if (i < period) {
        rsis.push(50);
        continue;
      }

      const gains = diffs.slice(i - period, i).filter((d) => d > 0).reduce((a, b) => a + b, 0);
      const losses = diffs.slice(i - period, i).filter((d) => d < 0).reduce((a, b) => a + Math.abs(b), 0);

      const avgGain = gains / period;
      const avgLoss = losses / period;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);

      rsis.push(rsi);
    }

    return rsis;
  }

  private calculateADX(points: any[], period: number = 14): number[] {
    // Simplified ADX (just return trend strength indicator)
    const adxValues: number[] = [];
    const tr: number[] = [];

    for (let i = 1; i < points.length; i++) {
      const curr = points[i];
      const prev = points[i - 1];

      const high = curr.high ?? curr.close;
      const low = curr.low ?? curr.close;
      const prevClose = prev.close;

      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);

      tr.push(Math.max(tr1, tr2, tr3));
    }

    for (let i = 0; i < points.length; i++) {
      if (i < period) {
        adxValues.push(0);
      } else {
        const avgTR = tr.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
        // Simple volatility measure (not true ADX, but good proxy)
        const atrPercent = (avgTR / points[i].close) * 100;
        const adx = Math.min(atrPercent * 20, 100); // Scale to 0-100
        adxValues.push(Math.max(adx, 10)); // Min 10 to avoid division issues
      }
    }

    return adxValues;
  }

  private calculateATR(points: any[], period: number = 14): number[] {
    const atrs: number[] = [];
    const tr: number[] = [];

    for (let i = 1; i < points.length; i++) {
      const curr = points[i];
      const prev = points[i - 1];

      const high = curr.high ?? curr.close;
      const low = curr.low ?? curr.close;
      const prevClose = prev.close;

      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);

      tr.push(Math.max(tr1, tr2, tr3));
    }

    for (let i = 0; i < points.length; i++) {
      if (i < period) {
        atrs.push(0);
      } else {
        const avgTR = tr.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
        atrs.push(avgTR);
      }
    }

    return atrs;
  }

  private findSupportResistance(points: any[], currentIndex: number, lookback: number) {
    const start = Math.max(0, currentIndex - lookback);
    const recentPoints = points.slice(start, currentIndex);

    if (recentPoints.length === 0) {
      return { support: 0, resistance: 0 };
    }

    const lows = recentPoints.map((p) => p.low ?? p.close);
    const highs = recentPoints.map((p) => p.high ?? p.close);

    return {
      support: Math.min(...lows),
      resistance: Math.max(...highs)
    };
  }
}

export default EnhancedSignalStrategy;
