import type { Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import type { ZodTypeAny } from 'zod'
import { formatZodErrors, createValidationError } from '../utils/apiResponse.js'
import { ValidationError as ValidationException } from '../utils/errors.js'
import { log } from '../utils/logger.js'
import type { AuthenticatedRequest } from '../types/middleware.js'

type SchemaTarget = 'body' | 'query' | 'params'

export interface ValidationSchemaMap {
  body?: ZodTypeAny
  query?: ZodTypeAny
  params?: ZodTypeAny
  custom?: (
    req: AuthenticatedRequest
  ) => Promise<string[] | BackendValidationError[]> | string[] | BackendValidationError[] | null
}

export type BackendValidationError = ReturnType<typeof createValidationError>

/**
 * Builds a schema-aware validation middleware that normalizes Zod issues into ApiValidationError[]
 * and reuses the dedicated ValidationError exception when checks fail.
 */
export function validateRequest(schemas: ValidationSchemaMap) {
  const schemaEntries: Array<[SchemaTarget, ZodTypeAny]> = []

  if (schemas.body) {
    schemaEntries.push(['body', schemas.body])
  }
  if (schemas.query) {
    schemaEntries.push(['query', schemas.query])
  }
  if (schemas.params) {
    schemaEntries.push(['params', schemas.params])
  }

  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const errors: BackendValidationError[] = []

    const assignParsedData = (target: SchemaTarget, data: unknown) => {
      switch (target) {
        case 'body':
          req.body = data
          break
        case 'query':
          req.query = data
          break
        case 'params':
          req.params = data
          break
      }
    }

    const applySchema = (schema: ZodTypeAny, target: SchemaTarget) => {
      const value = req[target]
      const result = schema.safeParse(value)

      if (!result.success) {
        const issueErrors = formatZodErrors(result.error)
        errors.push(
          ...issueErrors.map((issue) =>
            issue.field === 'unknown'
              ? createValidationError(target, issue.message, issue.code, issue.value)
              : issue
          )
        )
        return
      }

      assignParsedData(target, result.data)
    }

    try {
      for (const [location, schema] of schemaEntries) {
        applySchema(schema, location)
      }

      if (schemas.custom) {
        const customResult = await Promise.resolve(schemas.custom(req))
        if (Array.isArray(customResult)) {
          customResult.forEach((entry, index) => {
            if (typeof entry === 'string') {
              errors.push(
                createValidationError(`custom.${index}`, entry, undefined, undefined)
              )
              return
            }
            errors.push(entry)
          })
        }
      }

      if (errors.length > 0) {
        log.warn('Request validation failed', {
          path: req.path,
          method: req.method,
          errors,
        })
        return next(
          new ValidationException('Request validation failed', {
            errors,
          })
        )
      }

      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          new ValidationException('Request validation failed', {
            errors: formatZodErrors(error),
          })
        )
      }
      log.error('Validation middleware error', error)
      next(error)
    }
  }
}
