import axios from 'axios';
import type { PriceSeries } from '@/models/PriceData';
import { getEnv } from '@/types/env';

const env = getEnv();

interface AlphaVantageDailyResponse {
  ['Time Series (Daily)']: Record<
    string,
    {
      ['1. open']: string;
      ['2. high']: string;
      ['3. low']: string;
      ['4. close']: string;
      ['5. volume']: string;
    }
  >;
}

export async function fetchStockPrices(symbol: string): Promise<PriceSeries> {
  if (!env.ALPHA_VANTAGE_API_KEY) {
    throw new Error('ALPHA_VANTAGE_API_KEY is required to fetch stock data');
  }

  const { data } = await axios.get<AlphaVantageDailyResponse>(env.ALPHA_VANTAGE_BASE_URL, {
    params: {
      function: 'TIME_SERIES_DAILY',
      symbol,
      outputsize: 'compact',
      apikey: env.ALPHA_VANTAGE_API_KEY
    }
  });

  const series = data['Time Series (Daily)'] ?? {};

  const points = Object.entries(series)
    .map(([date, values]) => ({
      timestamp: new Date(date),
      open: Number(values['1. open']),
      high: Number(values['2. high']),
      low: Number(values['3. low']),
      close: Number(values['4. close']),
      volume: Number(values['5. volume'])
    }))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return {
    symbol: symbol.toUpperCase(),
    assetType: 'stock',
    points
  };
}
