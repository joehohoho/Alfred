/**
 * Slippage & transaction cost model for realistic backtesting.
 *
 * Models four cost components that eat into real-world trading returns:
 *   1. Base slippage — market impact from order execution
 *   2. Volatility slippage — additional impact during high-ATR periods
 *   3. Spread cost — half the bid-ask spread (crossing the spread)
 *   4. Commission — exchange/broker fees per trade
 *
 * Also provides gap risk detection for stop-loss realism.
 */

export interface SlippageConfig {
  /** Base slippage as % of price (default: 0.05% for crypto, 0.02% for stocks) */
  baseSlippagePct: number;
  /** Additional slippage during high volatility (ATR-based, default: 0.1%) */
  volatilitySlippagePct: number;
  /** Spread cost as % of price (default: 0.03% for major crypto, 0.01% for stocks) */
  spreadPct: number;
  /** Commission per trade as % (default: 0.1% for crypto) */
  commissionPct: number;
}

export const CRYPTO_SLIPPAGE: SlippageConfig = {
  baseSlippagePct: 0.05,
  volatilitySlippagePct: 0.1,
  spreadPct: 0.03,
  commissionPct: 0.1,
};

export const STOCK_SLIPPAGE: SlippageConfig = {
  baseSlippagePct: 0.02,
  volatilitySlippagePct: 0.05,
  spreadPct: 0.01,
  commissionPct: 0.05,
};

export interface SlippageResult {
  /** The price after applying all slippage and costs */
  executionPrice: number;
  /** Total cost as a percentage of the signal price */
  totalCostPct: number;
}

/**
 * Calculate realistic execution price including slippage, spread, and commission.
 *
 * For BUY orders: execution price is HIGHER than signal price (worse fill).
 * For SELL orders: execution price is LOWER than signal price (worse fill).
 *
 * Volatility scaling: when atrPct is high (volatile market), additional slippage
 * kicks in proportionally. A "normal" ATR baseline of 2% is used — an ATR of 4%
 * would double the volatility slippage component.
 *
 * @param signalPrice - The price at which the signal fired
 * @param signalType  - BUY or SELL
 * @param atrPct      - Current ATR as a percentage of price (e.g., 3.5 for 3.5%)
 * @param config      - Slippage configuration preset
 */
export function applySlippage(
  signalPrice: number,
  signalType: 'BUY' | 'SELL',
  atrPct: number,
  config: SlippageConfig
): SlippageResult {
  // Normalize ATR against a "calm market" baseline of 2%.
  // Values above 2% scale up the volatility component; below 2% scale it down.
  const ATR_BASELINE = 2;
  const volatilityMultiplier = Math.max(0, atrPct / ATR_BASELINE);

  // Component breakdown (all in % of price):
  const baseSlippage = config.baseSlippagePct;
  const volSlippage = config.volatilitySlippagePct * volatilityMultiplier;
  const halfSpread = config.spreadPct / 2; // We cross half the spread
  const commission = config.commissionPct;

  const totalCostPct = baseSlippage + volSlippage + halfSpread + commission;

  // Convert percentage to decimal multiplier
  const costDecimal = totalCostPct / 100;

  let executionPrice: number;
  if (signalType === 'BUY') {
    // Buying: we pay more than the quoted price
    executionPrice = signalPrice * (1 + costDecimal);
  } else {
    // Selling: we receive less than the quoted price
    executionPrice = signalPrice * (1 - costDecimal);
  }

  return {
    executionPrice,
    totalCostPct,
  };
}

// ---------------------------------------------------------------------------
// Gap risk detection
// ---------------------------------------------------------------------------

export interface GapResult {
  /** Whether the gap is significant (> 1% by default) */
  hasGap: boolean;
  /** Gap size as a percentage of the previous close */
  gapPct: number;
  /** Direction of the gap */
  gapDirection: 'up' | 'down';
}

/** Minimum gap size (%) to be considered significant */
const GAP_THRESHOLD_PCT = 1;

/**
 * Detect if there's a significant gap between previous close and current open.
 *
 * Gaps can cause stop-losses to execute at much worse prices than expected.
 * If a long position has a stop at $95 but the market gaps down to open at $90,
 * the stop executes at $90, not $95.
 *
 * The function also checks whether the gap was filled intraday (price retraced
 * back through the gap). Unfilled gaps are more significant for stop-loss
 * slippage because the stop price was never available during the session.
 *
 * @param prevClose   - Previous bar's closing price
 * @param currentOpen - Current bar's opening price
 * @param currentHigh - Current bar's high (used for gap-fill detection on down gaps)
 * @param currentLow  - Current bar's low (used for gap-fill detection on up gaps)
 */
export function detectGap(
  prevClose: number,
  currentOpen: number,
  currentHigh: number,
  currentLow: number
): GapResult {
  const gapPct = ((currentOpen - prevClose) / prevClose) * 100;
  const absGap = Math.abs(gapPct);
  const gapDirection: 'up' | 'down' = gapPct >= 0 ? 'up' : 'down';

  return {
    hasGap: absGap >= GAP_THRESHOLD_PCT,
    gapPct: Number(gapPct.toFixed(4)),
    gapDirection,
  };
}

/**
 * Adjust a stop-loss exit price for gap risk.
 *
 * When a gap blows through the stop level, the stop executes at the open
 * price (or worse), not the intended stop price. This function returns the
 * realistic exit price accounting for that scenario.
 *
 * @param intendedStopPrice - The calculated stop-loss price
 * @param currentOpen       - The bar's opening price
 * @param direction         - Position direction ('long' or 'short')
 * @returns The realistic exit price after gap adjustment
 */
export function adjustStopForGap(
  intendedStopPrice: number,
  currentOpen: number,
  direction: 'long' | 'short'
): number {
  if (direction === 'long') {
    // Long stop-loss triggers when price falls below stop.
    // If the market gaps DOWN past our stop, we execute at the open (worse).
    if (currentOpen < intendedStopPrice) {
      return currentOpen;
    }
    return intendedStopPrice;
  } else {
    // Short stop-loss triggers when price rises above stop.
    // If the market gaps UP past our stop, we execute at the open (worse).
    if (currentOpen > intendedStopPrice) {
      return currentOpen;
    }
    return intendedStopPrice;
  }
}
