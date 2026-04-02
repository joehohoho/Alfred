'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { TrendingUp, Zap, Settings, ChevronRight, RefreshCw, ArrowUpCircle, ArrowDownCircle, MinusCircle, BarChart3, HelpCircle } from 'lucide-react';
import { MetricsCard } from '@/components/MetricsCard';
import { StrategyCard } from '@/components/StrategyCard';
import { TradeTable } from '@/components/TradeTable';
import { PriceChart } from '@/components/dashboard/PriceChart';
import type { SignalMarker } from '@/components/dashboard/PriceChart';

type BacktestResult = {
  symbol: string;
  strategy: string;
  days: number;
  status: string;
  optimized?: boolean;
  usedCachedParams?: boolean;
  cachedParamsAge?: string;
  walkForwardValidated?: boolean;
  optimalParams?: Record<string, number>;
  optimization?: {
    totalCombinationsTested: number;
    topParams: Array<{
      params: Record<string, number>;
      metrics: { totalPnlPercent: number; winRate: number; sharpeRatio: number; totalTrades: number };
      compositeScore: number;
    }>;
    optimizedAt: string;
  };
  comparison?: {
    defaultPnL: string;
    defaultPnLPercent: number;
    optimizedPnL: string;
    optimizedPnLPercent: number;
    improvement: string;
  };
  metrics?: {
    winRate: string;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: string;
    totalPnL: string;
    totalTrades: number;
  };
  trades?: any[];
  priceData?: Array<{ date: string; price: number; sma9?: number; sma21?: number }>;
  signals?: SignalMarker[];
  message?: string;
  error?: string;
};

type CurrentSignal = {
  symbol: string;
  assetType: 'crypto' | 'stock';
  signalType: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  rationale: string;
  generatedAt: string;
  strategy: string;
};

const QUICK_SYMBOLS = ['BTC', 'ETH', 'AAPL', 'MSFT', 'GOOGL', 'NVDA'];

const STRATEGIES = [
  {
    id: 'SMA_RSI_IMPROVED',
    title: 'SMA + RSI',
    desc: 'Trend-following with momentum. Best for volatility.',
    metrics: 'Win: 50-65% | Sharpe: 0.8-1.2',
  },
  {
    id: 'MACD',
    title: 'MACD',
    desc: 'Momentum & signal divergence. Great for breakouts.',
    metrics: 'Win: 55-70% | Sharpe: 0.9-1.4',
  },
  {
    id: 'BOLLINGER_BANDS',
    title: 'Bollinger Bands',
    desc: 'Mean reversion with volatility. Ranging markets.',
    metrics: 'Win: 60-75% | Sharpe: 1.0-1.5',
  },
  {
    id: 'SMART',
    title: 'Smart Regime',
    desc: 'Detects market regime first. Sits in cash during choppy markets.',
    metrics: 'Win: 55-70% | Sharpe: 1.0-1.8',
  },
  {
    id: 'ENSEMBLE',
    title: 'Dynamic Ensemble',
    desc: 'Runs all strategies and dynamically weights by recent performance.',
    metrics: 'Win: 55-75% | Sharpe: 1.0-2.0',
  },
  {
    id: 'MEAN_REVERSION',
    title: 'Mean Reversion',
    desc: 'Buys oversold bounces and sells overbought pullbacks. Exploits mean reversion.',
    metrics: 'Win: 50-65% | Sharpe: 0.8-1.5',
  },
  {
    id: 'BREAKOUT',
    title: 'Breakout',
    desc: 'Detects consolidation ranges and trades confirmed breakouts with volume.',
    metrics: 'Win: 45-60% | Sharpe: 0.8-1.6',
  },
  {
    id: 'FUNDING_RATE',
    title: 'Funding Rate',
    desc: 'Trades extreme funding rate imbalances. Leading indicator for corrections and squeezes.',
    metrics: 'Win: 45-60% | Sharpe: 0.7-1.4',
  },
  {
    id: 'BAYESIAN',
    title: 'Bayesian Scorer',
    desc: 'Probabilistic scoring using Bayesian inference. Only trades when probability exceeds 70%.',
    metrics: 'Win: 50-65% | Sharpe: 0.9-1.6',
  },
  {
    id: 'THOMPSON',
    title: 'Thompson Sampling',
    desc: 'Adaptive strategy rotation. Automatically discovers the best strategy for current conditions.',
    metrics: 'Win: 50-70% | Sharpe: 0.9-1.8',
  },
];

