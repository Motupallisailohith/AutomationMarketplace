import { Router } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../shared/logger';
import { authMiddleware } from '../middleware/auth';

const router = Router();

const MIN_PASSWORD_CHAR_LENGTH = 8;
const MAX_PASSWORD_CHAR_LENGTH = 128;

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
      return;
    }

    if (password.length < MIN_PASSWORD_CHAR_LENGTH) {
      res.status(400).json({
        success: false,
        error: `Password must be at least ${MIN_PASSWORD_CHAR_LENGTH} characters long`,
      });
      return;
    }

    if (password.length > MAX_PASSWORD_CHAR_LENGTH) {
      res.status(400).json({
        success: false,
        error: `Password must be at most ${MAX_PASSWORD_CHAR_LENGTH} characters long`,
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
      return;
    }

    // Register user
    const result = await authService.register(email, password, { firstName, lastName });

    logger.info('User registered successfully', { 
      userId: result.user?.id, 
      email: result.user?.email 
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
        },
        token: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      },
    });

  } catch (error: any) {
    logger.error('Registration failed:', { error: error?.message || error });
    res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
      return;
    }

    // Login user
    const result = await authService.login(email, password);

    logger.info('User logged in successfully', { 
      userId: result.user?.id, 
      email: result.user?.email 
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: result.user?.id,
          email: result.user?.email,
          firstName: result.user?.firstName,
          lastName: result.user?.lastName,
          role: result.user?.role,
        },
        token: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      },
    });

  } catch (error: any) {
    logger.error('Login failed:', { error: error?.message || error });
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
      return;
    }

    const result = await authService.refreshToken(refreshToken);

    logger.info('Token refreshed successfully');

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });

  } catch (error: any) {
    logger.error('Token refresh failed:', { error: error?.message || error });
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
    });
  }
});

// Get current user (alias for /profile)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;

    const user = await authService.getUserById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
    });

  } catch (error: any) {
    logger.error('Failed to get current user:', { error: error?.message || error });
    res.status(500).json({
      success: false,
      error: 'Failed to get current user',
    });
  }
});

// Get current user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;

    const user = await authService.getUserById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
    });

  } catch (error: any) {
    logger.error('Failed to get user profile:', { error: error?.message || error });
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile',
    });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { firstName, lastName, email } = req.body;

    const updates: any = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (email !== undefined) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
        return;
      }
      updates.email = email;
    }

    const user = await authService.updateUser(userId, updates);

    logger.info('User profile updated', { userId });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          updatedAt: user.updatedAt,
        },
      },
    });

  } catch (error: any) {
    logger.error('Failed to update user profile:', { error: error?.message || error });
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
});

// Change password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
      return;
    }

    if (newPassword.length < MIN_PASSWORD_CHAR_LENGTH) {
      res.status(400).json({
        success: false,
        error: `New password must be at least ${MIN_PASSWORD_CHAR_LENGTH} characters long`,
      });
      return;
    }

    if (newPassword.length > MAX_PASSWORD_CHAR_LENGTH) {
      res.status(400).json({
        success: false,
        error: `New password must be at most ${MAX_PASSWORD_CHAR_LENGTH} characters long`,
      });
      return;
    }

    await authService.changePassword(userId, currentPassword, newPassword);

    logger.info('User password changed', { userId });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });

  } catch (error: any) {
    logger.error('Failed to change password:', { error: error?.message || error });
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
    });
  }
});

// Logout (invalidate refresh tokens)
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const refreshToken = req.body.refreshToken || '';

    await authService.logout(refreshToken);

    logger.info('User logged out', { userId });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });

  } catch (error: any) {
    logger.error('Logout failed:', { error: error?.message || error });
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

export default router;