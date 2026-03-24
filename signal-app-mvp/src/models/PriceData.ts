export type AssetType = 'crypto' | 'stock';
export type Timeframe = '1h' | '4h' | 'daily' | 'weekly';

export interface PricePoint {
  timestamp: Date;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
}

export interface PriceSeries {
  symbol: string;
  assetType: AssetType;
  timeframe?: Timeframe;
  points: PricePoint[];
  fetchedAt?: Date;
  source?: string; // Data source (Binance, CoinGecko, Polygon, etc)
}
