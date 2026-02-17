import type { AssetType } from './PriceData';

export type TradeSide = 'BUY' | 'SELL';

export interface Trade {
  id?: string;
  userId: string;
  symbol: string;
  assetType: AssetType;
  side: TradeSide;
  quantity: number;
  price: number;
  executedAt: Date;
  signalId?: string;
}
