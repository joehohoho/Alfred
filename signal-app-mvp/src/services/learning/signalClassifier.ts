/**
 * Signal Classifier — logistic regression model for predicting trade outcomes.
 *
 * Replaces the pattern-matching system in tradeAnalyzer.ts with a statistical
 * learning approach. Extracts 8 continuous features from market conditions at
 * signal time and predicts win probability via binary logistic regression.
 *
 * Pure TypeScript — no external ML libraries. Runs in Next.js serverless.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { PriceSeries } from '@/models/PriceData';
import type { Trade as BacktestTrade } from '@/services/backtest/engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModelWeights {
  weights: number[];      // w0 (bias) + w1..w8
  featureMeans: number[]; // for standardization
  featureStds: number[];  // for standardization
  trainedOn: number;      // number of training samples
  lastUpdated: string;
  accuracy: number;       // training accuracy
  auc: number;            // approximate AUC
}

export interface TrainingSample {
  features: number[];     // 8 raw feature values
  label: number;          // 1 = winning trade, 0 = losing trade
  weight: number;         // sample weight (recent trades weighted higher)
}

// Feature names for reporting
const FEATURE_NAMES = [
  'price_vs_20sma',
  'price_vs_50sma',
  'price_vs_200sma',
  'rsi_14',
  'atr_pct',
  'momentum_5d',
  'momentum_20d',
  'volume_ratio',
] as const;

const NUM_FEATURES = 8;

// Training hyperparameters
const LEARNING_RATE = 0.01;
const MAX_ITERATIONS = 100;
const L2_LAMBDA = 0.1;
const GRADIENT_CLIP = 5.0;

// Online update parameters
const ONLINE_LEARNING_RATE = 0.005;
const ONLINE_ITERATIONS = 20;

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');

function modelPath(symbol: string): string {
  return path.join(DATA_DIR, `signal-model-${symbol.toUpperCase()}.json`);
}

function readModel(symbol: string): ModelWeights | null {
  try {
    const filePath = modelPath(symbol);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ModelWeights;
    }
  } catch {
    // corrupted — return null
  }
  return null;
}

function writeModel(symbol: string, model: ModelWeights): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(modelPath(symbol), JSON.stringify(model, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Indicator helpers (mirrors tradeAnalyzer.ts)
// ---------------------------------------------------------------------------

function computeSMA(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += values[j];
      result.push(sum / period);
    }
  }
  return result;
}

function computeRSI(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (values.length <= period) return result;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    if (change > 0) gainSum += change;
    else lossSum += Math.abs(change);
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = 100 - 100 / (1 + rs);

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rsI = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = 100 - 100 / (1 + rsI);
  }
  return result;
}

function computeATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number,
): number[] {
  const length = closes.length;
  const tr: number[] = new Array(length).fill(NaN);

  for (let i = 0; i < length; i++) {
    if (i === 0) {
      tr[i] = highs[i] - lows[i];
    } else {
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      tr[i] = Math.max(hl, hc, lc);
    }
  }

  const atr: number[] = new Array(length).fill(NaN);
  if (length < period) return atr;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i];
  atr[period - 1] = sum / period;

  for (let i = period; i < length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
  return atr;
}

// ---------------------------------------------------------------------------
// Numerically stable math helpers
// ---------------------------------------------------------------------------

/**
 * Numerically stable sigmoid using the log-sum-exp trick.
 * For z >= 0: σ(z) = 1 / (1 + exp(-z))
 * For z < 0:  σ(z) = exp(z) / (1 + exp(z))
 * This avoids overflow in exp() for large |z|.
 */
function sigmoid(z: number): number {
  if (z >= 0) {
    const expNegZ = Math.exp(-z);
    return 1 / (1 + expNegZ);
  } else {
    const expZ = Math.exp(z);
    return expZ / (1 + expZ);
  }
}

/** Clip a value to [-bound, bound] */
function clip(value: number, bound: number): number {
  if (value > bound) return bound;
  if (value < -bound) return -bound;
  return value;
}

// ---------------------------------------------------------------------------
// Feature extraction
// ---------------------------------------------------------------------------

