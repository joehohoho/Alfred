import * as fs from 'fs';
import * as path from 'path';
import type { PerformanceEntry } from '@/services/backtest/performanceTracker';

const DATA_DIR = path.join(process.cwd(), 'data');
const PERF_FILE = path.join(DATA_DIR, 'strategy-performance.json');
const OUTCOMES_FILE = path.join(DATA_DIR, 'signal-outcomes.json');

const MIN_WEIGHT = 0.2;
const MAX_WEIGHT = 2.0;
const DEFAULT_WEIGHT = 1.0;

// All known strategies
const ALL_STRATEGIES = [
  'SMA_RSI_IMPROVED',
  'MACD',
  'BOLLINGER_BANDS',
  'RSI_EXTREME',
  'TREND_FOLLOWING',
];

interface OutcomeData {
  outcomes: Array<{
    symbol: string;
    signalType: string;
    outcome: string; // 'win' | 'loss' | 'pending'
    strategy?: string;
    pnlPercent?: number;
  }>;
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
    }
  } catch {
    // corrupted
  }
  return fallback;
}

/**
 * Compute a performance score for a strategy from recent backtest results.
 *
 * Score factors:
 * - Recent P&L trend (last 10 backtests)
 * - Win rate
 * - Sharpe ratio
 *
 * Returns a score centered at 0. Positive = good performer, negative = poor.
 */
function computeStrategyScore(entries: PerformanceEntry[]): number {
  if (entries.length === 0) return 0;

  // Take last 10 entries
  const recent = entries.slice(-10);

  // Average PnL
  const avgPnl = recent.reduce((sum, e) => sum + e.pnlPercent, 0) / recent.length;

  // Average win rate (already 0-100)
  const avgWinRate = recent.reduce((sum, e) => sum + e.winRate, 0) / recent.length;

  // Average Sharpe
  const avgSharpe = recent.reduce((sum, e) => sum + e.sharpe, 0) / recent.length;

  // Composite: weight each component
  // PnL normalized by dividing by 10 (so +-10% maps to +-1)
  // WinRate normalized to 0-1 by dividing by 100, then centered at 0.5
  // Sharpe already in reasonable range
  const score =
    (avgPnl / 10) * 0.4 +
    ((avgWinRate / 100 - 0.5) * 2) * 0.3 +
    avgSharpe * 0.3;

  return score;
}

/**
 * Incorporate signal outcomes (live tracking) into score.
 * Only counts outcomes with a known strategy.
 */
function computeOutcomeBonus(outcomes: OutcomeData, strategy: string): number {
  const stratOutcomes = outcomes.outcomes.filter(
    (o) => o.strategy === strategy && o.outcome !== 'pending'
  );

  if (stratOutcomes.length === 0) return 0;

  const wins = stratOutcomes.filter((o) => o.outcome === 'win').length;
  const total = stratOutcomes.length;
  const winRate = wins / total;

  // Small bonus/penalty: +-0.3 max
  return (winRate - 0.5) * 0.6;
}

/**
 * Returns adaptive weights for each strategy based on recent performance.
 *
 * Strategies that performed well get higher weight (up to MAX_WEIGHT).
 * Poor performers get lower weight (down to MIN_WEIGHT).
 * No data = default weight of 1.0.
 */
export function getAdaptiveWeights(): Record<string, number> {
  const perfEntries = readJson<PerformanceEntry[]>(PERF_FILE, []);
  const outcomes = readJson<OutcomeData>(OUTCOMES_FILE, { outcomes: [] });

  // Group performance entries by strategy
  const byStrategy = new Map<string, PerformanceEntry[]>();
  for (const entry of perfEntries) {
    const existing = byStrategy.get(entry.strategy) || [];
    existing.push(entry);
    byStrategy.set(entry.strategy, existing);
  }

  // Compute raw scores
  const rawScores = new Map<string, number>();
  for (const strat of ALL_STRATEGIES) {
    const entries = byStrategy.get(strat) || [];
    const perfScore = computeStrategyScore(entries);
    const outcomeBonus = computeOutcomeBonus(outcomes, strat);
    rawScores.set(strat, perfScore + outcomeBonus);
  }

  // Convert scores to weights: map score range to [MIN_WEIGHT, MAX_WEIGHT]
  // Use sigmoid-like mapping centered at 0
  const weights: Record<string, number> = {};
  for (const strat of ALL_STRATEGIES) {
    const score = rawScores.get(strat) ?? 0;

    // Map score to weight using a simple linear mapping clamped to bounds
    // score of 0 -> weight of 1.0 (default)
    // score of +1 -> weight of ~1.5
    // score of -1 -> weight of ~0.5
    let weight = DEFAULT_WEIGHT + score * 0.5;

    // Clamp
    weight = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, weight));

    weights[strat] = Math.round(weight * 100) / 100;
  }

  return weights;
}
