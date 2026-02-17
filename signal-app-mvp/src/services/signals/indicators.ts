export function calculateSMA(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const subset = values.slice(values.length - period);
  const sum = subset.reduce((acc, value) => acc + value, 0);
  return sum / period;
}

export function calculateRSI(values: number[], period = 14): number | null {
  if (values.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = values.length - period; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
