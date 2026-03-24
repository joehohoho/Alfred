import type { PriceSeries, PricePoint } from '@/models/PriceData';
import type { DataSource, Timeframe, AssetType } from '../DataManager';

const POLYGON_BASE_URL = 'https://api.polygon.io/v2/aggs/ticker';

/**
 * Polygon.io adapter for fetching stock price data
 * Premium provider with excellent historical data
 * Requires POLYGON_API_KEY environment variable
 */
export class PolygonAdapter implements DataSource {
  name = 'Polygon';
  supportedAssetType: AssetType = 'stock';

  private apiKey = process.env.POLYGON_API_KEY || '';
  private timeframeMap: Record<Timeframe, string> = {
    '1h': 'hour',
    '4h': 'hour', // Will fetch hourly and aggregate
    'daily': 'day',
    'weekly': 'week'
  };

  supportsTimeframe(timeframe: Timeframe): boolean {
    return timeframe in this.timeframeMap;
  }

  async fetch(symbol: string, days: number, timeframe: Timeframe = 'daily'): Promise<PriceSeries> {
    if (!this.apiKey) {
      throw new Error('POLYGON_API_KEY environment variable not set');
    }

    const multiplier = this.getMultiplier(timeframe);
    const timeframeStr = this.timeframeMap[timeframe];

    const from = this.getFromDate(days);
    const to = new Date().toISOString().split('T')[0];

    const url = new URL(`${POLYGON_BASE_URL}/${symbol}/range/${multiplier}/${timeframeStr}/${from}/${to}`);
    url.searchParams.append('apiKey', this.apiKey);
    url.searchParams.append('sort', 'asc');
    url.searchParams.append('limit', '120'); // Max per request

    try {
      console.log(`[PolygonAdapter] Fetching ${symbol} (${timeframe}) from ${from} to ${to}...`);
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as {
        results?: Array<{
          t: number;
          o: number;
          h: number;
          l: number;
          c: number;
          v: number;
        }>;
        status: string;
      };

      if (!data.results || data.results.length === 0) {
        throw new Error(`No data returned from Polygon for ${symbol}`);
      }

      const points: PricePoint[] = data.results.map(bar => ({
        timestamp: new Date(bar.t),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v ?? 0
      }));

      return {
        symbol,
        assetType: 'stock',
        timeframe,
        points,
        fetchedAt: new Date(),
        source: 'Polygon'
      };
    } catch (error) {
      throw new Error(`PolygonAdapter failed for ${symbol}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private getMultiplier(timeframe: Timeframe): number {
    // Polygon uses multiplier + timeframe unit
    // e.g., multiplier=1, timeframeStr='day' = 1 day
    // multiplier=4, timeframeStr='hour' = 4 hours
    switch (timeframe) {
      case '1h':
        return 1;
      case '4h':
        return 4;
      case 'daily':
        return 1;
      case 'weekly':
        return 1;
      default:
        return 1;
    }
  }

  private getFromDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }
}
