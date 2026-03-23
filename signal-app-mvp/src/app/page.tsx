'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Zap, TrendingUp, Settings } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl font-bold mb-4">Market Signals App</h1>
          <p className="text-xl text-slate-400">
            Trading signals with 3 proven strategies, backtesting engine, and parameter optimizer
          </p>
        </div>

        {/* Quick Start */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <CardTitle className="text-white">Quick Test</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 mb-4">
                Run backtests on any symbol with different strategies
              </p>
              <Link
                href="/test"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                Test Now <ArrowRight className="w-4 h-4" />
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <CardTitle className="text-white">Strategies</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 mb-4">
                3 adaptive strategies: SMA+RSI, MACD, Bollinger Bands
              </p>
              <p className="text-sm text-slate-500">Each backtested and optimized</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Settings className="w-5 h-5 text-blue-400" />
                <CardTitle className="text-white">CLI Tools</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 mb-4">
                Run from terminal: npm run backtest:compare
              </p>
              <p className="text-sm text-slate-500">Full control + advanced options</p>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold mb-6">What&apos;s Included</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'Backtest Engine', desc: 'Validate strategies against 90+ days of data' },
              { title: 'Parameter Optimizer', desc: 'Find best settings for current market conditions' },
              { title: 'Multi-Strategy Voting', desc: 'Combine 3 strategies for robust signals' },
              { title: 'Performance Metrics', desc: 'Win rate, Sharpe ratio, max drawdown, and more' },
              { title: 'Signal Confidence', desc: 'Strength indicator (0-1) for each signal' },
              { title: 'Trade History', desc: 'Entry/exit prices, P&L, duration of each trade' },
            ].map((feature: any, i: number) => (
              <div key={i} className="border-l-2 border-emerald-500 pl-4">
                <h3 className="font-semibold text-emerald-400 mb-1">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-center">
          <p className="text-slate-400 mb-2">Ready to test?</p>
          <Link
            href="/test"
            className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded font-semibold transition-colors"
          >
            Go to Test Interface
          </Link>
        </div>
      </div>
    </div>
  );
}
