import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { AuthService } from '../services';
import { AuthenticatedRequest } from '../types';

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Get auth service from DI container
    const authService = container.resolve(AuthService);

    // Verify token and get user
    const user = await authService.verifyToken(token);

    // Attach user to request
    (req as AuthenticatedRequest).user = user;

    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Invalid token' });
  }
}

/**
 * Optional auth middleware - doesn't block if no token
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const authService = container.resolve(AuthService);
      const user = await authService.verifyToken(token);
      (req as AuthenticatedRequest).user = user;
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
}
