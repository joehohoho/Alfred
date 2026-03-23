#!/usr/bin/env tsx

/**
 * CLI Backtest Tool
 * Usage:
 *   tsx src/cli/backtest.ts --symbol AAPL --strategy SMA_RSI_IMPROVED --days 90
 *   tsx src/cli/backtest.ts --symbol BTC --strategy MACD --optimize
 *   tsx src/cli/backtest.ts --symbol ETH --compare-all
 */

import { fetchStockPrices } from '@/services/api/stockClient';
import { fetchCryptoPrices, fetchBinanceKlines } from '@/services/api/cryptoClient';
import { BacktestEngine, ParameterOptimizer } from '@/services/backtest/engine';
import { SMARSIImprovedStrategy } from '@/services/strategies/smaRsiImproved';
import { MACDStrategy } from '@/services/strategies/macdStrategy';
import { BollingerStrategy } from '@/services/strategies/bollingerStrategy';
import type { Strategy } from '@/services/backtest/engine';

interface CLIArgs {
  symbol: string;
  strategy?: string;
  days?: number;
  optimize?: boolean;
  compareAll?: boolean;
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = {
    symbol: 'BTC',
    days: 90,
    optimize: false,
    compareAll: false
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--symbol' && i + 1 < process.argv.length) {
      args.symbol = process.argv[++i];
    } else if (arg === '--strategy' && i + 1 < process.argv.length) {
      args.strategy = process.argv[++i];
    } else if (arg === '--days' && i + 1 < process.argv.length) {
      args.days = parseInt(process.argv[++i]);
    } else if (arg === '--optimize') {
      args.optimize = true;
    } else if (arg === '--compare-all') {
      args.compareAll = true;
    }
  }

  return args;
}

async function fetchPriceData(symbol: string, days: number) {
  // Determine asset type
  const isCrypto = ['BTC', 'ETH', 'bitcoin', 'ethereum'].includes(symbol.toUpperCase());

  try {
    if (symbol.toUpperCase() === 'BTC' || symbol.toUpperCase() === 'BTCUSDT') {
      console.log(`Fetching ${symbol} data from Binance...`);
      return await fetchBinanceKlines('BTCUSDT', Math.ceil(days / 4)); // 4h candles
    } else if (symbol.toUpperCase() === 'ETH' || symbol.toUpperCase() === 'ETHUSDT') {
      console.log(`Fetching ${symbol} data from Binance...`);
      return await fetchBinanceKlines('ETHUSDT', Math.ceil(days / 4));
    } else if (isCrypto) {
      console.log(`Fetching ${symbol} data from CoinGecko...`);
      return await fetchCryptoPrices(symbol.toLowerCase(), days);
    } else {
      console.log(`Fetching ${symbol} data from Alpha Vantage...`);
      return await fetchStockPrices(symbol);
    }
  } catch (error) {
    console.error(`Failed to fetch data for ${symbol}:`, error);
    throw error;
  }
}

function getStrategy(name: string, params: Record<string, number> = {}): Strategy {
  switch (name.toUpperCase()) {
    case 'SMA_RSI_IMPROVED':
      return new SMARSIImprovedStrategy(params);
    case 'MACD':
      return new MACDStrategy(params);
    case 'BOLLINGER':
      return new BollingerStrategy(params);
    default:
      return new SMARSIImprovedStrategy(params);
  }
}

function formatResult(title: string, result: any): void {
  console.log('\n' + '='.repeat(70));
  console.log(`${title}`);
  console.log('='.repeat(70));
  console.log(`Symbol: ${result.symbol}`);
  console.log(`Strategy: ${result.strategyName}`);
  console.log(`Total Trades: ${result.totalTrades}`);
  console.log(`Winning Trades: ${result.winningTrades} | Losing: ${result.losingTrades}`);
  console.log(`Win Rate: ${result.winRate}%`);
  console.log(`Total P&L: $${result.totalPnL} (${result.totalPnLPercent}%)`);
  console.log(`Average Win: $${result.avgWin} | Average Loss: -$${result.avgLoss}`);
  console.log(`Profit Factor: ${result.profitFactor}`);
  console.log(`Max Drawdown: ${result.maxDrawdown}%`);
  console.log(`Sharpe Ratio: ${result.sharpeRatio}`);

  if (result.totalTrades > 0) {
    console.log('\nTrade Details:');
    result.trades.forEach((trade: any, i: number) => {
      const pnlStr = trade.pnl > 0 ? `+$${trade.pnl}` : `-$${Math.abs(trade.pnl)}`;
      console.log(
        `  ${i + 1}. Entry: $${trade.entryPrice.toFixed(2)} → Exit: $${trade.exitPrice.toFixed(2)} | ${pnlStr} (${trade.pnlPercent.toFixed(2)}%) | ${trade.daysHeld}d`
      );
    });
  }
}

