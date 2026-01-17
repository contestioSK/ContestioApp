/**
 * In-memory cache for high-frequency read endpoints
 * Designed for live competition data (leaderboards, statistics)
 * 
 * Strategy: Cache-first with TTL invalidation
 * - Leaderboard: 5s TTL (one calculation, thousands of reads)
 * - Statistics: 5s TTL
 * - Catches list: 3s TTL (referee needs faster updates)
 * 
 * Manual invalidation on writes for immediate consistency
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  invalidations: number;
}

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, invalidations: 0 };
  
  // TTL constants in milliseconds
  static readonly TTL = {
    LEADERBOARD: 5000,      // 5 seconds - viewers
    SECTOR_STATS: 5000,     // 5 seconds - viewers  
    CATCHES_LIST: 3000,     // 3 seconds - referee needs faster
    TEAMS_LIST: 10000,      // 10 seconds - rarely changes during event
    COMPETITION: 30000,     // 30 seconds - static during event
  };

  /**
   * Get cached data or fetch fresh data
   * @param key Cache key (e.g., 'leaderboard:competition-id')
   * @param ttl Time-to-live in milliseconds
   * @param fetcher Async function to get fresh data
   */
  async getOrFetch<T>(
    key: string, 
    ttl: number, 
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    // Return cached data if still valid
    if (cached && cached.expiresAt > now) {
      this.stats.hits++;
      return cached.data as T;
    }
    
    // Cache miss - fetch fresh data
    this.stats.misses++;
    const data = await fetcher();
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    });
    
    return data;
  }

  /**
   * Invalidate cache entries by prefix
   * Called after writes (new catch, team update, etc.)
   */
  invalidateByPrefix(prefix: string): void {
    const keysToDelete: string[] = Array.from(this.cache.keys()).filter(key => 
      key.startsWith(prefix)
    );
    
    keysToDelete.forEach(key => this.cache.delete(key));
    this.stats.invalidations += keysToDelete.length;
    
    if (keysToDelete.length > 0) {
      console.log(`[CACHE] Invalidated ${keysToDelete.length} entries with prefix: ${prefix}`);
    }
  }

  /**
   * Invalidate all cache for a competition
   * Called when catch is added/verified
   */
  invalidateCompetition(competitionId: string): void {
    this.invalidateByPrefix(`leaderboard:${competitionId}`);
    this.invalidateByPrefix(`sector-stats:${competitionId}`);
    this.invalidateByPrefix(`catches:${competitionId}`);
    this.invalidateByPrefix(`sector-leaderboards:${competitionId}`);
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    if (this.cache.delete(key)) {
      this.stats.invalidations++;
      console.log(`[CACHE] Invalidated: ${key}`);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): CacheStats & { size: number; hitRate: string } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 
      ? ((this.stats.hits / total) * 100).toFixed(1) + '%'
      : '0%';
    
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate
    };
  }

  /**
   * Clear all cache (use sparingly)
   */
  clear(): void {
    this.cache.clear();
    console.log('[CACHE] Cleared all cache');
  }

  /**
   * Clean up expired entries (called periodically)
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[CACHE] Cleaned up ${cleaned} expired entries`);
    }
  }
}

// Singleton instance
export const cache = new CacheService();

// Export TTL constants for external use
export const CacheTTL = CacheService.TTL;

// Cleanup expired entries every 30 seconds
setInterval(() => cache.cleanup(), 30000);

// Cache key generators for consistency
export const CacheKeys = {
  leaderboard: (competitionId: string) => `leaderboard:${competitionId}`,
  sectorStats: (competitionId: string, sector: string) => `sector-stats:${competitionId}:${sector}`,
  sectorLeaderboards: (competitionId: string, limit: number) => `sector-leaderboards:${competitionId}:${limit}`,
  catches: (competitionId: string) => `catches:${competitionId}`,
  teams: (competitionId: string) => `teams:${competitionId}`,
  competition: (competitionId: string) => `competition:${competitionId}`,
};
