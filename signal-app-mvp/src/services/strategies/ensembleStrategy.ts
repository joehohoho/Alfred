import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength, Strategy } from '@/services/backtest/engine';
import { SMARSIImprovedStrategy } from './smaRsiImproved';
import { MACDStrategy } from './macdStrategy';
import { BollingerStrategy } from './bollingerStrategy';
import { TrendFollowingStrategy } from './trendFollowingStrategy';
import { SmartStrategy } from './smartStrategy';

interface SubStrategyState {
  strategy: Strategy;
  /** Rolling PnL over the last N bars (sliding window) */
  rollingPnL: number[];
  /** Current simulated position: 1 = long, -1 = short, 0 = flat */
  position: number;
  /** Entry price for the current position */
  entryPrice: number;
}

/**
 * Dynamic Ensemble Strategy
 *
 * Runs all sub-strategies simultaneously on the same price data, tracks each
 * strategy's rolling PnL over a sliding window, and dynamically weights their
 * votes to produce consensus BUY/SELL signals.
 *
 * Key mechanics:
 *   - Rolling performance: simulates each strategy's PnL bar-by-bar over the
 *     last `lookbackBars` bars to derive dynamic weights.
 *   - Weight = max(0.1, normalizedPnL). Poorly performing strategies get
 *     near-zero weight but never fully zero.
 *   - Consensus scoring: weighted BUY and SELL scores must exceed `threshold`
 *     to trigger a signal.
 *   - Conflict resolution: if BUY and SELL scores are within `conflictMargin`,
 *     output HOLD to avoid whipsaw.
 *   - Signal strength: weighted average of contributing strengths, scaled by
 *     the consensus level (more agreement = higher strength).
 */
export class EnsembleStrategy implements Strategy {
  name = 'ENSEMBLE';

  private readonly lookbackBars: number;
  private readonly threshold: number;
  private readonly conflictMargin: number;

  constructor(params: {
    lookbackBars?: number;
    threshold?: number;
    conflictMargin?: number;
  } = {}) {
    this.lookbackBars = params.lookbackBars ?? 30;
    this.threshold = params.threshold ?? 0.5;
    this.conflictMargin = params.conflictMargin ?? 0.15;
  }

