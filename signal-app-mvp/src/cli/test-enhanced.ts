#!/usr/bin/env tsx

/**
 * Test Enhanced Signal Strategy
 */

import { fetchBinanceKlines } from '@/services/api/cryptoClient';
import { BacktestEngine } from '@/services/backtest/engine';
import { EnhancedSignalStrategy } from '@/services/strategies/enhancedSignalStrategy';
import { SMARSIImprovedStrategy } from '@/services/strategies/smaRsiImproved';

async function main() {
  try {
    console.log(`\n📊 ENHANCED SIGNAL STRATEGY TEST`);
    console.log(`Symbol: BTC | Period: 30 days`);
    console.log('='.repeat(70));

    // Fetch data
    console.log(`\n🔄 Fetching historical data...`);
    const priceData = await fetchBinanceKlines('BTCUSDT', 30, '1h');
    console.log(`✓ Loaded ${priceData.points.length} candles`);

    // Test BASELINE
    console.log(`\n▶️  Testing BASELINE (SMA_RSI_IMPROVED)...`);
    const engine = new BacktestEngine();
    const baselineStrategy = new SMARSIImprovedStrategy();
    const baselineResult = engine.backtest(priceData, baselineStrategy);

    console.log(`\n📊 BASELINE RESULTS:`);
    console.log(`  Trades: ${baselineResult.totalTrades}`);
    console.log(`  Win Rate: ${baselineResult.winRate.toFixed(2)}%`);
    console.log(`  P&L: $${baselineResult.totalPnL.toFixed(2)} (${baselineResult.totalPnLPercent.toFixed(2)}%)`);
    console.log(`  Sharpe: ${baselineResult.sharpeRatio.toFixed(3)}`);

    // Test ENHANCED
    console.log(`\n▶️  Testing ENHANCED (Multi-Factor Confirmation)...`);
    const enhancedStrategy = new EnhancedSignalStrategy();
    const enhancedResult = engine.backtest(priceData, enhancedStrategy);

    console.log(`\n📊 ENHANCED RESULTS:`);
    console.log(`  Trades: ${enhancedResult.totalTrades}`);
    console.log(`  Win Rate: ${enhancedResult.winRate.toFixed(2)}%`);
    console.log(`  P&L: $${enhancedResult.totalPnL.toFixed(2)} (${enhancedResult.totalPnLPercent.toFixed(2)}%)`);
    console.log(`  Sharpe: ${enhancedResult.sharpeRatio.toFixed(3)}`);

    // Comparison
    console.log(`\n📈 COMPARISON:`);
    console.log(`  Win Rate: ${baselineResult.winRate.toFixed(2)}% → ${enhancedResult.winRate.toFixed(2)}% (${enhancedResult.winRate - baselineResult.winRate > 0 ? '+' : ''}${(enhancedResult.winRate - baselineResult.winRate).toFixed(2)}%)`);
    console.log(`  P&L: $${baselineResult.totalPnL.toFixed(2)} → $${enhancedResult.totalPnL.toFixed(2)}`);

    if (enhancedResult.winRate > baselineResult.winRate + 5) {
      console.log(`\n✅ SIGNIFICANT IMPROVEMENT: +${(enhancedResult.winRate - baselineResult.winRate).toFixed(2)}% win rate!`);
    } else if (enhancedResult.winRate > baselineResult.winRate) {
      console.log(`\n✓ Improvement detected.`);
    } else {
      console.log(`\n⚠️ Performance declined. Adjusting parameters...`);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
