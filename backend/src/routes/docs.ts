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

const router = express.Router();

/**
 * GET /docs/health - Documentation health check
 */
router.get('/health', middleware.context, wrapAsync(docsHealthHandler));

/**
 * GET /docs/openapi.json - OpenAPI specification
 */
router.get('/openapi.json', middleware.context, openApiSpecHandler);

/**
 * GET /docs - Swagger UI documentation
 */
router.use(
  '/',
  middleware.context,
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerUiOptions)
);

export default router;