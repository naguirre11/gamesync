/**
 * Game Cache Utility
 * Handles caching of Steam API responses to respect rate limits
 */

import { STEAM_CONFIG } from '../../config/api.js';

class GameCache {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = STEAM_CONFIG.CACHE_DURATION;
  }

  /**
   * Generate cache key for Steam ID and request type
   * @param {string} steamId - Steam user ID
   * @param {string} requestType - Type of request (games, profile, etc.)
   * @returns {string} Cache key
   */
  generateKey(steamId, requestType = 'games') {
    return `steam_${requestType}_${steamId}`;
  }

  /**
   * Get cached data if not expired
   * @param {string} steamId - Steam user ID
   * @param {string} requestType - Type of request
   * @returns {Object|null} Cached data or null if expired/missing
   */
  get(steamId, requestType = 'games') {
    const key = this.generateKey(steamId, requestType);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Store data in cache with timestamp
   * @param {string} steamId - Steam user ID
   * @param {Object} data - Data to cache
   * @param {string} requestType - Type of request
   */
  set(steamId, data, requestType = 'games') {
    const key = this.generateKey(steamId, requestType);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear expired entries from cache
   */
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheDuration) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const value of this.cache.values()) {
      if (now - value.timestamp > this.cacheDuration) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      cacheDuration: this.cacheDuration
    };
  }
}

// Create and export singleton instance
export const gameCache = new GameCache();

// Run cleanup every 30 minutes
setInterval(() => {
  gameCache.cleanup();
}, 30 * 60 * 1000);