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

export async function fetchBinanceKlines(symbol = 'BTCUSDT', limit = 100): Promise<PriceSeries> {
  const url = `${env.BINANCE_BASE_URL}/api/v3/klines`;
  const { data } = await axios.get(url, {
    params: {
      symbol,
      interval: '4h',
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
