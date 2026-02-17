import type { PriceSeries } from '@/models/PriceData';
import type { Signal } from '@/models/Signal';
import { calculateRSI, calculateSMA } from './indicators';

const SHORT_SMA_PERIOD = 9;
const LONG_SMA_PERIOD = 21;
const RSI_PERIOD = 14;

export function generateSignal(series: PriceSeries): Signal {
  const closes = series.points.map((point) => point.close);

  if (closes.length < LONG_SMA_PERIOD + 1) {
    return {
      symbol: series.symbol,
      assetType: series.assetType,
      signalType: 'HOLD',
      strategy: 'SMA_RSI_BASELINE',
      shortSma: 0,
      longSma: 0,
      rsi: 50,
      price: closes.at(-1) ?? 0,
      confidence: 0,
      generatedAt: new Date(),
      rationale: 'Not enough historical data to compute indicators'
    };
  }

  const currentShortSma = calculateSMA(closes, SHORT_SMA_PERIOD) ?? 0;
  const currentLongSma = calculateSMA(closes, LONG_SMA_PERIOD) ?? 0;
  const currentRsi = calculateRSI(closes, RSI_PERIOD) ?? 50;

  const previousShortSma = calculateSMA(closes.slice(0, -1), SHORT_SMA_PERIOD) ?? currentShortSma;
  const previousLongSma = calculateSMA(closes.slice(0, -1), LONG_SMA_PERIOD) ?? currentLongSma;

  const bullishCross = previousShortSma <= previousLongSma && currentShortSma > currentLongSma;
  const bearishCross = previousShortSma >= previousLongSma && currentShortSma < currentLongSma;

  let signalType: Signal['signalType'] = 'HOLD';
  let rationale = 'No strong crossover + RSI condition met';

  if (bullishCross && currentRsi < 30) {
    signalType = 'BUY';
    rationale = 'Bullish SMA crossover detected and RSI indicates oversold conditions (<30)';
  } else if (bearishCross && currentRsi > 70) {
    signalType = 'SELL';
    rationale = 'Bearish SMA crossover detected and RSI indicates overbought conditions (>70)';
  }

  const confidence = Math.min(
    1,
    Math.abs(currentShortSma - currentLongSma) / Math.max(currentLongSma, 1) +
      Math.abs(currentRsi - 50) / 50
  );

  return {
    symbol: series.symbol,
    assetType: series.assetType,
    signalType,
    strategy: 'SMA_RSI_BASELINE',
    shortSma: Number(currentShortSma.toFixed(4)),
    longSma: Number(currentLongSma.toFixed(4)),
    rsi: Number(currentRsi.toFixed(2)),
    price: closes.at(-1) ?? 0,
    confidence: Number(confidence.toFixed(2)),
    generatedAt: new Date(),
    rationale
  };
}
