import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { getDataManager } from '@/services/data/DataManager';
import type { Strategy, SignalWithStrength } from '@/services/backtest/engine';
import { SMARSIImprovedStrategy } from '@/services/strategies/smaRsiImproved';
import { MACDStrategy } from '@/services/strategies/macdStrategy';
import { BollingerStrategy } from '@/services/strategies/bollingerStrategy';
import { RSIExtremeStrategy } from '@/services/strategies/rsiExtremeStrategy';
import { TrendFollowingStrategy } from '@/services/strategies/trendFollowingStrategy';
import { filterSignals } from '@/services/strategies/signalFilter';
import {
  analyzeTrades as analyzeTradePatterns,
  getLearnedPatterns,
  mergePatterns,
  savePatterns,
} from '@/services/learning/tradeAnalyzer';
import type { Trade as BacktestTrade } from '@/services/backtest/engine';

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

interface RiskSettings {
  stopLossPercent: number;
  trailingStopPercent: number;
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
  riskSettings: RiskSettings;
}

// ---- Storage ----

const DATA_DIR = path.join(process.cwd(), 'data');
const PAPER_TRADES_FILE = path.join(DATA_DIR, 'paper-trades.json');

function readSessions(): PaperSession[] {
  try {
    if (fs.existsSync(PAPER_TRADES_FILE)) {
      return JSON.parse(fs.readFileSync(PAPER_TRADES_FILE, 'utf-8'));
    }
  } catch {
    // corrupted — start fresh
  }
  return [];
}

