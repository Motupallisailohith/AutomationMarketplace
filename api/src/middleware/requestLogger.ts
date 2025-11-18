import { Request, Response, NextFunction } from 'express';
import { logger } from '../shared/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const { method, url, ip } = req;
  const userAgent = req.get('User-Agent') || '';

  // Log request start
  logger.info('Request started', {
    method,
    url,
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
  });

  // Capture response details
  const originalSend = res.send;
  res.send = function(body: any) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method,
      url,
      ip,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0,
      timestamp: new Date().toISOString(),
    });

    return originalSend.call(this, body);
  };

  next();
}