async function main() {
  const args = parseArgs();

  try {
    // Fetch price data
    const priceData = await fetchPriceData(args.symbol, args.days ?? 90);
    console.log(`✓ Loaded ${priceData.points.length} price points`);

    const engine = new BacktestEngine();

    if (args.compareAll) {
      // Compare all strategies
      console.log('\n📊 Comparing all strategies...\n');

      const strategies = ['SMA_RSI_IMPROVED', 'MACD', 'BOLLINGER'];
      const results = [];

      for (const stratName of strategies) {
        const strategy = getStrategy(stratName);
        const result = engine.backtest(priceData, strategy);
        results.push(result);
        formatResult(`Strategy: ${stratName}`, result);
      }

      // Summary
      console.log('\n' + '='.repeat(70));
      console.log('SUMMARY - Best Strategy');
      console.log('='.repeat(70));
      const bestBySharpe = results.reduce((best, curr) => (curr.sharpeRatio > best.sharpeRatio ? curr : best));
      const bestByWinRate = results.reduce((best, curr) => (curr.winRate > best.winRate ? curr : best));
      const bestByPnL = results.reduce((best, curr) => (curr.totalPnL > best.totalPnL ? curr : best));

      console.log(`Best Sharpe Ratio: ${bestBySharpe.strategyName} (${bestBySharpe.sharpeRatio})`);
      console.log(`Best Win Rate: ${bestByWinRate.strategyName} (${bestByWinRate.winRate}%)`);
      console.log(`Best P&L: ${bestByPnL.strategyName} ($${bestByPnL.totalPnL})`);
    } else if (args.optimize) {
      // Optimize parameters for a strategy
      const stratName = args.strategy || 'SMA_RSI_IMPROVED';
      console.log(`\n🔧 Optimizing ${stratName} parameters...\n`);

      const optimizer = new ParameterOptimizer();
      let paramRanges: Record<string, number[]> = {};

      switch (stratName.toUpperCase()) {
        case 'SMA_RSI_IMPROVED':
          paramRanges = {
            shortPeriod: [5, 7, 9, 12],
            longPeriod: [14, 21, 26, 34],
            rsiPeriod: [10, 14, 20],
            rsiBuyThreshold: [20, 30, 40, 50],
            rsiSellThreshold: [50, 60, 70, 80]
          };
          break;
        case 'MACD':
          paramRanges = {
            fastPeriod: [8, 12],
            slowPeriod: [20, 26, 34],
            signalPeriod: [7, 9]
          };
          break;
        case 'BOLLINGER':
          paramRanges = {
            period: [15, 20, 25],
            stdDevs: [1.5, 2, 2.5]
          };
          break;
      }

      const strategyFactory = (params: Record<string, number>) => getStrategy(stratName, params);
      const results = optimizer.optimize(priceData, strategyFactory, paramRanges);

      console.log(`Tested ${results.length} parameter combinations\n`);
      console.log('Top 5 Parameter Sets:');
      results.slice(0, 5).forEach((r, i) => {
        console.log(`\n${i + 1}. Sharpe: ${r.result.sharpeRatio}, Win Rate: ${r.result.winRate}%, Trades: ${r.result.totalTrades}`);
        console.log(`   Params: ${JSON.stringify(r.params)}`);
        console.log(`   P&L: $${r.result.totalPnL} (${r.result.totalPnLPercent}%)`);
      });

      // Run backtest with best params
      const bestParams = results[0].params;
      const bestStrategy = getStrategy(stratName, bestParams);
      const bestResult = engine.backtest(priceData, bestStrategy);
      formatResult(`Best ${stratName} Configuration`, bestResult);
    } else {
      // Single strategy backtest
      const stratName = args.strategy || 'SMA_RSI_IMPROVED';
      console.log(`\nRunning backtest for ${stratName}...`);

      const strategy = getStrategy(stratName);
      const result = engine.backtest(priceData, strategy);
      formatResult(`Backtest Results`, result);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
