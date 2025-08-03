/**
 * Manual Game Entry Utility
 * Fallback option when Steam API is unavailable or profile is private
 */

/**
 * Validate manually entered game data
 * @param {Object} game - Game object to validate
 * @returns {Object} Validation result
 */
export function validateGameEntry(game) {
  const errors = [];

  if (!game.name || typeof game.name !== 'string' || game.name.trim().length === 0) {
    errors.push('Game name is required');
  }

  if (game.name && game.name.length > 100) {
    errors.push('Game name must be less than 100 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create a standardized game object from manual entry
 * @param {string} name - Game name
 * @param {Object} options - Additional game options
 * @returns {Object} Standardized game object
 */
export function createManualGameEntry(name, options = {}) {
  const validation = validateGameEntry({ name });
  
  if (!validation.isValid) {
    throw new Error(`Invalid game entry: ${validation.errors.join(', ')}`);
  }

  return {
    appId: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    source: 'manual',
    playtimeForever: options.playtime || 0,
    imgIconUrl: options.iconUrl || null,
    imgLogoUrl: options.logoUrl || null,
    addedAt: new Date().toISOString(),
    addedBy: options.userId || 'anonymous'
  };
}

/**
 * Parse game list from text input (one game per line)
 * @param {string} gameListText - Text with game names separated by newlines
 * @param {Object} options - Options for all games
 * @returns {Array} Array of game objects
 */
export function parseGameListFromText(gameListText, options = {}) {
  if (!gameListText || typeof gameListText !== 'string') {
    return [];
  }

  const lines = gameListText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const games = [];
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      const game = createManualGameEntry(lines[i], options);
      games.push(game);
    } catch (error) {
      errors.push(`Line ${i + 1}: ${error.message}`);
    }
  }

  return {
    games,
    errors,
    totalProcessed: lines.length,
    successCount: games.length,
    errorCount: errors.length
  };
}

/**
 * Find common games between manual and Steam libraries
 * @param {Array} manualGames - Manually entered games
 * @param {Array} steamGames - Games from Steam API
 * @returns {Array} Common games with fuzzy matching
 */
export function findCommonGames(manualGames, steamGames) {
  const commonGames = [];

  for (const manualGame of manualGames) {
    // Try exact match first
    let steamMatch = steamGames.find(steamGame => 
      steamGame.name.toLowerCase() === manualGame.name.toLowerCase()
    );

    // If no exact match, try fuzzy matching
    if (!steamMatch) {
      steamMatch = steamGames.find(steamGame => 
        steamGame.name.toLowerCase().includes(manualGame.name.toLowerCase()) ||
        manualGame.name.toLowerCase().includes(steamGame.name.toLowerCase())
      );
    }

    if (steamMatch) {
      commonGames.push({
        ...steamMatch,
        manualEntry: manualGame,
        matchType: steamMatch.name.toLowerCase() === manualGame.name.toLowerCase() 
          ? 'exact' : 'fuzzy'
      });
    }
  }

  return commonGames;
}

/**
 * Popular game suggestions for manual entry
 */
export const POPULAR_GAMES_SUGGESTIONS = [
  'Counter-Strike 2',
  'Dota 2',
  'PUBG: BATTLEGROUNDS',
  'Grand Theft Auto V',
  'Apex Legends',
  'Team Fortress 2',
  'Rust',
  'Dead by Daylight',
  'Garry\'s Mod',
  'Among Us',
  'Fall Guys',
  'Rocket League',
  'Valheim',
  'Minecraft',
  'Terraria',
  'Stardew Valley',
  'The Witcher 3: Wild Hunt',
  'Cyberpunk 2077',
  'Red Dead Redemption 2',
  'Elden Ring'
];

/**
 * Get game suggestions based on partial input
 * @param {string} partialName - Partial game name
 * @param {number} limit - Maximum suggestions to return
 * @returns {Array} Array of suggested game names
 */
export function getGameSuggestions(partialName, limit = 5) {
  if (!partialName || partialName.length < 2) {
    return POPULAR_GAMES_SUGGESTIONS.slice(0, limit);
  }

  const lowerPartial = partialName.toLowerCase();
  
  const matches = POPULAR_GAMES_SUGGESTIONS.filter(game =>
    game.toLowerCase().includes(lowerPartial)
  );

  return matches.slice(0, limit);
}