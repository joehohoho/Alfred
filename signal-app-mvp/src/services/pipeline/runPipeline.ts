import { fetchBinanceKlines, fetchCryptoPrices } from '@/services/api/cryptoClient';
import { fetchStockPrices } from '@/services/api/stockClient';
import { insertSignal } from '@/services/db/repositories';
import { generateSignal } from '@/services/signals/generateSignal';

const CRYPTO_TARGETS = ['bitcoin', 'ethereum'];
const BINANCE_TARGETS = ['BTCUSDT', 'ETHUSDT'];
const STOCK_TARGETS = ['AAPL', 'MSFT'];

export async function runSignalPipeline() {
  const generatedSignals = [];

  for (const coin of CRYPTO_TARGETS) {
    const series = await fetchCryptoPrices(coin);
    const signal = generateSignal(series);
    await insertSignal(signal);
    generatedSignals.push(signal);
  }

  for (const symbol of BINANCE_TARGETS) {
    const series = await fetchBinanceKlines(symbol);
    const signal = generateSignal(series);
    await insertSignal(signal);
    generatedSignals.push(signal);
  }

  for (const symbol of STOCK_TARGETS) {
    try {
      const series = await fetchStockPrices(symbol);
      const signal = generateSignal(series);
      await insertSignal(signal);
      generatedSignals.push(signal);
    } catch (error) {
      console.warn(`Skipping stock symbol ${symbol}:`, error);
    }
  }

  return generatedSignals;
}

if (require.main === module) {
  runSignalPipeline()
    .then((signals) => {
      console.log(`Pipeline complete. Generated ${signals.length} signals.`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Pipeline failed:', error);
      process.exit(1);
    });
}
