import { Request, Response, NextFunction } from 'express';
import { logger } from '../shared/logger';
import { UserError, OperationalError, UnexpectedError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, ValidationError } from '../errors';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response | void {
  // Log error details
  logger.error('Error occurred:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // Handle structured errors
  if (err instanceof UserError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err instanceof ValidationError && err.fields ? { fields: err.fields } : {}),
    });
  }

  if (err instanceof OperationalError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      retryable: err.retryable,
    });
  }

  if (err instanceof UnexpectedError) {
    // Don't expose internal details in production
    const message = process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message;
    
    return res.status(500).json({
      success: false,
      error: message,
    });
  }

  // Fallback for unhandled errors
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message;

  return res.status(statusCode).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    path: req.url,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}