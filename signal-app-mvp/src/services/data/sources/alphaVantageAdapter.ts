import type { PriceSeries, PricePoint } from '@/models/PriceData';
import type { DataSource, Timeframe, AssetType } from '../DataManager';

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

/**
 * Alpha Vantage adapter for fetching stock price data
 * Free tier available, good fallback when Polygon not available
 * Requires ALPHA_VANTAGE_API_KEY environment variable
 */
export class AlphaVantageAdapter implements DataSource {
  name = 'AlphaVantage';
  supportedAssetType: AssetType = 'stock';

  private apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
  private functionMap: Record<Timeframe, string> = {
    '1h': 'TIME_SERIES_INTRADAY', // Requires interval param
    '4h': 'TIME_SERIES_INTRADAY',
    'daily': 'TIME_SERIES_DAILY',
    'weekly': 'TIME_SERIES_WEEKLY'
  };

  supportsTimeframe(timeframe: Timeframe): boolean {
    return timeframe in this.functionMap;
  }

  async fetch(symbol: string, days: number, timeframe: Timeframe = 'daily'): Promise<PriceSeries> {
    if (!this.apiKey) {
      throw new Error('ALPHA_VANTAGE_API_KEY environment variable not set');
    }

    const func = this.functionMap[timeframe];
    const url = new URL(ALPHA_VANTAGE_BASE_URL);
    url.searchParams.append('function', func);
    url.searchParams.append('symbol', symbol);
    url.searchParams.append('apikey', this.apiKey);

    // For intraday, specify interval
    if (timeframe === '1h') {
      url.searchParams.append('interval', '60min');
    } else if (timeframe === '4h') {
      url.searchParams.append('interval', '240min');
    }

    // Request full (extended) output for daily
    if (timeframe === 'daily' || timeframe === 'weekly') {
      url.searchParams.append('outputsize', 'full');
    }

    try {
      console.log(`[AlphaVantageAdapter] Fetching ${symbol} (${func})...`);
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;

      // Check for API errors
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
      }

      if (data['Note']) {
        throw new Error(`Alpha Vantage rate limit: ${data['Note']}`);
      }

      // Extract time series data based on function used
      let timeSeries: Record<string, any> | undefined;
      if (func === 'TIME_SERIES_INTRADAY') {
        const key = Object.keys(data).find(k => k.startsWith('Time Series'));
        timeSeries = key ? data[key] : undefined;
      } else if (func === 'TIME_SERIES_DAILY') {
        timeSeries = data['Time Series (Daily)'];
      } else if (func === 'TIME_SERIES_WEEKLY') {
        timeSeries = data['Time Series (Weekly)'];
      }

      if (!timeSeries || Object.keys(timeSeries).length === 0) {
        throw new Error(`No time series data returned for ${symbol}`);
      }

      // Convert to PricePoints
      const points: PricePoint[] = Object.entries(timeSeries)
        .slice(0, Math.ceil(days * 1.5)) // Get slightly more than requested to filter later
        .map(([dateStr, values]: [string, any]) => ({
          timestamp: new Date(dateStr),
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseFloat(values['5. volume']) ?? 0
        }))
        .reverse(); // Alpha Vantage returns newest first, we want oldest first

      return {
        symbol,
        assetType: 'stock',
        timeframe,
        points,
        fetchedAt: new Date(),
        source: 'AlphaVantage'
      };
    } catch (error) {
      throw new Error(`AlphaVantageAdapter failed for ${symbol}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
