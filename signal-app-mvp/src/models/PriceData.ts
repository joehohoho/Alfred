export type AssetType = 'crypto' | 'stock';

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
  points: PricePoint[];
}
