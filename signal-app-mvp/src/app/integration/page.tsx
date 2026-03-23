'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Zap, TrendingUp, BarChart3, Settings } from 'lucide-react';

export default function IntegrationPage() {
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
            <h1 className="text-xl font-bold">Integration Guide</h1>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto px-6 py-12">
          {/* Hero */}
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-bold mb-4">Integrate Signals into Your Trading</h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Use Market Signals App with the GST App for a complete automated trading workflow.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-8 mb-12">
            {/* Step 1 */}
            <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center flex-shrink-0 font-bold text-emerald-400">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-3 flex items-center gap-2">
                    <Zap className="w-6 h-6" />
                    Test Strategies on Market Signals
                  </h3>
                  <p className="text-slate-400 mb-4">
                    Start with the Market Signals App dashboard. Pick a symbol (BTC, ETH, AAPL, etc.), choose a strategy (SMA+RSI, MACD, or Bollinger Bands), and test it on historical data.
                  </p>
                  <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 space-y-2 mb-4">
                    <div className="text-sm font-semibold text-slate-300">What to look for:</div>
                    <ul className="text-sm text-slate-400 space-y-1">
                      <li>✓ Win rate above 50&ndash;55%</li>
                      <li>✓ Sharpe ratio above 1.0</li>
                      <li>✓ Profit factor above 1.5</li>
                      <li>✓ Max drawdown under 25%</li>
                    </ul>
                  </div>
                  <Link
                    href="/dashboard"
                    className="inline-block px-6 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 font-medium transition-colors"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center flex-shrink-0 font-bold text-blue-400">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-3 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6" />
                    Review Detailed Results
                  </h3>
                  <p className="text-slate-400 mb-4">
                    After running a backtest, click &quot;View Details&quot; to see the complete analysis including trade-by-trade P&amp;L, performance chart, and strategy notes. This helps you understand exactly how the strategy performs.
                  </p>
                  <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 space-y-2 mb-4">
                    <div className="text-sm font-semibold text-slate-300">You&apos;ll see:</div>
                    <ul className="text-sm text-slate-400 space-y-1">
                      <li>✓ Complete metrics grid (4 key metrics)</li>
                      <li>✓ Trade history with entry/exit prices</li>
                      <li>✓ When strategy works / when it struggles</li>
                      <li>✓ Interpretation guide for metrics</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center flex-shrink-0 font-bold text-cyan-400">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-3 flex items-center gap-2">
                    <Settings className="w-6 h-6" />
                    Connect to GST App
                  </h3>
                  <p className="text-slate-400 mb-4">
                    Once you&apos;ve found a strategy that performs well, link it to the GST App. The GST App will use the signals generated by Market Signals to execute trades automatically.
                  </p>
                  <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 space-y-2 mb-4">
                    <div className="text-sm font-semibold text-slate-300">Integration setup:</div>
                    <ul className="text-sm text-slate-400 space-y-1">
                      <li>✓ GST App polls signal endpoint every minute</li>
                      <li>✓ Filters signals with confidence &gt; 60%</li>
                      <li>✓ Automatically sizes positions based on risk</li>
                      <li>✓ Executes buy/sell orders on your exchange</li>
                    </ul>
                  </div>
                  <a
                    href="https://github.com/yourusername/gst-app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-300 hover:bg-blue-500/30 font-medium transition-colors"
                  >
                    View GST App Docs
                  </a>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/50 flex items-center justify-center flex-shrink-0 font-bold text-purple-400">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-3 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6" />
                    Monitor & Optimize
                  </h3>
                  <p className="text-slate-400 mb-4">
                    As live trades execute, compare actual performance against the backtest. The system continuously learns and can auto-adjust parameters for better performance.
                  </p>
                  <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 space-y-2 mb-4">
                    <div className="text-sm font-semibold text-slate-300">Weekly optimization:</div>
                    <ul className="text-sm text-slate-400 space-y-1">
                      <li>✓ Re-backtest on most recent 90 days</li>
                      <li>✓ Identify best-performing parameters</li>
                      <li>✓ Auto-deploy improved settings</li>
                      <li>✓ Track live vs backtest accuracy</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* API Endpoints */}
          <div className="mb-12 p-8 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <h3 className="text-2xl font-bold mb-6">API Endpoints for Integration</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 font-mono text-sm">
                <div className="text-emerald-400 font-bold mb-2">POST /api/backtest</div>
                <div className="text-slate-400">
                  Run backtest on a symbol/strategy/period combination. Returns full metrics and trade history.
                </div>
              </div>
              <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 font-mono text-sm">
                <div className="text-blue-400 font-bold mb-2">GET /api/signals?symbol=BTC</div>
                <div className="text-slate-400">
                  Get current live signals for a symbol. Returns signal type, confidence score, and entry price.
                </div>
              </div>
              <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 font-mono text-sm">
                <div className="text-cyan-400 font-bold mb-2">POST /api/signals/track</div>
                <div className="text-slate-400">
                  Track outcome of a signal (entry/exit prices, P&L). Used for learning feedback loop.
                </div>
              </div>
            </div>
          </div>

          {/* Architecture Diagram */}
          <div className="mb-12 p-8 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <h3 className="text-2xl font-bold mb-6">Complete Workflow Architecture</h3>
            <div className="bg-slate-900/50 rounded-lg p-6 overflow-auto">
              <pre className="text-xs text-slate-400 font-mono">{`
┌─────────────────────────────────────────────────────────────┐
│                  Market Signals App                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Dashboard: Test Strategies & View Results          │   │
│  │  - Select symbol, strategy, period                  │   │
│  │  - Run backtest instantly                           │   │
│  │  - View metrics & trade history                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Backtest Engine + Strategy Registry                │   │
│  │  - 3 strategies: SMA+RSI, MACD, Bollinger           │   │
│  │  - Parallel evaluation                              │   │
│  │  - Performance weighting                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Live Signal Generation                             │   │
│  │  - Generate signals from live price data            │   │
│  │  - Score confidence (0-1)                           │   │
│  │  - Filter by confidence threshold                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         ↓
                    REST API
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    GST App (Trading)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Signal Consumer                                    │   │
│  │  - Poll signals every 60 seconds                    │   │
│  │  - Filter by confidence > 60%                       │   │
│  │  - Execute trades automatically                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Risk Management                                    │   │
│  │  - Position sizing based on signal strength        │   │
│  │  - Stop-loss / take-profit                         │   │
│  │  - Portfolio allocation                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Exchange Integration                               │   │
│  │  - Execute orders on Binance/etc                    │   │
│  │  - Track filled trades                              │   │
│  │  - Update portfolio balance                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Feedback Loop                                      │   │
│  │  - Track signal outcomes (P&L)                      │   │
│  │  - Send back to Market Signals                      │   │
│  │  - Auto-optimize parameters                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
              `}</pre>
            </div>
          </div>

          {/* Quick Start Checklist */}
          <div className="p-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              Quick Start Checklist
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                'Test at least 3 symbols with all strategies',
                'Review detailed results for your top performers',
                'Document which strategy works best for each symbol',
                'Set up GST App connection',
                'Configure position sizing and risk limits',
                'Run in demo mode for 1 week',
                'Monitor live signals vs backtest accuracy',
                'Enable auto-optimization after 2 weeks',
              ].map((item, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded mt-0.5 cursor-pointer"
                  />
                  <span className="text-slate-300 group-hover:text-white transition-colors">{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 p-8 rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 text-center">
            <h3 className="text-2xl font-bold mb-4">Ready to Start?</h3>
            <p className="text-slate-400 mb-6 max-w-xl mx-auto">
              Begin by testing strategies on the dashboard. Once you find winners, connect them to GST for live trading.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="px-8 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 font-semibold transition-colors"
              >
                Go to Dashboard
              </Link>
              <a
                href="https://github.com/yourusername/gst-app"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 rounded-lg border border-slate-700 hover:border-slate-600 font-semibold transition-colors"
              >
                GST App Docs
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
