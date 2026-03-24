import type { PriceSeries, PricePoint } from '@/models/PriceData';
import { BinanceAdapter } from './sources/binanceAdapter';
import { CoinGeckoAdapter } from './sources/coingeckoAdapter';
import { PolygonAdapter } from './sources/polygonAdapter';
import { AlphaVantageAdapter } from './sources/alphaVantageAdapter';
import { CacheManager } from './cache/cacheManager';

export type Timeframe = '1h' | '4h' | 'daily' | 'weekly';
export type AssetType = 'crypto' | 'stock';

export interface DataSource {
  name: string;
  fetch(symbol: string, days: number, timeframe?: Timeframe): Promise<PriceSeries>;
  supportsTimeframe(timeframe: Timeframe): boolean;
  supportedAssetType: AssetType;
}

/**
 * Unified data manager for fetching price data from multiple sources
 * Implements caching, fallback logic, and data validation
 */
export class DataManager {
  private sources: Map<string, DataSource> = new Map();
  private cache: CacheManager;
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 1000;

  constructor() {
    this.cache = new CacheManager();
    this.initializeSources();
  }

  private initializeSources() {
    // Register data sources in priority order
    const cryptoSources: DataSource[] = [
      new BinanceAdapter(),
      new CoinGeckoAdapter()
    ];

    const stockSources: DataSource[] = [
      new PolygonAdapter(),
      new AlphaVantageAdapter()
    ];

    // Map sources by asset type + symbol
    cryptoSources.forEach(source => {
      this.sources.set(`crypto_${source.name}`, source);
    });

    stockSources.forEach(source => {
      this.sources.set(`stock_${source.name}`, source);
    });
  }

  /**
   * Fetch price data for a symbol
   * Automatically detects asset type and tries sources in priority order
   * Falls back to alternative sources if primary fails
   */
  async fetch(
    symbol: string,
    days: number = 90,
    assetType?: AssetType,
    timeframe: Timeframe = 'daily'
  ): Promise<PriceSeries> {
    // Check cache first
    const cacheKey = this.getCacheKey(symbol, days, timeframe);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      console.log(`[DataManager] Cache hit for ${symbol} (${timeframe})`);
      return cached;
    }

    // Detect asset type if not specified
    const detectedType = assetType || this.detectAssetType(symbol);

    // Get sources for this asset type
    const sourceCandidates = this.getSourcesForAssetType(detectedType);

    let lastError: Error | null = null;

    for (const source of sourceCandidates) {
      // Check if source supports the requested timeframe
      if (!source.supportsTimeframe(timeframe)) {
        console.log(`[DataManager] ${source.name} does not support ${timeframe} timeframe, skipping`);
        continue;
      }

      try {
        console.log(`[DataManager] Fetching ${symbol} from ${source.name} (${days} days, ${timeframe})`);
        const data = await this.fetchWithRetry(source, symbol, days, timeframe);

        // Validate data before caching
        this.validateData(data, symbol);

        // Cache successful result
        await this.cache.set(cacheKey, data);

        console.log(`[DataManager] ✓ Successfully fetched ${data.points.length} price points for ${symbol}`);
        return data;
      } catch (error) {
        lastError = error as Error;
        console.error(`[DataManager] Failed to fetch from ${source.name}: ${lastError.message}`);
        // Continue to next source
      }
    }

    // If all sources failed, throw error
    throw new Error(
      `Could not fetch price data for ${symbol} from any source. Last error: ${lastError?.message}`
    );
  }

  /**
   * Fetch multiple symbols in parallel
   */
  async fetchMultiple(
    symbols: string[],
    days: number = 90,
    assetType?: AssetType,
    timeframe: Timeframe = 'daily'
  ): Promise<Map<string, PriceSeries>> {
    const results = new Map<string, PriceSeries>();

    const promises = symbols.map(async (symbol) => {
      try {
        const data = await this.fetch(symbol, days, assetType, timeframe);
        results.set(symbol, data);
      } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error);
        // Continue with next symbol instead of failing entire batch
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Clear cache (full or partial)
   */
  async clearCache(symbol?: string): Promise<void> {
    if (symbol) {
      await this.cache.clear(symbol);
    } else {
      await this.cache.clearAll();
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ size: number; entries: number; oldestEntry?: Date }> {
    return this.cache.getStats();
  }

  // ============ Private Methods ============

  private async fetchWithRetry(
    source: DataSource,
    symbol: string,
    days: number,
    timeframe: Timeframe,
    attempt: number = 1
  ): Promise<PriceSeries> {
    try {
      return await source.fetch(symbol, days, timeframe);
    } catch (error) {
      if (attempt < this.maxRetries) {
        const delayMs = this.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`[DataManager] Retry attempt ${attempt}/${this.maxRetries} after ${delayMs}ms`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.fetchWithRetry(source, symbol, days, timeframe, attempt + 1);
      }
      throw error;
    }
  }

  private getSourcesForAssetType(assetType: AssetType): DataSource[] {
    const sources: DataSource[] = [];

    // Find all sources for this asset type, in priority order
    const entries = Array.from(this.sources.entries());
    entries.forEach(([key, source]) => {
      if (source.supportedAssetType === assetType) {
        sources.push(source);
      }
    });

    return sources;
  }

  private detectAssetType(symbol: string): AssetType {
    const cryptoSymbols = ['BTC', 'ETH', 'XRP', 'ADA', 'SOL', 'BNB', 'DOGE', 'LINK', 'LTC', 'POLKA'];
    const upperSymbol = symbol.toUpperCase();

    if (cryptoSymbols.includes(upperSymbol)) {
      return 'crypto';
    }

    // Default to stock for unknown symbols
    return 'stock';
  }

  private validateData(data: PriceSeries, expectedSymbol: string): void {
    if (!data.points || data.points.length === 0) {
      throw new Error(`No price points returned for ${expectedSymbol}`);
    }

    if (data.symbol.toUpperCase() !== expectedSymbol.toUpperCase()) {
      console.warn(`Symbol mismatch: expected ${expectedSymbol}, got ${data.symbol}`);
    }

    // Check for data corruption (prices jumping >50%)
    let prevClose = data.points[0].close;
    for (let i = 1; i < data.points.length; i++) {
      const point = data.points[i];
      const changePercent = Math.abs((point.close - prevClose) / prevClose) * 100;
      if (changePercent > 50) {
        console.warn(
          `Large price jump detected: ${point.close} (${changePercent.toFixed(2)}%) from ${prevClose}. ` +
          `This may indicate data corruption.`
        );
      }
      prevClose = point.close;
    }

    // Warn if too few data points
    if (data.points.length < 10) {
      console.warn(`Only ${data.points.length} data points returned. This may be insufficient for backtesting.`);
    }
  }

  private getCacheKey(symbol: string, days: number, timeframe: Timeframe): string {
    return `price_${symbol}_${days}d_${timeframe}`;
  }
}

// Singleton instance
let dataManagerInstance: DataManager | null = null;

export function getDataManager(): DataManager {
  if (!dataManagerInstance) {
    dataManagerInstance = new DataManager();
  }
  return dataManagerInstance;
}