/** Pre-computed indicator arrays for a price series. */
interface IndicatorCache {
  closes: number[];
  highs: number[];
  lows: number[];
  volumes: (number | undefined)[];
  sma20: number[];
  sma50: number[];
  sma200: number[];
  rsi14: number[];
  atr14: number[];
  volumeSma20: number[];
}

function buildIndicators(series: PriceSeries): IndicatorCache {
  const closes = series.points.map((p) => p.close);
  const highs = series.points.map((p) => p.high ?? p.close);
  const lows = series.points.map((p) => p.low ?? p.close);
  const volumes: (number | undefined)[] = series.points.map((p) => p.volume);

  return {
    closes,
    highs,
    lows,
    volumes,
    sma20: computeSMA(closes, 20),
    sma50: computeSMA(closes, 50),
    sma200: computeSMA(closes, 200),
    rsi14: computeRSI(closes, 14),
    atr14: computeATR(highs, lows, closes, 14),
    volumeSma20: computeSMA(
      volumes.map((v) => v ?? 0),
      20,
    ),
  };
}

/**
 * Extract 8 continuous features from market conditions at index `idx`.
 * Returns null if any required indicator is unavailable (insufficient data).
 */
function extractFeaturesFromIndicators(
  idx: number,
  ind: IndicatorCache,
): number[] | null {
  const close = ind.closes[idx];
  if (close <= 0) return null;

  // Need at least SMA20 and RSI14 to be valid
  if (isNaN(ind.sma20[idx]) || isNaN(ind.rsi14[idx])) return null;

  // Feature 0: price_vs_20sma — (price - sma20) / sma20
  const priceVs20sma = ind.sma20[idx] !== 0
    ? (close - ind.sma20[idx]) / ind.sma20[idx]
    : 0;

  // Feature 1: price_vs_50sma
  const priceVs50sma = !isNaN(ind.sma50[idx]) && ind.sma50[idx] !== 0
    ? (close - ind.sma50[idx]) / ind.sma50[idx]
    : 0;

  // Feature 2: price_vs_200sma
  const priceVs200sma = !isNaN(ind.sma200[idx]) && ind.sma200[idx] !== 0
    ? (close - ind.sma200[idx]) / ind.sma200[idx]
    : 0;

  // Feature 3: rsi_14 — normalized to 0-1
  const rsi14 = ind.rsi14[idx] / 100;

  // Feature 4: atr_pct — ATR / price (volatility)
  const atrPct = !isNaN(ind.atr14[idx]) && close > 0
    ? ind.atr14[idx] / close
    : 0;

  // Feature 5: momentum_5d — 5-day price change %
  const momentum5d = idx >= 5
    ? (close - ind.closes[idx - 5]) / ind.closes[idx - 5]
    : 0;

  // Feature 6: momentum_20d — 20-day price change %
  const momentum20d = idx >= 20
    ? (close - ind.closes[idx - 20]) / ind.closes[idx - 20]
    : 0;

  // Feature 7: volume_ratio — volume / 20-day avg volume
  const vol = ind.volumes[idx];
  const volAvg = ind.volumeSma20[idx];
  const volumeRatio = vol != null && !isNaN(volAvg) && volAvg > 0
    ? vol / volAvg
    : 1.0; // default to 1.0 (average) if volume data missing

  return [
    priceVs20sma,
    priceVs50sma,
    priceVs200sma,
    rsi14,
    atrPct,
    momentum5d,
    momentum20d,
    volumeRatio,
  ];
}

// ---------------------------------------------------------------------------
// Standardization helpers
// ---------------------------------------------------------------------------

