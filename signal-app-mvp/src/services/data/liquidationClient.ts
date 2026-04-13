/**
 * Liquidation level mapping client — estimates where major liquidation clusters
 * sit relative to current price using Binance forced liquidation data and
 * open interest leverage assumptions.
 *
 * Approach:
 * 1. Fetch recent forced liquidations from Binance Futures (public, no auth).
 * 2. Build liquidation clusters from actual liquidation prices.
 * 3. Supplement with estimated clusters based on OI + common leverage tiers
 *    (5x, 10x, 20x, 50x) to cover positions not yet liquidated.
 * 4. Determine "magnet direction" — where cascading liquidations would pull price.
 *
 * Cached for 1 hour per symbol.
 */

const BINANCE_FAPI = 'https://fapi.binance.com';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// --- Types ---

export interface LiquidationLevel {
  price: number;
  estimatedSize: 'small' | 'medium' | 'large';
}

export interface LiquidationLevels {
  longLiquidations: LiquidationLevel[];   // below current price — longs get liquidated here
  shortLiquidations: LiquidationLevel[];  // above current price — shorts get liquidated here
  nearestLongLiquidation: number;         // closest long liquidation price
  nearestShortLiquidation: number;        // closest short liquidation price
  magnetDirection: 'up' | 'down' | 'neutral'; // where price is likely to be pulled
}

// --- Cache ---

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, fetchedAt: Date.now() });
}

// --- Helpers ---

function toBinanceFuturesSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (upper.endsWith('USDT')) return upper;
  return `${upper}USDT`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    throw new Error(`Binance API error: ${res.status} ${res.statusText} — ${url}`);
  }
  return res.json() as Promise<T>;
}

// --- Binance forced liquidation orders ---

interface BinanceForceOrder {
  symbol: string;
  price: string;
  origQty: string;
  executedQty: string;
  averagePrice: string;
  side: 'BUY' | 'SELL'; // BUY = short was liquidated, SELL = long was liquidated
  time: number;
}

