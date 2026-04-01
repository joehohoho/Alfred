/**
 * Adaptive Position Sizing Module
 *
 * Combines Kelly Criterion, ATR-based volatility scaling, and drawdown
 * protection to compute how much capital to allocate per trade.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface PositionSizeResult {
  fraction: number;        // 0.1 to 1.0 — fraction of capital to use
  reason: string;          // explanation
  kellyFraction: number;   // raw Kelly value
  volatilityScale: number; // ATR-based scale factor (0-1)
  drawdownScale: number;   // drawdown-based scale factor (0-1)
}

export interface SizingContext {
  winRate: number;           // historical win rate (0-1)
  avgWin: number;            // average winning trade $
  avgLoss: number;           // average losing trade $
  currentDrawdownPct: number; // current drawdown from peak (0-100)
  atrPct: number;            // ATR as % of current price (0-100)
  tradeCount: number;        // number of historical trades (confidence)
}

export interface PositionSizerConfig {
  kellyMultiplier: number;       // 0.5 = half-Kelly (default)
  drawdownThreshold: number;     // % drawdown to trigger reduction (default 15)
  drawdownReduction: number;     // factor when drawdown exceeded (default 0.5)
  atrBaselinePct: number;        // "normal" ATR% — above this, scale down (default 2)
  minFraction: number;           // floor (default 0.1)
  maxFraction: number;           // ceiling (default 1.0)
  minTradesForFullKelly: number; // trades needed before trusting Kelly (default 20)
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: PositionSizerConfig = {
  kellyMultiplier: 0.5,
  drawdownThreshold: 15,
  drawdownReduction: 0.5,
  atrBaselinePct: 2,
  minFraction: 0.1,
  maxFraction: 1.0,
  minTradesForFullKelly: 20,
};

// ---------------------------------------------------------------------------
// Core calculation
// ---------------------------------------------------------------------------

/**
 * Compute the raw Kelly fraction.
 *   f* = (W * R - (1 - W)) / R
 * where W = winRate, R = avgWin / avgLoss (win/loss ratio).
 *
 * Returns 0 when inputs are degenerate (no losses, no wins, etc.).
 */
function rawKelly(winRate: number, avgWin: number, avgLoss: number): number {
  if (!Number.isFinite(winRate) || !Number.isFinite(avgWin) || !Number.isFinite(avgLoss)) {
    return 0;
  }
  if (avgLoss <= 0 || avgWin <= 0) return 0;

  const R = avgWin / avgLoss;
  const kelly = (winRate * R - (1 - winRate)) / R;
  return kelly;
}

/**
 * Compute a volatility scale factor based on ATR as a percentage of price.
 * When atrPct <= baseline, scale = 1 (full size).
 * When atrPct > baseline, scale decreases linearly: baseline / atrPct.
 * Clamped to [0.1, 1].
 */
function volatilityScale(atrPct: number, baselinePct: number): number {
  if (!Number.isFinite(atrPct) || atrPct <= 0) return 1;
  if (!Number.isFinite(baselinePct) || baselinePct <= 0) return 1;

  if (atrPct <= baselinePct) return 1;
  return Math.max(0.1, baselinePct / atrPct);
}

/**
 * Compute a drawdown scale factor.
 * Returns 1 if drawdown is below threshold, `reduction` otherwise.
 */
function drawdownScale(
  currentDrawdownPct: number,
  threshold: number,
  reduction: number,
): number {
  if (!Number.isFinite(currentDrawdownPct) || currentDrawdownPct < 0) return 1;
  return currentDrawdownPct >= threshold ? reduction : 1;
}

/**
 * Stateless position-size calculation.
 */
