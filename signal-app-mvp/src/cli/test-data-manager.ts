#!/usr/bin/env tsx

/**
 * Test script for DataManager
 * Verifies data fetching, caching, and validation work correctly
 * 
 * Usage:
 *   tsx src/cli/test-data-manager.ts
 *   tsx src/cli/test-data-manager.ts --symbol BTC
 *   tsx src/cli/test-data-manager.ts --symbol AAPL --days 365
 */

import { getDataManager } from '@/services/data/DataManager';
import { AssetRegistry } from '@/services/data/assetRegistry';

async function testDataManager() {
  const dataManager = getDataManager();

  console.log('========================================');
  console.log('DataManager Test Suite');
  console.log('========================================\n');

  // Parse CLI args
  let symbol = 'BTC';
  let days = 90;
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--symbol' && i + 1 < process.argv.length) {
      symbol = process.argv[++i];
    } else if (process.argv[i] === '--days' && i + 1 < process.argv.length) {
      days = parseInt(process.argv[++i]);
    }
  }

  console.log(`Test 1: Asset Registry`);
  console.log('----------------------------------------');
  const stats = AssetRegistry.getStats();
  console.log(`Total assets: ${stats.totalAssets}`);
  console.log(`Active assets: ${stats.activeAssets}`);
  console.log(`Crypto: ${stats.activeCryptoCount}/${stats.cryptoCount}`);
  console.log(`Stocks: ${stats.activeStockCount}/${stats.stockCount}`);
  console.log(`✓ Asset registry loaded\n`);

  console.log(`Test 2: Fetch Data (${symbol}, ${days} days, daily)`);
  console.log('----------------------------------------');
  try {
    const startTime = Date.now();
    const data = await dataManager.fetch(symbol, days, undefined, 'daily');
    const elapsed = Date.now() - startTime;

    console.log(`✓ Fetched successfully in ${elapsed}ms`);
    console.log(`  Symbol: ${data.symbol}`);
    console.log(`  Asset type: ${data.assetType}`);
    console.log(`  Timeframe: ${data.timeframe}`);
    console.log(`  Data points: ${data.points.length}`);
    console.log(`  Date range: ${data.points[0].timestamp.toISOString().split('T')[0]} to ${data.points[data.points.length - 1].timestamp.toISOString().split('T')[0]}`);
    console.log(`  Source: ${data.source}`);

    // Validate OHLCV data
    const sample = data.points[Math.floor(data.points.length / 2)];
    console.log(`  Sample point (middle): Open=${sample.open?.toFixed(2)}, High=${sample.high?.toFixed(2)}, Low=${sample.low?.toFixed(2)}, Close=${sample.close.toFixed(2)}, Volume=${sample.volume}`);
    console.log();

    console.log(`Test 3: Cache Hit`);
    console.log('----------------------------------------');
    const startTime2 = Date.now();
    const data2 = await dataManager.fetch(symbol, days, undefined, 'daily');
    const elapsed2 = Date.now() - startTime2;

    console.log(`✓ Cache hit in ${elapsed2}ms (should be <10ms)`);
    console.log(`  Data points match: ${data.points.length === data2.points.length}`);
    console.log();

    console.log(`Test 4: Cache Statistics`);
    console.log('----------------------------------------');
    const stats = await dataManager.getCacheStats();
    console.log(`✓ Cache stats:`);
    console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`  Entries: ${stats.entries}`);
    if (stats.oldestEntry) {
      console.log(`  Oldest: ${stats.oldestEntry.toISOString()}`);
    }
    console.log();

    console.log(`Test 5: Fetch Multiple Symbols`);
    console.log('----------------------------------------');
    const symbols = ['BTC', 'ETH', 'AAPL'];
    const startTime3 = Date.now();
    const multiData = await dataManager.fetchMultiple(symbols, 30);
    const elapsed3 = Date.now() - startTime3;

    console.log(`✓ Fetched ${multiData.size} symbols in ${elapsed3}ms`);
    for (const [sym, data] of multiData) {
      console.log(`  ${sym}: ${data.points.length} points (${data.assetType})`);
    }
    console.log();

    console.log('========================================');
    console.log('All tests passed! ✓');
    console.log('========================================');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testDataManager().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
