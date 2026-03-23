'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TrendingUp, BarChart3, Zap, ChevronRight, Play, Settings } from 'lucide-react';

export default function HomePage() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-emerald-900/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-40 w-80 h-80 bg-blue-900/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="border-b border-slate-800/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                Market Signals
              </h1>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <span className="px-3 py-1 rounded-full bg-slate-800/50 border border-emerald-500/30">Demo Mode</span>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Trading Signals,<br />
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Scientifically Proven
            </span>
          </h2>
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
            Test 3 adaptive strategies with real backtesting. Analyze win rates, risk metrics, and trade history. No guesswork.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <Link
              href="/test"
              className="group px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
            >
              <Play className="w-5 h-5" />
              Start Testing Now
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#strategies"
              className="px-8 py-4 border border-slate-700 hover:border-slate-600 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              Learn More
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { label: '3 Strategies', value: 'SMA+RSI, MACD, Bollinger' },
              { label: 'Real Backtests', value: '90+ days historical data' },
              { label: 'Performance Metrics', value: 'Win rate, Sharpe, Drawdown' },
            ].map((stat, i) => (
              <div key={i} className="p-6 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
                <div className="text-3xl font-bold text-emerald-400 mb-2">{stat.label}</div>
                <div className="text-sm text-slate-400">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Strategies Section */}
        <div id="strategies" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-800/50">
          <h3 className="text-3xl font-bold mb-12 text-center">How It Works</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              {
                id: 'sma',
                icon: <BarChart3 className="w-8 h-8" />,
                title: 'SMA + RSI Strategy',
                desc: 'Moving average crossovers + momentum oscillator. Best for trend-following.',
                metrics: 'Win Rate: 50-65% | Sharpe: 0.8-1.2',
              },
              {
                id: 'macd',
                icon: <TrendingUp className="w-8 h-8" />,
                title: 'MACD Strategy',
                desc: 'Momentum indicator with signal line divergence. Great for breakouts.',
                metrics: 'Win Rate: 55-70% | Sharpe: 0.9-1.4',
              },
              {
                id: 'bollinger',
                icon: <Zap className="w-8 h-8" />,
                title: 'Bollinger Bands',
                desc: 'Mean reversion strategy with dynamic volatility. Handles ranging markets.',
                metrics: 'Win Rate: 60-75% | Sharpe: 1.0-1.5',
              },
            ].map((strategy) => (
              <div
                key={strategy.id}
                onMouseEnter={() => setHovered(strategy.id)}
                onMouseLeave={() => setHovered(null)}
                className="p-8 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-emerald-500/50 transition-all duration-300 cursor-pointer group hover:bg-slate-800/50"
              >
                <div className="mb-4 w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-400/20 to-blue-400/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  {strategy.icon}
                </div>
                <h4 className="text-xl font-semibold mb-3">{strategy.title}</h4>
                <p className="text-slate-400 mb-4 text-sm">{strategy.desc}</p>
                <div className={`text-xs text-slate-500 transition-all duration-300 ${hovered === strategy.id ? 'text-emerald-400' : ''}`}>
                  {strategy.metrics}
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 rounded-lg bg-slate-800/30 border border-slate-700/50 mb-12">
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              Smart Signal Combination
            </h4>
            <p className="text-slate-400 mb-4">
              All 3 strategies run in parallel on your selected symbol. Signals are weighted by recent performance and voted together for maximum robustness. Single strategy fails? The others have your back.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              {['Input: Price Data', 'Run 3 Strategies', 'Weight by Performance', 'Output: Signal + Confidence'].map((step, i) => (
                <div key={i} className="p-3 rounded bg-slate-900/50 border border-slate-700 text-center text-slate-300">
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-800/50">
          <h3 className="text-3xl font-bold mb-12 text-center">Key Features</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {[
              { title: 'Any Symbol', desc: 'Crypto (BTC, ETH), Stocks (AAPL, MSFT), Commodities' },
              { title: 'Flexible Timeframe', desc: 'Test 7 to 365 days of historical data' },
              { title: 'Detailed Metrics', desc: 'Win rate, profit factor, Sharpe ratio, max drawdown' },
              { title: 'Trade History', desc: 'Every entry/exit with P&L and duration' },
              { title: 'Parameter Tuning', desc: 'Optimize strategy settings for your market' },
              { title: 'CLI & Web', desc: 'Test via interface or terminal commands' },
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
                <div className="font-semibold text-emerald-400 mb-2">{feature.title}</div>
                <div className="text-sm text-slate-400">{feature.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Footer */}
        <div className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-800/50">
          <div className="p-12 rounded-lg bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-emerald-500/20 text-center">
            <h3 className="text-2xl font-bold mb-4">Ready to Test Your Signals?</h3>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Jump into the test interface, pick a symbol and strategy, and see real backtest results in seconds.
            </p>
            <Link
              href="/test"
              className="inline-block px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-lg font-semibold transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
            >
              Go to Test Interface
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-800/50 mt-20">
          <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-slate-500">
            <p>Market Signals App • Demo Mode • Educational Purpose</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
