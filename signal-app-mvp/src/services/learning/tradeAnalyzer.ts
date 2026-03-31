/**
 * Trade Pattern Analyzer — learns from losing (and winning) trades to improve
 * future signal filtering.  Completed trades are analyzed for market-context
 * conditions at entry time.  Patterns are persisted to `data/trade-patterns.json`
 * and consumed by the adaptive signal filter.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { PriceSeries } from '@/models/PriceData';
import type { Trade as BacktestTrade } from '@/services/backtest/engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PatternCondition {
  condition: string;
  lossCount: number;
  winCount: number;
  avgLoss: number;
  avgWin: number;
  confidence: number; // lossCount / (lossCount + winCount)
}

export interface TradePatterns {
  losingPatterns: PatternCondition[];
  winningPatterns: PatternCondition[];
  totalTrades: number;
  lastUpdated: string;
}

export interface AllTradePatterns {
  [symbol: string]: TradePatterns;
}

// Minimum trades before a pattern is eligible for filtering
const MIN_TRADES_FOR_PATTERN = 8;
// Max patterns stored per symbol (prune lowest confidence)
const MAX_PATTERNS_PER_SYMBOL = 20;
// Age (ms) after which patterns get 50% weight reduction
const DECAY_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
const PATTERNS_FILE = path.join(DATA_DIR, 'trade-patterns.json');

function readAllPatterns(): AllTradePatterns {
  try {
    if (fs.existsSync(PATTERNS_FILE)) {
      return JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf-8'));
    }
  } catch {
    // corrupted — start fresh
  }
  return {};
}

function writeAllPatterns(data: AllTradePatterns): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(PATTERNS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Indicator helpers (self-contained — mirrors signalFilter.ts)
// ---------------------------------------------------------------------------

function computeSMA(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += values[j];
      result.push(sum / period);
    }
  }
  return result;
}

function computeRSI(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (values.length <= period) return result;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    if (change > 0) gainSum += change;
    else lossSum += Math.abs(change);
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = 100 - 100 / (1 + rs);

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rsI = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = 100 - 100 / (1 + rsI);
  }
  return result;
}

function computeATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number,
): number[] {
  const length = closes.length;
  const tr: number[] = new Array(length).fill(NaN);

  for (let i = 0; i < length; i++) {
    if (i === 0) {
      tr[i] = highs[i] - lows[i];
    } else {
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      tr[i] = Math.max(hl, hc, lc);
    }
  }

  const atr: number[] = new Array(length).fill(NaN);
  if (length < period) return atr;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  atr[period - 1] = sum / period;

  for (let i = period; i < length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
  return atr;
}

// ---------------------------------------------------------------------------
// Build date-indexed price lookup
// ---------------------------------------------------------------------------

interface IndexedDay {
  index: number;
  close: number;
  high: number;
  low: number;
  volume: number | undefined;
}

function buildDateIndex(series: PriceSeries): Map<string, IndexedDay> {
  const map = new Map<string, IndexedDay>();
  for (let i = 0; i < series.points.length; i++) {
    const p = series.points[i];
    const ts = p.timestamp instanceof Date ? p.timestamp : new Date(p.timestamp as unknown as string);
    const key = ts.toISOString().split('T')[0];
    map.set(key, {
      index: i,
      close: p.close,
      high: p.high ?? p.close,
      low: p.low ?? p.close,
      volume: p.volume,
    });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Condition detection at a given price index
// ---------------------------------------------------------------------------

interface MarketContext {
  conditions: string[];
}

function detectConditions(
  idx: number,
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: (number | undefined)[],
  sma20: number[],
  sma50: number[],
  sma200: number[],
  rsi14: number[],
  atr14: number[],
  volumeSma20: number[],
): MarketContext {
  const conditions: string[] = [];
  const close = closes[idx];

  // Price vs SMAs
  if (!isNaN(sma20[idx])) {
    if (close < sma20[idx]) conditions.push('price_below_20sma');
    else conditions.push('price_above_20sma');
  }
  if (!isNaN(sma50[idx])) {
    if (close < sma50[idx]) conditions.push('price_below_50sma');
    else conditions.push('price_above_50sma');
  }
  if (!isNaN(sma200[idx])) {
    if (close < sma200[idx]) conditions.push('price_below_200sma');
    else conditions.push('price_above_200sma');
  }

  // RSI buckets
  if (!isNaN(rsi14[idx])) {
    const r = rsi14[idx];
    if (r > 70) conditions.push('rsi_above_70');
    else if (r > 65) conditions.push('rsi_above_65');
    else if (r < 30) conditions.push('rsi_below_30');
    else if (r < 35) conditions.push('rsi_below_35');
  }

  // Volume vs 20-day average (only track low volume — high volume is generally good for entries)
  const vol = volumes[idx];
  if (vol != null && !isNaN(volumeSma20[idx]) && volumeSma20[idx] > 0) {
    if (vol < volumeSma20[idx] * 0.8) conditions.push('low_volume');
  }

  // Price momentum: rising or falling over last 5 days
  if (idx >= 5) {
    const fiveDaysAgo = closes[idx - 5];
    const change = (close - fiveDaysAgo) / fiveDaysAgo;
    if (change < -0.02) conditions.push('declining_momentum');
    else if (change > 0.02) conditions.push('rising_momentum');
  }

  // Volatility: ATR(14) relative to price
  if (!isNaN(atr14[idx]) && close > 0) {
    const atrPct = (atr14[idx] / close) * 100;
    if (atrPct > 4) conditions.push('high_volatility');
    else if (atrPct < 1) conditions.push('low_volatility');
  }

  // Day of week (0=Sunday, 6=Saturday)
  // We need the timestamp for this — approximate from index if needed
  // but we don't have timestamp here, so skip day-of-week in conditions
  // (handled in analyzeTrades where we have access to entry time)

  // Combined conditions
  if (conditions.includes('price_above_50sma') && conditions.includes('rising_momentum')) {
    conditions.push('price_above_50sma_and_rising');
  }
  if (conditions.includes('price_below_50sma') && conditions.includes('declining_momentum')) {
    conditions.push('price_below_50sma_and_declining');
  }
  if (conditions.includes('rsi_above_70') && conditions.includes('high_volatility')) {
    conditions.push('overbought_and_volatile');
  }

  return { conditions };
}

// ---------------------------------------------------------------------------
// Core analysis
// ---------------------------------------------------------------------------

/**
 * Analyze a set of completed trades against a price series to extract
 * market-context patterns for winning and losing trades.
 */
