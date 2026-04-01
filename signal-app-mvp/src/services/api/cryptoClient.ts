import axios from 'axios';
import type { PriceSeries } from '@/models/PriceData';
import { getEnv } from '@/types/env';

const env = getEnv();

export async function fetchCryptoPrices(symbol = 'bitcoin', days = 30): Promise<PriceSeries> {
  const url = `${env.COINGECKO_BASE_URL}/coins/${symbol}/market_chart`;
  const { data } = await axios.get(url, {
    params: {
      vs_currency: 'usd',
      days,
      interval: 'daily'
    }
  });

  const points = (data.prices as [number, number][]).map(([timestamp, close]) => ({
    timestamp: new Date(timestamp),
    close
  }));

  return {
    symbol: symbol.toUpperCase(),
    assetType: 'crypto',
    points
  };
}

/**
 * Fetch Binance OHLCV data
 * @param symbol Trading pair (e.g., BTCUSDT, ETHUSDT)
 * @param days Number of days of history to fetch
 * @param interval Candle interval (1m, 5m, 15m, 1h, 4h, 1d)
 * @returns PriceSeries with OHLCV data
 */
export async function fetchBinanceKlines(
  symbol = 'BTCUSDT',
  days = 30,
  interval = '1h'
): Promise<PriceSeries> {
  // Calculate number of candles needed
  // 1m = 1440/day, 5m = 288/day, 15m = 96/day, 1h = 24/day, 4h = 6/day, 1d = 1/day
  const candlesPerDay: Record<string, number> = {
    '1m': 1440,
    '5m': 288,
    '15m': 96,
    '1h': 24,
    '4h': 6,
    '1d': 1
  };
  
  const limit = Math.min(
    candlesPerDay[interval] ? candlesPerDay[interval] * days : 100,
    1000 // Binance API limit per request
  );

  const url = `${env.BINANCE_BASE_URL}/api/v3/klines`;
  const { data } = await axios.get(url, {
    params: {
      symbol,
      interval,
      limit
    }
  });

  const points = (data as string[][]).map((kline) => ({
    timestamp: new Date(Number(kline[0])),
    open: Number(kline[1]),
    high: Number(kline[2]),
    low: Number(kline[3]),
    close: Number(kline[4]),
    volume: Number(kline[5])
  }));

  return {
    symbol,
    assetType: 'crypto',
    points
  };
}