function computeMeansAndStds(
  samples: TrainingSample[],
): { means: number[]; stds: number[] } {
  const n = samples.length;
  if (n === 0) {
    return {
      means: new Array(NUM_FEATURES).fill(0),
      stds: new Array(NUM_FEATURES).fill(1),
    };
  }

  const means = new Array(NUM_FEATURES).fill(0);
  const stds = new Array(NUM_FEATURES).fill(0);

  // Weighted mean
  let totalWeight = 0;
  for (const s of samples) {
    totalWeight += s.weight;
    for (let j = 0; j < NUM_FEATURES; j++) {
      means[j] += s.features[j] * s.weight;
    }
  }
  for (let j = 0; j < NUM_FEATURES; j++) {
    means[j] /= totalWeight;
  }

  // Weighted std
  for (const s of samples) {
    for (let j = 0; j < NUM_FEATURES; j++) {
      const diff = s.features[j] - means[j];
      stds[j] += s.weight * diff * diff;
    }
  }
  for (let j = 0; j < NUM_FEATURES; j++) {
    stds[j] = Math.sqrt(stds[j] / totalWeight);
    // Avoid division by zero — if std is 0, set to 1 (feature is constant)
    if (stds[j] < 1e-10) stds[j] = 1;
  }

  return { means, stds };
}

function standardize(
  features: number[],
  means: number[],
  stds: number[],
): number[] {
  return features.map((x, i) => (x - means[i]) / stds[i]);
}

// ---------------------------------------------------------------------------
// AUC approximation (Wilcoxon-Mann-Whitney statistic)
// ---------------------------------------------------------------------------

function approximateAUC(
  predictions: number[],
  labels: number[],
): number {
  const positives: number[] = [];
  const negatives: number[] = [];

  for (let i = 0; i < labels.length; i++) {
    if (labels[i] === 1) positives.push(predictions[i]);
    else negatives.push(predictions[i]);
  }

  if (positives.length === 0 || negatives.length === 0) return 0.5;

  let concordant = 0;
  let ties = 0;
  for (const p of positives) {
    for (const n of negatives) {
      if (p > n) concordant++;
      else if (p === n) ties++;
    }
  }

  return (concordant + 0.5 * ties) / (positives.length * negatives.length);
}

// ---------------------------------------------------------------------------
// SignalClassifier
// ---------------------------------------------------------------------------

export class SignalClassifier {
  private symbol: string;
  private model: ModelWeights | null = null;

  constructor(symbol: string) {
    this.symbol = symbol.toUpperCase();
  }

  /**
   * Extract 8 features from a price series at a given index.
   * Returns the raw (un-standardized) feature vector.
   */
  extractFeatures(series: PriceSeries, idx: number): number[] {
    const indicators = buildIndicators(series);
    const features = extractFeaturesFromIndicators(idx, indicators);
    if (!features) {
      // Return zeros if insufficient data — caller should check
      return new Array(NUM_FEATURES).fill(0);
    }
    return features;
  }

  /**
   * Train model from scratch using gradient descent on the full sample set.
   */
  train(samples: TrainingSample[]): void {
    if (samples.length < 5) {
      // Not enough data to train a meaningful model
      return;
    }

    // Compute standardization parameters
    const { means, stds } = computeMeansAndStds(samples);

    // Initialize weights to zero (bias + 8 features)
    const weights = new Array(NUM_FEATURES + 1).fill(0);

    // Standardize all features
    const standardized = samples.map((s) => ({
      features: standardize(s.features, means, stds),
      label: s.label,
      weight: s.weight,
    }));

    const totalWeight = standardized.reduce((sum, s) => sum + s.weight, 0);

    // Gradient descent with L2 regularization
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const gradients = new Array(NUM_FEATURES + 1).fill(0);

      for (const sample of standardized) {
        // Compute z = w0 + w1*x1 + ... + w8*x8
        let z = weights[0]; // bias
        for (let j = 0; j < NUM_FEATURES; j++) {
          z += weights[j + 1] * sample.features[j];
        }

        const predicted = sigmoid(z);
        const error = (predicted - sample.label) * sample.weight;

        // Gradient for bias (no regularization on bias)
        gradients[0] += error;

        // Gradient for features (with L2 regularization)
        for (let j = 0; j < NUM_FEATURES; j++) {
          gradients[j + 1] += error * sample.features[j];
        }
      }

      // Update weights
      for (let j = 0; j <= NUM_FEATURES; j++) {
        let grad = gradients[j] / totalWeight;

        // L2 regularization (skip bias at index 0)
        if (j > 0) {
          grad += L2_LAMBDA * weights[j];
        }

        // Gradient clipping
        grad = clip(grad, GRADIENT_CLIP);

        weights[j] -= LEARNING_RATE * grad;
      }
    }

