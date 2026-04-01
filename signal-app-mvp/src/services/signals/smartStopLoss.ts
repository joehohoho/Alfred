/**
 * Smart Stop-Loss Placement
 * Combines ATR, support/resistance levels, and technical analysis
 */

import type { PriceSeries } from '@/models/PriceData';

export interface StopLossLevel {
  atrBased: number; // Entry ± ATR
  supportResistance: number; // Nearest support/resistance
  volatilityBased: number; // Entry ± 2x volatility
  recommended: number; // Best choice
  reasoning: string;
  confidence: number; // 0-1, how confident in this level
}

export class SmartStopLossCalculator {
  /**
   * Calculate multiple stop loss levels
   * For BUY signals: stop loss BELOW entry
   * For SELL signals: stop loss ABOVE entry
   */
  static calculateStopLoss(
    series: PriceSeries,
    entryPrice: number,
    isLongTrade: boolean, // true = BUY (stop below), false = SELL (stop above)
    atrPeriod: number = 14
  ): StopLossLevel {
    const atr = this.calculateATR(series, atrPeriod);
    const volatility = this.calculateVolatility(series, 20);
    const supportResistance = this.findSupportResistance(series, entryPrice, isLongTrade);

    // Calculate different stop loss methods
    const atrBased = isLongTrade ? entryPrice - atr * 1.5 : entryPrice + atr * 1.5;
    const volatilityBased = isLongTrade ? entryPrice - entryPrice * volatility * 2 : entryPrice + entryPrice * volatility * 2;
    const recommendedSL = this.selectBestStopLoss(
      atrBased,
      supportResistance,
      volatilityBased,
      entryPrice,
      isLongTrade,
      atr,
      volatility
    );

    const reasoning = this.generateStopLossReasoning(atrBased, supportResistance, volatilityBased, recommendedSL, isLongTrade);
    const confidence = this.calculateConfidence(atrBased, supportResistance, volatilityBased, entryPrice, isLongTrade);

    return {
      atrBased,
      supportResistance,
      volatilityBased,
      recommended: recommendedSL,
      reasoning,
      confidence
    };
  }

  /**
   * ATR-based stop loss (tightest, uses technical volatility)
   */
  static calculateATRBasedStopLoss(
    entryPrice: number,
    atr: number,
    isLongTrade: boolean,
    atrMultiplier: number = 1.5
  ): number {
    return isLongTrade ? entryPrice - atr * atrMultiplier : entryPrice + atr * atrMultiplier;
  }

  /**
   * Find support/resistance levels near entry price
   */
  static findSupportResistance(series: PriceSeries, entryPrice: number, isLongTrade: boolean): number {
    if (series.points.length < 20) {
      // Fallback if not enough data
      return isLongTrade ? entryPrice * 0.98 : entryPrice * 1.02;
    }

    const recentPoints = series.points.slice(-50); // Last 50 candles
    const prices = recentPoints.map((p) => p.low ?? p.close);

    // Find local lows (support for longs) or highs (resistance for shorts)
    const extrema = this.findLocalExtrema(prices, isLongTrade);

    if (extrema.length === 0) {
      return isLongTrade ? entryPrice * 0.97 : entryPrice * 1.03;
    }

    // Find the closest extrema to entry price
    const closest = extrema.reduce((prev, curr) => {
      return Math.abs(curr - entryPrice) < Math.abs(prev - entryPrice) ? curr : prev;
    });

    // For longs: use support below entry; for shorts: use resistance above entry
    if (isLongTrade) {
      // Support should be below entry
      return closest < entryPrice ? closest : entryPrice * 0.97;
    } else {
      // Resistance should be above entry
      return closest > entryPrice ? closest : entryPrice * 1.03;
    }
  }

  /**
   * Find local extrema (peaks and valleys)
   */
  private static findLocalExtrema(prices: number[], findLows: boolean): number[] {
    const extrema: number[] = [];

    for (let i = 1; i < prices.length - 1; i++) {
      if (findLows) {
        // Find local lows
        if (prices[i] < prices[i - 1] && prices[i] < prices[i + 1]) {
          extrema.push(prices[i]);
        }
      } else {
        // Find local highs
        if (prices[i] > prices[i - 1] && prices[i] > prices[i + 1]) {
          extrema.push(prices[i]);
        }
      }
    }

    return extrema;
  }

