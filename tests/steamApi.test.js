/**
 * Steam API Service Tests
 * Unit tests for Steam Web API integration
 */

import { steamApi } from '../src/services/steamApi.js';
import { gameCache } from '../src/utils/gameCache.js';
import { STEAM_ERRORS } from '../config/api.js';

// Mock fetch for testing
global.fetch = jest.fn();

describe('SteamApiService', () => {
  beforeEach(() => {
    // Clear cache before each test
    gameCache.clear();
    // Reset fetch mock
    fetch.mockClear();
  });

  describe('validateSteamId', () => {
    test('should validate correct Steam ID format', () => {
      const validId = '76561198001234567';
      expect(steamApi.validateSteamId(validId)).toBe(true);
    });

    test('should reject invalid Steam ID formats', () => {
      const invalidIds = [
        '123456789', // too short
        '765611980012345678', // too long
        '7656119800123456a', // contains letter
        '', // empty
        null, // null
        undefined // undefined
      ];

      invalidIds.forEach(id => {
        expect(steamApi.validateSteamId(id)).toBe(false);
      });
    });
  });

  describe('getOwnedGames', () => {
    const mockSteamId = '76561198001234567';
    const mockResponse = {
      response: {
        game_count: 2,
        games: [
          {
            appid: 730,
            name: 'Counter-Strike 2',
            playtime_forever: 1000,
            img_icon_url: 'test_icon',
            img_logo_url: 'test_logo'
          },
          {
            appid: 570,
            name: 'Dota 2',
            playtime_forever: 500
          }
        ]
      }
    };

    test('should fetch and return owned games', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await steamApi.getOwnedGames(mockSteamId);

      expect(result.steamId).toBe(mockSteamId);
      expect(result.gameCount).toBe(2);
      expect(result.games).toHaveLength(2);
      expect(result.games[0].name).toBe('Counter-Strike 2');
    });

    test('should use cached data when available', async () => {
      // First call - should make API request
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await steamApi.getOwnedGames(mockSteamId);
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result = await steamApi.getOwnedGames(mockSteamId);
      expect(fetch).toHaveBeenCalledTimes(1); // No additional API call
      expect(result.steamId).toBe(mockSteamId);
    });

    test('should bypass cache when useCache is false', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      await steamApi.getOwnedGames(mockSteamId);
      await steamApi.getOwnedGames(mockSteamId, false);
      
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('should throw error for invalid Steam ID', async () => {
      await expect(steamApi.getOwnedGames('invalid')).rejects.toThrow(STEAM_ERRORS.INVALID_STEAM_ID);
    });

    test('should handle private profile error', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: {} }) // Empty response indicates private profile
      });

      await expect(steamApi.getOwnedGames(mockSteamId)).rejects.toThrow(STEAM_ERRORS.PRIVATE_PROFILE);
    });

    test('should handle rate limit error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 429
      });

      await expect(steamApi.getOwnedGames(mockSteamId)).rejects.toThrow(STEAM_ERRORS.RATE_LIMIT_EXCEEDED);
    });

    test('should handle network error', async () => {
      fetch.mockRejectedValueOnce(new TypeError('Network request failed'));

      await expect(steamApi.getOwnedGames(mockSteamId)).rejects.toThrow(STEAM_ERRORS.NETWORK_ERROR);
    });
  });

  describe('findOverlappingGames', () => {
    const steamId1 = '76561198001234567';
    const steamId2 = '76561198001234568';

    const mockLibrary1 = {
      steamId: steamId1,
      games: [
        { appid: 730, name: 'Counter-Strike 2' },
        { appid: 570, name: 'Dota 2' },
        { appid: 440, name: 'Team Fortress 2' }
      ]
    };

    const mockLibrary2 = {
      steamId: steamId2,
      games: [
        { appid: 730, name: 'Counter-Strike 2' },
        { appid: 570, name: 'Dota 2' },
        { appid: 1086940, name: 'Baldur\'s Gate 3' }
      ]
    };

    test('should find overlapping games between libraries', async () => {
      // Mock the getOwnedGames calls
      jest.spyOn(steamApi, 'getOwnedGames')
        .mockResolvedValueOnce(mockLibrary1)
        .mockResolvedValueOnce(mockLibrary2);

      const overlaps = await steamApi.findOverlappingGames([steamId1, steamId2]);

      expect(overlaps).toHaveLength(2);
      expect(overlaps.map(g => g.name)).toContain('Counter-Strike 2');
      expect(overlaps.map(g => g.name)).toContain('Dota 2');
      expect(overlaps.every(g => g.ownedBy === 2)).toBe(true);
    });

    test('should handle failed library fetches gracefully', async () => {
      jest.spyOn(steamApi, 'getOwnedGames')
        .mockResolvedValueOnce(mockLibrary1)
        .mockRejectedValueOnce(new Error(STEAM_ERRORS.PRIVATE_PROFILE));

      const overlaps = await steamApi.findOverlappingGames([steamId1, steamId2]);

      expect(overlaps).toHaveLength(0); // No overlaps possible with failed library
    });

    test('should require at least 2 Steam IDs', async () => {
      await expect(steamApi.findOverlappingGames([steamId1])).rejects.toThrow('At least 2 Steam IDs required');
    });
  });

  describe('processGamesList', () => {
    test('should process raw games data into clean format', () => {
      const rawGames = [
        {
          appid: 730,
          name: 'Counter-Strike 2',
          playtime_forever: 1000,
          playtime_2weeks: 50,
          img_icon_url: 'icon',
          img_logo_url: 'logo',
          has_community_visible_stats: true
        }
      ];

      const processed = steamApi.processGamesList(rawGames);

      expect(processed[0]).toEqual({
        appId: 730,
        name: 'Counter-Strike 2',
        playtimeForever: 1000,
        playtime2Weeks: 50,
        imgIconUrl: 'icon',
        imgLogoUrl: 'logo',
        hasPublicStatsSupport: true
      });
    });

    test('should handle missing optional fields', () => {
      const rawGames = [
        {
          appid: 730,
          name: 'Counter-Strike 2'
        }
      ];

      const processed = steamApi.processGamesList(rawGames);

      expect(processed[0].playtimeForever).toBe(0);
      expect(processed[0].playtime2Weeks).toBe(0);
      expect(processed[0].hasPublicStatsSupport).toBe(false);
    });
  });
});