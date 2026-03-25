import type { PriceSeries } from '@/models/PriceData';

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
export class BacktestEngine {
  private readonly feePercent = 0.001; // 0.1% per trade
  private readonly position = {
    isLong: false,
    entryPrice: 0,
    entryTime: new Date(),
    quantity: 1 // Assume 1 unit per trade
  };

  backtest(series: PriceSeries, strategy: Strategy): BacktestResult {
    const signals = strategy.generateSignals(series);
    const trades: Trade[] = [];

    // Ensure all signal times are proper Date objects (may be strings after serialization)
    for (const s of signals) {
      if (!(s.time instanceof Date)) {
        s.time = new Date(s.time as any);
      }
    }

    for (const signal of signals) {
      if (signal.type === 'BUY' && !this.position.isLong) {
        this.position.isLong = true;
        this.position.entryPrice = signal.price;
        this.position.entryTime = signal.time;
      } else if (signal.type === 'SELL' && this.position.isLong) {
        const exitPrice = signal.price;
        const fee = (signal.price * this.feePercent) * 2; // Entry + exit fee
        const pnl = (exitPrice - this.position.entryPrice) * this.position.quantity - fee;
        const pnlPercent =
          ((exitPrice - this.position.entryPrice) / this.position.entryPrice) * 100 - 0.2; // -0.2% for fees
        const daysHeld = Math.ceil((signal.time.getTime() - this.position.entryTime.getTime()) / (1000 * 60 * 60 * 24));

        trades.push({
          entryPrice: this.position.entryPrice,
          entryTime: this.position.entryTime,
          exitPrice,
          exitTime: signal.time,
          quantity: this.position.quantity,
          pnl,
          pnlPercent,
          daysHeld: Math.max(1, daysHeld),
          fee
        });

        this.position.isLong = false;
      }
    }

    // Close any open position at last price
    if (this.position.isLong && series.points.length > 0) {
      const lastPoint = series.points[series.points.length - 1];
      const exitPrice = lastPoint.close;
      const fee = (exitPrice * this.feePercent) * 2;
      const pnl = (exitPrice - this.position.entryPrice) * this.position.quantity - fee;
      const pnlPercent =
        ((exitPrice - this.position.entryPrice) / this.position.entryPrice) * 100 - 0.2;
      const lastTs = lastPoint.timestamp instanceof Date ? lastPoint.timestamp : new Date(lastPoint.timestamp as any);
      const entryTs = this.position.entryTime instanceof Date ? this.position.entryTime : new Date(this.position.entryTime as any);
      const daysHeld = Math.ceil((lastTs.getTime() - entryTs.getTime()) / (1000 * 60 * 60 * 24));

      trades.push({
        entryPrice: this.position.entryPrice,
        entryTime: this.position.entryTime,
        exitPrice,
        exitTime: lastPoint.timestamp,
        quantity: this.position.quantity,
        pnl,
        pnlPercent,
        daysHeld: Math.max(1, daysHeld),
        fee
      });
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
