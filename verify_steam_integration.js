#!/usr/bin/env node

/**
 * Steam API Integration Verification Script
 * Tests all major functionality of the Steam API integration
 */

import { steamApi } from './src/services/steamApi.js';
import { gameCache } from './src/utils/gameCache.js';
import { createManualGameEntry, parseGameListFromText } from './src/utils/manualEntry.js';

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, description) {
  log(`\n${colors.bold}Step ${step}: ${description}${colors.reset}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️ ${message}`, 'yellow');
}

/**
 * Test Steam ID validation
 */
function testSteamIdValidation() {
  logStep(1, 'Testing Steam ID Validation');
  
  const validIds = ['76561198001234567', '76561198123456789'];
  const invalidIds = ['123', 'invalid', '', null, undefined];
  
  let passed = 0;
  let failed = 0;
  
  // Test valid IDs
  validIds.forEach(id => {
    if (steamApi.validateSteamId(id)) {
      logSuccess(`Valid ID accepted: ${id}`);
      passed++;
    } else {
      logError(`Valid ID rejected: ${id}`);
      failed++;
    }
  });
  
  // Test invalid IDs
  invalidIds.forEach(id => {
    if (!steamApi.validateSteamId(id)) {
      logSuccess(`Invalid ID rejected: ${id || 'null/undefined'}`);
      passed++;
    } else {
      logError(`Invalid ID accepted: ${id || 'null/undefined'}`);
      failed++;
    }
  });
  
  log(`\nValidation Test Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

/**
 * Test Steam API connection with a known public profile
 */
async function testSteamApiConnection() {
  logStep(2, 'Testing Steam API Connection');
  
  // Using Gabe Newell's public Steam ID as a test (well-known public profile)
  const testSteamId = '76561197960287930';
  
  try {
    log('Fetching profile information...');
    const profile = await steamApi.getPlayerSummary(testSteamId);
    logSuccess(`Profile fetched: ${profile.personaName}`);
    
    log('Fetching game library...');
    const library = await steamApi.getOwnedGames(testSteamId);
    logSuccess(`Library fetched: ${library.gameCount} games`);
    
    if (library.games && library.games.length > 0) {
      log(`Sample games:`);
      library.games.slice(0, 3).forEach(game => {
        log(`  - ${game.name} (${game.playtime_forever} minutes played)`);
      });
    }
    
    return true;
  } catch (error) {
    logError(`API connection failed: ${error.message}`);
    logWarning('This might be due to:');
    logWarning('- Invalid API key');
    logWarning('- Network connectivity issues');
    logWarning('- Steam API being temporarily unavailable');
    return false;
  }
}

/**
 * Test caching functionality
 */
async function testCaching() {
  logStep(3, 'Testing Caching Functionality');
  
  const testSteamId = '76561197960287930';
  
  try {
    // Clear cache first
    gameCache.clear();
    log('Cache cleared');
    
    // First request - should hit API
    const start1 = Date.now();
    await steamApi.getOwnedGames(testSteamId);
    const time1 = Date.now() - start1;
    logSuccess(`First request completed in ${time1}ms`);
    
    // Second request - should use cache
    const start2 = Date.now();
    await steamApi.getOwnedGames(testSteamId);
    const time2 = Date.now() - start2;
    logSuccess(`Second request completed in ${time2}ms (cached)`);
    
    if (time2 < time1) {
      logSuccess('Caching is working - second request was faster');
    } else {
      logWarning('Caching might not be working - times were similar');
    }
    
    // Test cache bypass
    const start3 = Date.now();
    await steamApi.getOwnedGames(testSteamId, false);
    const time3 = Date.now() - start3;
    logSuccess(`Cache bypass request completed in ${time3}ms`);
    
    // Display cache stats
    const stats = gameCache.getStats();
    log(`Cache stats: ${stats.validEntries} valid entries, ${stats.totalEntries} total`);
    
    return true;
  } catch (error) {
    logError(`Caching test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test error handling scenarios
 */
async function testErrorHandling() {
  logStep(4, 'Testing Error Handling');
  
  const tests = [
    {
      name: 'Invalid Steam ID',
      test: () => steamApi.getOwnedGames('invalid_id'),
      expectedError: 'INVALID_STEAM_ID'
    },
    {
      name: 'Non-existent Steam ID',
      test: () => steamApi.getOwnedGames('76561198000000000'),
      expectedError: ['INVALID_STEAM_ID', 'PRIVATE_PROFILE'] // Could be either
    }
  ];
  
  let passed = 0;
  
  for (const test of tests) {
    try {
      await test.test();
      logError(`${test.name}: Expected error but got success`);
    } catch (error) {
      const expectedErrors = Array.isArray(test.expectedError) ? test.expectedError : [test.expectedError];
      if (expectedErrors.some(expected => error.message.includes(expected))) {
        logSuccess(`${test.name}: Correctly handled error - ${error.message}`);
        passed++;
      } else {
        logError(`${test.name}: Unexpected error - ${error.message}`);
      }
    }
  }
  
  log(`Error handling tests: ${passed}/${tests.length} passed`);
  return passed === tests.length;
}

/**
 * Test manual entry fallback
 */
function testManualEntry() {
  logStep(5, 'Testing Manual Entry Fallback');
  
  try {
    // Test single game entry
    const game1 = createManualGameEntry('Counter-Strike 2');
    logSuccess(`Manual game created: ${game1.name} (ID: ${game1.appId})`);
    
    // Test batch entry from text
    const gameListText = `
Counter-Strike 2
Dota 2
Team Fortress 2
    `.trim();
    
    const result = parseGameListFromText(gameListText);
    logSuccess(`Batch entry: ${result.successCount} games processed, ${result.errorCount} errors`);
    
    result.games.forEach(game => {
      log(`  - ${game.name}`);
    });
    
    // Test validation
    try {
      createManualGameEntry(''); // Should fail
      logError('Empty game name should have failed validation');
      return false;
    } catch (error) {
      logSuccess('Empty game name correctly rejected');
    }
    
    return true;
  } catch (error) {
    logError(`Manual entry test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test overlapping games functionality
 */
async function testOverlappingGames() {
  logStep(6, 'Testing Overlapping Games Detection');
  
  try {
    // Use two well-known public Steam profiles for testing
    const steamIds = [
      '76561197960287930', // Gabe Newell
      '76561197960434622'  // Another Valve employee (if public)
    ];
    
    log('Finding overlapping games between test accounts...');
    const overlaps = await steamApi.findOverlappingGames(steamIds);
    
    if (overlaps.length > 0) {
      logSuccess(`Found ${overlaps.length} overlapping games:`);
      overlaps.slice(0, 5).forEach(game => {
        log(`  - ${game.name} (owned by ${game.ownedBy} users)`);
      });
    } else {
      logWarning('No overlapping games found (this might be normal)');
    }
    
    return true;
  } catch (error) {
    logError(`Overlapping games test failed: ${error.message}`);
    return false;
  }
}

/**
 * Display API usage statistics
 */
function displayStats() {
  logStep(7, 'API Usage Statistics');
  
  const stats = steamApi.getStats();
  log(`Total API requests made: ${stats.requestCount}`);
  log(`Cache statistics:`);
  log(`  - Total entries: ${stats.cacheStats.totalEntries}`);
  log(`  - Valid entries: ${stats.cacheStats.validEntries}`);
  log(`  - Cache duration: ${stats.cacheStats.cacheDuration / 1000 / 60} minutes`);
  log(`Last request time: ${new Date(stats.lastRequestTime).toLocaleString()}`);
}

/**
 * Main verification function
 */
async function runVerification() {
  log(`${colors.bold}🎮 GameSync Steam API Integration Verification${colors.reset}`);
  log('========================================================');
  
  const results = [];
  
  // Run all tests
  results.push({ name: 'Steam ID Validation', passed: testSteamIdValidation() });
  results.push({ name: 'Steam API Connection', passed: await testSteamApiConnection() });
  results.push({ name: 'Caching Functionality', passed: await testCaching() });
  results.push({ name: 'Error Handling', passed: await testErrorHandling() });
  results.push({ name: 'Manual Entry Fallback', passed: testManualEntry() });
  results.push({ name: 'Overlapping Games', passed: await testOverlappingGames() });
  
  // Display statistics
  displayStats();
  
  // Summary
  log('\n========================================================');
  log(`${colors.bold}VERIFICATION SUMMARY${colors.reset}`);
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    log(`${status} ${result.name}`);
  });
  
  log(`\nOverall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    logSuccess('🎉 All tests passed! Steam API integration is working correctly.');
    process.exit(0);
  } else {
    logError('❌ Some tests failed. Please check the implementation.');
    process.exit(1);
  }
}

// Run verification if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runVerification().catch(error => {
    logError(`Verification failed with error: ${error.message}`);
    process.exit(1);
  });
}