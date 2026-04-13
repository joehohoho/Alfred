/**
 * On-chain / order-flow metrics client — taker buy/sell ratio, top trader positioning,
 * MVRV proxy (price/200SMA), and trend detection.
 * All endpoints are public Binance Futures (no auth needed). Each cached for 1 hour.
 */

const BINANCE_FAPI = 'https://fapi.binance.com';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// --- Symbol mapping ---

function toBinanceFuturesSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (upper.endsWith('USDT')) return upper;
  return `${upper}USDT`;
}

// --- In-memory cache ---

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

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    throw new Error(`Binance API error: ${res.status} ${res.statusText} — ${url}`);
  }
  return res.json() as Promise<T>;
}

// --- Binance response types ---

interface BinanceRatioEntry {
  symbol: string;
  longAccount?: string;
  shortAccount?: string;
  longPosition?: string;
  shortPosition?: string;
  longShortRatio: string;
  timestamp: number;
}

interface BinanceTakerEntry {
  buySellRatio: string;
  buyVol: string;
  sellVol: string;
  timestamp: number;
}

// --- Public interface ---

export interface OnChainMetrics {
  takerBuySellRatio: number;           // >1 = more buying, <1 = more selling
  topTraderLongRatio: number;          // % of top traders that are long (accounts)
  topTraderPositionLongRatio: number;  // % of top trader positions that are long
  mvrvProxy: number;                   // price / 200SMA ratio
  takerTrend: 'buying' | 'selling' | 'neutral'; // 3-day trend direction
}

// --- Taker Buy/Sell Volume Ratio ---

async function getTakerBuySellRatio(
  symbol: string,
): Promise<{ ratio: number; timestamp: number }[]> {
  const pair = toBinanceFuturesSymbol(symbol);
  const cacheKey = `taker:${pair}`;
  const cached = getCached<{ ratio: number; timestamp: number }[]>(cacheKey);
  if (cached) return cached;

  const url = `${BINANCE_FAPI}/futures/data/takerlongshortRatio?symbol=${pair}&period=1d&limit=30`;
  const raw = await fetchJson<BinanceTakerEntry[]>(url);

  const result = raw.map((entry) => ({
    ratio: Number(entry.buySellRatio),
    timestamp: entry.timestamp,
  }));

  setCache(cacheKey, result);
  return result;
}

// --- Top Trader Long/Short Account Ratio ---

async function getTopTraderAccountRatio(
  symbol: string,
): Promise<{ longRatio: number; timestamp: number }[]> {
  const pair = toBinanceFuturesSymbol(symbol);
  const cacheKey = `topAcct:${pair}`;
  const cached = getCached<{ longRatio: number; timestamp: number }[]>(cacheKey);
  if (cached) return cached;

  const url = `${BINANCE_FAPI}/futures/data/topLongShortAccountRatio?symbol=${pair}&period=1d&limit=30`;
  const raw = await fetchJson<BinanceRatioEntry[]>(url);

  const result = raw.map((entry) => ({
    longRatio: Number(entry.longAccount ?? entry.longShortRatio) * 100,
    timestamp: entry.timestamp,
  }));

  setCache(cacheKey, result);
  return result;
}

// --- Top Trader Long/Short Position Ratio ---

async function getTopTraderPositionRatio(
  symbol: string,
): Promise<{ longRatio: number; timestamp: number }[]> {
  const pair = toBinanceFuturesSymbol(symbol);
  const cacheKey = `topPos:${pair}`;
  const cached = getCached<{ longRatio: number; timestamp: number }[]>(cacheKey);
  if (cached) return cached;

  const url = `${BINANCE_FAPI}/futures/data/topLongShortPositionRatio?symbol=${pair}&period=1d&limit=30`;
  const raw = await fetchJson<BinanceRatioEntry[]>(url);

  const result = raw.map((entry) => ({
    longRatio: Number(entry.longPosition ?? entry.longShortRatio) * 100,
    timestamp: entry.timestamp,
  }));

  setCache(cacheKey, result);
  return result;
}

// --- MVRV Proxy (price / 200-day SMA) ---

function computeMvrvProxy(closes: number[]): number {
  if (closes.length === 0) return 1;
  const window = Math.min(200, closes.length);
  const slice = closes.slice(-window);
  const sma = slice.reduce((sum, v) => sum + v, 0) / slice.length;
  if (sma === 0) return 1;
  const currentPrice = closes[closes.length - 1];
  return currentPrice / sma;
}

// --- Taker trend detection (3-day) ---

function detectTakerTrend(
  ratios: { ratio: number; timestamp: number }[],
): 'buying' | 'selling' | 'neutral' {
  if (ratios.length < 3) return 'neutral';

  const last3 = ratios.slice(-3);
  const allBuying = last3.every((r) => r.ratio > 1.05);
  const allSelling = last3.every((r) => r.ratio < 0.95);

  if (allBuying) return 'buying';
  if (allSelling) return 'selling';
  return 'neutral';
}

// --- Main entry point ---

/**
 * Fetch on-chain / order-flow metrics for a symbol. All API calls are non-fatal:
 * if any critical fetch fails, returns null. Individual metrics fall back to
 * neutral defaults.
 */
export async function getOnChainMetrics(
  symbol: string,
  closes?: number[],
): Promise<OnChainMetrics | null> {
  try {
    // Fetch all three Binance endpoints in parallel
    const [takerData, topAcctData, topPosData] = await Promise.allSettled([
      getTakerBuySellRatio(symbol),
      getTopTraderAccountRatio(symbol),
      getTopTraderPositionRatio(symbol),
    ]);

    // Taker buy/sell ratio — required for meaningful output
    const takerRatios =
      takerData.status === 'fulfilled' ? takerData.value : null;
    if (!takerRatios || takerRatios.length === 0) {
      console.warn('[OnChainClient] Taker ratio fetch failed — returning null');
      return null;
    }

    const latestTaker = takerRatios[takerRatios.length - 1].ratio;

    // Top trader account ratio (fallback to 50% = neutral)
    const topAcct =
      topAcctData.status === 'fulfilled' && topAcctData.value.length > 0
        ? topAcctData.value[topAcctData.value.length - 1].longRatio
        : 50;

    // Top trader position ratio (fallback to 50% = neutral)
    const topPos =
      topPosData.status === 'fulfilled' && topPosData.value.length > 0
        ? topPosData.value[topPosData.value.length - 1].longRatio
        : 50;

    // MVRV proxy — computed locally from price data
    const mvrv = closes && closes.length > 0 ? computeMvrvProxy(closes) : 1;

    // Taker trend over last 3 days
    const takerTrend = detectTakerTrend(takerRatios);

    return {
      takerBuySellRatio: latestTaker,
      topTraderLongRatio: topAcct,
      topTraderPositionLongRatio: topPos,
      mvrvProxy: mvrv,
      takerTrend,
    };
  } catch (err) {
    console.warn('[OnChainClient] Unexpected error fetching on-chain metrics:', err);
    return null;
  }
}
