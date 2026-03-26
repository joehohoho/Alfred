import * as fs from 'fs';
import * as path from 'path';

export interface PerformanceEntry {
  symbol: string;
  strategy: string;
  params: Record<string, number>;
  days: number;
  pnlPercent: number;
  winRate: number;
  sharpe: number;
  trades: number;
  timestamp: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const PERF_FILE = path.join(DATA_DIR, 'strategy-performance.json');
const MAX_PER_STRATEGY = 100;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readPerformance(): PerformanceEntry[] {
  try {
    if (fs.existsSync(PERF_FILE)) {
      const raw = fs.readFileSync(PERF_FILE, 'utf-8');
      return JSON.parse(raw) as PerformanceEntry[];
    }
  } catch {
    // corrupted file — start fresh
  }
  return [];
}

function writePerformance(entries: PerformanceEntry[]) {
  ensureDataDir();
  fs.writeFileSync(PERF_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

/**
 * Track a backtest result for adaptive weights and historical analysis.
 * Keeps last MAX_PER_STRATEGY entries per strategy.
 */
export function trackPerformance(entry: Omit<PerformanceEntry, 'timestamp'>) {
  const entries = readPerformance();

  const newEntry: PerformanceEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  entries.push(newEntry);

  // Prune: keep last MAX_PER_STRATEGY per strategy
  const byStrategy = new Map<string, PerformanceEntry[]>();
  for (const e of entries) {
    const existing = byStrategy.get(e.strategy) || [];
    existing.push(e);
    byStrategy.set(e.strategy, existing);
  }

  const pruned: PerformanceEntry[] = [];
  for (const [, stratEntries] of byStrategy) {
    // Sort by timestamp descending, keep last N
    stratEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    pruned.push(...stratEntries.slice(0, MAX_PER_STRATEGY));
  }

  // Sort final array chronologically
  pruned.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  writePerformance(pruned);
}

/**
 * Read all performance history entries.
 */
export function getPerformanceHistory(): PerformanceEntry[] {
  return readPerformance();
}