    // Compute training accuracy and AUC
    const predictions: number[] = [];
    const labels: number[] = [];
    let correct = 0;

    for (const sample of standardized) {
      let z = weights[0];
      for (let j = 0; j < NUM_FEATURES; j++) {
        z += weights[j + 1] * sample.features[j];
      }
      const prob = sigmoid(z);
      predictions.push(prob);
      labels.push(sample.label);

      const predicted = prob >= 0.5 ? 1 : 0;
      if (predicted === sample.label) correct++;
    }

    const accuracy = correct / samples.length;
    const auc = approximateAUC(predictions, labels);

    this.model = {
      weights,
      featureMeans: means,
      featureStds: stds,
      trainedOn: samples.length,
      lastUpdated: new Date().toISOString(),
      accuracy: Number(accuracy.toFixed(4)),
      auc: Number(auc.toFixed(4)),
    };
  }

  /**
   * Incrementally update the model with new trade data.
   * Uses a smaller learning rate and fewer iterations to nudge
   * existing weights rather than retraining from scratch.
   */
  updateOnline(newSamples: TrainingSample[]): void {
    if (!this.model || newSamples.length === 0) return;

    const weights = [...this.model.weights];
    const means = this.model.featureMeans;
    const stds = this.model.featureStds;

    // Standardize new samples using existing means/stds
    const standardized = newSamples.map((s) => ({
      features: standardize(s.features, means, stds),
      label: s.label,
      weight: s.weight,
    }));

    const totalWeight = standardized.reduce((sum, s) => sum + s.weight, 0);

    // Mini-batch gradient descent
    for (let iter = 0; iter < ONLINE_ITERATIONS; iter++) {
      const gradients = new Array(NUM_FEATURES + 1).fill(0);

      for (const sample of standardized) {
        let z = weights[0];
        for (let j = 0; j < NUM_FEATURES; j++) {
          z += weights[j + 1] * sample.features[j];
        }

        const predicted = sigmoid(z);
        const error = (predicted - sample.label) * sample.weight;

        gradients[0] += error;
        for (let j = 0; j < NUM_FEATURES; j++) {
          gradients[j + 1] += error * sample.features[j];
        }
      }

      for (let j = 0; j <= NUM_FEATURES; j++) {
        let grad = gradients[j] / totalWeight;
        if (j > 0) grad += L2_LAMBDA * weights[j];
        grad = clip(grad, GRADIENT_CLIP);
        weights[j] -= ONLINE_LEARNING_RATE * grad;
      }
    }

    this.model.weights = weights;
    this.model.trainedOn += newSamples.length;
    this.model.lastUpdated = new Date().toISOString();

    // Note: accuracy/AUC are not updated in online mode — they reflect
    // full-batch training metrics. Recalculation would require storing
    // all historical samples.
  }

  /**
   * Predict win probability for a signal given raw (un-standardized) features.
   * Returns a value between 0.0 and 1.0.
   */
  predict(features: number[]): number {
    if (!this.model) return 0.5; // no model — return neutral

    const standardized = standardize(
      features,
      this.model.featureMeans,
      this.model.featureStds,
    );

    let z = this.model.weights[0]; // bias
    for (let j = 0; j < NUM_FEATURES; j++) {
      z += this.model.weights[j + 1] * standardized[j];
    }

    return sigmoid(z);
  }

  /**
   * Save model weights to disk.
   */
  save(): void {
    if (this.model) {
      writeModel(this.symbol, this.model);
    }
  }

  /**
   * Load model weights from disk. Returns true if a model was found.
   */
  load(): boolean {
    const loaded = readModel(this.symbol);
    if (loaded) {
      this.model = loaded;
      return true;
    }
    return false;
  }

  /**
   * Get feature importance ranked by absolute weight value.
   * Higher absolute weight = more influence on predictions.
   */
  getFeatureImportance(): { feature: string; importance: number }[] {
    if (!this.model) return [];

    const importance = FEATURE_NAMES.map((name, i) => ({
      feature: name,
      importance: Math.abs(this.model!.weights[i + 1]),
    }));

    importance.sort((a, b) => b.importance - a.importance);
    return importance;
  }

  /** Check whether a trained model is loaded. */
  isReady(): boolean {
    return this.model !== null;
  }

  /** Get current model metadata (null if not trained). */
  getModelInfo(): ModelWeights | null {
    return this.model ? { ...this.model } : null;
  }
}

