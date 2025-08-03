export default {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files  
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Enable ES modules
  preset: null,
  
  // Module handling
  extensionsToTreatAsEsm: ['.jsx'],
  transform: {},
  
  // Test patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.test.jsx',
    '**/__tests__/**/*.js',
    '**/__tests__/**/*.jsx'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.test.{js,jsx}',
    '!src/index.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Module paths  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/tests/__mocks__/fileMock.js'
  },
  
  // Transform ignore patterns for node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch|fetch-mock|@testing-library)/)'
  ],
  
  // Global settings
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // Verbose output for debugging
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true
};