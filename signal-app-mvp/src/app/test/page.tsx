'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, TrendingUp, Zap } from 'lucide-react';

type BacktestResult = {
  symbol: string;
  strategy: string;
  days: number;
  status: string;
  metrics?: {
    winRate: string;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: string;
    totalPnL: string;
    totalTrades: number;
  };
  trades?: any[];
  message?: string;
  error?: string;
};

export default function TestPage() {
  const [symbol, setSymbol] = useState('BTC');
  const [strategy, setStrategy] = useState('SMA_RSI_IMPROVED');
  const [days, setDays] = useState('90');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const handleRunBacktest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          strategy,
          days: parseInt(days),
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ symbol, strategy, days: parseInt(days), status: 'error', error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const strategyDescriptions: Record<string, { name: string; desc: string }> = {
    SMA_RSI_IMPROVED: {
      name: 'SMA + RSI',
      desc: 'Trend-following with momentum confirmation. Quick signals, good for volatile markets.',
    },
    MACD: {
      name: 'MACD',
      desc: 'Momentum-based with signal line divergence. Excellent for trending markets and breakouts.',
    },
    BOLLINGER: {
      name: 'Bollinger Bands',
      desc: 'Mean reversion strategy for ranging markets. Identifies overbought/oversold conditions.',
    },
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
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </Link>
            <h1 className="text-xl font-bold">Backtest Interface</h1>
            <div />
          </div>
        </nav>

        <div className="max-w-5xl mx-auto px-6 py-12">
          {/* Test Controls */}
          <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm mb-8">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-400" />
              Configure Backtest
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Symbol Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">Trading Symbol</label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="BTC, ETH, AAPL..."
                  className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors"
                />
                <div className="text-xs text-slate-500 mt-2">Crypto (BTC, ETH) or Stock (AAPL, MSFT)</div>
              </div>

              {/* Strategy Select */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">Strategy</label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="SMA_RSI_IMPROVED">SMA + RSI (Trend-following)</option>
                  <option value="MACD">MACD (Momentum)</option>
                  <option value="BOLLINGER">Bollinger Bands (Mean Reversion)</option>
                </select>
              </div>

              {/* Days Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">Lookback Period (Days)</label>
                <input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  min="7"
                  max="365"
                  className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none transition-colors"
                />
                <div className="text-xs text-slate-500 mt-2">7-365 days of historical data</div>
              </div>
            </div>

            {/* Strategy Description */}
            <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 mb-8">
              <div className="font-semibold text-emerald-400 mb-2">{strategyDescriptions[strategy].name} Strategy</div>
              <div className="text-sm text-slate-400">{strategyDescriptions[strategy].desc}</div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunBacktest}
              disabled={loading || !symbol}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Running Backtest...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Run Backtest
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className={`p-8 rounded-xl border backdrop-blur-sm ${result.error ? 'bg-red-950/30 border-red-700/50' : 'bg-slate-800/50 border-slate-700/50'}`}>
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
                Backtest Results
              </h3>

              {result.error ? (
                <div className="p-4 rounded-lg bg-red-900/30 border border-red-700/50 text-red-200">
                  <div className="font-semibold mb-2">Error</div>
                  <div className="text-sm">{result.error}</div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Test Parameters */}
                  <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Symbol</div>
                      <div className="font-semibold text-lg">{result.symbol}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Strategy</div>
                      <div className="font-semibold text-lg">{strategyDescriptions[result.strategy]?.name || result.strategy}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Period</div>
                      <div className="font-semibold text-lg">{result.days} days</div>
                    </div>
                  </div>

                  {result.metrics && (
                    <>
                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <MetricCard label="Win Rate" value={result.metrics.winRate} color="emerald" />
                        <MetricCard label="Profit Factor" value={result.metrics.profitFactor.toFixed(2)} color="blue" />
                        <MetricCard label="Sharpe Ratio" value={result.metrics.sharpeRatio.toFixed(2)} color="purple" />
                        <MetricCard label="Max Drawdown" value={result.metrics.maxDrawdown} color="red" />
                        <MetricCard label="Total P&L" value={result.metrics.totalPnL} color="emerald" />
                        <MetricCard label="Total Trades" value={result.metrics.totalTrades.toString()} color="cyan" />
                      </div>

                      {/* Interpretation */}
                      <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
                        <div className="font-semibold text-slate-300 mb-2">How to Interpret</div>
                        <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
                          <li><span className="font-semibold">Win Rate &gt; 50%</span> means more profitable trades than losing ones</li>
                          <li><span className="font-semibold">Profit Factor &gt; 1.5</span> means strong risk-reward ratio</li>
                          <li><span className="font-semibold">Sharpe &gt; 1.0</span> means good risk-adjusted returns</li>
                          <li><span className="font-semibold">Max Drawdown</span> shows the worst peak-to-trough decline</li>
                        </ul>
                      </div>

                      {/* Trades Table */}
                      {result.trades && result.trades.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-4">Trade Details (First 10)</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-700">
                                  <th className="text-left py-3 px-4 text-slate-400">#</th>
                                  <th className="text-left py-3 px-4 text-slate-400">Entry Price</th>
                                  <th className="text-left py-3 px-4 text-slate-400">Exit Price</th>
                                  <th className="text-left py-3 px-4 text-slate-400">P&L</th>
                                  <th className="text-left py-3 px-4 text-slate-400">Return %</th>
                                  <th className="text-left py-3 px-4 text-slate-400">Days Held</th>
                                </tr>
                              </thead>
                              <tbody>
                                {result.trades.slice(0, 10).map((trade, i) => (
                                  <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/50">
                                    <td className="py-3 px-4">{i + 1}</td>
                                    <td className="py-3 px-4 font-mono text-slate-300">${trade.entry.toLocaleString()}</td>
                                    <td className="py-3 px-4 font-mono text-slate-300">${trade.exit.toLocaleString()}</td>
                                    <td className={`py-3 px-4 font-mono font-semibold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      ${trade.pnl.toLocaleString()}
                                    </td>
                                    <td className={`py-3 px-4 font-mono ${trade.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {trade.pnlPct >= 0 ? '+' : ''}{trade.pnlPct.toFixed(2)}%
                                    </td>
                                    <td className="py-3 px-4 text-slate-400">{trade.daysHeld}d</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {result.message && (
                    <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-700/50 text-blue-200 text-sm">
                      {result.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Help Section */}
          {!result && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="p-6 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <h4 className="font-semibold text-emerald-400 mb-3">💡 Tip: Quick Tests</h4>
                <div className="text-sm text-slate-400 space-y-2">
                  <p><span className="font-semibold">BTC</span> - Bitcoin, highly volatile, good for momentum strategies</p>
                  <p><span className="font-semibold">ETH</span> - Ethereum, similar to BTC, slightly less volatile</p>
                  <p><span className="font-semibold">AAPL</span> - Apple stock, stable trend-follower</p>
                </div>
              </div>
              <div className="p-6 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <h4 className="font-semibold text-blue-400 mb-3">⚙️ Pro Tip: Strategy Choice</h4>
                <div className="text-sm text-slate-400 space-y-2">
                  <p><span className="font-semibold">SMA+RSI</span> best for volatile assets with clear trends</p>
                  <p><span className="font-semibold">MACD</span> best for momentum-driven markets</p>
                  <p><span className="font-semibold">Bollinger</span> best for range-bound markets</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorClass = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    red: 'text-red-400',
    cyan: 'text-cyan-400',
  }[color] || 'text-emerald-400';

  return (
    <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
      <div className="text-xs text-slate-500 mb-2">{label}</div>
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
    </div>
  );
}
