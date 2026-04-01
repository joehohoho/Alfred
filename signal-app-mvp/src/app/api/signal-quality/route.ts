import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import {
  getLearnedPatterns,
  getActionableLosingPatterns,
  getActionableWinningPatterns,
} from '@/services/learning/tradeAnalyzer';

const DATA_DIR = path.join(process.cwd(), 'data');
const PERF_FILE = path.join(DATA_DIR, 'strategy-performance.json');
const QUALITY_LOG_FILE = path.join(DATA_DIR, 'signal-quality-log.json');

interface PerfEntry {
  symbol: string;
  strategy: string;
  days: number;
  pnlPercent: number;
  winRate: number;
  sharpe: number;
  trades: number;
  timestamp: string;
}

interface QualitySnapshot {
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
}

function readPerfData(): PerfEntry[] {
  try {
    if (fs.existsSync(PERF_FILE)) {
      return JSON.parse(fs.readFileSync(PERF_FILE, 'utf-8'));
    }
  } catch { /* */ }
  return [];
}

function readQualityLog(): QualitySnapshot[] {
  try {
    if (fs.existsSync(QUALITY_LOG_FILE)) {
      return JSON.parse(fs.readFileSync(QUALITY_LOG_FILE, 'utf-8'));
    }
  } catch { /* */ }
  return [];
}

function writeQualityLog(log: QualitySnapshot[]): void {
  fs.writeFileSync(QUALITY_LOG_FILE, JSON.stringify(log, null, 2), 'utf-8');
}

/**
 * GET /api/signal-quality?symbol=BTC
 *
 * Returns signal quality trends over time:
 * - Daily snapshots of avg PnL, win rate, profitable run %
 * - Learning system growth (patterns, actionable count)
 * - Overall improvement direction (improving / declining / stable)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = (searchParams.get('symbol') || 'BTC').toUpperCase();

    const perfData = readPerfData();
    const qualityLog = readQualityLog();

    // Group performance data by date
    const byDate = new Map<string, PerfEntry[]>();
    for (const entry of perfData) {
      if (entry.symbol !== symbol) continue;
      const date = entry.timestamp.slice(0, 10);
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(entry);
    }

    // Build snapshots for dates we haven't logged yet
    const loggedDates = new Set(qualityLog.map((s) => s.date));
    const patterns = getLearnedPatterns(symbol);
    const actionableLosing = getActionableLosingPatterns(symbol);
    const actionableWinning = getActionableWinningPatterns(symbol);
    const patternsLearned = patterns
      ? patterns.losingPatterns.length + patterns.winningPatterns.length
      : 0;
    const actionableCount = actionableLosing.length + actionableWinning.length;
    const tradesAnalyzed = patterns?.totalTrades ?? 0;

    for (const [date, entries] of byDate.entries()) {
      if (loggedDates.has(date)) continue;

      const pnls = entries.map((e) => e.pnlPercent);
      const winRates = entries.map((e) => e.winRate);
      const profitable = entries.filter((e) => e.pnlPercent > 0);

      // Find best strategy for this date
      const best = entries.reduce((a, b) => (a.pnlPercent > b.pnlPercent ? a : b));

      const snapshot: QualitySnapshot = {
        date,
        avgPnl: Number((pnls.reduce((a, b) => a + b, 0) / pnls.length).toFixed(2)),
        avgWinRate: Number((winRates.reduce((a, b) => a + b, 0) / winRates.length).toFixed(1)),
        profitableRuns: profitable.length,
        totalRuns: entries.length,
        profitablePercent: Number(((profitable.length / entries.length) * 100).toFixed(1)),
        patternsLearned,
        actionablePatterns: actionableCount,
        tradesAnalyzed,
        bestStrategy: best.strategy,
        bestPnl: best.pnlPercent,
      };

      qualityLog.push(snapshot);
    }

    // Sort by date and persist
    qualityLog.sort((a, b) => a.date.localeCompare(b.date));
    writeQualityLog(qualityLog);

    // Calculate improvement direction
    const recent = qualityLog.slice(-3);
    const older = qualityLog.slice(0, Math.max(1, qualityLog.length - 3));

    const recentAvgPnl = recent.length > 0
      ? recent.reduce((s, r) => s + r.avgPnl, 0) / recent.length : 0;
    const olderAvgPnl = older.length > 0
      ? older.reduce((s, r) => s + r.avgPnl, 0) / older.length : 0;

    const recentProfitable = recent.length > 0
      ? recent.reduce((s, r) => s + r.profitablePercent, 0) / recent.length : 0;
    const olderProfitable = older.length > 0
      ? older.reduce((s, r) => s + r.profitablePercent, 0) / older.length : 0;

    let trend: 'improving' | 'declining' | 'stable' | 'insufficient_data' = 'insufficient_data';
    if (qualityLog.length >= 2) {
      const pnlDelta = recentAvgPnl - olderAvgPnl;
      const profDelta = recentProfitable - olderProfitable;
      if (pnlDelta > 1 || profDelta > 5) trend = 'improving';
      else if (pnlDelta < -1 || profDelta < -5) trend = 'declining';
      else trend = 'stable';
    }

    // Current stats (latest snapshot)
    const latest = qualityLog[qualityLog.length - 1] ?? null;

    return NextResponse.json({
      symbol,
      trend,
      snapshots: qualityLog,
      current: latest ? {
        avgPnl: latest.avgPnl,
        avgWinRate: latest.avgWinRate,
        profitablePercent: latest.profitablePercent,
        bestStrategy: latest.bestStrategy,
        bestPnl: latest.bestPnl,
      } : null,
      learning: {
        patternsLearned,
        actionablePatterns: actionableCount,
        tradesAnalyzed,
        lastUpdated: patterns?.lastUpdated ?? null,
      },
      summary: {
        totalSnapshots: qualityLog.length,
        overallAvgPnl: qualityLog.length > 0
          ? Number((qualityLog.reduce((s, r) => s + r.avgPnl, 0) / qualityLog.length).toFixed(2))
          : 0,
        overallProfitablePercent: qualityLog.length > 0
          ? Number((qualityLog.reduce((s, r) => s + r.profitablePercent, 0) / qualityLog.length).toFixed(1))
          : 0,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to retrieve signal quality: ${message}` },
      { status: 500 },
    );
  }
}
