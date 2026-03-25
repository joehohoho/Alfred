import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const OUTCOMES_FILE = path.join(DATA_DIR, 'signal-outcomes.json');

interface SignalOutcome {
  id: string;
  signalId: string;
  symbol: string;
  signalType: 'BUY' | 'SELL' | 'HOLD';
  entryPrice: number;
  exitPrice?: number;
  outcome?: 'win' | 'loss' | 'pending';
  pnl?: number;
  pnlPercent?: number;
  trackedAt: string;
  closedAt?: string;
  notes?: string;
}

interface OutcomeStore {
  outcomes: SignalOutcome[];
  updatedAt: string;
}

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

async function readOutcomes(): Promise<OutcomeStore> {
  try {
    const raw = await fs.readFile(OUTCOMES_FILE, 'utf-8');
    return JSON.parse(raw) as OutcomeStore;
  } catch {
    return { outcomes: [], updatedAt: new Date().toISOString() };
  }
}

async function writeOutcomes(store: OutcomeStore): Promise<void> {
  await ensureDataDir();
  store.updatedAt = new Date().toISOString();
  await fs.writeFile(OUTCOMES_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

function computeStats(outcomes: SignalOutcome[]) {
  const closed = outcomes.filter((o) => o.outcome === 'win' || o.outcome === 'loss');
  const wins = closed.filter((o) => o.outcome === 'win');
  const losses = closed.filter((o) => o.outcome === 'loss');
  const pending = outcomes.filter((o) => o.outcome === 'pending' || !o.outcome);

  const totalPnL = closed.reduce((sum, o) => sum + (o.pnl ?? 0), 0);
  const avgPnlPercent = closed.length > 0
    ? closed.reduce((sum, o) => sum + (o.pnlPercent ?? 0), 0) / closed.length
    : 0;

  return {
    total: outcomes.length,
    closed: closed.length,
    pending: pending.length,
    wins: wins.length,
    losses: losses.length,
    winRate: closed.length > 0 ? Number(((wins.length / closed.length) * 100).toFixed(1)) : 0,
    totalPnL: Number(totalPnL.toFixed(2)),
    avgPnlPercent: Number(avgPnlPercent.toFixed(2)),
  };
}

/**
 * POST /api/signals/track
 * Track a signal outcome (entry, or close with exit price)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { signalId, symbol, signalType, entryPrice, exitPrice, outcome, notes } = body;

    if (!signalId || !symbol || !signalType || entryPrice == null) {
      return NextResponse.json(
        { error: 'Required fields: signalId, symbol, signalType, entryPrice' },
        { status: 400 }
      );
    }

    const store = await readOutcomes();

    // Check if this signal is already tracked (update it)
    const existingIdx = store.outcomes.findIndex((o) => o.signalId === signalId);

    if (existingIdx >= 0) {
      // Update existing outcome (e.g., closing the position)
      const existing = store.outcomes[existingIdx];
      if (exitPrice != null) {
        existing.exitPrice = Number(exitPrice);
        existing.pnl = Number((exitPrice - existing.entryPrice).toFixed(2));
        existing.pnlPercent = Number(
          (((exitPrice - existing.entryPrice) / existing.entryPrice) * 100).toFixed(2)
        );
        existing.closedAt = new Date().toISOString();

        // Auto-determine outcome if not specified
        existing.outcome = outcome ?? (existing.pnl > 0 ? 'win' : 'loss');
      }
      if (notes) existing.notes = notes;

      store.outcomes[existingIdx] = existing;
      await writeOutcomes(store);

      return NextResponse.json({
        status: 'updated',
        outcome: existing,
        stats: computeStats(store.outcomes),
      });
    }

    // Create new tracked outcome
    const newOutcome: SignalOutcome = {
      id: `track_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      signalId,
      symbol: symbol.toUpperCase(),
      signalType,
      entryPrice: Number(entryPrice),
      exitPrice: exitPrice != null ? Number(exitPrice) : undefined,
      outcome: outcome ?? (exitPrice != null
        ? (exitPrice > entryPrice ? 'win' : 'loss')
        : 'pending'),
      trackedAt: new Date().toISOString(),
      notes,
    };

    // Compute PnL if exit price provided
    if (newOutcome.exitPrice != null) {
      newOutcome.pnl = Number((newOutcome.exitPrice - newOutcome.entryPrice).toFixed(2));
      newOutcome.pnlPercent = Number(
        (((newOutcome.exitPrice - newOutcome.entryPrice) / newOutcome.entryPrice) * 100).toFixed(2)
      );
      newOutcome.closedAt = new Date().toISOString();
    }

    store.outcomes.push(newOutcome);
    await writeOutcomes(store);

    // Optionally insert into DB if available
    try {
      if (process.env.DATABASE_URL) {
        const { default: pool } = await import('@/services/db/client');
        await pool.query(
          `INSERT INTO signal_outcomes (id, signal_id, symbol, signal_type, entry_price, exit_price, outcome, pnl, pnl_percent, tracked_at, closed_at, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (signal_id) DO UPDATE SET
             exit_price = EXCLUDED.exit_price,
             outcome = EXCLUDED.outcome,
             pnl = EXCLUDED.pnl,
             pnl_percent = EXCLUDED.pnl_percent,
             closed_at = EXCLUDED.closed_at,
             notes = EXCLUDED.notes`,
          [
            newOutcome.id,
            newOutcome.signalId,
            newOutcome.symbol,
            newOutcome.signalType,
            newOutcome.entryPrice,
            newOutcome.exitPrice ?? null,
            newOutcome.outcome,
            newOutcome.pnl ?? null,
            newOutcome.pnlPercent ?? null,
            newOutcome.trackedAt,
            newOutcome.closedAt ?? null,
            newOutcome.notes ?? null,
          ]
        );
      }
    } catch {
      // DB insert is best-effort; JSON file is the primary store
    }

    return NextResponse.json({
      status: 'created',
      outcome: newOutcome,
      stats: computeStats(store.outcomes),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/signals/track
 * Returns all tracked outcomes with win/loss stats
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    const store = await readOutcomes();
    let outcomes = store.outcomes;

    // Filter by symbol if provided
    if (symbol) {
      outcomes = outcomes.filter((o) => o.symbol === symbol.toUpperCase());
    }

    // Sort by most recent first
    outcomes.sort((a, b) => new Date(b.trackedAt).getTime() - new Date(a.trackedAt).getTime());

    return NextResponse.json({
      outcomes,
      stats: computeStats(outcomes),
      updatedAt: store.updatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
