/**
 * Fear & Greed Index client — fetches from alternative.me (no auth needed).
 * Updates daily; we cache for 4 hours.
 */

const FNG_API = 'https://api.alternative.me/fng/';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

interface FngApiEntry {
  value: string;
  value_classification: string;
  timestamp: string;
}

interface FngApiResponse {
  data: FngApiEntry[];
}

interface FngCacheEntry {
  data: FngApiResponse;
  fetchedAt: number;
}

let fngCache: FngCacheEntry | null = null;

async function fetchFng(limit: number): Promise<FngApiResponse> {
  // Return cache if fresh enough and covers the requested limit
  if (
    fngCache &&
    Date.now() - fngCache.fetchedAt < CACHE_TTL_MS &&
    fngCache.data.data.length >= limit
  ) {
    return fngCache.data;
  }

  const url = `${FNG_API}?limit=${limit}&format=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    throw new Error(`FNG API error: ${res.status} ${res.statusText}`);
  }
  const json: FngApiResponse = await res.json();
  fngCache = { data: json, fetchedAt: Date.now() };
  return json;
}

/**
 * Current Fear & Greed Index value (0-100).
 */
export async function getFearGreedIndex(): Promise<{
  value: number;
  classification: string;
  timestamp: string;
}> {
  const res = await fetchFng(1);
  const entry = res.data[0];
  return {
    value: Number(entry.value),
    classification: entry.value_classification,
    timestamp: entry.timestamp,
  };
}

/**
 * Historical FGI values for the last N days.
 */
export async function getFearGreedHistory(
  days: number,
): Promise<Array<{ value: number; date: string }>> {
  const res = await fetchFng(days);
  return res.data.map((entry) => ({
    value: Number(entry.value),
    date: new Date(Number(entry.timestamp) * 1000).toISOString().split('T')[0],
  }));
}
