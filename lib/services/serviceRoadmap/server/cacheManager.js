/**
 * Simple in-memory cache manager for GitHub API responses
 * Helps avoid hitting GitHub API rate limits (60/hour unauthenticated, 5000/hour authenticated)
 */
export class GitHubCacheManager {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @param {boolean} allowExpired - Return even if expired (for rate limit fallback)
   * @returns {any|null} Cached value or null
   */
  get(key, allowExpired = false) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const isExpired = now > entry.expiresAt;

    if (isExpired && !allowExpired) {
      // Clean up expired entry
      this.cache.delete(key);
      return null;
    }

    // Return data (even if expired when allowExpired=true)
    return entry.data;
  }

  /**
   * Set cache value with TTL
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, data, ttl) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    const isExpired = now > entry.expiresAt;

    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear expired entries
   * @returns {number} Number of entries cleared
   */
  cleanup() {
    const now = Date.now();
    let cleared = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      console.log(`🗑️ [GitHubCacheManager] Cleaned up ${cleared} expired entries`);
    }

    return cleared;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ [GitHubCacheManager] Cleared all cache (${size} entries)`);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
    };
  }
}

// Create singleton instance
const cacheManager = new GitHubCacheManager();

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cacheManager.cleanup();
  }, 5 * 60 * 1000);
}

export default cacheManager;