  generateSignals(series: PriceSeries): SignalWithStrength[] {
    const points = series.points;
    if (points.length < 2) return [];

    // Initialize sub-strategies
    const subStrategies: SubStrategyState[] = [
      new SMARSIImprovedStrategy(),
      new MACDStrategy(),
      new BollingerStrategy(),
      new TrendFollowingStrategy(),
      new SmartStrategy(),
    ].map((strategy) => ({
      strategy,
      rollingPnL: [],
      position: 0,
      entryPrice: 0,
    }));

    // Generate signals from each sub-strategy up front
    const allSubSignals: Map<string, SignalWithStrength>[] = subStrategies.map((sub) => {
      const signals = sub.strategy.generateSignals(series);
      const byDate = new Map<string, SignalWithStrength>();
      for (const sig of signals) {
        const ts = sig.time instanceof Date ? sig.time : new Date(sig.time as any);
        const dateKey = ts.toISOString().split('T')[0];
        // Keep the strongest signal per day per strategy
        const existing = byDate.get(dateKey);
        if (!existing || sig.strength > existing.strength) {
          byDate.set(dateKey, sig);
        }
      }
      return byDate;
    });

    const ensembleSignals: SignalWithStrength[] = [];

    // Walk through each bar
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      const prevPoint = points[i - 1];
      const ts = point.timestamp instanceof Date ? point.timestamp : new Date(point.timestamp as any);
      const dateKey = ts.toISOString().split('T')[0];

      // --- Step 1: Update rolling PnL for each sub-strategy ---
      for (let s = 0; s < subStrategies.length; s++) {
        const sub = subStrategies[s];
        const signal = allSubSignals[s].get(dateKey);

        // Calculate bar PnL from any open position
        let barPnL = 0;
        if (sub.position !== 0 && sub.entryPrice > 0) {
          const priceDelta = (point.close - prevPoint.close) / sub.entryPrice;
          barPnL = priceDelta * sub.position; // positive if position direction matches price move
        }

        // Process signal: update simulated position
        if (signal && signal.type !== 'HOLD') {
          if (signal.type === 'BUY' && sub.position !== 1) {
            sub.position = 1;
            sub.entryPrice = point.close;
          } else if (signal.type === 'SELL' && sub.position !== -1) {
            sub.position = -1;
            sub.entryPrice = point.close;
          }
        }

        // Push bar PnL into rolling window
        sub.rollingPnL.push(barPnL);
        if (sub.rollingPnL.length > this.lookbackBars) {
          sub.rollingPnL.shift();
        }
      }

      // --- Step 2: Calculate dynamic weights from rolling PnL ---
      const cumulativePnLs = subStrategies.map((sub) =>
        sub.rollingPnL.reduce((sum, v) => sum + v, 0)
      );

      const minPnL = Math.min(...cumulativePnLs);
      const maxPnL = Math.max(...cumulativePnLs);
      const pnlRange = maxPnL - minPnL;

      const weights = cumulativePnLs.map((pnl) => {
        if (pnlRange < 1e-9) return 1.0; // All equal — use uniform weight
        const normalized = (pnl - minPnL) / pnlRange; // 0 to 1
        return Math.max(0.1, normalized); // Floor at 0.1
      });

      const totalWeight = weights.reduce((a, b) => a + b, 0);

      // --- Step 3: Consensus scoring ---
      let buyScore = 0;
      let sellScore = 0;
      let buyStrengthWeighted = 0;
      let sellStrengthWeighted = 0;
      let buyWeightSum = 0;
      let sellWeightSum = 0;
      let voterCount = 0;

      for (let s = 0; s < subStrategies.length; s++) {
        const signal = allSubSignals[s].get(dateKey);
        if (!signal || signal.type === 'HOLD') continue;

        const normalizedWeight = weights[s] / totalWeight;
        voterCount++;

        if (signal.type === 'BUY') {
          buyScore += normalizedWeight;
          buyStrengthWeighted += signal.strength * weights[s];
          buyWeightSum += weights[s];
        } else if (signal.type === 'SELL') {
          sellScore += normalizedWeight;
          sellStrengthWeighted += signal.strength * weights[s];
          sellWeightSum += weights[s];
        }
      }

      // Skip bars with no votes
      if (voterCount === 0) continue;

      // --- Step 4: Conflict resolution ---
      if (Math.abs(buyScore - sellScore) < this.conflictMargin) {
        // BUY and SELL are too close — HOLD to avoid whipsaw
        continue;
      }

      // --- Step 5: Determine signal if dominant score exceeds threshold ---
      let signalType: 'BUY' | 'SELL' | null = null;
      let rawStrength = 0;

      if (buyScore >= this.threshold && buyScore > sellScore) {
        signalType = 'BUY';
        rawStrength = buyWeightSum > 0 ? buyStrengthWeighted / buyWeightSum : 0;
      } else if (sellScore >= this.threshold && sellScore > buyScore) {
        signalType = 'SELL';
        rawStrength = sellWeightSum > 0 ? sellStrengthWeighted / sellWeightSum : 0;
      }

      if (!signalType) continue;

      // --- Step 6: Scale strength by consensus level ---
      // consensusRatio: what fraction of voters agreed on the winning side
      const winningVoters = signalType === 'BUY' ? buyScore : sellScore;
      const consensusRatio = winningVoters; // already normalized to [0,1]
      const strength = Math.min(1, rawStrength * (0.5 + 0.5 * consensusRatio));

      ensembleSignals.push({
        time: ts,
        type: signalType,
        price: point.close,
        strength,
      });
    }

    return ensembleSignals;
  }
}