export function calculatePositionSize(
  ctx: SizingContext,
  config: Partial<PositionSizerConfig> = {},
): PositionSizeResult {
  const cfg: PositionSizerConfig = { ...DEFAULT_CONFIG, ...config };
  const reasons: string[] = [];

  // --- Kelly ---
  let kelly = rawKelly(ctx.winRate, ctx.avgWin, ctx.avgLoss);

  // If we don't have enough trade history, blend toward a conservative default.
  // Linear ramp: at 0 trades -> 100% default, at minTrades -> 100% Kelly.
  const defaultFraction = cfg.minFraction;
  if (ctx.tradeCount < cfg.minTradesForFullKelly) {
    const confidence = Math.max(0, ctx.tradeCount) / cfg.minTradesForFullKelly;
    kelly = defaultFraction * (1 - confidence) + kelly * confidence;
    reasons.push(
      `low confidence (${ctx.tradeCount}/${cfg.minTradesForFullKelly} trades) — blended toward ${(defaultFraction * 100).toFixed(0)}%`,
    );
  }

  // Apply Kelly multiplier (e.g. half-Kelly)
  const kellyScaled = kelly * cfg.kellyMultiplier;
  if (cfg.kellyMultiplier < 1) {
    reasons.push(`${(cfg.kellyMultiplier * 100).toFixed(0)}%-Kelly applied`);
  }

  // --- Volatility ---
  const volScale = volatilityScale(ctx.atrPct, cfg.atrBaselinePct);
  if (volScale < 1) {
    reasons.push(
      `volatility scaling (ATR ${ctx.atrPct.toFixed(2)}% vs baseline ${cfg.atrBaselinePct}%) -> ${(volScale * 100).toFixed(0)}%`,
    );
  }

  // --- Drawdown ---
  const ddScale = drawdownScale(ctx.currentDrawdownPct, cfg.drawdownThreshold, cfg.drawdownReduction);
  if (ddScale < 1) {
    reasons.push(
      `drawdown protection (${ctx.currentDrawdownPct.toFixed(1)}% >= ${cfg.drawdownThreshold}% threshold) -> ${(ddScale * 100).toFixed(0)}%`,
    );
  }

  // --- Combine ---
  let fraction = kellyScaled * volScale * ddScale;

  // Clamp
  fraction = Math.max(cfg.minFraction, Math.min(cfg.maxFraction, fraction));

  // Guard against NaN / non-finite results
  if (!Number.isFinite(fraction)) {
    fraction = cfg.minFraction;
    reasons.length = 0;
    reasons.push('non-finite result — defaulting to minimum');
  }

  if (reasons.length === 0) {
    reasons.push('standard sizing');
  }

  return {
    fraction: Number(fraction.toFixed(4)),
    reason: reasons.join('; '),
    kellyFraction: Number(kelly.toFixed(4)),
    volatilityScale: Number(volScale.toFixed(4)),
    drawdownScale: ddScale,
  };
}

// ---------------------------------------------------------------------------
// Stateful PositionSizer class
// ---------------------------------------------------------------------------

export class PositionSizer {
  private readonly config: PositionSizerConfig;
  private wins = 0;
  private losses = 0;
  private totalWinAmount = 0;
  private totalLossAmount = 0;
  private peakCapital: number;
  private currentCapital: number;

  constructor(
    initialCapital: number,
    config: Partial<PositionSizerConfig> = {},
  ) {
    if (!Number.isFinite(initialCapital) || initialCapital <= 0) {
      throw new Error('initialCapital must be a positive finite number');
    }
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.peakCapital = initialCapital;
    this.currentCapital = initialCapital;
  }

  // -- Accessors --

  get winRate(): number {
    const total = this.wins + this.losses;
    return total > 0 ? this.wins / total : 0;
  }

  get avgWin(): number {
    return this.wins > 0 ? this.totalWinAmount / this.wins : 0;
  }

  get avgLoss(): number {
    return this.losses > 0 ? this.totalLossAmount / this.losses : 0;
  }

  get tradeCount(): number {
    return this.wins + this.losses;
  }

  get drawdownPct(): number {
    if (this.peakCapital <= 0) return 0;
    return Math.max(0, ((this.peakCapital - this.currentCapital) / this.peakCapital) * 100);
  }

  get capital(): number {
    return this.currentCapital;
  }

  get peak(): number {
    return this.peakCapital;
  }

  // -- Mutations --

  /**
   * Record a completed trade. Updates running statistics and capital tracking.
   * @param pnl - profit/loss in $ (positive = win, negative = loss)
   */
  recordTrade(pnl: number): void {
    if (!Number.isFinite(pnl)) return;

    this.currentCapital += pnl;

    if (pnl > 0) {
      this.wins++;
      this.totalWinAmount += pnl;
    } else if (pnl < 0) {
      this.losses++;
      this.totalLossAmount += Math.abs(pnl);
    }
    // pnl === 0 is a scratch trade — don't count toward win/loss stats

    if (this.currentCapital > this.peakCapital) {
      this.peakCapital = this.currentCapital;
    }
  }

  /**
   * Calculate position size for the next trade.
   * @param atrPct - current ATR as % of price (0-100). Pass 0 to skip vol scaling.
   */
  size(atrPct: number = 0): PositionSizeResult {
    const ctx: SizingContext = {
      winRate: this.winRate,
      avgWin: this.avgWin,
      avgLoss: this.avgLoss,
      currentDrawdownPct: this.drawdownPct,
      atrPct,
      tradeCount: this.tradeCount,
    };
    return calculatePositionSize(ctx, this.config);
  }

  /**
   * Dollar amount to allocate on the next trade.
   * Convenience wrapper: fraction * currentCapital.
   */
  sizeInDollars(atrPct: number = 0): { dollars: number; result: PositionSizeResult } {
    const result = this.size(atrPct);
    const dollars = Number((result.fraction * this.currentCapital).toFixed(2));
    return { dollars, result };
  }

  /**
   * Reset all state (useful between optimization runs).
   */
  reset(initialCapital: number): void {
    if (!Number.isFinite(initialCapital) || initialCapital <= 0) {
      throw new Error('initialCapital must be a positive finite number');
    }
    this.wins = 0;
    this.losses = 0;
    this.totalWinAmount = 0;
    this.totalLossAmount = 0;
    this.peakCapital = initialCapital;
    this.currentCapital = initialCapital;
  }
}
