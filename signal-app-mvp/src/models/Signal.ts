import type { AssetType } from './PriceData';

export type SignalType = 'BUY' | 'SELL' | 'HOLD';

export interface Signal {
  id?: string;
  symbol: string;
  assetType: AssetType;
  signalType: SignalType;
  strategy: 'SMA_RSI_BASELINE';
  shortSma: number;
  longSma: number;
  rsi: number;
  price: number;
  confidence: number;
  generatedAt: Date;
  rationale: string;
}