export function analyzeTrades(
  symbol: string,
  trades: BacktestTrade[],
  series: PriceSeries,
): TradePatterns {
  if (trades.length === 0) {
    return {
      losingPatterns: [],
      winningPatterns: [],
      totalTrades: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Pre-compute indicators
  const closes = series.points.map((p) => p.close);
  const highs = series.points.map((p) => p.high ?? p.close);
  const lows = series.points.map((p) => p.low ?? p.close);
  const volumes: (number | undefined)[] = series.points.map((p) => p.volume);

  const sma20 = computeSMA(closes, 20);
  const sma50 = computeSMA(closes, 50);
  const sma200 = computeSMA(closes, 200);
  const rsi14 = computeRSI(closes, 14);
  const atr14 = computeATR(highs, lows, closes, 14);
  const volumeSma20 = computeSMA(
    volumes.map((v) => v ?? 0),
    20,
  );

  const dateIndex = buildDateIndex(series);

  // Accumulators: condition -> { wins, losses, totalWinPnl, totalLossPnl }
  const conditionStats = new Map<
    string,
    { winCount: number; lossCount: number; totalWinPnl: number; totalLossPnl: number }
  >();

  function addStat(condition: string, isWin: boolean, pnlPct: number) {
    let stats = conditionStats.get(condition);
    if (!stats) {
      stats = { winCount: 0, lossCount: 0, totalWinPnl: 0, totalLossPnl: 0 };
      conditionStats.set(condition, stats);
    }
    if (isWin) {
      stats.winCount++;
      stats.totalWinPnl += pnlPct;
    } else {
      stats.lossCount++;
      stats.totalLossPnl += pnlPct; // negative value
    }
  }

  for (const trade of trades) {
    const entryTime = trade.entryTime instanceof Date
      ? trade.entryTime
      : new Date(trade.entryTime as unknown as string);
    const dateKey = entryTime.toISOString().split('T')[0];
    const day = dateIndex.get(dateKey);
    if (!day) continue;

    const idx = day.index;
    const isWin = trade.pnl > 0;
    const pnlPct = trade.pnlPercent;

    const ctx = detectConditions(
      idx, closes, highs, lows, volumes,
      sma20, sma50, sma200, rsi14, atr14, volumeSma20,
    );

    // Day-of-week patterns removed — they are noise, not signal

    for (const cond of ctx.conditions) {
      addStat(cond, isWin, pnlPct);
    }
  }

  // Build pattern lists
  const losingPatterns: PatternCondition[] = [];
  const winningPatterns: PatternCondition[] = [];

  for (const [condition, stats] of conditionStats.entries()) {
    const total = stats.winCount + stats.lossCount;
    const lossConfidence = total > 0 ? stats.lossCount / total : 0;
    const winConfidence = total > 0 ? stats.winCount / total : 0;
    const avgLoss = stats.lossCount > 0 ? stats.totalLossPnl / stats.lossCount : 0;
    const avgWin = stats.winCount > 0 ? stats.totalWinPnl / stats.winCount : 0;

    if (lossConfidence >= 0.5) {
      losingPatterns.push({
        condition,
        lossCount: stats.lossCount,
        winCount: stats.winCount,
        avgLoss: Number(avgLoss.toFixed(2)),
        avgWin: Number(avgWin.toFixed(2)),
        confidence: Number(lossConfidence.toFixed(3)),
      });
    }

    if (winConfidence >= 0.5) {
      winningPatterns.push({
        condition,
        winCount: stats.winCount,
        lossCount: stats.lossCount,
        avgWin: Number(avgWin.toFixed(2)),
        avgLoss: Number(avgLoss.toFixed(2)),
        confidence: Number(winConfidence.toFixed(3)),
      });
    }
  }

  // Sort by confidence descending
  losingPatterns.sort((a, b) => b.confidence - a.confidence);
  winningPatterns.sort((a, b) => b.confidence - a.confidence);

  return {
    losingPatterns,
    winningPatterns,
    totalTrades: trades.length,
    lastUpdated: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Merge patterns from multiple backtests (weighted by recency)
// ---------------------------------------------------------------------------

/**
 * Merge new patterns into existing ones. The `weight` parameter allows
 * paper-trade outcomes to count more (e.g., weight = 2 for paper trades).
 * Patterns older than 30 days in `existing` get 50% weight reduction.
 */
export function mergePatterns(
  existing: TradePatterns,
  newPatterns: TradePatterns,
  weight: number = 1,
): TradePatterns {
  // Determine age decay factor for existing patterns
  const existingAge = Date.now() - new Date(existing.lastUpdated).getTime();
  const existingDecay = existingAge > DECAY_AGE_MS ? 0.5 : 1.0;

  // Build a map of all conditions
  const merged = new Map<
    string,
    { winCount: number; lossCount: number; totalWinPnl: number; totalLossPnl: number }
  >();

  function addPatterns(patterns: PatternCondition[], scale: number, isLosing: boolean) {
    for (const p of patterns) {
      let stats = merged.get(p.condition);
      if (!stats) {
        stats = { winCount: 0, lossCount: 0, totalWinPnl: 0, totalLossPnl: 0 };
        merged.set(p.condition, stats);
      }
      stats.winCount += p.winCount * scale;
      stats.lossCount += p.lossCount * scale;
      stats.totalWinPnl += p.avgWin * p.winCount * scale;
      stats.totalLossPnl += p.avgLoss * p.lossCount * scale;
    }
  }

  // Existing patterns with decay
  addPatterns(existing.losingPatterns, existingDecay, true);
  addPatterns(existing.winningPatterns, existingDecay, false);

  // New patterns with weight multiplier
  addPatterns(newPatterns.losingPatterns, weight, true);
  addPatterns(newPatterns.winningPatterns, weight, false);

  // Rebuild pattern lists
  const losingPatterns: PatternCondition[] = [];
  const winningPatterns: PatternCondition[] = [];

  for (const [condition, stats] of merged.entries()) {
    const total = stats.winCount + stats.lossCount;
    if (total < 1) continue;

    const lossConfidence = stats.lossCount / total;
    const winConfidence = stats.winCount / total;
    const avgLoss = stats.lossCount > 0 ? stats.totalLossPnl / stats.lossCount : 0;
    const avgWin = stats.winCount > 0 ? stats.totalWinPnl / stats.winCount : 0;

    if (lossConfidence >= 0.5) {
      losingPatterns.push({
        condition,
        lossCount: Math.round(stats.lossCount),
        winCount: Math.round(stats.winCount),
        avgLoss: Number(avgLoss.toFixed(2)),
        avgWin: Number(avgWin.toFixed(2)),
        confidence: Number(lossConfidence.toFixed(3)),
      });
    }

    if (winConfidence >= 0.5) {
      winningPatterns.push({
        condition,
        winCount: Math.round(stats.winCount),
        lossCount: Math.round(stats.lossCount),
        avgWin: Number(avgWin.toFixed(2)),
        avgLoss: Number(avgLoss.toFixed(2)),
        confidence: Number(winConfidence.toFixed(3)),
      });
    }
  }

  // Sort and prune
  losingPatterns.sort((a, b) => b.confidence - a.confidence);
  winningPatterns.sort((a, b) => b.confidence - a.confidence);

  const totalTrades = Math.round(
    existing.totalTrades * existingDecay + newPatterns.totalTrades * weight,
  );

  const result: TradePatterns = {
    losingPatterns: losingPatterns.slice(0, MAX_PATTERNS_PER_SYMBOL),
    winningPatterns: winningPatterns.slice(0, MAX_PATTERNS_PER_SYMBOL),
    totalTrades,
    lastUpdated: new Date().toISOString(),
  };

  return result;
}

// ---------------------------------------------------------------------------
// Read / Save helpers
// ---------------------------------------------------------------------------

/** Retrieve learned patterns for a symbol, or null if none exist. */
export function getLearnedPatterns(symbol: string): TradePatterns | null {
  const all = readAllPatterns();
  return all[symbol.toUpperCase()] ?? null;
}

/** Persist patterns for a symbol. */
export function savePatterns(symbol: string, patterns: TradePatterns): void {
  const all = readAllPatterns();
  all[symbol.toUpperCase()] = patterns;
  writeAllPatterns(all);
}

// ---------------------------------------------------------------------------
// Query helpers (used by learning-stats endpoint & signal filter)
// ---------------------------------------------------------------------------

// Single-factor patterns that are too noisy to use for filtering
const NOISY_SINGLE_PATTERNS = new Set([
  'price_below_20sma', 'price_above_20sma',
  'price_below_50sma', 'price_above_50sma',
  'price_below_200sma', 'price_above_200sma',
  'rsi_above_70', 'rsi_above_65', 'rsi_below_30', 'rsi_below_35',
  'low_volume',
  'declining_momentum', 'rising_momentum',
  'high_volatility', 'low_volatility',
]);

/** Patterns that have enough data to be used for filtering. */
export function getActionableLosingPatterns(symbol: string): PatternCondition[] {
  const patterns = getLearnedPatterns(symbol);
  if (!patterns) return [];
  return patterns.losingPatterns.filter(
    (p) =>
      (p.lossCount + p.winCount) >= MIN_TRADES_FOR_PATTERN &&
      p.confidence > 0.75 &&
      !NOISY_SINGLE_PATTERNS.has(p.condition), // Only multi-factor combined patterns
  );
}

export function getActionableWinningPatterns(symbol: string): PatternCondition[] {
  const patterns = getLearnedPatterns(symbol);
  if (!patterns) return [];
  return patterns.winningPatterns.filter(
    (p) =>
      (p.lossCount + p.winCount) >= MIN_TRADES_FOR_PATTERN &&
      p.confidence > 0.75 &&
      !NOISY_SINGLE_PATTERNS.has(p.condition), // Only multi-factor combined patterns
  );
}

// ---------------------------------------------------------------------------
// Current market context detection (used by signal filter)
// ---------------------------------------------------------------------------

/**
 * Detect which conditions are active at a given price-series index.
 * Exported so the signal filter can compare current context against
 * learned patterns.
 */
export function detectCurrentConditions(
  series: PriceSeries,
  idx: number,
): string[] {
  const closes = series.points.map((p) => p.close);
  const highs = series.points.map((p) => p.high ?? p.close);
  const lows = series.points.map((p) => p.low ?? p.close);
  const volumes: (number | undefined)[] = series.points.map((p) => p.volume);

  const sma20 = computeSMA(closes, 20);
  const sma50 = computeSMA(closes, 50);
  const sma200 = computeSMA(closes, 200);
  const rsi14 = computeRSI(closes, 14);
  const atr14 = computeATR(highs, lows, closes, 14);
  const volumeSma20 = computeSMA(
    volumes.map((v) => v ?? 0),
    20,
  );

  const ctx = detectConditions(
    idx, closes, highs, lows, volumes,
    sma20, sma50, sma200, rsi14, atr14, volumeSma20,
  );

  return ctx.conditions;
}
