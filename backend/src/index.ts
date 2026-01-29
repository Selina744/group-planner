/**
 * Main entry point for Group Planner API
 *
 * This file serves as the primary entry point and delegates to the server module.
 * It handles environment setup and basic initialization before starting the server.
 */

import { config } from 'dotenv';
import { log } from './utils/logger.js';
import { GroupPlannerServer } from './server.js';

// Load environment variables
config();

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName] || process.env[varName]?.trim() === '');

if (missingEnvVars.length > 0) {
  log.error('Missing required environment variables', {
    missing: missingEnvVars,
  });
  process.exit(1);
}

// Initialize and start the server
async function main() {
  try {
    const server = new GroupPlannerServer();
    await server.start();
  } catch (error) {
    log.error('Failed to start application', error);
    process.exit(1);
  }
}

// Start the application
main();