/**
 * Structured error handling system based on n8n's error architecture
 * Provides semantic error types for better error handling and user messaging
 */

/**
 * UserError - For user mistakes and invalid input
 * Examples: wrong credentials, invalid data format, missing required fields
 */
export class UserError extends Error {
  readonly statusCode: number;
  readonly level: 'info' | 'warning' = 'info';

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'UserError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * OperationalError - For expected runtime issues
 * Examples: database unavailable, API rate limit, network timeout
 */
export class OperationalError extends Error {
  readonly statusCode: number;
  readonly level: 'warning' | 'error' = 'warning';
  readonly retryable: boolean;

  constructor(message: string, statusCode: number = 503, retryable: boolean = true) {
    super(message);
    this.name = 'OperationalError';
    this.statusCode = statusCode;
    this.retryable = retryable;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * UnexpectedError - For bugs and system failures
 * Examples: null pointer, type errors, unhandled cases
 */
export class UnexpectedError extends Error {
  readonly statusCode: number = 500;
  readonly level: 'error' = 'error';
  readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'UnexpectedError';
    this.cause = cause;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * NotFoundError - For missing resources
 * Convenience wrapper around UserError
 */
export class NotFoundError extends UserError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * UnauthorizedError - For authentication failures
 * Convenience wrapper around UserError
 */
export class UnauthorizedError extends UserError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * ForbiddenError - For authorization failures
 * Convenience wrapper around UserError
 */
export class ForbiddenError extends UserError {
  constructor(message: string = 'Forbidden - insufficient permissions') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * ConflictError - For resource conflicts
 * Convenience wrapper around UserError
 */
export class ConflictError extends UserError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * ValidationError - For input validation failures
 * Convenience wrapper around UserError
 */
export class ValidationError extends UserError {
  readonly fields?: Record<string, string>;

  constructor(message: string, fields?: Record<string, string>) {
    super(message, 400);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

/**
 * BadRequestError - For malformed or invalid requests
 * Convenience wrapper around UserError (n8n compatibility)
 */
export class BadRequestError extends UserError {
  readonly httpStatusCode: number;

  constructor(message: string) {
    super(message, 400);
    this.name = 'BadRequestError';
    this.httpStatusCode = 400;
  }
}

/**
 * InternalServerError - For internal server failures
 * Convenience wrapper around UnexpectedError (n8n compatibility)
 */
export class InternalServerError extends UnexpectedError {
  readonly httpStatusCode: number;

  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'InternalServerError';
    this.httpStatusCode = 500;
  }
}
