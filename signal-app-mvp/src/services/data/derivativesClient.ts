/**
 * Binance Futures derivatives data client — funding rates, open interest, long/short ratio.
 * All endpoints are public (no auth needed). Each cached for 1 hour.
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

// --- Funding Rate ---

interface BinanceFundingEntry {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
}

export async function getFundingRate(
  symbol: string,
): Promise<{ rate: number; timestamp: string }[]> {
  const pair = toBinanceFuturesSymbol(symbol);
  const cacheKey = `funding:${pair}`;
  const cached = getCached<{ rate: number; timestamp: string }[]>(cacheKey);
  if (cached) return cached;

  const url = `${BINANCE_FAPI}/fapi/v1/fundingRate?symbol=${pair}&limit=30`;
  const raw = await fetchJson<BinanceFundingEntry[]>(url);

  const result = raw.map((entry) => ({
    rate: Number(entry.fundingRate),
    timestamp: new Date(entry.fundingTime).toISOString(),
  }));

  setCache(cacheKey, result);
  return result;
}

// --- Open Interest History ---

interface BinanceOIEntry {
  symbol: string;
  sumOpenInterest: string;
  sumOpenInterestValue: string;
  timestamp: number;
}

export async function getOpenInterest(
  symbol: string,
): Promise<{ oi: number; timestamp: string }[]> {
  const pair = toBinanceFuturesSymbol(symbol);
  const cacheKey = `oi:${pair}`;
  const cached = getCached<{ oi: number; timestamp: string }[]>(cacheKey);
  if (cached) return cached;

  const url = `${BINANCE_FAPI}/futures/data/openInterestHist?symbol=${pair}&period=1d&limit=30`;
  const raw = await fetchJson<BinanceOIEntry[]>(url);

  const result = raw.map((entry) => ({
    oi: Number(entry.sumOpenInterestValue),
    timestamp: new Date(entry.timestamp).toISOString(),
  }));

  setCache(cacheKey, result);
  return result;
}

// --- Global Long/Short Account Ratio ---

interface BinanceLSEntry {
  symbol: string;
  longAccount: string;
  shortAccount: string;
  longShortRatio: string;
  timestamp: number;
}

export async function getLongShortRatio(
  symbol: string,
): Promise<{ longRatio: number; shortRatio: number; timestamp: string }[]> {
  const pair = toBinanceFuturesSymbol(symbol);
  const cacheKey = `ls:${pair}`;
  const cached = getCached<{ longRatio: number; shortRatio: number; timestamp: string }[]>(
    cacheKey,
  );
  if (cached) return cached;

  const url = `${BINANCE_FAPI}/futures/data/globalLongShortAccountRatio?symbol=${pair}&period=1d&limit=30`;
  const raw = await fetchJson<BinanceLSEntry[]>(url);

  const result = raw.map((entry) => ({
    longRatio: Number(entry.longAccount) * 100,   // convert to percentage
    shortRatio: Number(entry.shortAccount) * 100,
    timestamp: new Date(entry.timestamp).toISOString(),
  }));

  setCache(cacheKey, result);
  return result;
}
