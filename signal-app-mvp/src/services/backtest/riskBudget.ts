/**
 * Dynamic Risk Budget System
 *
 * Prevents death spirals by managing a total risk budget that decreases with
 * losses and regenerates over time. When the budget is depleted, trading stops
 * until conditions improve.
 *
 * Three independent circuit breakers:
 *   1. Daily loss limit   — resets each new day
 *   2. Weekly loss limit  — resets each new week
 *   3. Consecutive losses — triggers a bar-based pause + recovery ramp
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface RiskBudgetConfig {
  /** Maximum loss allowed per week as % of capital. Default: 5 */
  weeklyBudgetPct: number;
  /** Maximum loss allowed per day as % of capital. Default: 2 */
  dailyBudgetPct: number;
  /** Number of consecutive losses before forced pause. Default: 3 */
  maxConsecutiveLosses: number;
  /** Bars to wait after consecutive loss pause. Default: 5 */
  pauseBars: number;
  /** Recovery multiplier — after a pause, trade at reduced size. Default: 0.5 */
  recoveryMultiplier: number;
  /** Bars at reduced size before returning to full size. Default: 10 */
  recoveryBars: number;
}

export interface RiskBudgetState {
  dailyLossPct: number;
  weeklyLossPct: number;
  consecutiveLosses: number;
  isPaused: boolean;
  pauseBarRemaining: number;
  isRecovering: boolean;
  recoveryBarsRemaining: number;
  /** 0 when paused, recoveryMultiplier during recovery, 1.0 at full size */
  currentSizeMultiplier: number;
  totalTradesBlocked: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: RiskBudgetConfig = {
  weeklyBudgetPct: 5,
  dailyBudgetPct: 2,
  maxConsecutiveLosses: 3,
  pauseBars: 5,
  recoveryMultiplier: 0.5,
  recoveryBars: 10,
};

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

export class RiskBudgetManager {
  private readonly config: RiskBudgetConfig;

  private dailyLossPct = 0;
  private weeklyLossPct = 0;
  private consecutiveLosses = 0;

  private isPaused = false;
  private pauseBarRemaining = 0;

  private isRecovering = false;
  private recoveryBarsRemaining = 0;

  private totalTradesBlocked = 0;

  private dailyBudgetExhausted = false;
  private weeklyBudgetExhausted = false;

  constructor(config?: Partial<RiskBudgetConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Called before each signal — returns whether to allow the trade and at what
   * size multiplier.
   */
  shouldTrade(currentBar: number): { allowed: boolean; sizeMultiplier: number; reason: string } {
    // --- Pause countdown (tick each bar we evaluate) ---
    if (this.isPaused) {
      this.pauseBarRemaining--;
      if (this.pauseBarRemaining <= 0) {
        // Pause over — enter recovery mode
        this.isPaused = false;
        this.isRecovering = true;
        this.recoveryBarsRemaining = this.config.recoveryBars;
      } else {
        this.totalTradesBlocked++;
        return { allowed: false, sizeMultiplier: 0, reason: `paused (${this.pauseBarRemaining} bars remaining)` };
      }
    }

    // --- Daily budget exhausted ---
    if (this.dailyBudgetExhausted) {
      this.totalTradesBlocked++;
      return { allowed: false, sizeMultiplier: 0, reason: `daily loss budget exhausted (${this.dailyLossPct.toFixed(2)}%)` };
    }

    // --- Weekly budget exhausted ---
    if (this.weeklyBudgetExhausted) {
      this.totalTradesBlocked++;
      return { allowed: false, sizeMultiplier: 0, reason: `weekly loss budget exhausted (${this.weeklyLossPct.toFixed(2)}%)` };
    }

    // --- Recovery mode: trade at reduced size ---
    if (this.isRecovering) {
      this.recoveryBarsRemaining--;
      if (this.recoveryBarsRemaining <= 0) {
        this.isRecovering = false;
      }
      return {
        allowed: true,
        sizeMultiplier: this.config.recoveryMultiplier,
        reason: `recovery mode (${this.recoveryBarsRemaining} bars remaining, ${(this.config.recoveryMultiplier * 100).toFixed(0)}% size)`,
      };
    }

    // --- Full size ---
    return { allowed: true, sizeMultiplier: 1.0, reason: 'full budget available' };
  }

  /**
   * Called after each completed trade.
   * @param pnlPct - trade P&L as a percentage of capital (negative = loss)
   */
  recordTradeResult(pnlPct: number, _bar: number): void {
    if (pnlPct < 0) {
      const lossPct = Math.abs(pnlPct);
      this.dailyLossPct += lossPct;
      this.weeklyLossPct += lossPct;
      this.consecutiveLosses++;

      // Check daily budget
      if (this.dailyLossPct >= this.config.dailyBudgetPct) {
        this.dailyBudgetExhausted = true;
      }

      // Check weekly budget
      if (this.weeklyLossPct >= this.config.weeklyBudgetPct) {
        this.weeklyBudgetExhausted = true;
      }

      // Check consecutive losses — trigger pause
      if (this.consecutiveLosses >= this.config.maxConsecutiveLosses && !this.isPaused) {
        this.isPaused = true;
        this.pauseBarRemaining = this.config.pauseBars;
        this.isRecovering = false;
        this.recoveryBarsRemaining = 0;
      }
    } else {
      // A win resets consecutive losses and exits recovery
      this.consecutiveLosses = 0;
      if (this.isRecovering) {
        this.isRecovering = false;
        this.recoveryBarsRemaining = 0;
      }
    }
  }

  /** Called at the start of each new day (bar-based approximation). */
  newDay(): void {
    this.dailyLossPct = 0;
    this.dailyBudgetExhausted = false;
  }

  /** Called at the start of each new week. */
  newWeek(): void {
    this.weeklyLossPct = 0;
    this.weeklyBudgetExhausted = false;
    // Also reset daily since a new week implies a new day
    this.newDay();
  }

  /** Get current state for diagnostics. */
  getState(): RiskBudgetState {
    let currentSizeMultiplier = 1.0;
    if (this.isPaused) {
      currentSizeMultiplier = 0;
    } else if (this.isRecovering) {
      currentSizeMultiplier = this.config.recoveryMultiplier;
    }

    return {
      dailyLossPct: this.dailyLossPct,
      weeklyLossPct: this.weeklyLossPct,
      consecutiveLosses: this.consecutiveLosses,
      isPaused: this.isPaused,
      pauseBarRemaining: this.pauseBarRemaining,
      isRecovering: this.isRecovering,
      recoveryBarsRemaining: this.recoveryBarsRemaining,
      currentSizeMultiplier,
      totalTradesBlocked: this.totalTradesBlocked,
    };
  }

  /** Reset all state. */
  reset(): void {
    this.dailyLossPct = 0;
    this.weeklyLossPct = 0;
    this.consecutiveLosses = 0;
    this.isPaused = false;
    this.pauseBarRemaining = 0;
    this.isRecovering = false;
    this.recoveryBarsRemaining = 0;
    this.totalTradesBlocked = 0;
    this.dailyBudgetExhausted = false;
    this.weeklyBudgetExhausted = false;
  }
}
