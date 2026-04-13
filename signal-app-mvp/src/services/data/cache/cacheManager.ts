import fs from 'fs/promises';
import path from 'path';
import type { PriceSeries } from '@/models/PriceData';

const CACHE_DIR = path.join(process.cwd(), '.cache', 'price_data');
const CACHE_VALIDITY_MS = 4 * 60 * 60 * 1000; // 4 hours — ensures prices refresh multiple times per day

interface CacheEntry {
  data: PriceSeries;
  timestamp: number;
}

/**
 * Manages caching of price data to reduce API calls
 * Stores data in local files with automatic expiration
 */
export class CacheManager {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private dirInitialized = false;

  private async ensureDir(): Promise<void> {
    if (this.dirInitialized) return;
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      this.dirInitialized = true;
    } catch (error) {
      console.error('[CacheManager] Failed to create cache directory:', error);
    }
  }

  async init(): Promise<void> {
    await this.ensureDir();
  }

  async get(key: string): Promise<PriceSeries | null> {
    // Check memory cache first
    const memEntry = this.memoryCache.get(key);
    if (memEntry && !this.isExpired(memEntry.timestamp)) {
      console.log(`[Cache] Memory hit: ${key}`);
      return memEntry.data;
    }

    // Check disk cache
    try {
      const filePath = this.getFilePath(key);
      const content = await fs.readFile(filePath, 'utf-8');
      const entry: CacheEntry = JSON.parse(content);

      if (!this.isExpired(entry.timestamp)) {
        // Re-populate memory cache
        this.memoryCache.set(key, entry);
        console.log(`[Cache] Disk hit: ${key}`);
        return entry.data;
      } else {
        // Expired, delete file
        await fs.unlink(filePath);
      }
    } catch (error) {
      // File not found or parse error, not in cache
    }

    return null;
  }

  async set(key: string, data: PriceSeries): Promise<void> {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now()
    };

    // Store in memory cache
    this.memoryCache.set(key, entry);

    // Store on disk
    try {
      await this.ensureDir();
      const filePath = this.getFilePath(key);
      await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
      console.log(`[Cache] Stored: ${key}`);
    } catch (error) {
      console.error(`[Cache] Failed to write cache file for ${key}:`, error);
      // Continue anyway, memory cache is still valid
    }
  }

  async clear(symbol: string): Promise<void> {
    // Remove from memory cache
    for (const key of this.memoryCache.keys()) {
      if (key.includes(symbol)) {
        this.memoryCache.delete(key);
      }
    }

    // Remove from disk
    try {
      const files = await fs.readdir(CACHE_DIR);
      for (const file of files) {
        if (file.includes(symbol)) {
          await fs.unlink(path.join(CACHE_DIR, file));
        }
      }
    } catch (error) {
      console.error(`[Cache] Failed to clear disk cache for ${symbol}:`, error);
    }
  }

  async clearAll(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear disk cache
    try {
      await this.ensureDir();
      const files = await fs.readdir(CACHE_DIR);
      for (const file of files) {
        await fs.unlink(path.join(CACHE_DIR, file));
      }
      console.log('[Cache] Cleared all caches');
    } catch (error) {
      console.error('[Cache] Failed to clear disk cache:', error);
    }
  }

  async getStats(): Promise<{ size: number; entries: number; oldestEntry?: Date }> {
    let totalSize = 0;
    let oldestTimestamp = Infinity;

    try {
      await this.ensureDir();
      const files = await fs.readdir(CACHE_DIR);
      for (const file of files) {
        const filePath = path.join(CACHE_DIR, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        oldestTimestamp = Math.min(oldestTimestamp, stats.mtime.getTime());
      }
    } catch (error) {
      // Cache dir might not exist yet, that's okay
    }

    return {
      size: totalSize,
      entries: this.memoryCache.size,
      oldestEntry: oldestTimestamp === Infinity ? undefined : new Date(oldestTimestamp)
    };
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > CACHE_VALIDITY_MS;
  }

  private getFilePath(key: string): string {
    // Sanitize key for filename
    const filename = key.replace(/[^a-z0-9_-]/gi, '_') + '.json';
    return path.join(CACHE_DIR, filename);
  }
}
