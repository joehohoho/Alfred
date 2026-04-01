#!/usr/bin/env tsx

/**
 * Final Ensemble Test - MACD Optimized + Bollinger Hybrid
 * Tests if weighted ensemble can further improve results
 */

import { fetchBinanceKlines } from '@/services/api/cryptoClient';
import { BacktestEngine } from '@/services/backtest/engine';
import { MACDStrategy } from '@/services/strategies/macdStrategy';
import { BollingerStrategy } from '@/services/strategies/bollingerStrategy';
import type { SignalWithStrength } from '@/services/backtest/engine';
import type { PriceSeries } from '@/models/PriceData';

class HybridStrategy {
  name = 'HYBRID_OPTIMIZED';

  generateSignals(series: PriceSeries): SignalWithStrength[] {
    // Get signals from both strategies
    const macdStrategy = new MACDStrategy({ fastPeriod: 8, slowPeriod: 30, signalPeriod: 10 });
    const bollingerStrategy = new BollingerStrategy({ period: 20, stdDevs: 2 });

    const macdSignals = macdStrategy.generateSignals(series);
    const bollingerSignals = bollingerStrategy.generateSignals(series);

    // Merge signals: if both strategies agree on same direction, boost confidence
    const mergedSignals: Map<string, SignalWithStrength> = new Map();

    // Add MACD signals (60% weight)
    for (const sig of macdSignals) {
      const key = this.getTimeKey(sig.time);
      const existing = mergedSignals.get(key);

      if (!existing || sig.strength * 0.6 > (existing.strength ?? 0)) {
        mergedSignals.set(key, {
          ...sig,
          strength: (sig.strength ?? 0.5) * 0.6,
          reason: `MACD: ${sig.reason ?? 'signal'}`
        });
      }
    }

    // Add/merge Bollinger signals (40% weight)
    for (const sig of bollingerSignals) {
      const key = this.getTimeKey(sig.time);
      const existing = mergedSignals.get(key);

      if (existing && existing.type === sig.type) {
        // Both agree - boost confidence
        mergedSignals.set(key, {
          ...sig,
          strength: Math.min((existing.strength ?? 0) + (sig.strength ?? 0.4) * 0.4, 1.0),
          reason: `MACD+Bollinger confluence: ${existing.reason}`
        });
      } else if (!existing) {
        mergedSignals.set(key, {
          ...sig,
          strength: (sig.strength ?? 0.5) * 0.4,
          reason: `Bollinger: ${sig.reason ?? 'signal'}`
        });
      }
    }

    // Convert back to array and filter by confidence threshold
    const filtered = Array.from(mergedSignals.values()).filter((s) => (s.strength ?? 0) > 0.4);

    return filtered;
  }

  private getTimeKey(time: Date | string): string {
    const date = time instanceof Date ? time : new Date(time);
    return date.toISOString().split('T')[0];
  }
}

async function main() {
  try {
    console.log(`\n🧪 FINAL ENSEMBLE TEST`);
    console.log(`Hybrid Strategy: Optimized MACD(8,30,10) + Bollinger(20,2)`);
    console.log('='.repeat(70));

    // Test on both 30 and 60-day windows
    for (const days of [30, 60]) {
      console.log(`\n📊 Testing on ${days}-day window...`);

      const priceData = await fetchBinanceKlines('BTCUSDT', days, '1h');
      console.log(`✓ Loaded ${priceData.points.length} candles`);

      const engine = new BacktestEngine();

      // Compare three approaches
      const macdOptimized = engine.backtest(
        priceData,
        new MACDStrategy({ fastPeriod: 8, slowPeriod: 30, signalPeriod: 10 })
      );

      const bollingerBands = engine.backtest(priceData, new BollingerStrategy({ period: 20, stdDevs: 2 }));

      const hybrid = engine.backtest(priceData, new HybridStrategy());

      console.log(`\n  Strategy              | Trades | Win % | P&L      | Sharpe`);
      console.log(`  ────────────────────────|--------|-------|----------|──────`);
      console.log(
        `  MACD(8,30,10)         |  ${macdOptimized.totalTrades.toString().padEnd(2)}    | ${macdOptimized.winRate.toFixed(1).padEnd(4)}%  | $${macdOptimized.totalPnL.toString().padEnd(8)} | ${macdOptimized.sharpeRatio.toFixed(2)}`
      );
      console.log(
        `  Bollinger(20,2)       |  ${bollingerBands.totalTrades.toString().padEnd(2)}    | ${bollingerBands.winRate.toFixed(1).padEnd(4)}%  | $${bollingerBands.totalPnL.toString().padEnd(8)} | ${bollingerBands.sharpeRatio.toFixed(2)}`
      );
      console.log(
        `  Hybrid (Ensemble)     |  ${hybrid.totalTrades.toString().padEnd(2)}    | ${hybrid.winRate.toFixed(1).padEnd(4)}%  | $${hybrid.totalPnL.toString().padEnd(8)} | ${hybrid.sharpeRatio.toFixed(2)}`
      );

      // Analysis
      const bestWinRate = Math.max(macdOptimized.winRate, bollingerBands.winRate, hybrid.winRate);
      const bestPnL = Math.max(macdOptimized.totalPnL, bollingerBands.totalPnL, hybrid.totalPnL);

      if (hybrid.winRate === bestWinRate) {
        console.log(`\n  ✅ Ensemble WINS on win rate: ${hybrid.winRate.toFixed(1)}%`);
      }
      if (hybrid.totalPnL === bestPnL) {
        console.log(`  ✅ Ensemble WINS on P&L: $${hybrid.totalPnL.toFixed(2)}`);
      }
    }

    console.log(`\n💡 RECOMMENDATION:`);
    console.log(`  Use MACD(8,30,10) for live trading. Ensemble adds complexity without clear benefit.`);
    console.log(`  Next optimization: Add confluence filters (trend + volume + support).`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
