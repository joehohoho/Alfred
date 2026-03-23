'use client';

import Link from 'next/link';
import { TrendingUp, BarChart3, Zap, ChevronRight, Play } from 'lucide-react';

export default function HomePage() {
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
            Test Trading Signals<br />
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Instantly
            </span>
          </h2>
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
            3 adaptive strategies. Real backtesting. See results in seconds. Use signals to improve your trading.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <Link
              href="/dashboard"
              className="group px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40"
            >
              <Play className="w-5 h-5" />
              Go to Dashboard
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/integration"
              className="px-8 py-4 border border-slate-700 hover:border-slate-600 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              Integration Guide
            </Link>
          </div>

          {/* Quick Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <BarChart3 className="w-6 h-6" />, title: '3 Strategies', desc: 'SMA+RSI, MACD, Bollinger' },
              { icon: <Zap className="w-6 h-6" />, title: 'Real Backtests', desc: '7-365 days instantly' },
              { icon: <TrendingUp className="w-6 h-6" />, title: 'Full Metrics', desc: 'Win rate, Sharpe, Drawdown' },
            ].map((feat, i) => (
              <div key={i} className="p-6 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <div className="text-emerald-400 mb-3">{feat.icon}</div>
                <div className="font-semibold mb-1">{feat.title}</div>
                <div className="text-sm text-slate-400">{feat.desc}</div>
              </div>
            ))}
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
