import type { PriceSeries } from '@/models/PriceData';
import { filterSignals } from '@/services/strategies/signalFilter';

export interface Trade {
  entryPrice: number;
  entryTime: Date;
  exitPrice: number;
  exitTime: Date;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  daysHeld: number;
  fee: number;
  exitReason?: string;
  direction: 'long' | 'short';
}

export interface BacktestResult {
  symbol: string;
  strategyName: string;
  trades: Trade[];
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  totalPnLPercent: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number; // Sum of wins / abs(sum of losses)
  maxDrawdown: number;
  sharpeRatio: number;
  returns: number[];
}

export interface SignalWithStrength {
  time: Date;
  type: 'BUY' | 'SELL' | 'HOLD';
  price: number;
  strength: number; // 0-1, confidence in signal
}

export interface Strategy {
  name: string;
  generateSignals(series: PriceSeries): SignalWithStrength[];
}

/**
 * Backtests a strategy against historical price data
 * Simulates trades based on generated signals with realistic fees
 */
export interface RiskManagement {
  stopLossPercent?: number;      // e.g., 5 = exit if price drops 5% below entry
  trailingStopPercent?: number;  // e.g., 3 = exit if price drops 3% from highest since entry
  takeProfitPercent?: number;    // e.g., 10 = exit if price rises 10% above entry
  maxHoldDays?: number;          // e.g., 30 = force exit after 30 days
  minSignalStrength?: number;    // e.g., 0.3 = skip signals with strength < 0.3
  allowShorts?: boolean;         // e.g., true = allow short selling (default: true)
}

const DEFAULT_RISK: RiskManagement = {
  stopLossPercent: 8,
  trailingStopPercent: 5,
  takeProfitPercent: 15,
  maxHoldDays: 30,
  minSignalStrength: 0,
  allowShorts: true,
};

export class BacktestEngine {
  private readonly feePercent = 0.001; // 0.1% per trade
  private readonly investmentAmount: number;
  private readonly risk: RiskManagement;
  private readonly position = {
    direction: 'none' as 'none' | 'long' | 'short',
    entryPrice: 0,
    entryTime: new Date(),
    quantity: 1,
    highestPrice: 0,  // for long trailing stop
    lowestPrice: Infinity, // for short trailing stop
  };

  constructor(investmentAmount: number = 10000, risk: RiskManagement = {}) {
    this.investmentAmount = investmentAmount;
    this.risk = { ...DEFAULT_RISK, ...risk };
  }

  private closeTrade(exitPrice: number, exitTime: Date, reason: string, trades: Trade[]) {
    const isShort = this.position.direction === 'short';
    const fee = (this.position.entryPrice * this.position.quantity * this.feePercent)
      + (exitPrice * this.position.quantity * this.feePercent);

    // Long P&L: (exit - entry) * qty - fee
    // Short P&L: (entry - exit) * qty - fee  (profit when price drops)
    const rawPnl = isShort
      ? (this.position.entryPrice - exitPrice) * this.position.quantity
      : (exitPrice - this.position.entryPrice) * this.position.quantity;
    const pnl = rawPnl - fee;

    const priceDiff = isShort
      ? (this.position.entryPrice - exitPrice) / this.position.entryPrice
      : (exitPrice - this.position.entryPrice) / this.position.entryPrice;
    const pnlPercent = priceDiff * 100 - 0.2;

    const daysHeld = Math.ceil((exitTime.getTime() - this.position.entryTime.getTime()) / (1000 * 60 * 60 * 24));

    trades.push({
      entryPrice: this.position.entryPrice,
      entryTime: this.position.entryTime,
      exitPrice,
      exitTime,
      quantity: this.position.quantity,
      pnl,
      pnlPercent,
      daysHeld: Math.max(1, daysHeld),
      fee,
      exitReason: reason,
      direction: this.position.direction as 'long' | 'short',
    });

    this.position.direction = 'none';
    this.position.entryPrice = 0;
    this.position.highestPrice = 0;
    this.position.lowestPrice = Infinity;
  }

