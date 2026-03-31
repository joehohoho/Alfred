/**
 * Sentiment filter — adjusts signal strength based on the Fear & Greed Index.
 *
 * Contrarian logic: extreme fear = good time to buy, extreme greed = good time to sell.
 */

import type { SignalWithStrength } from '@/services/backtest/engine';
import { getFearGreedIndex } from '@/services/data/sentimentClient';

export type SentimentRegime =
  | 'extreme_fear'
  | 'fear'
  | 'neutral'
  | 'greed'
  | 'extreme_greed';

/**
 * Classify the FGI value into a sentiment regime.
 */
export function getSentimentRegime(fgiValue: number): SentimentRegime {
  if (fgiValue < 20) return 'extreme_fear';
  if (fgiValue < 40) return 'fear';
  if (fgiValue <= 60) return 'neutral';
  if (fgiValue <= 80) return 'greed';
  return 'extreme_greed';
}

/**
 * Apply a contrarian sentiment modifier to a signal's strength.
 * Returns a new signal object (does not mutate the original).
 */
export function applySentimentModifier(
  signal: SignalWithStrength,
  fgiValue: number,
): SignalWithStrength {
  const regime = getSentimentRegime(fgiValue);

  let buyMul = 1;
  let sellMul = 1;

  switch (regime) {
    case 'extreme_fear':
      buyMul = 1.4;
      sellMul = 0.5;
      break;
    case 'fear':
      buyMul = 1.2;
      sellMul = 0.7;
      break;
    case 'neutral':
      return signal; // no change
    case 'greed':
      buyMul = 0.7;
      sellMul = 1.2;
      break;
    case 'extreme_greed':
      buyMul = 0.4;
      sellMul = 1.4;
      break;
  }

  const multiplier = signal.type === 'BUY' ? buyMul : signal.type === 'SELL' ? sellMul : 1;

  if (multiplier === 1) return signal;

  return {
    ...signal,
    strength: Math.min(1, signal.strength * multiplier),
  };
}

/**
 * Convenience: fetch current FGI and return the regime.
 */
export async function getCurrentSentimentRegime(): Promise<{
  regime: SentimentRegime;
  value: number;
  classification: string;
}> {
  const fgi = await getFearGreedIndex();
  return {
    regime: getSentimentRegime(fgi.value),
    value: fgi.value,
    classification: fgi.classification,
  };
}