function interpretMetric(name: string, value: number | string): 'positive' | 'negative' | 'neutral' | 'warning' {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (name === 'winRate') {
    if (numValue >= 55) return 'positive';
    if (numValue >= 50) return 'neutral';
    if (numValue >= 45) return 'warning';
    return 'negative';
  }

  if (name === 'sharpeRatio') {
    if (numValue >= 1.0) return 'positive';
    if (numValue >= 0.5) return 'neutral';
    if (numValue >= 0) return 'warning';
    return 'negative';
  }

  if (name === 'profitFactor') {
    if (numValue >= 2.0) return 'positive';
    if (numValue >= 1.5) return 'neutral';
    if (numValue >= 1.0) return 'warning';
    return 'negative';
  }

  if (name === 'maxDrawdown') {
    if (numValue <= 15) return 'positive';
    if (numValue <= 25) return 'neutral';
    if (numValue <= 35) return 'warning';
    return 'negative';
  }

  return 'neutral';
}

function SignalBadge({ type }: { type: 'BUY' | 'SELL' | 'HOLD' }) {
  if (type === 'BUY') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        <ArrowUpCircle className="w-3.5 h-3.5" />
        BUY
      </span>
    );
  }
  if (type === 'SELL') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
        <ArrowDownCircle className="w-3.5 h-3.5" />
        SELL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
      <MinusCircle className="w-3.5 h-3.5" />
      HOLD
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-slate-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 font-mono w-8 text-right">{pct}%</span>
    </div>
  );
}

