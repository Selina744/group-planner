/**
 * Documentation routes for Group Planner API
 *
 * This module provides Swagger/OpenAPI documentation routes
 * with comprehensive API documentation and examples.
 */

import express from 'express';
import swaggerUi from 'swagger-ui-express';
import {
  swaggerSpec,
  swaggerUiOptions,
  docsHealthHandler,
  openApiSpecHandler
} from '../docs/swagger.js';
import { wrapAsync } from '../utils/wrapAsync.js';
import { middleware } from '../middleware/index.js';

const router: express.Router = express.Router();

/**
 * GET /docs/health - Documentation health check
 */
router.get('/health', middleware.context as any, docsHealthHandler as any);

/**
 * GET /docs/openapi.json - OpenAPI specification
 */
router.get('/openapi.json', middleware.context as any, openApiSpecHandler as any);

/**
 * GET /docs - Swagger UI documentation
 */
router.use(
  '/',
  middleware.context as any,
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerUiOptions)
);

export default router;