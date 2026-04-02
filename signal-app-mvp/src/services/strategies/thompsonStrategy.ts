import type { PriceSeries } from '@/models/PriceData';
import type { SignalWithStrength, Strategy } from '@/services/backtest/engine';
import { SMARSIImprovedStrategy } from './smaRsiImproved';
import { MACDStrategy } from './macdStrategy';
import { BollingerStrategy } from './bollingerStrategy';
import { TrendFollowingStrategy } from './trendFollowingStrategy';
import { SmartStrategy } from './smartStrategy';
import { MeanReversionStrategy } from './meanReversionStrategy';
import { BreakoutStrategy } from './breakoutStrategy';

/**
 * Thompson Sampling Strategy Rotation
 *
 * A multi-armed bandit approach to strategy selection. Each sub-strategy is an
 * "arm" with a Beta(alpha, beta) distribution representing its success/failure
 * history. On each evaluation window:
 *
 *   1. Sample from each arm's Beta distribution
 *   2. Pick the arm with the highest sample (exploration/exploitation tradeoff)
 *   3. Emit that arm's signal for the current bar
 *   4. After the evaluation window, update the chosen arm's alpha (price moved
 *      in signal direction) or beta (price moved against)
 *
 * Adaptive features:
 *   - Decay: Every decayInterval bars, multiply all alpha/beta by decayFactor
 *     to forget stale data and adapt to regime changes
 *   - Forced exploration: Each arm must be picked at least once every 30 bars
 *   - No external dependencies for Beta sampling (Box-Muller + normal approx)
 */

interface StrategyArm {
  name: string;
  strategy: Strategy;
  alpha: number;   // successes + 1 (prior)
  beta: number;    // failures + 1 (prior)
  totalPicks: number;
  recentPnl: number[];  // last 10 trades for this arm
}

// ---------------------------------------------------------------------------
// Pure-TypeScript Beta distribution sampling
// ---------------------------------------------------------------------------