function CurrentSignalsSection() {
  const [signals, setSignals] = useState<CurrentSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/apps/market-signals/api/signals?grid=true');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSignals(data.signals || []);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchSignals, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  const cryptoSignals = signals.filter((s) => s.assetType === 'crypto').slice(0, 5);
  const stockSignals = signals.filter((s) => s.assetType === 'stock').slice(0, 5);

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          Current Signals
        </h2>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-slate-500">Updated {lastRefresh}</span>
          )}
          <button
            onClick={fetchSignals}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-emerald-500/30 transition-colors disabled:opacity-50"
            title="Refresh signals"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400 mb-4">
          Failed to load signals: {error}
        </div>
      )}

      {loading && signals.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-12 mb-3" />
              <div className="h-3 bg-slate-700 rounded w-16 mb-2" />
              <div className="h-6 bg-slate-700 rounded w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Crypto signals row */}
          {cryptoSignals.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Crypto</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {cryptoSignals.map((sig) => (
                  <div
                    key={sig.symbol}
                    className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm">{sig.symbol}</span>
                      <SignalBadge type={sig.signalType} />
                    </div>
                    <div className="text-lg font-mono font-semibold mb-1">
                      ${sig.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <ConfidenceBar value={sig.confidence} />
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 group-hover:line-clamp-none transition-all">
                      {sig.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stock signals row */}
          {stockSignals.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Stocks</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {stockSignals.map((sig) => (
                  <div
                    key={sig.symbol}
                    className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm">{sig.symbol}</span>
                      <SignalBadge type={sig.signalType} />
                    </div>
                    <div className="text-lg font-mono font-semibold mb-1">
                      ${sig.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <ConfidenceBar value={sig.confidence} />
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 group-hover:line-clamp-none transition-all">
                      {sig.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// --- Signal Quality Tracker ---

type QualitySnapshot = {
  date: string;
  avgPnl: number;
  avgWinRate: number;
  profitableRuns: number;
  totalRuns: number;
  profitablePercent: number;
  patternsLearned: number;
  actionablePatterns: number;
  tradesAnalyzed: number;
  bestStrategy: string;
  bestPnl: number;
};

type SignalQualityData = {
  symbol: string;
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  snapshots: QualitySnapshot[];
  current: {
    avgPnl: number;
    avgWinRate: number;
    profitablePercent: number;
    bestStrategy: string;
    bestPnl: number;
  } | null;
  learning: {
    patternsLearned: number;
    actionablePatterns: number;
    tradesAnalyzed: number;
    lastUpdated: string | null;
  };
  summary: {
    totalSnapshots: number;
    overallAvgPnl: number;
    overallProfitablePercent: number;
  };
};

function TrendBadge({ trend }: { trend: string }) {
  const config: Record<string, { label: string; color: string; icon: string }> = {
    improving: { label: 'Improving', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30', icon: '↑' },
    declining: { label: 'Declining', color: 'text-red-400 bg-red-500/15 border-red-500/30', icon: '↓' },
    stable: { label: 'Stable', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30', icon: '→' },
    insufficient_data: { label: 'Building...', color: 'text-slate-400 bg-slate-500/15 border-slate-500/30', icon: '◌' },
  };
  const c = config[trend] || config.insufficient_data;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${c.color}`}>
      {c.icon} {c.label}
    </span>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function SignalQualityPanel({ symbol }: { symbol: string }) {
  const [data, setData] = useState<SignalQualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/apps/market-signals/api/signal-quality?symbol=${symbol}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // silent — panel just won't render
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [symbol]);

  if (loading || !data) return null;

  const snapshots = data.snapshots;
  const hasHistory = snapshots.length >= 2;

  // Compute sparkline bar data (last 10 snapshots)
  const spark = snapshots.slice(-10);
  const maxPnl = Math.max(...spark.map((s) => Math.abs(s.avgPnl)), 1);

  // Change since first snapshot
  const firstPnl = snapshots.length > 0 ? snapshots[0].avgPnl : 0;
  const latestPnl = snapshots.length > 0 ? snapshots[snapshots.length - 1].avgPnl : 0;
  const pnlChange = latestPnl - firstPnl;

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          Signal Quality
        </h2>
        <TrendBadge trend={data.trend} />
      </div>

      <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm space-y-5">
        {/* Top stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-slate-900/50">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Avg PnL</div>
            <div className={`text-lg font-bold font-mono ${latestPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {latestPnl >= 0 ? '+' : ''}{safeFixed(latestPnl)}%
            </div>
            {hasHistory && (
              <div className={`text-[10px] mt-0.5 ${pnlChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {pnlChange >= 0 ? '↑' : '↓'} {Math.abs(pnlChange).toFixed(1)}% since start
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-slate-900/50">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Profitable Runs</div>
            <div className="text-lg font-bold font-mono text-amber-400">
              {safeFixed(data.current?.profitablePercent ?? 0, 0)}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              of backtest runs
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/50">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Patterns Learned</div>
            <div className="text-lg font-bold font-mono text-cyan-400">
              {data.learning.patternsLearned}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {data.learning.actionablePatterns} actionable
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/50">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Trades Analyzed</div>
            <div className="text-lg font-bold font-mono text-blue-400">
              {data.learning.tradesAnalyzed}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              training the filter
            </div>
          </div>
        </div>

        {/* PnL trend sparkline */}
        {spark.length >= 2 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">PnL Trend (by date)</div>
            <div className="flex items-end gap-1 h-12">
              {spark.map((s, i) => {
                const h = Math.max(4, (Math.abs(s.avgPnl) / maxPnl) * 48);
                const color = s.avgPnl >= 0 ? 'bg-emerald-500' : 'bg-red-500';
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                    <div
                      className={`w-full rounded-t ${color} transition-all opacity-70 group-hover:opacity-100`}
                      style={{ height: `${h}px` }}
                    />
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                      <div className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-[10px] text-slate-300 whitespace-nowrap shadow-lg">
                        {s.date}: {s.avgPnl >= 0 ? '+' : ''}{s.avgPnl.toFixed(1)}% ({s.profitableRuns}/{s.totalRuns} profitable)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[9px] text-slate-600 mt-1">
              <span>{spark[0].date}</span>
              <span>{spark[spark.length - 1].date}</span>
            </div>
          </div>
        )}

        {/* Learning progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Learning Progress</span>
            <span className="text-[10px] text-slate-500">
              {data.learning.actionablePatterns} / {data.learning.patternsLearned} patterns actionable
            </span>
          </div>
          <MiniBar
            value={data.learning.actionablePatterns}
            max={Math.max(data.learning.patternsLearned, 1)}
            color="bg-gradient-to-r from-cyan-500 to-emerald-500"
          />
          <div className="text-[10px] text-slate-500 mt-1">
            Actionable patterns actively filter out bad signals. More training = better filtering.
          </div>
        </div>

        {/* Expandable details */}
        {snapshots.length > 0 && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              {expanded ? 'Hide' : 'Show'} daily breakdown
            </button>

            {expanded && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-700/50">
                      <th className="text-left py-1.5 pr-3">Date</th>
                      <th className="text-right py-1.5 px-2">Avg PnL</th>
                      <th className="text-right py-1.5 px-2">Win Rate</th>
                      <th className="text-right py-1.5 px-2">Profitable</th>
                      <th className="text-right py-1.5 px-2">Runs</th>
                      <th className="text-right py-1.5 px-2">Patterns</th>
                      <th className="text-left py-1.5 pl-2">Best Strategy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.map((s, i) => (
                      <tr key={i} className="border-b border-slate-800/30 hover:bg-slate-800/30">
                        <td className="py-1.5 pr-3 text-slate-300 font-mono">{s.date}</td>
                        <td className={`py-1.5 px-2 text-right font-mono ${s.avgPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {s.avgPnl >= 0 ? '+' : ''}{s.avgPnl.toFixed(2)}%
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-300">{s.avgWinRate.toFixed(0)}%</td>
                        <td className="py-1.5 px-2 text-right font-mono text-amber-400">{s.profitablePercent.toFixed(0)}%</td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-400">{s.totalRuns}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-cyan-400">{s.patternsLearned}</td>
                        <td className="py-1.5 pl-2 text-slate-400">{s.bestStrategy} ({s.bestPnl > 0 ? '+' : ''}{s.bestPnl.toFixed(1)}%)</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Last updated */}
        {data.learning.lastUpdated && (
          <div className="text-[10px] text-slate-600 text-right">
            Last training: {new Date(data.learning.lastUpdated).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

// Safe number formatting — handles string, number, null, undefined
function safeFixed(val: any, digits: number = 2): string {
  if (val == null) return '0.' + '0'.repeat(digits);
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  return isNaN(num) ? '0.' + '0'.repeat(digits) : num.toFixed(digits);
}

export default function DashboardPage() {
  const [symbol, setSymbol] = useState('BTC');
  const [strategy, setStrategy] = useState('SMA_RSI_IMPROVED');
  const [days, setDays] = useState(90);
  const [investment, setInvestment] = useState(10000);
  const [stopLoss, setStopLoss] = useState(8);
  const [trailingStop, setTrailingStop] = useState(5);
  const [loading, setLoading] = useState(false);
  const [optimizeMode, setOptimizeMode] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const handleRunBacktest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/apps/market-signals/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          strategy,
          days: parseInt(String(days)),
          investment,
          stopLoss,
          trailingStop,
          optimize: optimizeMode,
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        symbol,
        strategy,
        days: parseInt(String(days)),
        status: 'error',
        error: String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-emerald-900/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-40 w-80 h-80 bg-blue-900/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="border-b border-slate-800/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                Market Signals
              </h1>
            </Link>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <Link
                href="/paper-trade"
                className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors font-medium"
              >
                Paper Trade
              </Link>
              <span className="px-3 py-1 rounded-full bg-slate-800/50 border border-emerald-500/30">Demo Mode</span>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Current Signals Section (above backtest) */}
          <CurrentSignalsSection />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Test Controls */}
            <div className="lg:col-span-1">
              <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm sticky top-24">
                <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
                  <Zap className="w-6 h-6 text-amber-400" />
                  Quick Test
                </h2>

                {/* Symbol Selection */}
                <div className="mb-8">
                  <label className="block text-sm font-semibold text-slate-300 mb-3">Symbol</label>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {QUICK_SYMBOLS.map((sym) => (
                      <button
                        key={sym}
                        onClick={() => setSymbol(sym)}
                        className={`py-2 rounded-lg font-semibold text-sm transition-all ${
                          symbol === sym
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="Custom symbol..."
                    className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-xs"
                  />
                </div>

                {/* Strategy Selection */}
                <div className="mb-8">
                  <label className="block text-sm font-semibold text-slate-300 mb-3">Strategy</label>
                  <div className="space-y-3">
                    {STRATEGIES.map((strat) => (
                      <StrategyCard
                        key={strat.id}
                        id={strat.id}
                        title={strat.title}
                        description={strat.desc}
                        metrics={strat.metrics}
                        selected={strategy === strat.id}
                        onClick={() => setStrategy(strat.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Days Selection */}
                <div className="mb-8">
                  <label className="block text-sm font-semibold text-slate-300 mb-3">
                    Lookback Period: <span className="text-emerald-400">{days} days</span>
                  </label>
                  <input
                    type="range"
                    min="7"
                    max="365"
                    step="1"
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-2">
                    <span>7 days</span>
                    <span>365 days</span>
                  </div>
                </div>

                {/* Investment Amount */}
                <div className="mb-8">
                  <label className="block text-sm font-semibold text-slate-300 mb-3">
                    Investment Amount: <span className="text-emerald-400">${investment.toLocaleString()}</span>
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="100000"
                    step="100"
                    value={investment}
                    onChange={(e) => setInvestment(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-2">
                    <span>$100</span>
                    <span>$100,000</span>
                  </div>
                </div>

                {/* Risk Settings */}
                <div className="mb-8 p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
                  <div className="text-xs font-semibold text-slate-400 uppercase mb-3">Risk Management</div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                        Stop Loss: <span className="text-red-400">{stopLoss}%</span>
                        <span className="relative group">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 p-2 rounded bg-slate-800 border border-slate-600 text-[11px] text-slate-300 leading-tight opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 shadow-lg">
                            Automatically sells your position if the price drops this percentage from your entry price. Limits your maximum loss per trade.
                          </span>
                        </span>
                      </label>
                      <input
                        type="range" min="3" max="20" step="1"
                        value={stopLoss}
                        onChange={(e) => setStopLoss(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                        <span>3% tight</span><span>20% wide</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                        Trailing Stop: <span className="text-amber-400">{trailingStop}%</span>
                        <span className="relative group">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-500 cursor-help" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 p-2 rounded bg-slate-800 border border-slate-600 text-[11px] text-slate-300 leading-tight opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 shadow-lg">
                            Moves your stop-loss upward as the price rises, locking in profits. If the price drops this percentage from its highest point after entry, the position is sold.
                          </span>
                        </span>
                      </label>
                      <input
                        type="range" min="2" max="15" step="1"
                        value={trailingStop}
                        onChange={(e) => setTrailingStop(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                        <span>2% tight</span><span>15% wide</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Optimize Toggle */}
                <div className="mb-6">
                  <button
                    onClick={() => setOptimizeMode(!optimizeMode)}
                    className={`w-full py-3 px-4 rounded-lg font-semibold text-sm flex items-center justify-between transition-all border ${
                      optimizeMode
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-700/50 border-slate-600/50 text-slate-400 hover:border-amber-500/30'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Parameter Optimization
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      optimizeMode ? 'bg-amber-500/30 text-amber-300' : 'bg-slate-600/50 text-slate-500'
                    }`}>
                      {optimizeMode ? 'ON' : 'OFF'}
                    </span>
                  </button>
                  {optimizeMode && (
                    <p className="text-xs text-amber-400/70 mt-2 px-1">
                      Grid search + walk-forward validation. Finds best parameters automatically. Takes longer.
                    </p>
                  )}
                </div>

                {/* Run Button */}
                <button
                  onClick={handleRunBacktest}
                  disabled={loading || !symbol}
                  className={`w-full py-4 px-6 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                    optimizeMode
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-amber-500/20 hover:shadow-amber-500/40'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-500/20 hover:shadow-emerald-500/40'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-r-transparent rounded-full animate-spin" />
                      {optimizeMode ? 'Finding optimal parameters...' : 'Testing...'}
                    </>
                  ) : (
                    <>
                      {optimizeMode ? <Settings className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                      {optimizeMode ? 'Optimize & Test' : 'Run Backtest'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Results Panel */}
            <div className="lg:col-span-2 space-y-6">
              {loading && (
                <div className={`p-12 rounded-xl border text-center ${
                  optimizeMode
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : 'bg-slate-800/50 border-slate-700/50'
                }`}>
                  <div className={`w-12 h-12 border-3 border-r-transparent rounded-full animate-spin mx-auto mb-4 ${
                    optimizeMode ? 'border-amber-500' : 'border-emerald-500'
                  }`} />
                  <p className="text-slate-400">
                    {optimizeMode
                      ? `Finding optimal parameters for ${symbol}... (grid search + walk-forward validation)`
                      : `Running backtest on ${symbol} (${days} days)...`}
                  </p>
                  {optimizeMode && (
                    <p className="text-xs text-slate-500 mt-2">This may take 10-30 seconds</p>
                  )}
                </div>
              )}

              {result && result.status === 'error' && (
                <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 font-semibold">Error</p>
                  <p className="text-sm text-red-300/80">{result.error || result.message}</p>
                </div>
              )}

              {result && result.status === 'success' && result.metrics && (
                <>
                  {/* Metrics Header */}
                  <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-3xl font-bold flex items-center gap-3">
                          {result.symbol}
                          {result.optimized && (
                            <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium">
                              Optimized
                            </span>
                          )}
                          {result.usedCachedParams && (
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium">
                              Cached params ({result.cachedParamsAge})
                            </span>
                          )}
                          {result.walkForwardValidated && (
                            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                              Walk-forward validated
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-400">
                          {STRATEGIES.find((s) => s.id === result.strategy)?.title || result.strategy} • {result.days} days
                        </div>
                      </div>
                      <Link
                        href={`/results?symbol=${result.symbol}&strategy=${result.strategy}&days=${result.days}`}
                        className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 text-sm font-medium flex items-center gap-1 transition-colors"
                      >
                        View Details
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Optimization Results */}
                  {result.optimized && result.comparison && (
                    <div className="p-6 rounded-xl bg-amber-500/5 border border-amber-500/20">
                      <h3 className="text-sm font-semibold text-amber-400 mb-4 flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Optimization Results
                        {result.optimization && (
                          <span className="text-xs text-slate-500 font-normal">
                            ({result.optimization.totalCombinationsTested} combinations tested)
                          </span>
                        )}
                      </h3>

                      {/* Comparison bar */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                          <div className="text-xs text-slate-500 mb-1">Default Parameters</div>
                          <div className={`text-xl font-bold font-mono ${
                            Number(result.comparison.defaultPnLPercent) >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {result.comparison.defaultPnL}
                          </div>
                          <div className="text-xs text-slate-500">
                            {Number(result.comparison.defaultPnLPercent) >= 0 ? '+' : ''}{safeFixed(result.comparison.defaultPnLPercent, 2)}%
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                          <div className="text-xs text-amber-400/70 mb-1">Optimized Parameters</div>
                          <div className={`text-xl font-bold font-mono ${
                            Number(result.comparison.optimizedPnLPercent) >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {result.comparison.optimizedPnL}
                          </div>
                          <div className="text-xs text-amber-400/70">
                            {Number(result.comparison.optimizedPnLPercent) >= 0 ? '+' : ''}{safeFixed(result.comparison.optimizedPnLPercent, 2)}%
                            <span className="ml-2 text-emerald-400">
                              ({parseFloat(result.comparison.improvement) >= 0 ? '+' : ''}{result.comparison.improvement} improvement)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Optimal params */}
                      {result.optimalParams && (
                        <div className="mt-3">
                          <div className="text-xs text-slate-500 mb-2">Best Parameters Found:</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(result.optimalParams).map(([key, val]) => (
                              <span key={key} className="px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50 text-xs font-mono">
                                <span className="text-slate-500">{key}:</span>{' '}
                                <span className="text-amber-300">{val}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Top 5 candidates */}
                      {result.optimization && result.optimization.topParams.length > 1 && (
                        <details className="mt-4">
                          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                            Show top {result.optimization.topParams.length} parameter sets
                          </summary>
                          <div className="mt-2 space-y-2">
                            {result.optimization.topParams.map((tp, idx) => (
                              <div key={idx} className="flex items-center gap-3 p-2 rounded bg-slate-800/30 text-xs">
                                <span className="text-slate-600 font-mono w-4">#{idx + 1}</span>
                                <span className="font-mono text-slate-400 flex-1">
                                  {Object.entries(tp.params).map(([k, v]) => `${k}=${v}`).join(', ')}
                                </span>
                                <span className={`font-mono ${Number(tp.metrics.totalPnlPercent) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {Number(tp.metrics.totalPnlPercent) >= 0 ? '+' : ''}{safeFixed(tp.metrics.totalPnlPercent, 2)}%
                                </span>
                                <span className="text-slate-500">
                                  W:{safeFixed(tp.metrics.winRate, 0)}%
                                </span>
                                <span className="text-slate-600">
                                  score:{safeFixed(tp.compositeScore, 3)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  )}

                  {/* Price Chart with Signal Overlays */}
                  {result.priceData && result.priceData.length > 0 && (
                    <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-400" />
                        Price Chart with Signals
                      </h3>
                      <PriceChart
                        data={result.priceData}
                        signals={result.signals}
                        height={350}
                      />
                      {result.signals && result.signals.length > 0 && (
                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                            Buy signals ({result.signals.filter((s) => s.type === 'BUY').length})
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                            Sell signals ({result.signals.filter((s) => s.type === 'SELL').length})
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <MetricsCard
                      label="Win Rate"
                      value={result.metrics.winRate}
                      unit="%"
                      type={interpretMetric('winRate', parseFloat(result.metrics.winRate))}
                      explanation="% of winning trades vs total trades"
                    />
                    <MetricsCard
                      label="Sharpe Ratio"
                      value={safeFixed(result.metrics.sharpeRatio, 2)}
                      type={interpretMetric('sharpeRatio', result.metrics.sharpeRatio)}
                      explanation="Risk-adjusted return (higher=better)"
                    />
                    <MetricsCard
                      label="Profit Factor"
                      value={safeFixed(result.metrics.profitFactor, 2)}
                      type={interpretMetric('profitFactor', result.metrics.profitFactor)}
                      explanation="Gross profit / gross loss (>1=profitable)"
                    />
                    <MetricsCard
                      label="Max Drawdown"
                      value={result.metrics.maxDrawdown}
                      unit="%"
                      type={interpretMetric('maxDrawdown', parseFloat(result.metrics.maxDrawdown))}
                      explanation="Worst peak-to-trough decline"
                    />
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4 p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
                    <div>
                      <div className="text-sm text-slate-400 mb-1">Total Return</div>
                      <div className="text-2xl font-bold text-emerald-400">{result.metrics.totalPnL}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400 mb-1">Total Trades</div>
                      <div className="text-2xl font-bold text-blue-400">{result.metrics.totalTrades}</div>
                    </div>
                  </div>

                  {/* Trade History */}
                  {result.trades && result.trades.length > 0 && (
                    <div className="space-y-4">
                      <div className="text-sm font-semibold text-slate-300">Trade History</div>
                      <TradeTable trades={result.trades} maxVisible={5} />
                    </div>
                  )}

                  {/* Strategy Info */}
                  <div className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50 space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Settings className="w-4 h-4 text-blue-400" />
                      Strategy Notes
                    </h4>
                    <p className="text-sm text-slate-400">
                      {STRATEGIES.find((s) => s.id === result.strategy)?.desc || 'Custom strategy configuration.'}
                    </p>
                  </div>
                </>
              )}

              {!loading && !result && (
                <div className="p-12 rounded-xl bg-slate-800/30 border-2 border-dashed border-slate-700 text-center">
                  <Zap className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">Select a symbol and strategy, then click Run Backtest</p>
                  <p className="text-sm text-slate-500 mt-2">Results will appear here with a live price chart</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Signal Quality Tracker */}
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <SignalQualityPanel symbol={symbol} />
        </div>

        {/* Quick Guide */}
        <div className="max-w-7xl mx-auto px-6 py-12 mt-12 border-t border-slate-800/50">
          <h3 className="text-2xl font-bold mb-6">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { num: '1', title: 'Pick Symbol', desc: 'BTC, ETH, or any stock symbol' },
              { num: '2', title: 'Choose Strategy', desc: 'SMA+RSI, MACD, or Bollinger Bands' },
              { num: '3', title: 'Set Period', desc: '7 to 365 days of historical data' },
              { num: '4', title: 'See Results', desc: 'Charts, signals, and metrics instantly' },
            ].map((step) => (
              <div key={step.num} className="p-6 rounded-lg bg-slate-800/30 border border-slate-700/50 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center font-bold text-emerald-400 mx-auto mb-3">
                  {step.num}
                </div>
                <div className="font-semibold mb-2">{step.title}</div>
                <div className="text-sm text-slate-400">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-800/50 text-center">
          <h3 className="text-xl font-bold mb-4">Ready to Use Signals in Real Trading?</h3>
          <p className="text-slate-400 mb-6 max-w-xl mx-auto">
            Integration with the GST app is coming soon. Signals will automatically flow to your trading interface.
          </p>
          <Link
            href="/integration"
            className="inline-block px-6 py-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/80 transition-colors font-medium"
          >
            See Integration Guide
          </Link>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-800/50 mt-12">
          <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-slate-500">
            <p>Market Signals App • Demo Mode • Educational Purpose</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
