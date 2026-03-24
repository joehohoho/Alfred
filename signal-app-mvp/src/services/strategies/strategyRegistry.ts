import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength, Strategy } from '@/services/backtest/engine';
import { SMARSIImprovedStrategy } from './smaRsiImproved';
import { MACDStrategy } from './macdStrategy';
import { BollingerStrategy } from './bollingerStrategy';
import { RSIExtremeStrategy } from './rsiExtremeStrategy';
import { TrendFollowingStrategy } from './trendFollowingStrategy';

export interface StrategyConfig {
  name: string;
  params: Record<string, number>;
  weight: number; // 0-1, importance weight
  enabled: boolean;
}

export interface EnsembleSignal {
  type: 'BUY' | 'SELL' | 'HOLD';
  price: number;
  time: Date;
  strength: number; // 0-1, weighted confidence
  sourceStrategies: string[];
  strategyVotes: Array<{
    strategy: string;
    vote: 'BUY' | 'SELL' | 'HOLD';
    strength: number;
  }>;
}

/**
 * Strategy Registry & Ensemble Voting System
 * 
 * Manages multiple strategies and combines their signals via voting
 * - Each strategy gets a weight based on recent performance
 * - Signals are merged and voted on to produce ensemble output
 * - Supports dynamic strategy enable/disable
 */
export class StrategyRegistry {
  private strategies: Map<string, Strategy> = new Map();
  private configs: Map<string, StrategyConfig> = new Map();

  constructor() {
    this.initializeDefaultStrategies();
  }

