/**
 * Kelly Criterion for Optimal Position Sizing
 * f* = (bp - q) / b
 * Where:
 *   f* = fraction of bankroll to risk
 *   b = ratio of win to loss
 *   p = win probability
 *   q = loss probability (1 - p)
 *
 * Combined with volatility adjustment for real markets
 */

import type { PriceSeries } from '@/models/PriceData';

export interface KellyPositionSize {
  optimalFraction: number; // 0-1, fraction of bankroll to risk
  adjustedFraction: number; // After volatility adjustment (usually 0.25x Kelly for safety)
  volatilityAdjustment: number; // 0.1 to 1.0
  atr: number; // Average True Range
  recentVolatility: number; // 20-day volatility %
  historicalVolatility: number; // Longer-term volatility
  recommendation: string; // Human-readable recommendation
  riskLevel: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
}

export class KellyCalculator {
  /**
   * Calculate Kelly fraction based on win/loss statistics
   * @param winRate Win percentage (0-1)
   * @param avgWin Average winning trade
   * @param avgLoss Average losing trade (as positive number)
   * @returns Kelly fraction (0-1)
   */
  static calculateKellyFraction(winRate: number, avgWin: number, avgLoss: number): number {
    if (avgLoss === 0 || avgWin === 0) return 0;

    const p = winRate; // Probability of win
    const q = 1 - winRate; // Probability of loss
    const b = avgWin / avgLoss; // Win/loss ratio

    // Kelly formula: f* = (bp - q) / b
    const kellyFraction = (b * p - q) / b;

    // Clamp to [0, 0.25] - never risk more than 25% of bankroll per trade
    return Math.max(0, Math.min(0.25, kellyFraction));
  }

  /**
   * Calculate position size adjusted for volatility
   * Higher volatility = smaller position
   * Lower volatility = can size up slightly
   */
  static calculateVolatilityAdjustedPositionSize(
    series: PriceSeries,
    winRate: number,
    avgWin: number,
    avgLoss: number,
    atrPeriod: number = 14
  ): KellyPositionSize {
    // 1. Calculate base Kelly fraction
    const kellyFraction = this.calculateKellyFraction(winRate, avgWin, avgLoss);

    // 2. Calculate ATR (Average True Range)
    const atr = this.calculateATR(series, atrPeriod);

    // 3. Calculate recent vs historical volatility
    const recentVol = this.calculateVolatility(series, 20); // 20-period volatility
    const historicalVol = this.calculateVolatility(series, 50); // 50-period volatility

    // 4. Calculate volatility adjustment factor
    // If recent vol > historical vol, reduce position size
    const volRatio = recentVol / (historicalVol || 1);
    let volatilityAdjustment = 1.0;

    if (volRatio > 1.5) {
      volatilityAdjustment = 0.5; // High volatility = 50% of Kelly
    } else if (volRatio > 1.2) {
      volatilityAdjustment = 0.7; // Above normal = 70% of Kelly
    } else if (volRatio < 0.7) {
      volatilityAdjustment = 1.0; // Normal to low = full Kelly
    } else {
      volatilityAdjustment = 0.85; // Slightly elevated = 85% of Kelly
    }

    // 5. Apply safety factor (use 0.25x Kelly for real trading)
    const safetyFactor = 0.25; // Conservative: use 1/4 Kelly
    const adjustedFraction = kellyFraction * volatilityAdjustment * safetyFactor;

    // 6. Determine risk level
    let riskLevel: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' = 'MEDIUM';
    if (adjustedFraction < 0.01) riskLevel = 'VERY_LOW';
    else if (adjustedFraction < 0.02) riskLevel = 'LOW';
    else if (adjustedFraction < 0.04) riskLevel = 'MEDIUM';
    else if (adjustedFraction < 0.06) riskLevel = 'HIGH';
    else riskLevel = 'VERY_HIGH';

    // 7. Generate recommendation
    const recommendation = this.generateRecommendation(
      kellyFraction,
      adjustedFraction,
      winRate,
      recentVol,
      historicalVol,
      riskLevel
    );

    return {
      optimalFraction: kellyFraction,
      adjustedFraction,
      volatilityAdjustment,
      atr,
      recentVolatility: recentVol * 100,
      historicalVolatility: historicalVol * 100,
      recommendation,
      riskLevel
    };
  }

  /**
   * Calculate Average True Range (ATR)
   */
  static calculateATR(series: PriceSeries, period: number = 14): number {
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

    // Calculate average of last 'period' TR values
    const recentTR = trueRanges.slice(-period);
    const atr = recentTR.reduce((a, b) => a + b, 0) / period;

    return atr;
  }

  /**
   * Calculate volatility (standard deviation of returns)
   */
  static calculateVolatility(series: PriceSeries, period: number = 20): number {
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
    const stdDev = Math.sqrt(variance);

    return stdDev;
  }

  private static generateRecommendation(
    kellyFraction: number,
    adjustedFraction: number,
    winRate: number,
    recentVol: number,
    historicalVol: number,
    riskLevel: string
  ): string {
    let recommendation = `Position size: ${(adjustedFraction * 100).toFixed(2)}% of bankroll. `;

    if (winRate < 0.45) {
      recommendation += `⚠️ Win rate is low (${(winRate * 100).toFixed(1)}%). Consider skipping trade. `;
    } else if (winRate < 0.50) {
      recommendation += `⚠️ Win rate barely positive (${(winRate * 100).toFixed(1)}%). Use minimum size. `;
    } else if (winRate < 0.55) {
      recommendation += `✓ Moderate win rate (${(winRate * 100).toFixed(1)}%). Use standard sizing. `;
    } else {
      recommendation += `✅ Strong win rate (${(winRate * 100).toFixed(1)}%). Can use full allocation. `;
    }

    if (recentVol > historicalVol * 1.3) {
      recommendation += `Volatility elevated (${(recentVol * 100).toFixed(1)}% vs ${(historicalVol * 100).toFixed(1)}% hist). `;
    } else if (recentVol < historicalVol * 0.8) {
      recommendation += `Volatility low. Market is calm. `;
    }

    recommendation += `Risk level: ${riskLevel}.`;

    return recommendation;
  }

  /**
   * Calculate optimal stop loss and take profit levels
   */
  static calculateRiskRewardLevels(
    entryPrice: number,
    atr: number,
    riskPercent: number = 2,
    rewardMultiplier: number = 2
  ): {
    stopLoss: number;
    takeProfit: number;
    riskAmount: number;
    rewardAmount: number;
    riskRewardRatio: number;
  } {
    const riskAmount = entryPrice * (riskPercent / 100);
    const stopLoss = entryPrice - riskAmount;

    const rewardAmount = riskAmount * rewardMultiplier;
    const takeProfit = entryPrice + rewardAmount;

    return {
      stopLoss,
      takeProfit,
      riskAmount,
      rewardAmount,
      riskRewardRatio: rewardAmount / riskAmount
    };
  }

  /**
   * Alternative: Position size based on ATR
   * Smaller positions in high-volatility markets
   */
  static calculateATRBasedPositionSize(
    entryPrice: number,
    atr: number,
    accountSize: number,
    riskPercent: number = 2
  ): {
    positionSize: number;
    contracts: number;
    riskAmount: number;
  } {
    const riskAmount = accountSize * (riskPercent / 100);
    const positionSize = riskAmount / (atr * 1.5); // Assume stop loss 1.5x ATR away

    return {
      positionSize,
      contracts: Math.floor(positionSize / entryPrice),
      riskAmount
    };
  }
}

export default KellyCalculator;
