import { NextResponse } from 'next/server';
import { getDataManager } from '@/services/data/DataManager';
import { StrategyRegistry } from '@/services/strategies/strategyRegistry';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = (searchParams.get('symbol') || 'BTC').toUpperCase();
    const days = Math.min(Number(searchParams.get('days') || 90), 365);

    // Fetch real price data
    const dataManager = getDataManager();
    const priceSeries = await dataManager.fetch(symbol, days);

    // Run ensemble strategy to generate signals
    const registry = new StrategyRegistry();
    const ensembleSignal = registry.generateEnsembleSignal(priceSeries);

    // Get individual strategy config details
    const strategyDetails = registry.getAllConfigs().map(config => ({
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