  backtest(series: PriceSeries, strategy: Strategy): BacktestResult {
    const rawSignals = strategy.generateSignals(series);
    const signals = filterSignals(series, rawSignals);
    const trades: Trade[] = [];
    const allowShorts = this.risk.allowShorts !== false; // default true

    // Ensure all signal times are proper Date objects
    for (const s of signals) {
      if (!(s.time instanceof Date)) {
        s.time = new Date(s.time as any);
      }
    }

    // Build a price map by date for intraday risk checks
    const priceByDate = new Map<string, { high: number; low: number; close: number; timestamp: Date }>();
    for (const p of series.points) {
      const ts = p.timestamp instanceof Date ? p.timestamp : new Date(p.timestamp as any);
      const dateKey = ts.toISOString().split('T')[0];
      priceByDate.set(dateKey, {
        high: p.high || p.close,
        low: p.low || p.close,
        close: p.close,
        timestamp: ts,
      });
    }

    // Process signals with risk management
    let signalIndex = 0;
    const sortedDates = Array.from(priceByDate.keys()).sort();

    for (const dateKey of sortedDates) {
      const dayData = priceByDate.get(dateKey)!;

      // Check risk management exits FIRST (before processing new signals)
      if (this.position.direction === 'long') {
        // Update highest price for trailing stop
        if (dayData.high > this.position.highestPrice) {
          this.position.highestPrice = dayData.high;
        }

        const entryPrice = this.position.entryPrice;
        const daysSinceEntry = Math.ceil(
          (dayData.timestamp.getTime() - this.position.entryTime.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Stop-loss check: price drops below entry
        if (this.risk.stopLossPercent && dayData.low <= entryPrice * (1 - this.risk.stopLossPercent / 100)) {
          const stopPrice = entryPrice * (1 - this.risk.stopLossPercent / 100);
          this.closeTrade(stopPrice, dayData.timestamp, `stop-loss (${this.risk.stopLossPercent}%)`, trades);
          continue;
        }

        // Trailing stop check
        if (this.risk.trailingStopPercent && this.position.highestPrice > 0) {
          const trailPrice = this.position.highestPrice * (1 - this.risk.trailingStopPercent / 100);
          if (dayData.low <= trailPrice) {
            this.closeTrade(trailPrice, dayData.timestamp, `trailing-stop (${this.risk.trailingStopPercent}%)`, trades);
            continue;
          }
        }

        // Take-profit check
        if (this.risk.takeProfitPercent && dayData.high >= entryPrice * (1 + this.risk.takeProfitPercent / 100)) {
          const tpPrice = entryPrice * (1 + this.risk.takeProfitPercent / 100);
          this.closeTrade(tpPrice, dayData.timestamp, `take-profit (${this.risk.takeProfitPercent}%)`, trades);
          continue;
        }

        // Max hold days check
        if (this.risk.maxHoldDays && daysSinceEntry >= this.risk.maxHoldDays) {
          this.closeTrade(dayData.close, dayData.timestamp, `max-hold (${this.risk.maxHoldDays}d)`, trades);
          continue;
        }
      } else if (this.position.direction === 'short') {
        // Update lowest price for short trailing stop
        if (dayData.low < this.position.lowestPrice) {
          this.position.lowestPrice = dayData.low;
        }

        const entryPrice = this.position.entryPrice;
        const daysSinceEntry = Math.ceil(
          (dayData.timestamp.getTime() - this.position.entryTime.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Stop-loss check for short: price RISES above entry + stopLossPercent
        if (this.risk.stopLossPercent && dayData.high >= entryPrice * (1 + this.risk.stopLossPercent / 100)) {
          const stopPrice = entryPrice * (1 + this.risk.stopLossPercent / 100);
          this.closeTrade(stopPrice, dayData.timestamp, `stop-loss (${this.risk.stopLossPercent}%)`, trades);
          continue;
        }

        // Trailing stop for short: price rises from lowest
        if (this.risk.trailingStopPercent && this.position.lowestPrice < Infinity) {
          const trailPrice = this.position.lowestPrice * (1 + this.risk.trailingStopPercent / 100);
          if (dayData.high >= trailPrice) {
            this.closeTrade(trailPrice, dayData.timestamp, `trailing-stop (${this.risk.trailingStopPercent}%)`, trades);
            continue;
          }
        }

        // Take-profit for short: price drops below entry - takeProfitPercent
        if (this.risk.takeProfitPercent && dayData.low <= entryPrice * (1 - this.risk.takeProfitPercent / 100)) {
          const tpPrice = entryPrice * (1 - this.risk.takeProfitPercent / 100);
          this.closeTrade(tpPrice, dayData.timestamp, `take-profit (${this.risk.takeProfitPercent}%)`, trades);
          continue;
        }

        // Max hold days check
        if (this.risk.maxHoldDays && daysSinceEntry >= this.risk.maxHoldDays) {
          this.closeTrade(dayData.close, dayData.timestamp, `max-hold (${this.risk.maxHoldDays}d)`, trades);
          continue;
        }
      }

      // Process signals for this date
      while (signalIndex < signals.length) {
        const signal = signals[signalIndex];
        const signalDate = signal.time.toISOString().split('T')[0];
        if (signalDate > dateKey) break;
        signalIndex++;
        if (signalDate < dateKey) continue;

        // Min signal strength filter
        if (this.risk.minSignalStrength && signal.strength < this.risk.minSignalStrength) {
          continue;
        }

        if (signal.type === 'BUY') {
          if (this.position.direction === 'short') {
            // Cover short position
            this.closeTrade(signal.price, signal.time, 'signal-cover', trades);
          }
          if (this.position.direction === 'none') {
            // Enter long position
            this.position.direction = 'long';
            this.position.entryPrice = signal.price;
            this.position.entryTime = signal.time;
            this.position.quantity = this.investmentAmount / signal.price;
            this.position.highestPrice = signal.price;
          }
        } else if (signal.type === 'SELL') {
          if (this.position.direction === 'long') {
            // Close long position
            this.closeTrade(signal.price, signal.time, 'signal', trades);
          }
          if (this.position.direction === 'none' && allowShorts) {
            // Enter short position
            this.position.direction = 'short';
            this.position.entryPrice = signal.price;
            this.position.entryTime = signal.time;
            this.position.quantity = this.investmentAmount / signal.price;
            this.position.lowestPrice = signal.price;
          }
        }
      }
    }

    // Close any open position at last price
    if (this.position.direction !== 'none' && series.points.length > 0) {
      const lastPoint = series.points[series.points.length - 1];
      const lastTs = lastPoint.timestamp instanceof Date ? lastPoint.timestamp : new Date(lastPoint.timestamp as any);
      this.closeTrade(lastPoint.close, lastTs, 'end-of-data', trades);
    }

    return this.calculateMetrics(series.symbol, strategy.name, trades);
  }

  private calculateMetrics(symbol: string, strategyName: string, trades: Trade[]): BacktestResult {
    const totalTrades = trades.length;
    const winningTrades = trades.filter((t) => t.pnl > 0).length;
    const losingTrades = trades.filter((t) => t.pnl < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const totalPnLPercent = trades.reduce((sum, t) => sum + t.pnlPercent, 0) / Math.max(1, totalTrades);

    const avgWin = winningTrades > 0 ? trades.filter((t) => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? trades.filter((t) => t.pnl < 0).reduce((sum, t) => sum + Math.abs(t.pnl), 0) / losingTrades : 0;
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

    // Calculate max drawdown
    let maxDrawdown = 0;
    let peakValue = 0;
    let runningValue = 0;
    for (const trade of trades) {
      runningValue += trade.pnl;
      if (runningValue > peakValue) {
        peakValue = runningValue;
      }
      const drawdown = ((peakValue - runningValue) / Math.max(peakValue, 1)) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    // Calculate Sharpe ratio (assuming 0% risk-free rate)
    const returns = trades.map((t) => t.pnlPercent);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b) / returns.length : 0;
    const variance =
      returns.length > 1
        ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)
        : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // 252 trading days/year

    return {
      symbol,
      strategyName,
      trades,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: Number(winRate.toFixed(2)),
      totalPnL: Number(totalPnL.toFixed(2)),
      totalPnLPercent: Number(totalPnLPercent.toFixed(2)),
      avgWin: Number(avgWin.toFixed(2)),
      avgLoss: Number(avgLoss.toFixed(2)),
      profitFactor: Number(profitFactor.toFixed(2)),
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      sharpeRatio: Number(sharpeRatio.toFixed(2)),
      returns
    };
  }
}

/**
 * Optimizes strategy parameters via grid search
 */
export class ParameterOptimizer {
  optimize(
    series: PriceSeries,
    strategy: (params: Record<string, number>) => Strategy,
    paramRanges: Record<string, number[]>
  ): Array<{ params: Record<string, number>; result: BacktestResult }> {
    const engine = new BacktestEngine();
    const results: Array<{ params: Record<string, number>; result: BacktestResult }> = [];

    // Generate all combinations
    const paramNames = Object.keys(paramRanges);
    const combinations = this.generateCombinations(paramRanges);

    for (const combo of combinations) {
      const params = paramNames.reduce((acc, name, idx) => {
        acc[name] = combo[idx];
        return acc;
      }, {} as Record<string, number>);

      const strategyInstance = strategy(params);
      const result = engine.backtest(series, strategyInstance);
      results.push({ params, result });
    }

    // Sort by Sharpe ratio (best risk-adjusted returns)
    results.sort((a, b) => b.result.sharpeRatio - a.result.sharpeRatio);
    return results;
  }

  private generateCombinations(ranges: Record<string, number[]>): number[][] {
    const keys = Object.keys(ranges);
    const values = keys.map((k) => ranges[k]);
    const combinations: number[][] = [];

    const generate = (index: number, current: number[]) => {
      if (index === keys.length) {
        combinations.push([...current]);
        return;
      }
      for (const value of values[index]) {
        current.push(value);
        generate(index + 1, current);
        current.pop();
      }
    };

    generate(0, []);
    return combinations;
  }
}
