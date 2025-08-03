/**
 * API Configuration for GameSync
 * Contains Steam Web API settings and endpoints
 */

// Steam Web API Configuration
export const STEAM_CONFIG = {
  API_KEY: '40780738BCB913A5D618F02F4DAF6EED',
  BASE_URL: 'https://api.steampowered.com',
  ENDPOINTS: {
    GET_OWNED_GAMES: '/IPlayerService/GetOwnedGames/v0001/',
    GET_PLAYER_SUMMARIES: '/ISteamUser/GetPlayerSummaries/v0002/',
    GET_APP_DETAILS: 'https://store.steampowered.com/api/appdetails'
  },
  RATE_LIMITS: {
    REQUESTS_PER_SECOND: 1,
    REQUESTS_PER_DAY: 100000
  },
  CACHE_DURATION: 60 * 60 * 1000 // 1 hour in milliseconds
};

// Error codes and messages
export const STEAM_ERRORS = {
  PRIVATE_PROFILE: 'PRIVATE_PROFILE',
  INVALID_STEAM_ID: 'INVALID_STEAM_ID',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  API_UNAVAILABLE: 'API_UNAVAILABLE',
  NETWORK_ERROR: 'NETWORK_ERROR'
};

// Default parameters for API calls
export const DEFAULT_PARAMS = {
  format: 'json',
  include_appinfo: true,
  include_played_free_games: true
};