  private initializeDefaultStrategies() {
    // Register all available strategies with default configs
    this.registerStrategy(
      'SMA_RSI_IMPROVED',
      new SMARSIImprovedStrategy(),
      { shortPeriod: 9, longPeriod: 21, rsiPeriod: 14, rsiBuyThreshold: 40, rsiSellThreshold: 60 },
      1.0 // Weight 1.0 (equal)
    );

    this.registerStrategy(
      'MACD',
      new MACDStrategy(),
      { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
      1.0
    );

    this.registerStrategy(
      'BOLLINGER_BANDS',
      new BollingerStrategy(),
      { period: 20, stdDevs: 2, rsiPeriod: 14, minRSI: 30, maxRSI: 70 },
      1.0
    );

    this.registerStrategy(
      'RSI_EXTREME',
      new RSIExtremeStrategy(),
      { rsiPeriod: 14, buyThreshold: 30, sellThreshold: 70 },
      0.8 // Slightly lower weight (mean-reversion strategy)
    );

    this.registerStrategy(
      'TREND_FOLLOWING',
      new TrendFollowingStrategy(),
      { hmaPeriod: 20, adxPeriod: 14, adxThreshold: 25, rsiPeriod: 14 },
      1.0
    );
  }

  /**
   * Register a new strategy
   */
  registerStrategy(
    name: string,
    strategy: Strategy,
    params: Record<string, number>,
    weight: number = 1.0
  ): void {
    this.strategies.set(name, strategy);
    this.configs.set(name, {
      name,
      params,
      weight: Math.min(1, Math.max(0, weight)),
      enabled: true
    });
  }

  /**
   * Update strategy weight (for performance-based weighting)
   */
  setStrategyWeight(name: string, weight: number): void {
    const config = this.configs.get(name);
    if (config) {
      config.weight = Math.min(1, Math.max(0, weight));
    }
  }

  /**
   * Enable/disable a strategy
   */
  setStrategyEnabled(name: string, enabled: boolean): void {
    const config = this.configs.get(name);
    if (config) {
      config.enabled = enabled;
    }
  }

  /**
   * Get all enabled strategies
   */
  getEnabledStrategies(): string[] {
    return Array.from(this.configs.values())
      .filter(c => c.enabled)
      .map(c => c.name);
  }

  /**
   * Generate ensemble signal from all enabled strategies
   * Uses voting + weighting to produce combined signal
   */
  generateEnsembleSignal(series: PriceSeries): EnsembleSignal {
    const enabledStrategies = this.getEnabledStrategies();
    const allVotes = new Map<number, Array<{
      type: 'BUY' | 'SELL';
      strategy: string;
      strength: number;
      weight: number;
    }>>();

    // Collect signals from all enabled strategies
    for (const stratName of enabledStrategies) {
      const strategy = this.strategies.get(stratName);
      const config = this.configs.get(stratName);

      if (!strategy || !config) continue;

      try {
        const signals = strategy.generateSignals(series);

        for (const signal of signals) {
          if (signal.type === 'HOLD') continue;

          const timeMs = signal.time.getTime();
          if (!allVotes.has(timeMs)) {
            allVotes.set(timeMs, []);
          }

          allVotes.get(timeMs)!.push({
            type: signal.type,
            strategy: stratName,
            strength: signal.strength,
            weight: config.weight
          });
        }
      } catch (error) {
        console.error(`[StrategyRegistry] Error generating signals from ${stratName}:`, error);
      }
    }

    // Find most recent vote set
    let lastSignalTime = 0;
    let lastSignalVotes: Array<{ type: string; strategy: string; strength: number; weight: number }> = [];

    for (const [timeMs, votes] of allVotes) {
      if (timeMs > lastSignalTime) {
        lastSignalTime = timeMs;
        lastSignalVotes = votes as any;
      }
    }

    // Default to HOLD if no signals
    if (lastSignalVotes.length === 0) {
      const lastPrice = series.points[series.points.length - 1]?.close ?? 0;
      const lastTime = series.points[series.points.length - 1]?.timestamp ?? new Date();
      return {
        type: 'HOLD',
        price: lastPrice,
        time: lastTime,
        strength: 0,
        sourceStrategies: [],
        strategyVotes: []
      };
    }

    // Vote on signal type
    const buyVotes = lastSignalVotes
      .filter(v => v.type === 'BUY')
      .reduce((sum, v) => sum + v.weight, 0);

    const sellVotes = lastSignalVotes
      .filter(v => v.type === 'SELL')
      .reduce((sum, v) => sum + v.weight, 0);

    const totalWeight = buyVotes + sellVotes;
    const buyPercent = totalWeight > 0 ? buyVotes / totalWeight : 0.5;

    // Determine final signal type
    let signalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength = 0;

    if (buyPercent > 0.6) {
      signalType = 'BUY';
      strength = Math.min(1, buyVotes / this.getTotalPossibleWeight());
    } else if (buyPercent < 0.4) {
      signalType = 'SELL';
      strength = Math.min(1, sellVotes / this.getTotalPossibleWeight());
    } else {
      // Mixed signals - HOLD
      signalType = 'HOLD';
      strength = 0.5; // Uncertain
    }

    // Calculate average strength of winning votes
    const winningVotes = lastSignalVotes.filter(v =>
      (signalType === 'BUY' && v.type === 'BUY') ||
      (signalType === 'SELL' && v.type === 'SELL')
    );

    if (winningVotes.length > 0) {
      const avgStrength = winningVotes.reduce((sum, v) => sum + v.strength * v.weight, 0) /
        winningVotes.reduce((sum, v) => sum + v.weight, 0);
      strength = Math.min(1, strength * avgStrength);
    }

    const sourceStrategies = lastSignalVotes.map(v => v.strategy);
    const lastPoint = series.points[series.points.length - 1];

    return {
      type: signalType,
      price: lastPoint?.close ?? 0,
      time: new Date(lastSignalTime),
      strength,
      sourceStrategies,
      strategyVotes: lastSignalVotes.map(v => ({
        strategy: v.strategy,
        vote: v.type as 'BUY' | 'SELL',
        strength: v.strength
      }))
    };
  }

  /**
   * Get configuration for a strategy
   */
  getStrategyConfig(name: string): StrategyConfig | undefined {
    return this.configs.get(name);
  }

  /**
   * Get all strategy configs
   */
  getAllConfigs(): StrategyConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Update strategy parameters
   */
  updateStrategyParams(name: string, params: Record<string, number>): void {
    const config = this.configs.get(name);
    if (config) {
      config.params = { ...config.params, ...params };
      // Recreate strategy with new params
      const strategy = this.strategies.get(name);
      if (strategy) {
        const StrategyClass = Object.getPrototypeOf(strategy).constructor;
        this.strategies.set(name, new StrategyClass(params));
      }
    }
  }

  /**
   * Get total possible weight (for normalization)
   */
  private getTotalPossibleWeight(): number {
    return Array.from(this.configs.values())
      .filter(c => c.enabled)
      .reduce((sum, c) => sum + c.weight, 0);
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalStrategies: number;
    enabledStrategies: number;
    avgWeight: number;
    totalWeight: number;
  } {
    const all = Array.from(this.configs.values());
    const enabled = all.filter(c => c.enabled);
    const totalWeight = enabled.reduce((sum, c) => sum + c.weight, 0);

    return {
      totalStrategies: all.length,
      enabledStrategies: enabled.length,
      avgWeight: enabled.length > 0 ? totalWeight / enabled.length : 0,
      totalWeight
    };
  }
}
