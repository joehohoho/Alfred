import type { PriceSeries, PricePoint } from '@/models/PriceData';
import type { DataSource, Timeframe, AssetType } from '../DataManager';

const BINANCE_BASE_URL = 'https://api.binance.com/api/v3/klines';

/**
 * Binance adapter for fetching cryptocurrency price data
 * Supports 1h, 4h, daily, and weekly candles
 */
export class BinanceAdapter implements DataSource {
  name = 'Binance';
  supportedAssetType: AssetType = 'crypto';

  private timeframeMap: Record<Timeframe, string> = {
    '1h': '1h',
    '4h': '4h',
    'daily': '1d',
    'weekly': '1w'
  };

  supportsTimeframe(timeframe: Timeframe): boolean {
    return timeframe in this.timeframeMap;
  }

  async fetch(symbol: string, days: number, timeframe: Timeframe = 'daily'): Promise<PriceSeries> {
    const binanceSymbol = this.normalizeBinanceSymbol(symbol);
    const binanceTimeframe = this.timeframeMap[timeframe];

    // Calculate limit: Binance returns max 1000 candles per request
    const limit = Math.min(Math.ceil(days / this.daysPerCandle(timeframe)), 1000);

    const url = new URL(BINANCE_BASE_URL);
    url.searchParams.append('symbol', binanceSymbol);
    url.searchParams.append('interval', binanceTimeframe);
    url.searchParams.append('limit', limit.toString());

    try {
      console.log(`[BinanceAdapter] Fetching ${binanceSymbol} at ${binanceTimeframe} interval (${limit} candles)...`);
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
      }

      const klines = await response.json() as any[][];

      if (!klines || klines.length === 0) {
        throw new Error(`No klines data returned from Binance for ${binanceSymbol}`);
      }

      const points: PricePoint[] = klines.map(kline => ({
        timestamp: new Date(kline[0]),
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[7])
      }));

      return {
        symbol,
        assetType: 'crypto',
        timeframe,
        points,
        fetchedAt: new Date(),
        source: 'Binance'
      };
    } catch (error) {
      throw new Error(`BinanceAdapter failed for ${binanceSymbol}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private normalizeBinanceSymbol(symbol: string): string {
    // Map common symbols to Binance format
    const symbolMap: Record<string, string> = {
      'BTC': 'BTCUSDT',
      'ETH': 'ETHUSDT',
      'XRP': 'XRPUSDT',
      'ADA': 'ADAUSDT',
      'SOL': 'SOLUSDT',
      'BNB': 'BNBUSDT',
      'DOGE': 'DOGEUSDT',
      'LINK': 'LINKUSDT',
      'LTC': 'LTCUSDT',
      'POLKA': 'DOTUSDT'
    };

    const normalized = symbol.toUpperCase();
    return symbolMap[normalized] || (normalized.endsWith('USDT') ? normalized : normalized + 'USDT');
  }

  private daysPerCandle(timeframe: Timeframe): number {
    switch (timeframe) {
      case '1h':
        return 1 / 24;
      case '4h':
        return 4 / 24;
      case 'daily':
        return 1;
      case 'weekly':
        return 7;
      default:
        return 1;
    }
  }
}
