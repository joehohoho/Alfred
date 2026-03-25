import { NextResponse } from 'next/server';
import { getDataManager } from '@/services/data/DataManager';
import { StrategyRegistry } from '@/services/strategies/strategyRegistry';

const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA'];
const STOCK_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN'];

interface SignalSummary {
  symbol: string;
  assetType: 'crypto' | 'stock';
  signalType: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  rationale: string;
  generatedAt: string;
  strategy: string;
  votes?: Array<{ strategy: string; vote: string; strength: number }>;
}

async function generateSignalForSymbol(symbol: string): Promise<SignalSummary | null> {
  try {
    const dataManager = getDataManager();
    const priceSeries = await dataManager.fetch(symbol, 90);

    const registry = new StrategyRegistry();
    const ensemble = registry.generateEnsembleSignal(priceSeries);

    const isCrypto = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'BNB', 'DOGE', 'LINK', 'LTC'].includes(symbol);

    // Build a human-readable rationale from the votes
    const buyVotes = ensemble.strategyVotes.filter((v) => v.vote === 'BUY');
    const sellVotes = ensemble.strategyVotes.filter((v) => v.vote === 'SELL');
    let rationale: string;

    if (ensemble.type === 'BUY') {
      rationale = `Bullish consensus from ${buyVotes.length} strategies (${buyVotes.map((v) => v.strategy.replace(/_/g, ' ')).join(', ')}). Confidence ${(ensemble.strength * 100).toFixed(0)}%.`;
    } else if (ensemble.type === 'SELL') {
      rationale = `Bearish consensus from ${sellVotes.length} strategies (${sellVotes.map((v) => v.strategy.replace(/_/g, ' ')).join(', ')}). Confidence ${(ensemble.strength * 100).toFixed(0)}%.`;
    } else {
      rationale = `Mixed signals. ${buyVotes.length} bullish vs ${sellVotes.length} bearish. No clear directional bias.`;
    }

    return {
      symbol,
      assetType: isCrypto ? 'crypto' : 'stock',
      signalType: ensemble.type,
      confidence: Number(ensemble.strength.toFixed(2)),
      price: ensemble.price,
      rationale,
      generatedAt: ensemble.time instanceof Date ? ensemble.time.toISOString() : new Date(ensemble.time).toISOString(),
      strategy: 'ENSEMBLE',
      votes: ensemble.strategyVotes,
    };
  } catch (error) {
    console.error(`[Signals] Failed to generate signal for ${symbol}:`, error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolParam = searchParams.get('symbol');
    const gridMode = searchParams.get('grid') === 'true';
    const days = Math.min(Number(searchParams.get('days') || 90), 365);

    // Grid mode: return signals for all tracked symbols
    if (gridMode) {
      const allSymbols = [...CRYPTO_SYMBOLS, ...STOCK_SYMBOLS];
      const results = await Promise.allSettled(
        allSymbols.map((sym) => generateSignalForSymbol(sym))
      );

      const signals: SignalSummary[] = [];
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          signals.push(result.value);
        }
      }

      return NextResponse.json({
        signals,
        refreshedAt: new Date().toISOString(),
      });
    }

    // Single symbol mode (original behavior)
    const symbol = (symbolParam || 'BTC').toUpperCase();
    const dataManager = getDataManager();
    const priceSeries = await dataManager.fetch(symbol, days);

    const registry = new StrategyRegistry();
    const ensembleSignal = registry.generateEnsembleSignal(priceSeries);

    const strategyDetails = registry.getAllConfigs().map((config) => ({
      name: config.name,
      weight: config.weight,
      enabled: config.enabled,
    }));

    return NextResponse.json({
      symbol,
      days,
      dataPoints: priceSeries.points.length,
      source: priceSeries.source || 'unknown',
      ensemble: {
        type: ensembleSignal.type,
        strength: ensembleSignal.strength,
        price: ensembleSignal.price,
        time: ensembleSignal.time,
        sourceStrategies: ensembleSignal.sourceStrategies,
        votes: ensembleSignal.strategyVotes,
      },
      strategies: strategyDetails,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to generate signals: ${message}` },
      { status: 500 }
    );
  }
}
