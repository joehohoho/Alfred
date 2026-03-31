'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Play,
  Square,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  Timer,
  DollarSign,
  BarChart3,
  ChevronLeft,
} from 'lucide-react';

// ---- Types ----

interface Position {
  entryPrice: number;
  quantity: number;
  entryTime: string;
  highestPrice: number;
}

interface PaperTrade {
  entry: number;
  exit: number;
  pnl: number;
  pnlPercent: number;
  reason: string;
  entryTime: string;
  exitTime: string;
}

interface PaperSession {
  id: string;
  symbol: string;
  strategy: string;
  investment: number;
  balance: number;
  currentPosition: Position | null;
  trades: PaperTrade[];
  totalPnl: number;
  totalPnlPercent: number;
  status: 'active' | 'stopped';
  startedAt: string;
  lastTickAt: string | null;
  riskSettings: { stopLossPercent: number; trailingStopPercent: number };
}

interface SessionSummary {
  id: string;
  symbol: string;
  strategy: string;
  status: string;
  investment: number;
  balance: number;
  totalPnl: number;
  totalPnlPercent: number;
  tradesCount: number;
  hasPosition: boolean;
  startedAt: string;
  lastTickAt: string | null;
}

interface TickResult {
  session: PaperSession;
  currentPrice: number;
  newTrades: PaperTrade[];
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
}

// ---- Constants ----

const BASE = '/apps/market-signals';

const SYMBOLS = ['BTC', 'ETH', 'AAPL', 'MSFT', 'GOOGL', 'NVDA'];
const STRATEGIES = [
  { id: 'SMA_RSI_IMPROVED', label: 'SMA + RSI' },
  { id: 'MACD', label: 'MACD' },
  { id: 'BOLLINGER_BANDS', label: 'Bollinger Bands' },
  { id: 'RSI_EXTREME', label: 'RSI Extreme' },
  { id: 'TREND_FOLLOWING', label: 'Trend Following' },
];

// ---- Page Component ----