/** Box-Muller transform: returns a standard normal sample */
function sampleNormal(rng: () => number): number {
  let u1 = 0;
  let u2 = 0;
  // Avoid log(0)
  while (u1 === 0) u1 = rng();
  while (u2 === 0) u2 = rng();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Sample from Beta(alpha, beta) using the normal approximation.
 *
 * For alpha, beta >= 1 (our case, since priors start at 1), the Beta
 * distribution is well-approximated by a Gaussian with:
 *   mean     = alpha / (alpha + beta)
 *   variance = alpha * beta / ((alpha + beta)^2 * (alpha + beta + 1))
 *
 * The result is clamped to [0.001, 0.999] to avoid degenerate values.
 */
function sampleBeta(alpha: number, beta: number, rng: () => number): number {
  const sum = alpha + beta;
  const mean = alpha / sum;
  const variance = (alpha * beta) / (sum * sum * (sum + 1));
  const stddev = Math.sqrt(variance);
  const sample = mean + stddev * sampleNormal(rng);
  return Math.max(0.001, Math.min(0.999, sample));
}

// ---------------------------------------------------------------------------
// Seeded PRNG (xoshiro128** variant) for deterministic backtests
// ---------------------------------------------------------------------------

function createRng(seed: number): () => number {
  // Simple splitmix32 to derive initial state
  let s = seed | 0;
  const next32 = () => {
    s |= 0;
    s = (s + 0x9e3779b9) | 0;
    let t = s ^ (s >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    t ^= t >>> 15;
    return t >>> 0;
  };
  let a = next32(), b = next32(), c = next32(), d = next32();

  return () => {
    const t = b << 9;
    let r = a * 5;
    r = ((r << 7) | (r >>> 25)) * 9;
    c ^= a;
    d ^= b;
    b ^= c;
    a ^= d;
    c ^= t;
    d = (d << 11) | (d >>> 21);
    return (r >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Thompson Sampling Strategy
// ---------------------------------------------------------------------------

export class ThompsonStrategy implements Strategy {
  name = 'THOMPSON';

  private readonly evaluationWindow: number;
  private readonly decayInterval: number;
  private readonly decayFactor: number;

  constructor(params?: Record<string, number>) {
    this.evaluationWindow = params?.evaluationWindow ?? 5;
    this.decayInterval = params?.decayInterval ?? 30;
    // decayFactor stored as integer percentage (90 = 0.90)
    this.decayFactor = (params?.decayFactor ?? 90) / 100;
  }

  generateSignals(series: PriceSeries): SignalWithStrength[] {
    const points = series.points;
    if (points.length < 30) return [];

    // Deterministic seed from first + last close price
    const seed = Math.round(
      (points[0].close * 1000 + points[points.length - 1].close * 1000) % 2147483647,
    );
    const rng = createRng(seed);

    // Initialize arms
    const arms: StrategyArm[] = [
      { name: 'SMA_RSI',       strategy: new SMARSIImprovedStrategy(),   alpha: 1, beta: 1, totalPicks: 0, recentPnl: [] },
      { name: 'MACD',          strategy: new MACDStrategy(),             alpha: 1, beta: 1, totalPicks: 0, recentPnl: [] },
      { name: 'BOLLINGER',     strategy: new BollingerStrategy(),        alpha: 1, beta: 1, totalPicks: 0, recentPnl: [] },
      { name: 'TREND',         strategy: new TrendFollowingStrategy(),   alpha: 1, beta: 1, totalPicks: 0, recentPnl: [] },
      { name: 'SMART',         strategy: new SmartStrategy(),            alpha: 1, beta: 1, totalPicks: 0, recentPnl: [] },
      { name: 'MEAN_REVERSION', strategy: new MeanReversionStrategy(),   alpha: 1, beta: 1, totalPicks: 0, recentPnl: [] },
      { name: 'BREAKOUT',      strategy: new BreakoutStrategy(),         alpha: 1, beta: 1, totalPicks: 0, recentPnl: [] },
    ];

    // Pre-generate all sub-strategy signals, keyed by date
    const armSignalsByDate: Map<string, SignalWithStrength>[] = arms.map((arm) => {
      const signals = arm.strategy.generateSignals(series);
      const byDate = new Map<string, SignalWithStrength>();
      for (const sig of signals) {
        const ts = sig.time instanceof Date ? sig.time : new Date(sig.time as any);
        const dateKey = ts.toISOString().split('T')[0];
        const existing = byDate.get(dateKey);
        if (!existing || sig.strength > existing.strength) {
          byDate.set(dateKey, sig);
        }
      }
      return byDate;
    });

    const thompsonSignals: SignalWithStrength[] = [];

    // Track which arm was selected per-bar and its signal, for deferred evaluation
    const selections: Array<{
      armIndex: number;
      signal: SignalWithStrength | undefined;
      barIndex: number;
    }> = [];

    // Track last pick bar per arm for forced exploration
    const lastPickBar: number[] = new Array(arms.length).fill(-Infinity);

    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      const ts = point.timestamp instanceof Date ? point.timestamp : new Date(point.timestamp as any);
      const dateKey = ts.toISOString().split('T')[0];

      // --- Decay: every decayInterval bars, shrink all alpha/beta ---
      if (i % this.decayInterval === 0) {
        for (const arm of arms) {
          arm.alpha = Math.max(1, arm.alpha * this.decayFactor);
          arm.beta = Math.max(1, arm.beta * this.decayFactor);
        }
      }

      // --- Forced exploration check ---
      // Find any arm not picked in the last 30 bars
      let forcedArm = -1;
      for (let a = 0; a < arms.length; a++) {
        if (i - lastPickBar[a] >= 30) {
          forcedArm = a;
          break;
        }
      }

      // --- Thompson sampling: pick an arm ---
      let chosenArm: number;
      if (forcedArm >= 0) {
        chosenArm = forcedArm;
      } else {
        // Sample from each arm's Beta distribution, pick highest
        let bestSample = -1;
        chosenArm = 0;
        for (let a = 0; a < arms.length; a++) {
          const sample = sampleBeta(arms[a].alpha, arms[a].beta, rng);
          if (sample > bestSample) {
            bestSample = sample;
            chosenArm = a;
          }
        }
      }

      arms[chosenArm].totalPicks++;
      lastPickBar[chosenArm] = i;

      // Get the chosen arm's signal for this bar
      const chosenSignal = armSignalsByDate[chosenArm].get(dateKey);

      selections.push({ armIndex: chosenArm, signal: chosenSignal, barIndex: i });

      // Emit the chosen arm's signal (if it has one for this bar)
      if (chosenSignal && chosenSignal.type !== 'HOLD') {
        thompsonSignals.push({
          time: ts,
          type: chosenSignal.type,
          price: chosenSignal.price,
          strength: chosenSignal.strength,
        });
      }

      // --- Window-based evaluation: every evaluationWindow bars ---
      if (selections.length >= this.evaluationWindow && i % this.evaluationWindow === 0) {
        // Evaluate the last evaluationWindow selections
        const windowSelections = selections.slice(-this.evaluationWindow);

        for (const sel of windowSelections) {
          if (!sel.signal || sel.signal.type === 'HOLD') continue;

          const entryBar = sel.barIndex;
          // Check if price moved in signal's direction over the next few bars
          // Use the current bar (i) as the evaluation point
          if (entryBar < points.length && i < points.length) {
            const entryClose = points[entryBar].close;
            const evalClose = points[i].close;
            const priceDelta = evalClose - entryClose;

            const success =
              (sel.signal.type === 'BUY' && priceDelta > 0) ||
              (sel.signal.type === 'SELL' && priceDelta < 0);

            const arm = arms[sel.armIndex];
            if (success) {
              arm.alpha += 1;
              // Track PnL
              const pnlPct = Math.abs(priceDelta / entryClose) * 100;
              arm.recentPnl.push(pnlPct);
            } else {
              arm.beta += 1;
              const pnlPct = -Math.abs(priceDelta / entryClose) * 100;
              arm.recentPnl.push(pnlPct);
            }

            // Keep only last 10 PnL entries
            if (arm.recentPnl.length > 10) {
              arm.recentPnl.shift();
            }
          }
        }
      }
    }

    return thompsonSignals;
  }
}
