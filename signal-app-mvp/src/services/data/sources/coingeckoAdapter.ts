import type { PriceSeries, PricePoint } from '@/models/PriceData';
import type { DataSource, Timeframe, AssetType } from '../DataManager';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3/coins';

/**
 * CoinGecko adapter for fetching cryptocurrency price data
 * Supports daily data only; best for longer-term backtesting
 */
export class CoinGeckoAdapter implements DataSource {
  name = 'CoinGecko';
  supportedAssetType: AssetType = 'crypto';

  supportsTimeframe(timeframe: Timeframe): boolean {
    // CoinGecko free API only provides daily data
    return timeframe === 'daily';
  }

  async fetch(symbol: string, days: number, timeframe: Timeframe = 'daily'): Promise<PriceSeries> {
    if (timeframe !== 'daily') {
      throw new Error(`CoinGecko adapter only supports 'daily' timeframe, got '${timeframe}'`);
    }

    const coinId = this.normalizeCoinId(symbol);
    const url = new URL(`${COINGECKO_BASE_URL}/${coinId}/market_chart`);
    url.searchParams.append('vs_currency', 'usd');
    url.searchParams.append('days', days.toString());
    url.searchParams.append('interval', 'daily');

    try {
      console.log(`[CoinGeckoAdapter] Fetching ${coinId} daily data (${days} days)...`);
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as {
        prices: [number, number][];
        market_caps: [number, number][];
        volumes: [number, number][];
      };

      if (!data.prices || data.prices.length === 0) {
        throw new Error(`No price data returned from CoinGecko for ${coinId}`);
      }

      // CoinGecko returns OHLC data as daily candles
      // We'll reconstruct as best we can (using close price as OHLC for now)
      // For better precision, we'd need premium/paid API access
      const points: PricePoint[] = data.prices.map((price, idx) => ({
        timestamp: new Date(price[0]),
        open: price[1],
        high: price[1],
        low: price[1],
        close: price[1],
        volume: data.volumes[idx]?.[1] ?? 0
      }));

      return {
        symbol,
        assetType: 'crypto',
        timeframe,
        points,
        fetchedAt: new Date(),
        source: 'CoinGecko'
      };
    } catch (error) {
      throw new Error(`CoinGeckoAdapter failed for ${coinId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private normalizeCoinId(symbol: string): string {
    // Map common symbols to CoinGecko coin IDs
    const coinMap: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'SOL': 'solana',
      'BNB': 'binancecoin',
      'DOGE': 'dogecoin',
      'LINK': 'chainlink',
      'LTC': 'litecoin',
      'POLKA': 'polkadot'
    };

    const normalized = symbol.toUpperCase();
    return coinMap[normalized] || symbol.toLowerCase();
  }
}
