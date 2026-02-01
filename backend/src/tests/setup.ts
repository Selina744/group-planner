/**
 * Global Test Setup
 *
 * This file runs before all tests to configure the test environment
 */

import { config } from 'dotenv';
import { setupTestEnvironment } from './utils/index.js';

// Load test environment variables first
config({ path: '.env.test' });

// Setup test environment
setupTestEnvironment();

// Global test configuration
process.env.NODE_ENV = 'test';

// Silence console logs during tests unless DEBUG_TESTS is set
if (!process.env.DEBUG_TESTS) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = () => {};
  console.error = (message, ...args) => {
    // Still show errors, but filter out routine ones
    if (typeof message === 'string' && message.includes('Test database')) {
      return;
    }
    originalError(message, ...args);
  };
  console.warn = () => {};

  // Restore for cleanup
  global.__originalConsole = {
    log: originalLog,
    error: originalError,
    warn: originalWarn
  };
}

// Handle process cleanup
process.on('exit', () => {
  // Any cleanup code here
});

process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});