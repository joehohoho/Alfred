import type { AssetType } from './DataManager';

export interface Asset {
  symbol: string;
  name: string;
  assetType: AssetType;
  minDailyVolume?: number; // For stocks, minimum daily volume in USD
  minMarketCap?: number;   // For crypto, minimum market cap in USD
  active: boolean;
}

/**
 * Registry of assets to monitor for signals
 * Quality-filtered: liquid, well-traded instruments
 */
export class AssetRegistry {
  private static readonly CRYPTO_ASSETS: Asset[] = [
    // Top 20 cryptocurrencies by market cap + liquidity
    { symbol: 'BTC', name: 'Bitcoin', assetType: 'crypto', minMarketCap: 500e9, active: true },
    { symbol: 'ETH', name: 'Ethereum', assetType: 'crypto', minMarketCap: 250e9, active: true },
    { symbol: 'BNB', name: 'Binance Coin', assetType: 'crypto', minMarketCap: 50e9, active: true },
    { symbol: 'XRP', name: 'Ripple', assetType: 'crypto', minMarketCap: 25e9, active: true },
    { symbol: 'SOL', name: 'Solana', assetType: 'crypto', minMarketCap: 40e9, active: true },
    { symbol: 'ADA', name: 'Cardano', assetType: 'crypto', minMarketCap: 20e9, active: true },
    { symbol: 'DOGE', name: 'Dogecoin', assetType: 'crypto', minMarketCap: 10e9, active: true },
    { symbol: 'LINK', name: 'Chainlink', assetType: 'crypto', minMarketCap: 15e9, active: true },
    { symbol: 'LTC', name: 'Litecoin', assetType: 'crypto', minMarketCap: 15e9, active: true },
    { symbol: 'POLKA', name: 'Polkadot', assetType: 'crypto', minMarketCap: 12e9, active: true },
  ];

  private static readonly STOCK_ASSETS: Asset[] = [
    // Large-cap, highly liquid stocks
    { symbol: 'AAPL', name: 'Apple Inc.', assetType: 'stock', minDailyVolume: 1e6, active: true },
    { symbol: 'MSFT', name: 'Microsoft Corporation', assetType: 'stock', minDailyVolume: 1e6, active: true },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', assetType: 'stock', minDailyVolume: 1e6, active: true },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', assetType: 'stock', minDailyVolume: 1e6, active: true },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', assetType: 'stock', minDailyVolume: 1e6, active: true },
    { symbol: 'META', name: 'Meta Platforms Inc.', assetType: 'stock', minDailyVolume: 1e6, active: true },
    { symbol: 'TSLA', name: 'Tesla Inc.', assetType: 'stock', minDailyVolume: 1e6, active: true },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', assetType: 'stock', minDailyVolume: 500e3, active: true },
    { symbol: 'V', name: 'Visa Inc.', assetType: 'stock', minDailyVolume: 500e3, active: true },
    { symbol: 'JNJ', name: 'Johnson & Johnson', assetType: 'stock', minDailyVolume: 500e3, active: true },
    { symbol: 'WMT', name: 'Walmart Inc.', assetType: 'stock', minDailyVolume: 500e3, active: true },
    { symbol: 'DIS', name: 'The Walt Disney Company', assetType: 'stock', minDailyVolume: 500e3, active: true },
    { symbol: 'MA', name: 'Mastercard Incorporated', assetType: 'stock', minDailyVolume: 500e3, active: true },
    { symbol: 'PG', name: 'Procter & Gamble Co.', assetType: 'stock', minDailyVolume: 500e3, active: true },
    { symbol: 'UNH', name: 'UnitedHealth Group Incorporated', assetType: 'stock', minDailyVolume: 500e3, active: true },
  ];

  /**
   * Get all active crypto assets
   */
  static getCryptoAssets(activeOnly: boolean = true): Asset[] {
    return activeOnly
      ? this.CRYPTO_ASSETS.filter(a => a.active)
      : this.CRYPTO_ASSETS;
  }

  /**
   * Get all active stock assets
   */
  static getStockAssets(activeOnly: boolean = true): Asset[] {
    return activeOnly
      ? this.STOCK_ASSETS.filter(a => a.active)
      : this.STOCK_ASSETS;
  }

  /**
   * Get all active assets
   */
  static getAllAssets(activeOnly: boolean = true): Asset[] {
    const all = [...this.CRYPTO_ASSETS, ...this.STOCK_ASSETS];
    return activeOnly
      ? all.filter(a => a.active)
      : all;
  }

  /**
   * Get assets by type
   */
  static getAssetsByType(type: AssetType, activeOnly: boolean = true): Asset[] {
    const assets = type === 'crypto' ? this.CRYPTO_ASSETS : this.STOCK_ASSETS;
    return activeOnly
      ? assets.filter(a => a.active)
      : assets;
  }

  /**
   * Find asset by symbol
   */
  static findAsset(symbol: string): Asset | undefined {
    const all = [...this.CRYPTO_ASSETS, ...this.STOCK_ASSETS];
    return all.find(a => a.symbol.toUpperCase() === symbol.toUpperCase());
  }

  /**
   * Check if asset is in registry
   */
  static hasAsset(symbol: string): boolean {
    return this.findAsset(symbol) !== undefined;
  }

  /**
   * Get assets with custom filters
   */
  static filter(
    predicate: (asset: Asset) => boolean,
    activeOnly: boolean = true
  ): Asset[] {
    const all = [...this.CRYPTO_ASSETS, ...this.STOCK_ASSETS];
    const filtered = all.filter(predicate);
    return activeOnly
      ? filtered.filter(a => a.active)
      : filtered;
  }

  /**
   * Enable/disable asset monitoring
   */
  static setActive(symbol: string, active: boolean): void {
    const asset = this.findAsset(symbol);
    if (asset) {
      asset.active = active;
    }
  }

  /**
   * Get summary statistics
   */
  static getStats(): {
    totalAssets: number;
    activeAssets: number;
    cryptoCount: number;
    stockCount: number;
    activeCryptoCount: number;
    activeStockCount: number;
  } {
    const all = this.getAllAssets(false);
    const active = this.getAllAssets(true);
    return {
      totalAssets: all.length,
      activeAssets: active.length,
      cryptoCount: this.CRYPTO_ASSETS.length,
      stockCount: this.STOCK_ASSETS.length,
      activeCryptoCount: this.CRYPTO_ASSETS.filter(a => a.active).length,
      activeStockCount: this.STOCK_ASSETS.filter(a => a.active).length,
    };
  }
}
