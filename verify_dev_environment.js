#!/usr/bin/env node

/**
 * Development Environment Verification Script
 * Validates that all development tools and configurations are working correctly
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);

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
 * Check Node.js and npm versions
 */
async function checkNodeEnvironment() {
  logStep(1, 'Checking Node.js and npm versions');
  
  try {
    const { stdout: nodeVersion } = await execAsync('node --version');
    const { stdout: npmVersion } = await execAsync('npm --version');
    
    const nodeVersionNum = parseInt(nodeVersion.replace('v', '').split('.')[0]);
    const npmVersionNum = parseInt(npmVersion.split('.')[0]);
    
    if (nodeVersionNum >= 18) {
      logSuccess(`Node.js version: ${nodeVersion.trim()} (✓ >= 18)`);
    } else {
      logError(`Node.js version: ${nodeVersion.trim()} (✗ < 18)`);
      return false;
    }
    
    logSuccess(`npm version: ${npmVersion.trim()}`);
    return true;
  } catch (error) {
    logError(`Failed to check Node.js/npm: ${error.message}`);
    return false;
  }
}

/**
 * Verify Git configuration
 */
async function checkGitConfiguration() {
  logStep(2, 'Checking Git configuration');
  
  try {
    // Check if git is available
    await execAsync('git --version');
    logSuccess('Git is available');
    
    // Check if .gitignore exists
    if (existsSync('.gitignore')) {
      logSuccess('.gitignore file exists');
    } else {
      logError('.gitignore file missing');
      return false;
    }
    
    // Check git repository status
    try {
      await execAsync('git status --porcelain');
      logSuccess('Git repository is initialized');
    } catch (error) {
      logWarning('Git repository not initialized or not in git directory');
    }
    
    return true;
  } catch (error) {
    logError(`Git check failed: ${error.message}`);
    return false;
  }
}

/**
 * Test ESLint configuration
 */