function writeSessions(sessions: PaperSession[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(PAPER_TRADES_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
}

function findSession(sessions: PaperSession[], id: string): PaperSession | undefined {
  return sessions.find((s) => s.id === id);
}

// ---- Strategy factory ----

const STRATEGY_MAP: Record<string, () => Strategy> = {
  SMA_RSI_IMPROVED: () => new SMARSIImprovedStrategy(),
  MACD: () => new MACDStrategy(),
  BOLLINGER_BANDS: () => new BollingerStrategy(),
  RSI_EXTREME: () => new RSIExtremeStrategy(),
  TREND_FOLLOWING: () => new TrendFollowingStrategy(),
};

// ---- Helpers ----

function recalcSummary(session: PaperSession) {
  session.totalPnl = session.trades.reduce((sum, t) => sum + t.pnl, 0);
  session.totalPnlPercent =
    session.investment > 0 ? (session.totalPnl / session.investment) * 100 : 0;
  session.totalPnl = Number(session.totalPnl.toFixed(2));
  session.totalPnlPercent = Number(session.totalPnlPercent.toFixed(2));
}

/** Convert PaperTrade[] to BacktestTrade[] for the trade analyzer. */
function toBacktestTrades(trades: PaperTrade[]): BacktestTrade[] {
  return trades.map((t) => ({
    entryPrice: t.entry,
    entryTime: new Date(t.entryTime),
    exitPrice: t.exit,
    exitTime: new Date(t.exitTime),
    quantity: 0, // not needed for pattern analysis
    direction: (t.pnl >= 0 ? 'long' : 'long') as 'long' | 'short', // paper trades are long-only for now
    pnl: t.pnl,
    pnlPercent: t.pnlPercent,
    daysHeld: Math.max(1, Math.ceil(
      (new Date(t.exitTime).getTime() - new Date(t.entryTime).getTime()) / (1000 * 60 * 60 * 24),
    )),
    fee: 0,
    exitReason: t.reason,
  }));
}

/** Learn from paper trades — weighted 2x compared to backtest outcomes. */
async function learnFromPaperTrades(symbol: string, trades: PaperTrade[]): Promise<void> {
  if (trades.length === 0) return;
  try {
    const dataManager = getDataManager();
    const priceSeries = await dataManager.fetch(symbol, 180); // wider window for context
    const btTrades = toBacktestTrades(trades);
    const newPatterns = analyzeTradePatterns(symbol, btTrades, priceSeries);
    const existing = getLearnedPatterns(symbol);
    // Weight = 2 for paper trades (real-time signals are more valuable)
    const merged = existing ? mergePatterns(existing, newPatterns, 2) : newPatterns;
    savePatterns(symbol, merged);
  } catch (err) {
    console.error('[PaperTrade] Trade pattern learning failed (non-fatal):', err);
  }
}

function closePosition(
  session: PaperSession,
  exitPrice: number,
  reason: string,
  exitTime: string,
) {
  const pos = session.currentPosition;
  if (!pos) return;

  const pnl = (exitPrice - pos.entryPrice) * pos.quantity;
  const pnlPercent = ((exitPrice - pos.entryPrice) / pos.entryPrice) * 100;

  session.trades.push({
    entry: Number(pos.entryPrice.toFixed(2)),
    exit: Number(exitPrice.toFixed(2)),
    pnl: Number(pnl.toFixed(2)),
    pnlPercent: Number(pnlPercent.toFixed(2)),
    reason,
    entryTime: pos.entryTime,
    exitTime,
  });

  session.balance += pnl;
  session.balance = Number(session.balance.toFixed(2));
  session.currentPosition = null;

  recalcSummary(session);
}

// ---- Route handler ----

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // Dispatch by action
    switch (action) {
      case 'start':
        return handleStart(body);
      case 'tick':
        return handleTick(body);
      case 'stop':
        return handleStop(body);
      case 'delete':
        return handleDelete(body);
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    const sessions = readSessions();

    if (sessionId) {
      const session = findSession(sessions, sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json(session);
    }

    // List all sessions with summary
    const summaries = sessions.map((s) => ({
      id: s.id,
      symbol: s.symbol,
      strategy: s.strategy,
      status: s.status,
      investment: s.investment,
      balance: s.balance,
      totalPnl: s.totalPnl,
      totalPnlPercent: s.totalPnlPercent,
      tradesCount: s.trades.length,
      hasPosition: s.currentPosition !== null,
      startedAt: s.startedAt,
      lastTickAt: s.lastTickAt,
    }));

    return NextResponse.json({ sessions: summaries });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ---- Action handlers ----

async function handleStart(body: Record<string, unknown>) {
  const {
    symbol,
    strategy: strategyName,
    investment = 10000,
    stopLoss = 8,
    trailingStop = 5,
  } = body;

  if (!symbol || typeof symbol !== 'string') {
    return NextResponse.json({ error: 'Missing required field: symbol' }, { status: 400 });
  }

  const stratKey = (String(strategyName || 'SMA_RSI_IMPROVED')).toUpperCase().replace(/[\s-]/g, '_');
  if (!STRATEGY_MAP[stratKey]) {
    return NextResponse.json(
      { error: `Unknown strategy: ${strategyName}. Available: ${Object.keys(STRATEGY_MAP).join(', ')}` },
      { status: 400 },
    );
  }

  const session: PaperSession = {
    id: `paper_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    symbol: String(symbol).toUpperCase(),
    strategy: stratKey,
    investment: Number(investment),
    balance: Number(investment),
    currentPosition: null,
    trades: [],
    totalPnl: 0,
    totalPnlPercent: 0,
    status: 'active',
    startedAt: new Date().toISOString(),
    lastTickAt: null,
    riskSettings: {
      stopLossPercent: Number(stopLoss) || 8,
      trailingStopPercent: Number(trailingStop) || 5,
    },
  };

  const sessions = readSessions();
  sessions.push(session);
  writeSessions(sessions);

  return NextResponse.json(session, { status: 201 });
}

async function handleTick(body: Record<string, unknown>) {
  const { sessionId } = body;
  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'Missing required field: sessionId' }, { status: 400 });
  }

  const sessions = readSessions();
  const session = findSession(sessions, sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  if (session.status !== 'active') {
    return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
  }

  // Fetch latest price data (90 days for indicator calculation)
  const dataManager = getDataManager();
  const priceSeries = await dataManager.fetch(session.symbol, 90);

  if (priceSeries.points.length === 0) {
    return NextResponse.json({ error: 'No price data available' }, { status: 500 });
  }

  const lastPoint = priceSeries.points[priceSeries.points.length - 1];
  const currentPrice = lastPoint.close;
  const now = new Date().toISOString();
  const newTrades: PaperTrade[] = [];
  const tradesBefore = session.trades.length;

  // Check stop-loss / trailing-stop for open position
  if (session.currentPosition) {
    const pos = session.currentPosition;
    const dayHigh = lastPoint.high ?? currentPrice;
    const dayLow = lastPoint.low ?? currentPrice;

    // Update highest price
    if (dayHigh > pos.highestPrice) {
      pos.highestPrice = dayHigh;
    }

    // Stop-loss
    const stopLossPrice = pos.entryPrice * (1 - session.riskSettings.stopLossPercent / 100);
    if (dayLow <= stopLossPrice) {
      closePosition(session, stopLossPrice, `stop-loss (${session.riskSettings.stopLossPercent}%)`, now);
    }
    // Trailing stop
    else if (pos.highestPrice > 0) {
      const trailPrice = pos.highestPrice * (1 - session.riskSettings.trailingStopPercent / 100);
      if (dayLow <= trailPrice) {
        closePosition(session, trailPrice, `trailing-stop (${session.riskSettings.trailingStopPercent}%)`, now);
      }
    }
  }

  // Generate current signal
  const strategyFactory = STRATEGY_MAP[session.strategy];
  if (strategyFactory) {
    const strategy = strategyFactory();
    const rawSignals = strategy.generateSignals(priceSeries);
    const signals = filterSignals(priceSeries, rawSignals);

    // Look at the most recent signal
    const recentSignals = signals.filter((s) => s.type === 'BUY' || s.type === 'SELL');
    const latestSignal = recentSignals.length > 0 ? recentSignals[recentSignals.length - 1] : null;

    if (latestSignal) {
      if (latestSignal.type === 'BUY' && !session.currentPosition) {
        // Open position
        const quantity = session.balance / currentPrice;
        session.currentPosition = {
          entryPrice: currentPrice,
          quantity,
          entryTime: now,
          highestPrice: currentPrice,
        };
      } else if (latestSignal.type === 'SELL' && session.currentPosition) {
        closePosition(session, currentPrice, 'signal', now);
      }
    }
  }

  session.lastTickAt = now;

  // Collect new trades
  for (let i = tradesBefore; i < session.trades.length; i++) {
    newTrades.push(session.trades[i]);
  }

  // Compute unrealized P&L
  let unrealizedPnl = 0;
  let unrealizedPnlPercent = 0;
  if (session.currentPosition) {
    unrealizedPnl = (currentPrice - session.currentPosition.entryPrice) * session.currentPosition.quantity;
    unrealizedPnlPercent = ((currentPrice - session.currentPosition.entryPrice) / session.currentPosition.entryPrice) * 100;
  }

  writeSessions(sessions);

  // If new trades were completed this tick, learn from them (paper trades weighted 2x)
  if (newTrades.length > 0) {
    await learnFromPaperTrades(session.symbol, newTrades);
  }

  return NextResponse.json({
    session,
    currentPrice: Number(currentPrice.toFixed(2)),
    newTrades,
    unrealizedPnl: Number(unrealizedPnl.toFixed(2)),
    unrealizedPnlPercent: Number(unrealizedPnlPercent.toFixed(2)),
  });
}

async function handleStop(body: Record<string, unknown>) {
  const { sessionId } = body;
  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'Missing required field: sessionId' }, { status: 400 });
  }

  const sessions = readSessions();
  const session = findSession(sessions, sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  if (session.status !== 'active') {
    return NextResponse.json({ error: 'Session is already stopped' }, { status: 400 });
  }

  // Close open position at current price
  if (session.currentPosition) {
    const dataManager = getDataManager();
    try {
      const priceSeries = await dataManager.fetch(session.symbol, 7);
      const lastPoint = priceSeries.points[priceSeries.points.length - 1];
      closePosition(session, lastPoint.close, 'session-stopped', new Date().toISOString());
    } catch {
      // If we can't fetch price, close at entry price (0 P&L)
      closePosition(session, session.currentPosition.entryPrice, 'session-stopped (no price data)', new Date().toISOString());
    }
  }

  session.status = 'stopped';

  // Learn from all trades in this session (paper trades weighted 2x)
  await learnFromPaperTrades(session.symbol, session.trades);

  writeSessions(sessions);

  return NextResponse.json(session);
}

function handleDelete(body: Record<string, unknown>) {
  const { sessionId } = body;
  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'Missing required field: sessionId' }, { status: 400 });
  }

  const sessions = readSessions();
  const session = findSession(sessions, sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  if (session.status === 'active') {
    return NextResponse.json({ error: 'Cannot delete an active session. Stop it first.' }, { status: 400 });
  }

  const idx = sessions.indexOf(session);
  sessions.splice(idx, 1);
  writeSessions(sessions);

  return NextResponse.json({ ok: true, deleted: sessionId });
}