export default function PaperTradePage() {
  // Start panel state
  const [symbol, setSymbol] = useState('BTC');
  const [strategy, setStrategy] = useState('SMA_RSI_IMPROVED');
  const [investment, setInvestment] = useState(10000);
  const [stopLoss, setStopLoss] = useState(8);
  const [trailingStop, setTrailingStop] = useState(5);
  const [starting, setStarting] = useState(false);

  // Active session
  const [activeSession, setActiveSession] = useState<PaperSession | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [unrealizedPnl, setUnrealizedPnl] = useState(0);
  const [unrealizedPnlPercent, setUnrealizedPnlPercent] = useState(0);
  const [ticking, setTicking] = useState(false);
  const [autoTick, setAutoTick] = useState(false);
  const autoTickRef = useRef(false);
  const autoTickTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Session list
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Error
  const [error, setError] = useState<string | null>(null);

  // ---- Fetch sessions ----
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/paper-trade`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // ---- Start session ----
  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/paper-trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          symbol: symbol.toUpperCase(),
          strategy,
          investment,
          stopLoss,
          trailingStop,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const session: PaperSession = await res.json();
      setActiveSession(session);
      fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStarting(false);
    }
  };

  // ---- Tick ----
  const handleTick = useCallback(async () => {
    if (!activeSession || ticking) return;
    setTicking(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/paper-trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tick', sessionId: activeSession.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const result: TickResult = await res.json();
      setActiveSession(result.session);
      setCurrentPrice(result.currentPrice);
      setUnrealizedPnl(result.unrealizedPnl);
      setUnrealizedPnlPercent(result.unrealizedPnlPercent);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTicking(false);
    }
  }, [activeSession, ticking]);

  // ---- Auto-tick ----
  useEffect(() => {
    autoTickRef.current = autoTick;
  }, [autoTick]);

  useEffect(() => {
    if (autoTick && activeSession && activeSession.status === 'active') {
      // Immediate first tick
      handleTick();
      autoTickTimer.current = setInterval(() => {
        if (autoTickRef.current) handleTick();
      }, 60000);
    }
    return () => {
      if (autoTickTimer.current) {
        clearInterval(autoTickTimer.current);
        autoTickTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTick, activeSession?.id]);

  // ---- Stop session ----
  const handleStop = async () => {
    if (!activeSession) return;
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/paper-trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', sessionId: activeSession.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const session: PaperSession = await res.json();
      setActiveSession(session);
      setAutoTick(false);
      setUnrealizedPnl(0);
      setUnrealizedPnlPercent(0);
      fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // ---- Load existing session ----
  const loadSession = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/paper-trade?sessionId=${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const session: PaperSession = await res.json();
      setActiveSession(session);
      setAutoTick(false);
      setUnrealizedPnl(0);
      setUnrealizedPnlPercent(0);
      setCurrentPrice(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // ---- Performance summary ----
  const winningTrades = activeSession?.trades.filter((t) => t.pnl > 0) || [];
  const losingTrades = activeSession?.trades.filter((t) => t.pnl < 0) || [];
  const winRate =
    activeSession && activeSession.trades.length > 0
      ? ((winningTrades.length / activeSession.trades.length) * 100).toFixed(1)
      : '0.0';
  const bestTrade = activeSession?.trades.length
    ? Math.max(...activeSession.trades.map((t) => t.pnl))
    : 0;
  const worstTrade = activeSession?.trades.length
    ? Math.min(...activeSession.trades.map((t) => t.pnl))
    : 0;

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
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                  Market Signals
                </h1>
              </Link>
              <span className="text-slate-600">|</span>
              <span className="text-sm font-semibold text-amber-400">Paper Trading</span>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Error banner */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column: Start panel + session list */}
            <div className="lg:col-span-1 space-y-6">
              {/* Start new session */}
              <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Play className="w-5 h-5 text-emerald-400" />
                  New Session
                </h2>

                {/* Symbol */}
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                    Symbol
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {SYMBOLS.map((sym) => (
                      <button
                        key={sym}
                        onClick={() => setSymbol(sym)}
                        className={`py-1.5 rounded-lg font-semibold text-xs transition-all ${
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
                    placeholder="Custom..."
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-xs"
                  />
                </div>

                {/* Strategy */}
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                    Strategy
                  </label>
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none text-sm"
                  >
                    {STRATEGIES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Investment */}
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                    Investment: <span className="text-emerald-400">${investment.toLocaleString()}</span>
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="100000"
                    step="100"
                    value={investment}
                    onChange={(e) => setInvestment(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Risk settings */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Stop Loss %</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Trailing Stop %</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={trailingStop}
                      onChange={(e) => setTrailingStop(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>

                {/* Start button */}
                <button
                  onClick={handleStart}
                  disabled={starting || !symbol}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                >
                  {starting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-r-transparent rounded-full animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Start Paper Trading
                    </>
                  )}
                </button>
              </div>

              {/* Past sessions */}
              <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-slate-300">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  Sessions
                </h3>
                {loadingSessions ? (
                  <div className="text-xs text-slate-500">Loading...</div>
                ) : sessions.length === 0 ? (
                  <div className="text-xs text-slate-500">No sessions yet. Start one above.</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {sessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => loadSession(s.id)}
                        className={`w-full p-3 rounded-lg text-left transition-all text-xs border ${
                          activeSession?.id === s.id
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-slate-800/30 border-slate-700/30 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold">{s.symbol}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              s.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-slate-600/30 text-slate-400'
                            }`}
                          >
                            {s.status}
                          </span>
                        </div>
                        <div className="text-slate-500">
                          {STRATEGIES.find((st) => st.id === s.strategy)?.label || s.strategy}
                        </div>
                        <div
                          className={`font-mono font-semibold mt-1 ${
                            s.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {s.totalPnl >= 0 ? '+' : ''}${s.totalPnl.toFixed(2)} ({s.totalPnlPercent.toFixed(2)}%)
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-slate-600">{s.tradesCount} trades | ${s.investment.toLocaleString()}</span>
                          {s.status === 'stopped' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Delete this session? This cannot be undone.')) {
                                  fetch('/apps/market-signals/api/paper-trade', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'delete', sessionId: s.id }),
                                  }).then(() => {
                                    setSessions((prev) => prev.filter((p) => p.id !== s.id));
                                    if (activeSession?.id === s.id) setActiveSession(null);
                                  });
                                }
                              }}
                              className="px-2 py-0.5 text-[10px] rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right column: Active session */}
            <div className="lg:col-span-2 space-y-6">
              {!activeSession ? (
                <div className="p-16 rounded-xl bg-slate-800/30 border-2 border-dashed border-slate-700 text-center">
                  <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">No active session</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Start a new paper trading session or select an existing one
                  </p>
                </div>
              ) : (
                <>
                  {/* Session header */}
                  <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-2xl font-bold flex items-center gap-3">
                          {activeSession.symbol}
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              activeSession.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-600/30 text-slate-400 border border-slate-600/30'
                            }`}
                          >
                            {activeSession.status}
                          </span>
                        </div>
                        <div className="text-sm text-slate-400 mt-1">
                          {STRATEGIES.find((s) => s.id === activeSession.strategy)?.label || activeSession.strategy}
                          {' | '}
                          Started {new Date(activeSession.startedAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2">
                        {activeSession.status === 'active' && (
                          <>
                            <button
                              onClick={handleTick}
                              disabled={ticking}
                              className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30 text-sm font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                              {ticking ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                              Tick
                            </button>
                            <button
                              onClick={() => setAutoTick(!autoTick)}
                              className={`px-4 py-2 rounded-lg border text-sm font-medium flex items-center gap-1.5 transition-colors ${
                                autoTick
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                  : 'bg-slate-700/50 border-slate-600/50 text-slate-400 hover:border-amber-500/30'
                              }`}
                            >
                              <Timer className="w-4 h-4" />
                              {autoTick ? 'Auto: ON' : 'Auto: OFF'}
                            </button>
                            <button
                              onClick={handleStop}
                              className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 text-sm font-medium flex items-center gap-1.5 transition-colors"
                            >
                              <Square className="w-4 h-4" />
                              Stop
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Balance & P&L row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/30">
                        <div className="text-xs text-slate-500 mb-1">Balance</div>
                        <div className="text-lg font-bold font-mono text-slate-200">
                          ${activeSession.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/30">
                        <div className="text-xs text-slate-500 mb-1">Total P&L</div>
                        <div
                          className={`text-lg font-bold font-mono ${
                            activeSession.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {activeSession.totalPnl >= 0 ? '+' : ''}${activeSession.totalPnl.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {activeSession.totalPnlPercent >= 0 ? '+' : ''}
                          {activeSession.totalPnlPercent.toFixed(2)}%
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/30">
                        <div className="text-xs text-slate-500 mb-1">Current Price</div>
                        <div className="text-lg font-bold font-mono text-slate-200">
                          {currentPrice > 0 ? `$${currentPrice.toLocaleString()}` : '--'}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/30">
                        <div className="text-xs text-slate-500 mb-1">Trades</div>
                        <div className="text-lg font-bold font-mono text-blue-400">
                          {activeSession.trades.length}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Open position */}
                  {activeSession.currentPosition && (
                    <div className="p-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                      <h3 className="text-sm font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                        <ArrowUpCircle className="w-4 h-4" />
                        Open Position
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Entry Price</div>
                          <div className="font-mono font-semibold">
                            ${activeSession.currentPosition.entryPrice.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Quantity</div>
                          <div className="font-mono font-semibold">
                            {activeSession.currentPosition.quantity.toFixed(6)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Unrealized P&L</div>
                          <div
                            className={`font-mono font-semibold ${
                              unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Unrealized %</div>
                          <div
                            className={`font-mono font-semibold ${
                              unrealizedPnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {unrealizedPnlPercent >= 0 ? '+' : ''}
                            {unrealizedPnlPercent.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 mt-3">
                        Opened {new Date(activeSession.currentPosition.entryTime).toLocaleString()}
                        {' | '}
                        Highest: $
                        {activeSession.currentPosition.highestPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  )}

                  {/* Performance summary */}
                  {activeSession.trades.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                        <div className="text-xs text-slate-400 mb-1">Win Rate</div>
                        <div className="text-2xl font-bold text-blue-400">{winRate}%</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {winningTrades.length}W / {losingTrades.length}L
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <div className="text-xs text-slate-400 mb-1">Best Trade</div>
                        <div className="text-2xl font-bold text-emerald-400">
                          ${bestTrade.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                        <div className="text-xs text-slate-400 mb-1">Worst Trade</div>
                        <div className="text-2xl font-bold text-red-400">
                          ${worstTrade.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <div className="text-xs text-slate-400 mb-1">Avg P&L</div>
                        <div
                          className={`text-2xl font-bold ${
                            activeSession.totalPnl / activeSession.trades.length >= 0
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          }`}
                        >
                          $
                          {(activeSession.totalPnl / activeSession.trades.length).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trade history */}
                  <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                      Trade History
                    </h3>
                    {activeSession.trades.length === 0 ? (
                      <div className="text-sm text-slate-500 text-center py-8">
                        No trades yet. Click &ldquo;Tick&rdquo; to process latest market data.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-slate-700/50">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-800/50 border-b border-slate-700/50">
                              <th className="px-4 py-3 text-left font-semibold text-slate-300">#</th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-300">Entry</th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-300">Exit</th>
                              <th className="px-4 py-3 text-right font-semibold text-slate-300">P&L</th>
                              <th className="px-4 py-3 text-right font-semibold text-slate-300">%</th>
                              <th className="px-4 py-3 text-left font-semibold text-slate-300">Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...activeSession.trades].reverse().map((trade, idx) => (
                              <tr
                                key={idx}
                                className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors"
                              >
                                <td className="px-4 py-3 text-slate-400">
                                  {activeSession.trades.length - idx}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-slate-200 font-mono">${trade.entry.toLocaleString()}</div>
                                  <div className="text-xs text-slate-500">
                                    {new Date(trade.entryTime).toLocaleDateString()}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-slate-200 font-mono">${trade.exit.toLocaleString()}</div>
                                  <div className="text-xs text-slate-500">
                                    {new Date(trade.exitTime).toLocaleDateString()}
                                  </div>
                                </td>
                                <td
                                  className={`px-4 py-3 text-right font-semibold font-mono ${
                                    trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                                  }`}
                                >
                                  {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                                </td>
                                <td
                                  className={`px-4 py-3 text-right font-semibold font-mono ${
                                    trade.pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                                  }`}
                                >
                                  {trade.pnlPercent >= 0 ? '+' : ''}
                                  {trade.pnlPercent.toFixed(2)}%
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      trade.reason === 'signal'
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : trade.reason.includes('stop')
                                          ? 'bg-red-500/20 text-red-400'
                                          : 'bg-slate-600/30 text-slate-400'
                                    }`}
                                  >
                                    {trade.reason}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Risk settings info */}
                  <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>
                        Stop Loss: <span className="text-slate-300">{activeSession.riskSettings.stopLossPercent}%</span>
                      </span>
                      <span>
                        Trailing Stop:{' '}
                        <span className="text-slate-300">{activeSession.riskSettings.trailingStopPercent}%</span>
                      </span>
                      <span>
                        Investment: <span className="text-slate-300">${activeSession.investment.toLocaleString()}</span>
                      </span>
                      {activeSession.lastTickAt && (
                        <span>
                          Last Tick:{' '}
                          <span className="text-slate-300">
                            {new Date(activeSession.lastTickAt).toLocaleTimeString()}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-800/50 mt-12">
          <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-slate-500">
            <p>Market Signals App - Paper Trading Simulator - Educational Purpose</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