async function checkESLintConfiguration() {
  logStep(3, 'Testing ESLint configuration');
  
  try {
    // Check if ESLint config exists
    if (existsSync('.eslintrc.cjs') || existsSync('.eslintrc.js')) {
      logSuccess('ESLint configuration file exists');
    } else {
      logError('ESLint configuration missing');
      return false;
    }
    
    // Test ESLint on source files
    try {
      const { stdout } = await execAsync('npx eslint src/ --format=compact');
      logSuccess('ESLint configuration is valid');
      
      if (stdout.trim()) {
        logWarning('ESLint found some issues (this is normal for initial setup)');
        console.log(stdout);
      }
    } catch (error) {
      if (error.code === 1) {
        logWarning('ESLint found linting issues (this is normal)');
      } else {
        logError(`ESLint configuration error: ${error.message}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    logError(`ESLint check failed: ${error.message}`);
    return false;
  }
}

/**
 * Test Prettier configuration
 */
async function checkPrettierConfiguration() {
  logStep(4, 'Testing Prettier configuration');
  
  try {
    // Check if Prettier config exists
    if (existsSync('.prettierrc')) {
      logSuccess('Prettier configuration file exists');
    } else {
      logError('Prettier configuration missing');
      return false;
    }
    
    // Test Prettier on a sample file
    try {
      await execAsync('npx prettier --check package.json');
      logSuccess('Prettier is working correctly');
    } catch (error) {
      if (error.code === 1) {
        logWarning('Some files need Prettier formatting (this is normal)');
      } else {
        logError(`Prettier check failed: ${error.message}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    logError(`Prettier check failed: ${error.message}`);
    return false;
  }
}

/**
 * Test pre-commit hooks
 */
async function checkPreCommitHooks() {
  logStep(5, 'Checking pre-commit hooks');
  
  try {
    // Check if Husky is installed
    if (existsSync('.husky/pre-commit')) {
      logSuccess('Husky pre-commit hook exists');
    } else {
      logError('Husky pre-commit hook missing');
      return false;
    }
    
    // Check if lint-staged is configured
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    if (packageJson['lint-staged']) {
      logSuccess('lint-staged configuration found');
    } else {
      logError('lint-staged configuration missing from package.json');
      return false;
    }
    
    logSuccess('Pre-commit hooks are configured');
    return true;
  } catch (error) {
    logError(`Pre-commit hooks check failed: ${error.message}`);
    return false;
  }
}

/**
 * Test Jest and testing setup
 */
async function checkTestingSetup() {
  logStep(6, 'Testing Jest and React Testing Library setup');
  
  try {
    // Check if Jest config exists
    if (existsSync('jest.config.js')) {
      logSuccess('Jest configuration file exists');
    } else {
      logError('Jest configuration missing');
      return false;
    }
    
    // Check if test setup exists
    if (existsSync('tests/setup.js')) {
      logSuccess('Jest setup file exists');
    } else {
      logError('Jest setup file missing');
      return false;
    }
    
    // Run existing tests
    try {
      const { stdout } = await execAsync('npm test -- --passWithNoTests --silent');
      logSuccess('Jest is working correctly');
      
      // Check if our Steam API tests pass
      try {
        await execAsync('npm test -- steamApi.test.js --silent');
        logSuccess('Steam API tests are passing');
      } catch (error) {
        logWarning('Steam API tests have issues (this might be expected)');
      }
    } catch (error) {
      logError(`Jest tests failed: ${error.message}`);
      return false;
    }
    
    return true;
  } catch (error) {
    logError(`Testing setup check failed: ${error.message}`);
    return false;
  }
}

/**
 * Check environment variables setup
 */
function checkEnvironmentVariables() {
  logStep(7, 'Checking environment variables setup');
  
  try {
    // Check if .env.example exists
    if (existsSync('.env.example')) {
      logSuccess('.env.example template exists');
    } else {
      logError('.env.example template missing');
      return false;
    }
    
    // Check if .env file exists (optional)
    if (existsSync('.env')) {
      logSuccess('.env file exists (good for local development)');
    } else {
      logWarning('.env file not found (create one from .env.example for local development)');
    }
    
    // Verify required environment variables are documented
    const envExample = readFileSync('.env.example', 'utf8');
    const requiredVars = ['STEAM_API_KEY', 'FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID'];
    
    let allFound = true;
    requiredVars.forEach(varName => {
      if (envExample.includes(varName)) {
        log(`  ✓ ${varName} documented`);
      } else {
        logError(`  ✗ ${varName} missing from .env.example`);
        allFound = false;
      }
    });
    
    return allFound;
  } catch (error) {
    logError(`Environment variables check failed: ${error.message}`);
    return false;
  }
}

/**
 * Check package dependencies
 */
function checkDependencies() {
  logStep(8, 'Checking package dependencies');
  
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    
    // Check development dependencies
    const requiredDevDeps = [
      'eslint', 'prettier', 'husky', 'lint-staged', 'jest',
      '@testing-library/react', '@testing-library/jest-dom'
    ];
    
    let allDevDepsFound = true;
    requiredDevDeps.forEach(dep => {
      if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
        log(`  ✓ ${dep}`);
      } else {
        logError(`  ✗ ${dep} missing`);
        allDevDepsFound = false;
      }
    });
    
    // Check scripts
    const requiredScripts = ['test', 'lint', 'lint:fix'];
    let allScriptsFound = true;
    requiredScripts.forEach(script => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        log(`  ✓ npm script: ${script}`);
      } else {
        logError(`  ✗ npm script missing: ${script}`);
        allScriptsFound = false;
      }
    });
    
    return allDevDepsFound && allScriptsFound;
  } catch (error) {
    logError(`Dependencies check failed: ${error.message}`);
    return false;
  }
}

/**
 * Main verification function
 */
async function runVerification() {
  log(`${colors.bold}🛠️ GameSync Development Environment Verification${colors.reset}`);
  log('========================================================');
  
  const results = [];
  
  // Run all checks
  results.push({ name: 'Node.js and npm versions', passed: await checkNodeEnvironment() });
  results.push({ name: 'Git configuration', passed: await checkGitConfiguration() });
  results.push({ name: 'ESLint configuration', passed: await checkESLintConfiguration() });
  results.push({ name: 'Prettier configuration', passed: await checkPrettierConfiguration() });
  results.push({ name: 'Pre-commit hooks', passed: await checkPreCommitHooks() });
  results.push({ name: 'Testing setup', passed: await checkTestingSetup() });
  results.push({ name: 'Environment variables', passed: checkEnvironmentVariables() });
  results.push({ name: 'Package dependencies', passed: checkDependencies() });
  
  // Summary
  log('\n========================================================');
  log(`${colors.bold}VERIFICATION SUMMARY${colors.reset}`);
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    log(`${status} ${result.name}`);
  });
  
  log(`\nOverall: ${passedTests}/${totalTests} checks passed`);
  
  if (passedTests === totalTests) {
    logSuccess('🎉 Development environment is fully configured and ready!');
    log('\nNext steps:');
    log('- Copy .env.example to .env and fill in your API keys');
    log('- Run `npm test` to verify all tests pass');
    log('- Run `npm run lint` to check code quality');
    log('- Start developing with confidence!');
    process.exit(0);
  } else {
    logError('❌ Some checks failed. Please fix the issues above.');
    log('\nRecommended actions:');
    log('- Install missing dependencies: npm install');
    log('- Fix configuration files as indicated');
    log('- Re-run this script: npm run verify:dev');
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