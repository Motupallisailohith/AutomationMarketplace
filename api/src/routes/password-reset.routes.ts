/**
 * Password Reset Routes
 * Handles forgot password, token verification, and password reset
 */

import { Router } from 'express';
import { Container } from '@n8n/di';
import { PasswordResetController } from '../controllers/password-reset.controller';
import { body, query, validationResult } from 'express-validator';

const router = Router();

// Get controller instance from DI container
const getController = () => Container.get(PasswordResetController);

/**
 * Validation middleware
 */
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post(
  '/forgot-password',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
  ],
  validateRequest,
  async (req, res) => {
    const controller = getController();
    await controller.forgotPassword(req, res);
  }
);

/**
 * GET /api/auth/resolve-password-token
 * Verify password reset token
 */
router.get(
  '/resolve-password-token',
  [
    query('token')
      .notEmpty()
      .withMessage('Token is required'),
  ],
  validateRequest,
  async (req, res) => {
    const controller = getController();
    await controller.resolvePasswordToken(req, res);
  }
);

/**
 * POST /api/auth/change-password
 * Change password using reset token
 */
router.post(
  '/change-password',
  [
    body('token')
      .notEmpty()
      .withMessage('Token is required'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters'),
  ],
  validateRequest,
  async (req, res) => {
    const controller = getController();
    await controller.changePassword(req, res);
  }
);

export default router;
