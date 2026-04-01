#!/usr/bin/env tsx

/**
 * Quick MACD Parameter Optimization
 * Find best fast/slow/signal periods for 30-day BTC window
 */

import { fetchBinanceKlines } from '@/services/api/cryptoClient';
import { BacktestEngine } from '@/services/backtest/engine';
import { MACDStrategy } from '@/services/strategies/macdStrategy';

interface OptimizationResult {
  fast: number;
  slow: number;
  signal: number;
  winRate: number;
  totalPnL: number;
  totalTrades: number;
  sharpeRatio: number;
  score: number; // Weighted score for ranking
}

async function main() {
  try {
    console.log(`\n🔧 MACD PARAMETER OPTIMIZATION`);
    console.log(`Symbol: BTC | Period: 30 days | 1h candles`);
    console.log('='.repeat(70));

    // Fetch data
    console.log(`\n📊 Fetching data...`);
    const priceData = await fetchBinanceKlines('BTCUSDT', 30, '1h');
    console.log(`✓ Loaded ${priceData.points.length} candles`);

    const engine = new BacktestEngine();
    const results: OptimizationResult[] = [];

    // Parameter ranges
    const fastPeriods = [8, 10, 12, 14];
    const slowPeriods = [24, 26, 28, 30];
    const signalPeriods = [7, 8, 9, 10, 11];

    let tested = 0;
    const total = fastPeriods.length * slowPeriods.length * signalPeriods.length;

    console.log(`\n🔍 Testing ${total} parameter combinations...`);

    for (const fast of fastPeriods) {
      for (const slow of slowPeriods) {
        if (fast >= slow) continue; // Skip invalid combos

        for (const signal of signalPeriods) {
          const strategy = new MACDStrategy({ fastPeriod: fast, slowPeriod: slow, signalPeriod: signal });
          const result = engine.backtest(priceData, strategy);

          // Calculate score: Prefer win rate > 45%, but also consider P&L
          const winRateScore = Math.max(0, Math.min((result.winRate / 50) * 100, 100)); // 0-100
          const pnlScore = result.totalPnL > 0 ? 100 : Math.max(0, 50 + result.totalPnL / 2); // Prefer positive P&L
          const tradesScore = Math.min((result.totalTrades / 20) * 100, 100); // Prefer more trades (better sample)

          const score = winRateScore * 0.5 + pnlScore * 0.3 + tradesScore * 0.2;

          results.push({
            fast,
            slow,
            signal,
            winRate: result.winRate,
            totalPnL: result.totalPnL,
            totalTrades: result.totalTrades,
            sharpeRatio: result.sharpeRatio,
            score
          });

          tested++;
          if (tested % 5 === 0) {
            process.stdout.write(`\r  Progress: ${tested}/${total} (${((tested / total) * 100).toFixed(1)}%)`);
          }
        }
      }
    }

    console.log(`\r✓ Tested ${tested} combinations            `);

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    // Display top 10
    console.log(`\n📈 TOP 10 PARAMETER SETS:`);
    console.log('─'.repeat(90));
    console.log(
      'Rank | Fast | Slow | Signal | Win Rate | Total P&L | Trades | Sharpe | Score'.padEnd(90)
    );
    console.log('─'.repeat(90));

    for (let i = 0; i < Math.min(10, results.length); i++) {
      const r = results[i];
      const rank = (i + 1).toString().padEnd(4);
      const fast = r.fast.toString().padEnd(5);
      const slow = r.slow.toString().padEnd(5);
      const signal = r.signal.toString().padEnd(7);
      const winRate = `${r.winRate.toFixed(1)}%`.padEnd(9);
      const pnl = `$${r.totalPnL.toFixed(0)}`.padEnd(10);
      const trades = r.totalTrades.toString().padEnd(7);
      const sharpe = r.sharpeRatio.toFixed(2).padEnd(7);
      const score = r.score.toFixed(1);

      const line = `${rank}${fast}${slow}${signal}${winRate}${pnl}${trades}${sharpe}${score}`;
      console.log(line);
    }

    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    const best = results[0];
    const bestWinRate = results.find((r) => r.winRate === Math.max(...results.map((x) => x.winRate)));
    const bestPnL = results.find((r) => r.totalPnL === Math.max(...results.map((x) => x.totalPnL)));

    console.log(`  Best Overall: MACD(${best.fast}, ${best.slow}, ${best.signal}) - Score: ${best.score.toFixed(1)}`);
    if (bestWinRate && bestWinRate !== best) {
      console.log(
        `  Best Win Rate: MACD(${bestWinRate.fast}, ${bestWinRate.slow}, ${bestWinRate.signal}) - ${bestWinRate.winRate.toFixed(1)}%`
      );
    }
    if (bestPnL && bestPnL !== best && bestPnL.totalPnL > 0) {
      console.log(
        `  Best P&L: MACD(${bestPnL.fast}, ${bestPnL.slow}, ${bestPnL.signal}) - $${bestPnL.totalPnL.toFixed(2)}`
      );
    }

    // Check if we found improvement
    console.log(`\n✓ Original MACD(12, 26, 9): 45.83% win rate`);
    console.log(`✓ Best found: ${best.winRate.toFixed(2)}% win rate`);

    if (best.winRate > 45.83) {
      console.log(`\n✅ IMPROVEMENT FOUND: +${(best.winRate - 45.83).toFixed(2)}% win rate!`);
    } else {
      console.log(`\n⚠️ No improvement in this parameter space. Consider ensemble approach.`);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
