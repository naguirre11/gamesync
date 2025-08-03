/**
 * Steam Web API Service
 * Handles all Steam API interactions with caching and error handling
 */

import { STEAM_CONFIG, STEAM_ERRORS, DEFAULT_PARAMS } from '../../config/api.js';
import { gameCache } from '../utils/gameCache.js';

class SteamApiService {
  constructor() {
    this.baseUrl = STEAM_CONFIG.BASE_URL;
    this.apiKey = STEAM_CONFIG.API_KEY;
    this.requestCount = 0;
    this.lastRequestTime = 0;
  }

  /**
   * Rate limiting - ensure we don't exceed Steam API limits
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / STEAM_CONFIG.RATE_LIMITS.REQUESTS_PER_SECOND;

    if (timeSinceLastRequest < minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, minInterval - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Validate Steam ID format
   * @param {string} steamId - Steam ID to validate
   * @returns {boolean} True if valid format
   */
  validateSteamId(steamId) {
    // Steam ID should be 17 digits
    return /^\d{17}$/.test(steamId);
  }

  /**
   * Make HTTP request to Steam API with error handling
   * @param {string} url - API endpoint URL
   * @returns {Promise<Object>} API response data
   */
  async makeRequest(url) {
    await this.enforceRateLimit();

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(STEAM_ERRORS.RATE_LIMIT_EXCEEDED);
        } else if (response.status === 403) {
          throw new Error(STEAM_ERRORS.PRIVATE_PROFILE);
        } else {
          throw new Error(STEAM_ERRORS.API_UNAVAILABLE);
        }
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === 'TypeError' || error.message.includes('fetch')) {
        throw new Error(STEAM_ERRORS.NETWORK_ERROR);
      }
      throw error;
    }
  }

  /**
   * Get player's owned games from Steam
   * @param {string} steamId - Steam user ID
   * @param {boolean} useCache - Whether to use cached data
   * @returns {Promise<Object>} Player's game library
   */
  async getOwnedGames(steamId, useCache = true) {
    // Validate Steam ID
    if (!this.validateSteamId(steamId)) {
      throw new Error(STEAM_ERRORS.INVALID_STEAM_ID);
    }

    // Check cache first
    if (useCache) {
      const cached = gameCache.get(steamId, 'games');
      if (cached) {
        return cached;
      }
    }

    // Build API URL
    const params = new URLSearchParams({
      key: this.apiKey,
      steamid: steamId,
      ...DEFAULT_PARAMS
    });

    const url = `${this.baseUrl}${STEAM_CONFIG.ENDPOINTS.GET_OWNED_GAMES}?${params}`;

    try {
      const data = await this.makeRequest(url);
      
      // Check if profile is private
      if (!data.response || !data.response.games) {
        throw new Error(STEAM_ERRORS.PRIVATE_PROFILE);
      }

      const result = {
        steamId,
        gameCount: data.response.game_count || 0,
        games: data.response.games || [],
        fetchedAt: new Date().toISOString()
      };

      // Cache the result
      gameCache.set(steamId, result, 'games');

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get player summary/profile info
   * @param {string} steamId - Steam user ID
   * @returns {Promise<Object>} Player profile data
   */
  async getPlayerSummary(steamId) {
    if (!this.validateSteamId(steamId)) {
      throw new Error(STEAM_ERRORS.INVALID_STEAM_ID);
    }

    // Check cache
    const cached = gameCache.get(steamId, 'profile');
    if (cached) {
      return cached;
    }

    const params = new URLSearchParams({
      key: this.apiKey,
      steamids: steamId
    });

    const url = `${this.baseUrl}${STEAM_CONFIG.ENDPOINTS.GET_PLAYER_SUMMARIES}?${params}`;

    try {
      const data = await this.makeRequest(url);
      
      if (!data.response || !data.response.players || data.response.players.length === 0) {
        throw new Error(STEAM_ERRORS.INVALID_STEAM_ID);
      }

      const player = data.response.players[0];
      const result = {
        steamId: player.steamid,
        personaName: player.personaname,
        profileUrl: player.profileurl,
        avatar: player.avatar,
        profileVisibility: player.communityvisibilitystate
      };

      // Cache profile data
      gameCache.set(steamId, result, 'profile');

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Process raw games list into cleaner format
   * @param {Array} games - Raw games array from Steam API
   * @returns {Array} Processed games array
   */
  processGamesList(games) {
    return games.map(game => ({
      appId: game.appid,
      name: game.name,
      playtimeForever: game.playtime_forever || 0,
      playtime2Weeks: game.playtime_2weeks || 0,
      imgIconUrl: game.img_icon_url,
      imgLogoUrl: game.img_logo_url,
      hasPublicStatsSupport: game.has_community_visible_stats || false
    }));
  }

  /**
   * Find overlapping games between multiple Steam libraries
   * @param {Array} steamIds - Array of Steam user IDs
   * @returns {Promise<Array>} Array of common games
   */
  async findOverlappingGames(steamIds) {
    if (!steamIds || steamIds.length < 2) {
      throw new Error('At least 2 Steam IDs required to find overlaps');
    }

    const libraries = [];

    // Fetch all libraries
    for (const steamId of steamIds) {
      try {
        const library = await this.getOwnedGames(steamId);
        libraries.push({
          steamId,
          games: library.games
        });
      } catch (error) {
        // Continue with other libraries if one fails
        console.warn(`Failed to fetch library for ${steamId}:`, error.message);
        libraries.push({
          steamId,
          games: [],
          error: error.message
        });
      }
    }

    // Find games that appear in ALL libraries
    if (libraries.length === 0) {
      return [];
    }

    const firstLibrary = libraries[0].games;
    const overlappingGames = [];

    for (const game of firstLibrary) {
      const appearsInAll = libraries.every(library => 
        library.games.some(libGame => libGame.appid === game.appid)
      );

      if (appearsInAll) {
        overlappingGames.push({
          appId: game.appid,
          name: game.name,
          imgIconUrl: game.img_icon_url,
          ownedBy: steamIds.length
        });
      }
    }

    return overlappingGames;
  }

  /**
   * Get service statistics
   * @returns {Object} Service usage stats
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      cacheStats: gameCache.getStats(),
      lastRequestTime: this.lastRequestTime
    };
  }
}

// Export singleton instance
export const steamApi = new SteamApiService();