// ---------------------------------------------------------------------------
// Training sample builder
// ---------------------------------------------------------------------------

/**
 * Build training samples from completed backtest trades.
 * Each trade is converted to a feature vector extracted at entry time,
 * labeled win (1) or loss (0), and weighted by recency (newer trades
 * get higher weight using exponential decay).
 */
export function buildTrainingSamples(
  trades: BacktestTrade[],
  series: PriceSeries,
): TrainingSample[] {
  if (trades.length === 0) return [];

  const indicators = buildIndicators(series);

  // Build date-to-index lookup
  const dateIndex = new Map<string, number>();
  for (let i = 0; i < series.points.length; i++) {
    const p = series.points[i];
    const ts = p.timestamp instanceof Date
      ? p.timestamp
      : new Date(p.timestamp as unknown as string);
    const key = ts.toISOString().split('T')[0];
    dateIndex.set(key, i);
  }

  // Sort trades by entry time for recency weighting
  const sorted = [...trades].sort((a, b) => {
    const ta = a.entryTime instanceof Date ? a.entryTime.getTime() : new Date(a.entryTime as unknown as string).getTime();
    const tb = b.entryTime instanceof Date ? b.entryTime.getTime() : new Date(b.entryTime as unknown as string).getTime();
    return ta - tb;
  });

  const samples: TrainingSample[] = [];
  const totalTrades = sorted.length;

  for (let t = 0; t < totalTrades; t++) {
    const trade = sorted[t];
    const entryTime = trade.entryTime instanceof Date
      ? trade.entryTime
      : new Date(trade.entryTime as unknown as string);
    const dateKey = entryTime.toISOString().split('T')[0];
    const idx = dateIndex.get(dateKey);

    if (idx === undefined) continue;

    const features = extractFeaturesFromIndicators(idx, indicators);
    if (!features) continue;

    // Recency weight: exponential decay from oldest (index 0) to newest.
    // Newest trade gets weight 1.0; oldest gets weight ~0.37 (e^-1).
    const recencyFraction = totalTrades > 1 ? t / (totalTrades - 1) : 1;
    const weight = Math.exp(recencyFraction - 1); // range [e^-1, 1] ≈ [0.37, 1.0]

    samples.push({
      features,
      label: trade.pnl > 0 ? 1 : 0,
      weight,
    });
  }

  return samples;
}

// ---------------------------------------------------------------------------
// Integration helper — drop-in for signal filter
// ---------------------------------------------------------------------------

// Cache classifiers in memory to avoid re-reading model files on every call
const classifierCache = new Map<string, SignalClassifier>();

/**
 * Get the predicted win probability for a signal.
 *
 * Returns null if no trained model exists for the symbol (graceful fallback
 * to the existing pattern-matching system).
 *
 * Returns a number 0.0 to 1.0 if a model is available.
 *
 * Usage in signal filter:
 *   const prob = getSignalWinProbability(symbol, series, signalIndex);
 *   if (prob !== null) {
 *     if (prob < 0.35) → block the BUY signal
 *     if (prob > 0.65) → boost strength by 1.3x
 *   }
 */
export function getSignalWinProbability(
  symbol: string,
  series: PriceSeries,
  signalIndex: number,
): number | null {
  const key = symbol.toUpperCase();

  // Try cache first
  let classifier = classifierCache.get(key);
  if (!classifier) {
    classifier = new SignalClassifier(key);
    const loaded = classifier.load();
    if (!loaded) return null; // no model — fall back to pattern system
    classifierCache.set(key, classifier);
  }

  if (!classifier.isReady()) return null;

  const features = classifier.extractFeatures(series, signalIndex);
  return classifier.predict(features);
}
