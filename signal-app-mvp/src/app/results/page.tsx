'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, BarChart3 } from 'lucide-react';
import { MetricsCard } from '@/components/MetricsCard';
import { TradeTable } from '@/components/TradeTable';

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

const STRATEGY_NAMES: Record<string, string> = {
  SMA_RSI_IMPROVED: 'SMA + RSI (Trend-following)',
  MACD: 'MACD (Momentum)',
  BOLLINGER: 'Bollinger Bands (Mean Reversion)',
};

const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  SMA_RSI_IMPROVED: 'Moving average crossovers combined with RSI momentum confirmation. Best for identifying trend reversals in volatile markets.',
  MACD: 'Momentum indicator with MACD line, signal line, and histogram divergence. Great for confirming breakouts and trend strength.',
  BOLLINGER: 'Mean reversion strategy using Bollinger Bands to identify overbought/oversold conditions. Works well in ranging, sideways markets.',
};

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

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(true);

  const symbol = searchParams.get('symbol') || 'BTC';
  const strategy = searchParams.get('strategy') || 'SMA_RSI_IMPROVED';
  const days = searchParams.get('days') || '90';

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch('/apps/market-signals/api/backtest', {
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
        setResult({
          symbol,
          strategy,
          days: parseInt(days),
          status: 'error',
          error: String(error),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [symbol, strategy, days]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
        <nav className="border-b border-slate-800/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
          </div>
        </nav>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-emerald-500 border-r-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading detailed results...</p>
          </div>
        </div>
      </div>
    );
  }

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
            <Link href="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold">Detailed Analysis</span>
            </div>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto px-6 py-12">
          {result?.status === 'error' ? (
            <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 font-semibold">Error</p>
              <p className="text-sm text-red-300/80">{result.error || result.message}</p>
            </div>
          ) : result?.metrics ? (
            <>
              {/* Header */}
              <div className="mb-8 p-6 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-4xl font-bold mb-2">{symbol}</div>
                    <div className="text-slate-400 space-y-1">
                      <div className="text-lg font-semibold text-emerald-400">{STRATEGY_NAMES[strategy]}</div>
                      <div className="text-sm">Analyzed {days} days of historical data</div>
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 hover:bg-slate-700 transition-colors text-sm font-medium"
                  >
                    Run Another Test
                  </Link>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="mb-8 grid grid-cols-2 gap-4">
                <MetricsCard
                  label="Win Rate"
                  value={result.metrics.winRate}
                  unit="%"
                  type={interpretMetric('winRate', parseFloat(result.metrics.winRate))}
                  explanation="Percentage of winning trades. 50%+ is profitable."
                />
                <MetricsCard
                  label="Sharpe Ratio"
                  value={result.metrics.sharpeRatio.toFixed(2)}
                  type={interpretMetric('sharpeRatio', result.metrics.sharpeRatio)}
                  explanation="Risk-adjusted returns. 1.0+ is excellent."
                />
                <MetricsCard
                  label="Profit Factor"
                  value={result.metrics.profitFactor.toFixed(2)}
                  type={interpretMetric('profitFactor', result.metrics.profitFactor)}
                  explanation="Total gains ÷ total losses. 1.5+ is good."
                />
                <MetricsCard
                  label="Max Drawdown"
                  value={result.metrics.maxDrawdown}
                  unit="%"
                  type={interpretMetric('maxDrawdown', parseFloat(result.metrics.maxDrawdown))}
                  explanation="Worst peak-to-trough decline. Lower is better."
                />
              </div>

              {/* Summary Statistics */}
              <div className="mb-8 grid grid-cols-3 gap-4 p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
                <div>
                  <div className="text-sm text-slate-400 mb-1">Total Return</div>
                  <div className="text-3xl font-bold text-emerald-400">{result.metrics.totalPnL}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Total Trades</div>
                  <div className="text-3xl font-bold text-blue-400">{result.metrics.totalTrades}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Period Analyzed</div>
                  <div className="text-3xl font-bold text-cyan-400">{days}d</div>
                </div>
              </div>

              {/* Strategy Description */}
              <div className="mb-8 p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  Strategy Overview
                </h3>
                <p className="text-slate-300 mb-4">{STRATEGY_DESCRIPTIONS[strategy]}</p>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                  <div>
                    <div className="text-xs text-slate-500 uppercase font-semibold mb-2">When It Works</div>
                    <ul className="text-sm text-slate-400 space-y-1">
                      {strategy === 'SMA_RSI_IMPROVED' && (
                        <>
                          <li>✓ Trending markets (clear direction)</li>
                          <li>✓ High volatility periods</li>
                          <li>✓ Strong momentum shifts</li>
                        </>
                      )}
                      {strategy === 'MACD' && (
                        <>
                          <li>✓ Trending markets (up or down)</li>
                          <li>✓ Clear momentum patterns</li>
                          <li>✓ Breakout confirmations</li>
                        </>
                      )}
                      {strategy === 'BOLLINGER' && (
                        <>
                          <li>✓ Ranging, sideways markets</li>
                          <li>✓ Mean reversion conditions</li>
                          <li>✓ Overbought/oversold extremes</li>
                        </>
                      )}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase font-semibold mb-2">When It Struggles</div>
                    <ul className="text-sm text-slate-400 space-y-1">
                      {strategy === 'SMA_RSI_IMPROVED' && (
                        <>
                          <li>✗ Sideways/ranging markets</li>
                          <li>✗ Whipsaws and false breaks</li>
                          <li>✗ Extended consolidations</li>
                        </>
                      )}
                      {strategy === 'MACD' && (
                        <>
                          <li>✗ Choppy, ranging markets</li>
                          <li>✗ Gap moves without warning</li>
                          <li>✗ Slow momentum shifts</li>
                        </>
                      )}
                      {strategy === 'BOLLINGER' && (
                        <>
                          <li>✗ Strong trending markets</li>
                          <li>✗ Volatility expansion moves</li>
                          <li>✗ Breakouts beyond bands</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Trade History */}
              {result.trades && result.trades.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-semibold text-lg mb-4">Trade-by-Trade Analysis</h3>
                  <TradeTable trades={result.trades} maxVisible={15} />
                </div>
              )}

              {/* Interpretation Guide */}
              <div className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
                <h3 className="font-semibold text-lg mb-4">How to Interpret These Results</h3>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div>
                    <div className="font-semibold text-emerald-400 mb-2">Good Signs</div>
                    <ul className="text-slate-400 space-y-1">
                      <li>✓ Win rate &gt; 55%</li>
                      <li>✓ Sharpe ratio &gt; 1.0</li>
                      <li>✓ Profit factor &gt; 1.5</li>
                      <li>✓ Drawdown &lt; 25%</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold text-amber-400 mb-2">Areas of Concern</div>
                    <ul className="text-slate-400 space-y-1">
                      <li>✗ Win rate &lt; 45%</li>
                      <li>✗ Sharpe ratio &lt; 0.5</li>
                      <li>✗ Profit factor &lt; 1.0</li>
                      <li>✗ Drawdown &gt; 35%</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400">No results available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