  /**
   * Select the best stop loss level from multiple candidates
   */
  private static selectBestStopLoss(
    atrBased: number,
    supportResistance: number,
    volatilityBased: number,
    entryPrice: number,
    isLongTrade: boolean,
    atr: number,
    volatility: number
  ): number {
    // For long trades: stop loss should be below entry
    if (isLongTrade) {
      const candidates = [
        { level: atrBased, name: 'ATR' },
        { level: supportResistance, name: 'Support' },
        { level: volatilityBased, name: 'Volatility' }
      ];

      // Prefer levels that are:
      // 1. Below entry price (all should be)
      // 2. Close to major support levels
      // 3. Not too tight (at least 1% away)
      // 4. Not too loose (not more than 5% away)

      const valid = candidates.filter((c) => {
        const distance = ((entryPrice - c.level) / entryPrice) * 100;
        return distance >= 1 && distance <= 5;
      });

      if (valid.length > 0) {
        // Prefer support/resistance if valid
        const srCandidate = valid.find((c) => c.name === 'Support');
        if (srCandidate) return srCandidate.level;

        // Otherwise prefer middle distance (ATR-based)
        return valid.find((c) => c.name === 'ATR')?.level || valid[0].level;
      }

      // Fallback to ATR-based
      return atrBased;
    } else {
      // For short trades: stop loss should be above entry
      const candidates = [
        { level: atrBased, name: 'ATR' },
        { level: supportResistance, name: 'Resistance' },
        { level: volatilityBased, name: 'Volatility' }
      ];

      const valid = candidates.filter((c) => {
        const distance = ((c.level - entryPrice) / entryPrice) * 100;
        return distance >= 1 && distance <= 5;
      });

      if (valid.length > 0) {
        const srCandidate = valid.find((c) => c.name === 'Resistance');
        if (srCandidate) return srCandidate.level;
        return valid.find((c) => c.name === 'ATR')?.level || valid[0].level;
      }

      return atrBased;
    }
  }

  /**
   * Generate human-readable reasoning for stop loss placement
   */
  private static generateStopLossReasoning(
    atrBased: number,
    supportResistance: number,
    volatilityBased: number,
    recommended: number,
    isLongTrade: boolean
  ): string {
    const direction = isLongTrade ? 'Long' : 'Short';
    const distToATR = ((Math.abs(atrBased - recommended) / atrBased) * 100).toFixed(2);
    const distToSR = ((Math.abs(supportResistance - recommended) / supportResistance) * 100).toFixed(2);

    return (
      `${direction} trade. Stop loss placed at ${recommended.toFixed(2)}. ` +
      `ATR-based: ${atrBased.toFixed(2)} (${distToATR}% diff), ` +
      `Support/Resistance: ${supportResistance.toFixed(2)} (${distToSR}% diff). ` +
      `Chosen level balances risk management with market structure.`
    );
  }

  /**
   * Calculate confidence in the stop loss placement (0-1)
   */
  private static calculateConfidence(
    atrBased: number,
    supportResistance: number,
    volatilityBased: number,
    entryPrice: number,
    isLongTrade: boolean
  ): number {
    // Confidence increases if multiple methods agree
    let confidence = 0.6; // Base confidence

    const atrSRDiff = Math.abs(atrBased - supportResistance) / entryPrice;
    if (atrSRDiff < 0.02) {
      confidence += 0.2; // Methods agree closely
    } else if (atrSRDiff < 0.05) {
      confidence += 0.1; // Methods roughly agree
    }

    // If support/resistance aligns with ATR, higher confidence
    if (
      (isLongTrade && supportResistance < entryPrice) ||
      (!isLongTrade && supportResistance > entryPrice)
    ) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate take profit based on risk/reward ratio
   */
  static calculateTakeProfit(
    stopLoss: number,
    entryPrice: number,
    isLongTrade: boolean,
    riskRewardRatio: number = 2 // 1:2 risk/reward
  ): number {
    const riskAmount = Math.abs(entryPrice - stopLoss);
    const profitTarget = riskAmount * riskRewardRatio;

    return isLongTrade ? entryPrice + profitTarget : entryPrice - profitTarget;
  }

  /**
   * Calculate ATR for stop loss
   */
  private static calculateATR(series: PriceSeries, period: number = 14): number {
    if (series.points.length < period + 1) {
      return 0;
    }

    const trueRanges: number[] = [];

    for (let i = 1; i < series.points.length; i++) {
      const curr = series.points[i];
      const prev = series.points[i - 1];

      const high = curr.high ?? curr.close;
      const low = curr.low ?? curr.close;
      const prevClose = prev.close;

      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);

      trueRanges.push(Math.max(tr1, tr2, tr3));
    }

    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((a, b) => a + b, 0) / period;
  }

  /**
   * Calculate volatility (standard deviation of returns)
   */
  private static calculateVolatility(series: PriceSeries, period: number = 20): number {
    if (series.points.length < period + 1) {
      return 0;
    }

    const closes = series.points.slice(-period).map((p) => p.close);
    const returns: number[] = [];

    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }

    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }
}

export default SmartStopLossCalculator;
