/**
 * Routes module exports for Group Planner API
 *
 * This module provides centralized exports for all route modules
 * and route configuration utilities.
 */

// Auth routes
export { default as authRoutes } from './auth.js';

// Documentation routes
export { default as docsRoutes } from './docs.js';

// Health routes
export { default as healthRoutes } from './health.js';

// Trip routes
export { default as tripRoutes } from './trip.js';

// Event routes
export { default as eventRoutes } from './event.js';

// Item routes
export { default as itemRoutes } from './item.js';

/**
 * Route configuration for the application
 * This will be used to mount routes in the main app
 */
export const routeConfig = {
  auth: {
    path: '/auth',
    router: 'authRoutes',
  },
  docs: {
    path: '/docs',
    router: 'docsRoutes',
  },
  health: {
    path: '/health',
    router: 'healthRoutes',
  },
  trips: {
    path: '/trips',
    router: 'tripRoutes',
  },
  events: {
    path: '/events',
    router: 'eventRoutes',
  },
  items: {
    path: '/items',
    router: 'itemRoutes',
  },
  // Future routes will be added here
  // users: {
  //   path: '/users',
  //   router: 'userRoutes',
  // },
};

/**
 * API versioning configuration
 */
export const apiConfig = {
  version: 'v1',
  basePath: '/api',
};

/**
 * Get full API path for routes
 */
export function getApiPath(routePath: string): string {
  return `${apiConfig.basePath}/${apiConfig.version}${routePath}`;
}