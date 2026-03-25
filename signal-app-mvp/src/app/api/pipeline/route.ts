import { NextResponse } from 'next/server';
import { getDataManager } from '@/services/data/DataManager';
import { StrategyRegistry } from '@/services/strategies/strategyRegistry';
import { AssetRegistry } from '@/services/data/assetRegistry';

export async function POST(request: Request) {
  try {
    let symbols: string[] | undefined;

    try {
      const body = await request.json();
      symbols = body.symbols;
    } catch {
      // Empty body is fine — use defaults
    }

    // Default to top 5 crypto assets from registry
    if (!symbols || symbols.length === 0) {
      symbols = AssetRegistry.getCryptoAssets()
        .slice(0, 5)
        .map(a => a.symbol);
    }

    const dataManager = getDataManager();
    const registry = new StrategyRegistry();

    const results: Array<{
      symbol: string;
      signal: {
        type: string;
        strength: number;
        price: number;
        time: Date;
        votes: Array<{ strategy: string; vote: string; strength: number }>;
      };
      error?: string;
    }> = [];

    for (const symbol of symbols) {
      try {
        const priceSeries = await dataManager.fetch(symbol.toUpperCase(), 90);
        const ensembleSignal = registry.generateEnsembleSignal(priceSeries);

        results.push({
          symbol: symbol.toUpperCase(),
          signal: {
            type: ensembleSignal.type,
            strength: ensembleSignal.strength,
            price: ensembleSignal.price,
            time: ensembleSignal.time,
            votes: ensembleSignal.strategyVotes,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          symbol: symbol.toUpperCase(),
          signal: { type: 'ERROR', strength: 0, price: 0, time: new Date(), votes: [] },
          error: message,
        });
      }
    }

    // Optionally insert into DB if configured
    if (process.env.DATABASE_URL) {
      try {
        const { insertSignal } = await import('@/services/db/repositories');
        for (const r of results) {
          if (r.error) continue;
          await insertSignal({
            symbol: r.symbol,
            assetType: 'crypto',
            signalType: r.signal.type as 'BUY' | 'SELL' | 'HOLD',
            strategy: 'SMA_RSI_BASELINE',
            shortSma: 0,
            longSma: 0,
            rsi: 0,
            price: r.signal.price,
            confidence: r.signal.strength,
            rationale: `Ensemble signal from ${r.signal.votes.map(v => v.strategy).join(', ')}`,
            generatedAt: new Date(),
          });
        }
      } catch (dbError) {
        console.error('[Pipeline] DB insert failed (non-fatal):', dbError);
      }
    }

    const successful = results.filter(r => !r.error);

    return NextResponse.json({
      ok: true,
      count: successful.length,
      total: symbols.length,
      signals: results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { ok: false, error: `Pipeline failed: ${message}` },
      { status: 500 }
    );
  }
}
