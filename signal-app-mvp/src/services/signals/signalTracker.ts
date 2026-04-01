/**
 * Signal Tracking Infrastructure
 * Tracks signal accuracy, win-rate by signal type, and feedback loops
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TrackedSignal {
  id: string;
  timestamp: Date;
  symbol: string;
  signalType: 'BUY' | 'SELL' | 'HOLD';
  strategyName: string;
  confidence: number; // 0-100
  entryPrice: number;
  entryTime: Date;
  exitPrice?: number;
  exitTime?: Date;
  status: 'open' | 'closed' | 'stale';
  pnl?: number;
  pnlPercent?: number;
  daysHeld?: number;
}

export interface SignalMetrics {
  totalSignals: number;
  closedSignals: number;
  openSignals: number;
  winRate: number; // 0-100
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  winCount: number;
  lossCount: number;
  totalPnL: number;
  maxDrawdown: number;
  bySignalType: Record<string, SignalMetrics>;
  byStrategy: Record<string, SignalMetrics>;
  byTimeframe: Record<string, SignalMetrics>;
}

export interface SignalDatabase {
  signals: TrackedSignal[];
  metrics: SignalMetrics;
  lastUpdated: Date;
}

export class SignalTracker {
  private dbPath: string;
  private db: SignalDatabase;

  constructor(dbPath: string = '/Users/hopenclaw/.openclaw/workspace/signal-app-mvp/data/signal-database.json') {
    this.dbPath = dbPath;
    this.db = this.loadDatabase();
  }

  private loadDatabase(): SignalDatabase {
    try {
      if (fs.existsSync(this.dbPath)) {
        const content = fs.readFileSync(this.dbPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (e) {
      console.warn('Could not load signal database, creating new one');
    }

    return {
      signals: [],
      metrics: this.initializeMetrics(),
      lastUpdated: new Date()
    };
  }

  private initializeMetrics(): SignalMetrics {
    return {
      totalSignals: 0,
      closedSignals: 0,
      openSignals: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      winCount: 0,
      lossCount: 0,
      totalPnL: 0,
      maxDrawdown: 0,
      bySignalType: {},
      byStrategy: {},
      byTimeframe: {}
    };
  }

  private saveDatabase(): void {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.dbPath, JSON.stringify(this.db, null, 2));
  }

  /**
   * Record a new signal
   */
  trackSignal(signal: Omit<TrackedSignal, 'id'>): TrackedSignal {
    const trackedSignal: TrackedSignal = {
      ...signal,
      id: `${signal.symbol}-${signal.timestamp.getTime()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.db.signals.push(trackedSignal);
    this.db.metrics.totalSignals++;
    this.db.metrics.openSignals++;
    this.db.lastUpdated = new Date();
    this.saveDatabase();

    return trackedSignal;
  }

  /**
   * Close a signal with exit price and outcome
   */
  closeSignal(signalId: string, exitPrice: number, exitTime: Date = new Date()): TrackedSignal | null {
    const signal = this.db.signals.find((s) => s.id === signalId);
    if (!signal) return null;

    signal.status = 'closed';
    signal.exitPrice = exitPrice;
    signal.exitTime = exitTime;
    signal.daysHeld = Math.floor((exitTime.getTime() - signal.entryTime.getTime()) / (1000 * 60 * 60 * 24));

    if (signal.signalType === 'BUY') {
      signal.pnl = (exitPrice - signal.entryPrice) * 1; // Assuming 1 unit position for simplicity
      signal.pnlPercent = ((exitPrice - signal.entryPrice) / signal.entryPrice) * 100;
    } else if (signal.signalType === 'SELL') {
      signal.pnl = (signal.entryPrice - exitPrice) * 1;
      signal.pnlPercent = ((signal.entryPrice - exitPrice) / signal.entryPrice) * 100;
    }

    this.db.metrics.closedSignals++;
    this.db.metrics.openSignals--;
    this.updateMetrics();
    this.saveDatabase();

    return signal;
  }

  /**
   * Mark old signals as stale (no update for X days)
   */
  markStaleSignals(daysOld: number = 7): void {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    this.db.signals.forEach((signal) => {
      if (signal.status === 'open' && signal.entryTime < cutoffDate) {
        signal.status = 'stale';
      }
    });

    this.updateMetrics();
    this.saveDatabase();
  }

  /**
   * Calculate metrics across all signals
   */
  private updateMetrics(): void {
    const closedSignals = this.db.signals.filter((s) => s.status === 'closed');
    const openSignals = this.db.signals.filter((s) => s.status === 'open');

    if (closedSignals.length === 0) {
      this.db.metrics = this.initializeMetrics();
      return;
    }

    const wins = closedSignals.filter((s) => (s.pnl ?? 0) > 0);
    const losses = closedSignals.filter((s) => (s.pnl ?? 0) < 0);

    const avgWin = wins.length > 0 ? wins.reduce((sum, s) => sum + (s.pnl ?? 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, s) => sum + (s.pnl ?? 0), 0) / losses.length) : 0;

    const totalPnL = closedSignals.reduce((sum, s) => sum + (s.pnl ?? 0), 0);
    const profitFactor = avgLoss === 0 ? (totalPnL > 0 ? 999 : 0) : avgWin / avgLoss;
    const winRate = (wins.length / closedSignals.length) * 100;

    // Calculate Sharpe ratio (simplified: uses pnl returns and std dev)
    const returns = closedSignals.map((s) => s.pnlPercent ?? 0);
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev === 0 ? 0 : (meanReturn / stdDev) * Math.sqrt(252); // 252 trading days/year

    // Max drawdown (simplified: peak to trough)
    let maxDD = 0;
    let peak = 0;
    let cumulativePnL = 0;
    for (const signal of closedSignals) {
      cumulativePnL += signal.pnl ?? 0;
      if (cumulativePnL > peak) {
        peak = cumulativePnL;
      } else {
        const drawdown = ((peak - cumulativePnL) / peak) * 100;
        maxDD = Math.max(maxDD, drawdown);
      }
    }

    this.db.metrics = {
      totalSignals: this.db.signals.length,
      closedSignals: closedSignals.length,
      openSignals: openSignals.length,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      sharpeRatio,
      winCount: wins.length,
      lossCount: losses.length,
      totalPnL,
      maxDrawdown: maxDD,
      bySignalType: this.groupMetricsByField('signalType'),
      byStrategy: this.groupMetricsByField('strategyName'),
      byTimeframe: this.groupMetricsByTimeframe()
    };

    this.db.lastUpdated = new Date();
  }

  private groupMetricsByField(field: 'signalType' | 'strategyName'): Record<string, SignalMetrics> {
    const grouped: Record<string, TrackedSignal[]> = {};

    this.db.signals.forEach((signal) => {
      const key = String(signal[field]);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(signal);
    });

    const metrics: Record<string, SignalMetrics> = {};
    for (const [key, signals] of Object.entries(grouped)) {
      const closed = signals.filter((s) => s.status === 'closed');
      if (closed.length === 0) continue;

      const wins = closed.filter((s) => (s.pnl ?? 0) > 0);
      const losses = closed.filter((s) => (s.pnl ?? 0) < 0);

      metrics[key] = {
        totalSignals: signals.length,
        closedSignals: closed.length,
        openSignals: signals.filter((s) => s.status === 'open').length,
        winRate: (wins.length / closed.length) * 100,
        avgWin: wins.length > 0 ? wins.reduce((sum, s) => sum + (s.pnl ?? 0), 0) / wins.length : 0,
        avgLoss:
          losses.length > 0 ? Math.abs(losses.reduce((sum, s) => sum + (s.pnl ?? 0), 0) / losses.length) : 0,
        profitFactor:
          wins.length > 0 && losses.length > 0
            ? (wins.reduce((sum, s) => sum + (s.pnl ?? 0), 0) / losses.length) / (losses.reduce((sum, s) => sum + (s.pnl ?? 0), 0) / losses.length)
            : 0,
        sharpeRatio: 0, // Simplified
        winCount: wins.length,
        lossCount: losses.length,
        totalPnL: closed.reduce((sum, s) => sum + (s.pnl ?? 0), 0),
        maxDrawdown: 0,
        bySignalType: {},
        byStrategy: {},
        byTimeframe: {}
      };
    }

    return metrics;
  }

  private groupMetricsByTimeframe(): Record<string, SignalMetrics> {
    const grouped: Record<string, TrackedSignal[]> = {};

    this.db.signals.forEach((signal) => {
      const daysHeld = signal.daysHeld ?? 0;
      let timeframe = '< 1 day';
      if (daysHeld >= 1 && daysHeld <= 7) timeframe = '1-7 days';
      else if (daysHeld > 7 && daysHeld <= 30) timeframe = '1-4 weeks';
      else if (daysHeld > 30) timeframe = '> 1 month';

      if (!grouped[timeframe]) grouped[timeframe] = [];
      grouped[timeframe].push(signal);
    });

    const metrics: Record<string, SignalMetrics> = {};
    for (const [timeframe, signals] of Object.entries(grouped)) {
      const closed = signals.filter((s) => s.status === 'closed');
      if (closed.length === 0) continue;

      const wins = closed.filter((s) => (s.pnl ?? 0) > 0);
      metrics[timeframe] = {
        totalSignals: signals.length,
        closedSignals: closed.length,
        openSignals: signals.filter((s) => s.status === 'open').length,
        winRate: (wins.length / closed.length) * 100,
        avgWin: wins.length > 0 ? wins.reduce((sum, s) => sum + (s.pnl ?? 0), 0) / wins.length : 0,
        avgLoss: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        winCount: wins.length,
        lossCount: closed.length - wins.length,
        totalPnL: closed.reduce((sum, s) => sum + (s.pnl ?? 0), 0),
        maxDrawdown: 0,
        bySignalType: {},
        byStrategy: {},
        byTimeframe: {}
      };
    }

    return metrics;
  }

  /**
   * Get all signals or filtered by criteria
   */
  getSignals(filters?: { symbol?: string; status?: string; strategyName?: string }): TrackedSignal[] {
    if (!filters) return this.db.signals;

    return this.db.signals.filter((signal) => {
      if (filters.symbol && signal.symbol !== filters.symbol) return false;
      if (filters.status && signal.status !== filters.status) return false;
      if (filters.strategyName && signal.strategyName !== filters.strategyName) return false;
      return true;
    });
  }

  /**
   * Get metrics summary
   */
  getMetrics(): SignalMetrics {
    return this.db.metrics;
  }

  /**
   * Get metrics for a specific time window
   */
  getMetricsSince(date: Date): SignalMetrics {
    const recentSignals = this.db.signals.filter((s) => s.entryTime >= date);
    // Recalculate metrics for recent signals
    const tempDb = { ...this.db };
    const tempTracker = new SignalTracker();
    tempTracker['db'].signals = recentSignals;
    tempTracker['updateMetrics']();
    return tempTracker['db'].metrics;
  }

  /**
   * Clear all data (use with caution)
   */
  clearAll(): void {
    this.db = {
      signals: [],
      metrics: this.initializeMetrics(),
      lastUpdated: new Date()
    };
    this.saveDatabase();
  }
}

export default SignalTracker;
