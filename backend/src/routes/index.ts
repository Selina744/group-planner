/**
 * Routes module exports for Group Planner API
 *
 * This module provides centralized exports for all route modules
 * and route configuration utilities.
 */

// Auth routes
export { default as authRoutes } from './auth.js';

/**
 * Route configuration for the application
 * This will be used to mount routes in the main app
 */
export const routeConfig = {
  auth: {
    path: '/auth',
    router: 'authRoutes',
  },
  // Future routes will be added here
  // trips: {
  //   path: '/trips',
  //   router: 'tripRoutes',
  // },
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