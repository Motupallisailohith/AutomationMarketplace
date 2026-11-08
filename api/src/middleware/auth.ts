import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../shared/logger';
import type { User } from '@n8n/db';

interface AuthRequest extends Request {
  user?: User;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
      });
      return;
    }

    try {
      const user = await authService.verifyToken(token);
      req.user = user;
      
      logger.debug('User authenticated', { 
        userId: user.id, 
        email: user.email,
      });
      
      next();
    } catch (error) {
      logger.warn('Invalid JWT token', { 
        error: (error as Error).message 
      });
      
      res.status(401).json({
        success: false,
        error: 'Invalid token.',
      });
      return;
    }
  } catch (error) {
    logger.error('Auth middleware error:', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Authentication error.',
    });
    return;
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (token) {
    try {
      const user = await authService.verifyToken(token);
      req.user = user;
    } catch (error) {
      // Token is invalid, but we don't fail - just continue without user
      logger.debug('Optional auth failed, continuing without user', { 
        error: (error as Error).message 
      });
    }
  }

  next();
};

export const requireRole = (requiredRoleSlug: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
      return;
    }

    const userRole = req.user.role?.slug;
    if (userRole !== requiredRoleSlug && userRole !== 'admin') {
      res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${requiredRoleSlug}`,
      });
      return;
    }

    next();
  };
};