async function getRecentLiquidations(symbol: string): Promise<BinanceForceOrder[]> {
  const pair = toBinanceFuturesSymbol(symbol);
  const cacheKey = `liq:${pair}`;
  const cached = getCached<BinanceForceOrder[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BINANCE_FAPI}/fapi/v1/forceOrders?symbol=${pair}&limit=100`;
    const raw = await fetchJson<BinanceForceOrder[]>(url);
    setCache(cacheKey, raw);
    return raw;
  } catch {
    // Endpoint may return 403 for some symbols or during maintenance
    return [];
  }
}

// --- Leverage-based estimation ---

/** Common leverage tiers and the % move from entry that triggers liquidation. */
const LEVERAGE_TIERS = [
  { leverage: 5,  movePercent: 0.20, size: 'large' as const },
  { leverage: 10, movePercent: 0.10, size: 'large' as const },
  { leverage: 20, movePercent: 0.05, size: 'medium' as const },
  { leverage: 50, movePercent: 0.02, size: 'small' as const },
];

function estimateLiquidationLevels(currentPrice: number): {
  longs: LiquidationLevel[];
  shorts: LiquidationLevel[];
} {
  const longs: LiquidationLevel[] = [];
  const shorts: LiquidationLevel[] = [];

  for (const tier of LEVERAGE_TIERS) {
    // Longs get liquidated below current price
    longs.push({
      price: Math.round(currentPrice * (1 - tier.movePercent) * 100) / 100,
      estimatedSize: tier.size,
    });
    // Shorts get liquidated above current price
    shorts.push({
      price: Math.round(currentPrice * (1 + tier.movePercent) * 100) / 100,
      estimatedSize: tier.size,
    });
  }

  return { longs, shorts };
}

// --- Cluster building from real liquidation data ---

function clusterLiquidations(
  orders: BinanceForceOrder[],
  currentPrice: number,
  bucketPercent = 0.01, // 1% price buckets
): { longs: LiquidationLevel[]; shorts: LiquidationLevel[] } {
  if (orders.length === 0) return { longs: [], shorts: [] };

  // Group by price buckets
  const buckets = new Map<number, { side: 'long' | 'short'; totalQty: number }>();

  for (const order of orders) {
    const price = Number(order.averagePrice || order.price);
    const qty = Number(order.executedQty || order.origQty);
    // Round price to bucket
    const bucketSize = currentPrice * bucketPercent;
    const bucketPrice = Math.round(price / bucketSize) * bucketSize;
    const side: 'long' | 'short' = order.side === 'SELL' ? 'long' : 'short';

    const existing = buckets.get(bucketPrice);
    if (existing && existing.side === side) {
      existing.totalQty += qty;
    } else if (!existing) {
      buckets.set(bucketPrice, { side, totalQty: qty });
    }
  }

  // Convert to levels with size classification
  const allQtys = [...buckets.values()].map((b) => b.totalQty);
  const maxQty = Math.max(...allQtys);
  const longs: LiquidationLevel[] = [];
  const shorts: LiquidationLevel[] = [];

  for (const [price, bucket] of buckets) {
    const ratio = bucket.totalQty / maxQty;
    const estimatedSize: 'small' | 'medium' | 'large' =
      ratio > 0.6 ? 'large' : ratio > 0.3 ? 'medium' : 'small';

    const level: LiquidationLevel = { price, estimatedSize };

    if (bucket.side === 'long' && price < currentPrice) {
      longs.push(level);
    } else if (bucket.side === 'short' && price > currentPrice) {
      shorts.push(level);
    }
  }

  return { longs, shorts };
}

// --- Main export ---

export async function getLiquidationLevels(
  symbol: string,
  currentPrice: number,
): Promise<LiquidationLevels | null> {
  const cacheKey = `liq-levels:${symbol}:${Math.round(currentPrice)}`;
  const cached = getCached<LiquidationLevels>(cacheKey);
  if (cached) return cached;

  try {
    // Fetch real liquidation data
    const recentOrders = await getRecentLiquidations(symbol);
    const realClusters = clusterLiquidations(recentOrders, currentPrice);

    // Estimate from leverage tiers
    const estimated = estimateLiquidationLevels(currentPrice);

    // Merge real + estimated, deduplicate by proximity (within 0.5%)
    const longLiquidations = mergeLevels(
      [...realClusters.longs, ...estimated.longs],
      currentPrice,
    ).sort((a, b) => b.price - a.price); // closest to price first

    const shortLiquidations = mergeLevels(
      [...realClusters.shorts, ...estimated.shorts],
      currentPrice,
    ).sort((a, b) => a.price - b.price); // closest to price first

    const nearestLongLiquidation =
      longLiquidations.length > 0 ? longLiquidations[0].price : currentPrice * 0.95;

    const nearestShortLiquidation =
      shortLiquidations.length > 0 ? shortLiquidations[0].price : currentPrice * 1.05;

    // Magnet direction: larger cluster mass pulls price toward it
    const longMass = longLiquidations.reduce(
      (sum, l) => sum + (l.estimatedSize === 'large' ? 3 : l.estimatedSize === 'medium' ? 2 : 1),
      0,
    );
    const shortMass = shortLiquidations.reduce(
      (sum, l) => sum + (l.estimatedSize === 'large' ? 3 : l.estimatedSize === 'medium' ? 2 : 1),
      0,
    );

    // Weight by proximity — closer clusters have more pull
    const longProximity = longLiquidations
      .slice(0, 3)
      .reduce((sum, l) => sum + (1 - Math.abs(l.price - currentPrice) / currentPrice), 0);
    const shortProximity = shortLiquidations
      .slice(0, 3)
      .reduce((sum, l) => sum + (1 - Math.abs(l.price - currentPrice) / currentPrice), 0);

    const longPull = longMass * (1 + longProximity);
    const shortPull = shortMass * (1 + shortProximity);

    let magnetDirection: 'up' | 'down' | 'neutral';
    if (shortPull > longPull * 1.3) {
      magnetDirection = 'up'; // short squeeze potential
    } else if (longPull > shortPull * 1.3) {
      magnetDirection = 'down'; // long cascade potential
    } else {
      magnetDirection = 'neutral';
    }

    const result: LiquidationLevels = {
      longLiquidations,
      shortLiquidations,
      nearestLongLiquidation,
      nearestShortLiquidation,
      magnetDirection,
    };

    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[LiquidationClient] Failed to compute liquidation levels:', err);
    return null;
  }
}

/** Merge levels, deduplicating those within 0.5% of each other (keep larger). */
function mergeLevels(levels: LiquidationLevel[], currentPrice: number): LiquidationLevel[] {
  if (levels.length === 0) return [];

  const sorted = [...levels].sort((a, b) => a.price - b.price);
  const merged: LiquidationLevel[] = [sorted[0]];
  const proximityThreshold = currentPrice * 0.005;

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (Math.abs(sorted[i].price - last.price) < proximityThreshold) {
      // Keep the larger size
      const sizeRank = { small: 1, medium: 2, large: 3 };
      if (sizeRank[sorted[i].estimatedSize] > sizeRank[last.estimatedSize]) {
        merged[merged.length - 1] = sorted[i];
      }
    } else {
      merged.push(sorted[i]);
    }
  }

  return merged;
}
