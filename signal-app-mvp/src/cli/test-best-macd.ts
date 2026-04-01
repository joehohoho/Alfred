#!/usr/bin/env tsx

import { fetchBinanceKlines } from '@/services/api/cryptoClient';
import { BacktestEngine } from '@/services/backtest/engine';
import { MACDStrategy } from '@/services/strategies/macdStrategy';

async function main() {
  try {
    console.log(`\n✅ FINAL VALIDATION: Best MACD Parameters`);
    console.log('='.repeat(70));

    // Test multiple windows to ensure robustness
    for (const days of [30, 60, 90]) {
      console.log(`\n📊 Testing on ${days}-day window...`);
      
      const priceData = await fetchBinanceKlines('BTCUSDT', days, '1h');
      console.log(`✓ Loaded ${priceData.points.length} candles`);

      const engine = new BacktestEngine();

      // Original MACD
      const original = engine.backtest(priceData, new MACDStrategy({ fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }));
      
      // Best variant 1: MACD(8,26,8)
      const improved1 = engine.backtest(priceData, new MACDStrategy({ fastPeriod: 8, slowPeriod: 26, signalPeriod: 8 }));
      
      // Best variant 2: MACD(8,30,10)
      const improved2 = engine.backtest(priceData, new MACDStrategy({ fastPeriod: 8, slowPeriod: 30, signalPeriod: 10 }));

      console.log(`\n  Trades  Win Rate  P&L       Sharpe`);
      console.log(`  ──────  ────────  ────────  ──────`);
      console.log(`Original:  ${original.totalTrades.toString().padEnd(2)}      ${original.winRate.toFixed(1).padEnd(3)}%   $${original.totalPnL.toString().padEnd(8)} ${original.sharpeRatio.toFixed(2)}`);
      console.log(`Best(8,26,8): ${improved1.totalTrades.toString().padEnd(2)}      ${improved1.winRate.toFixed(1).padEnd(3)}%   $${improved1.totalPnL.toString().padEnd(8)} ${improved1.sharpeRatio.toFixed(2)}`);
      console.log(`Best(8,30,10): ${improved2.totalTrades.toString().padEnd(2)}      ${improved2.winRate.toFixed(1).padEnd(3)}%   $${improved2.totalPnL.toString().padEnd(8)} ${improved2.sharpeRatio.toFixed(2)}`);
      
      const bestWin = improved1.winRate > improved2.winRate ? improved1 : improved2;
      const improvement = bestWin.winRate - original.winRate;
      console.log(`\n  ✅ Improvement: +${improvement.toFixed(2)}% win rate`);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
