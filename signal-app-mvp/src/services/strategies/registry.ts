import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength, Strategy } from '@/services/backtest/engine';
import { SMARSIImprovedStrategy } from './smaRsiImproved';
import { MACDStrategy } from './macdStrategy';
import { BollingerStrategy } from './bollingerStrategy';

export interface StrategyPerformance {
  name: string;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  totalTrades: number;
  recentAccuracy: number; // Accuracy on last N trades
  weight: number; // Confidence weight for signal voting
}

/**
 * Strategy Registry
 * Manages multiple strategies and their performance tracking
 * Provides adaptive strategy selection based on historical performance
 */
export class StrategyRegistry implements Strategy {
  private strategies: BaseStrategyAdapter[] = [];
  private performance: Map<string, StrategyPerformance> = new Map();

  constructor() {
    // Initialize with default strategies
    this.registerStrategy(new SMARSIImprovedStrategy());
    this.registerStrategy(new MACDStrategy());
    this.registerStrategy(new BollingerStrategy());
  }

  registerStrategy(strategy: any): void {
    this.strategies.push(
      new BaseStrategyAdapter(strategy.name, (series: PriceSeries) => strategy.generateSignals(series))
    );

    // Initialize performance tracking
    this.performance.set(strategy.name, {
      name: strategy.name,
      winRate: 0.5, // Neutral until we have data
      profitFactor: 1.0,
      sharpeRatio: 0,
      totalTrades: 0,
      recentAccuracy: 0.5,
      weight: 1 / this.strategies.length // Equal weight initially
    });
  }

  /**
   * Generate signals from all strategies
   * Combine them with adaptive weighting based on performance
   */
  generateSignals(series: PriceSeries): SignalWithStrength[] {
    const allSignals: SignalWithStrength[] = [];

    // Get signals from each strategy
    const signalsByTime = new Map<string, { buy: SignalWithStrength[]; sell: SignalWithStrength[] }>();

    for (const strategy of this.strategies) {
      const signals = strategy.generateSignals(series);
      const perf = this.performance.get(strategy.name) || { weight: 1 / this.strategies.length };

      for (const signal of signals) {
        const timeKey = signal.time.getTime().toString();
        if (!signalsByTime.has(timeKey)) {
          signalsByTime.set(timeKey, { buy: [], sell: [] });
        }
        const entry = signalsByTime.get(timeKey)!;
        const weightedSignal: SignalWithStrength = {
          ...signal,
          strength: signal.strength * perf.weight
        };
        if (signal.type === 'BUY') {
          entry.buy.push(weightedSignal);
        } else {
          entry.sell.push(weightedSignal);
        }
      }
    }

    // Aggregate signals by time
    signalsByTime.forEach((group, timeKey) => {
      const time = new Date(Number(timeKey));

      // Aggregate BUY signals
      if (group.buy.length > 0) {
        const avgStrength = group.buy.reduce((sum, s) => sum + s.strength, 0) / group.buy.length;
        const price = group.buy[0].price; // Use first signal's price (approximately same time)
        allSignals.push({
          time,
          type: 'BUY',
          price,
          strength: Math.min(1, avgStrength)
        });
      }

      // Aggregate SELL signals
      if (group.sell.length > 0) {
        const avgStrength = group.sell.reduce((sum, s) => sum + s.strength, 0) / group.sell.length;
        const price = group.sell[0].price;
        allSignals.push({
          time,
          type: 'SELL',
          price,
          strength: Math.min(1, avgStrength)
        });
      }
    });

    // Sort by time
    allSignals.sort((a, b) => a.time.getTime() - b.time.getTime());
    return allSignals;
  }

  /**
   * Update strategy performance based on backtest results
   * Called after running backtests to adjust weights
   */
  updatePerformance(strategyName: string, performance: Partial<StrategyPerformance>): void {
    const current = this.performance.get(strategyName);
    if (current) {
      this.performance.set(strategyName, { ...current, ...performance });
      this.normalizeWeights();
    }
  }

  /**
   * Get all registered strategies
   */
  getStrategies(): BaseStrategyAdapter[] {
    return this.strategies;
  }

  /**
   * Get performance data for all strategies
   */
  getPerformance(): StrategyPerformance[] {
    return Array.from(this.performance.values());
  }

  /**
   * Normalize strategy weights so they sum to 1.0
   */
  private normalizeWeights(): void {
    const strategies = Array.from(this.performance.values());

    // Weight by Sharpe ratio + win rate
    const scores = strategies.map((s) => {
      const sharpeWeight = Math.max(0, s.sharpeRatio);
      const winRateWeight = s.winRate;
      const profitFactorWeight = Math.log(Math.max(s.profitFactor, 1) + 1);
      return sharpeWeight * 0.4 + winRateWeight * 0.3 + profitFactorWeight * 0.3;
    });

    const totalScore = scores.reduce((a, b) => a + b, 0);

    strategies.forEach((s, i) => {
      s.weight = totalScore > 0 ? scores[i] / totalScore : 1 / strategies.length;
    });
  }

  get name(): string {
    return 'ADAPTIVE_MULTI_STRATEGY';
  }
}

/**
 * Adapter to make any strategy compatible with Strategy interface
 */
class BaseStrategyAdapter implements Strategy {
  constructor(
    public readonly name: string,
    private readonly signalGenerator: (series: PriceSeries) => SignalWithStrength[]
  ) {}

  generateSignals(series: PriceSeries): SignalWithStrength[] {
    return this.signalGenerator(series);
  }
}
