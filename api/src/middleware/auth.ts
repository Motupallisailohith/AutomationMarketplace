import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../shared/logger';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

interface AuthRequest extends Request {
  user?: JWTPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      req.user = decoded;
      
      logger.debug('User authenticated', { 
        userId: decoded.userId, 
        email: decoded.email,
        role: decoded.role 
      });
      
      next();
    } catch (jwtError) {
      logger.warn('Invalid JWT token', { 
        token: token.substring(0, 20) + '...',
        error: (jwtError as Error).message 
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
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      req.user = decoded;
    } catch (error) {
      // Token is invalid, but we don't fail - just continue without user
      logger.debug('Optional auth failed, continuing without user', { 
        error: (error as Error).message 
      });
    }
  }

  next();
};

export const requireRole = (requiredRole: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
      return;
    }

    if (req.user.role !== requiredRole && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${requiredRole}`,
      });
      return;
    }

    next();
  };
};