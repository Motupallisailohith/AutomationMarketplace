/**
 * Auth Service using @n8n/db repositories
 * Replaces raw SQL with TypeORM repositories
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Service } from '@n8n/di';
import { UserRepository, User } from '@n8n/db';
import { Logger } from '@n8n/backend-common';
import { generateNanoId } from '@n8n/db';
import { GlobalConfig } from '@n8n/config';
import { UserError, ConflictError, UnauthorizedError, NotFoundError, UnexpectedError } from '../errors';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

@Service()
export class AuthService {
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private accessTokenExpiry: string = '15m';
  private refreshTokenExpiry: string = '7d';

  constructor(
    private userRepository: UserRepository,
    private logger: Logger
  ) {
    
    // Use JWT_SECRET from env, fallback to default
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';
    
    if (this.jwtSecret === 'your-secret-key-change-in-production') {
      this.logger.warn('Using default JWT secret - change this in production!');
    }
  }

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    options?: { firstName?: string; lastName?: string }
  ): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findNonShellUser(email.toLowerCase());
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Create user entity
      const user = this.userRepository.create({
        id: generateNanoId(),
        email: email.toLowerCase(),
        password: passwordHash,
        firstName: options?.firstName || null,
        lastName: options?.lastName || null,
        disabled: false,
        mfaEnabled: false,
      });

      // Save user
      await this.userRepository.save(user);
      
      // Generate tokens
      const tokens = this.generateTokens(user);

      this.logger.info('User registered successfully', { userId: user.id, email: user.email });

      return { user, tokens };
    } catch (error) {
      this.logger.error('Registration failed', { email, error });
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      // Get user with password
      const user = await this.userRepository.findNonShellUser(email.toLowerCase());
      
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      if (user.disabled) {
        throw new UnauthorizedError('Account is disabled');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password!);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Check MFA if enabled
      if (user.mfaEnabled) {
        throw new UserError('MFA_REQUIRED', 401);
      }

      // Update last active
      user.lastActiveAt = new Date();
      await this.userRepository.save(user);

      // Generate tokens
      const tokens = this.generateTokens(user);

      this.logger.info('User logged in successfully', { userId: user.id, email: user.email });

      return { user, tokens };
    } catch (error) {
      this.logger.error('Login failed', { email, error });
      throw error;
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<User> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
      
      // Get user from database
      const user = await this.userRepository.findOne({
        where: { id: decoded.userId },
        relations: ['role'],
      });

      if (!user) {
        throw new NotFoundError('User', decoded.userId);
      }

      if (user.disabled) {
        throw new UnauthorizedError('Account is disabled');
      }

      return user;
    } catch (error) {
      this.logger.error('Token verification failed', { error });
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as JWTPayload;
      
      const user = await this.userRepository.findOne({
        where: { id: decoded.userId },
        relations: ['role'],
      });

      if (!user || user.disabled) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch (error) {
      this.logger.error('Token refresh failed', { error });
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user || !user.password) {
        throw new NotFoundError('User', userId);
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 12;
      user.password = await bcrypt.hash(newPassword, saltRounds);

      await this.userRepository.save(user);

      this.logger.info('Password changed successfully', { userId });
    } catch (error) {
      this.logger.error('Password change failed', { userId, error });
      throw error;
    }
  }

  /**
   * Generate password reset token
   * Token expires in 1 hour
   */
  async generatePasswordResetToken(user: User): Promise<string> {
    try {
      const resetToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          purpose: 'password-reset' 
        },
        this.jwtSecret,
        { expiresIn: '1h' }
      );

      this.logger.info('Password reset token generated', { userId: user.id, email: user.email });

      return resetToken;
    } catch (error) {
      this.logger.error('Failed to generate password reset token', { userId: user.id, error });
      throw new UnexpectedError('Failed to generate reset token');
    }
  }

  /**
   * Verify password reset token and return user
   */
  async verifyPasswordResetToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      if (decoded.purpose !== 'password-reset') {
        this.logger.warn('Invalid password reset token purpose', { purpose: decoded.purpose });
        return null;
      }

      const user = await this.userRepository.findOne({
        where: { id: decoded.userId },
        relations: ['role'],
      });

      if (!user || user.disabled) {
        this.logger.warn('Password reset token verification failed - user not found or disabled', { 
          userId: decoded.userId 
        });
        return null;
      }

      this.logger.info('Password reset token verified', { userId: user.id });
      return user;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        this.logger.info('Password reset token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        this.logger.warn('Invalid password reset token');
      } else {
        this.logger.error('Password reset token verification error', { error });
      }
      return null;
    }
  }

  /**
   * Update user password (used by password reset)
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('User', userId);
      }

      if (user.disabled) {
        throw new UnauthorizedError('Account is disabled');
      }

      // Hash new password
      const saltRounds = 12;
      user.password = await bcrypt.hash(newPassword, saltRounds);
      user.updatedAt = new Date();

      await this.userRepository.save(user);

      this.logger.info('Password updated successfully', { userId });
    } catch (error) {
      this.logger.error('Password update failed', { userId, error });
      throw error;
    }
  }

  /**
   * Request password reset (kept for backward compatibility)
   */
  async requestPasswordReset(email: string): Promise<{ resetToken: string }> {
    try {
      const user = await this.userRepository.findNonShellUser(email.toLowerCase());
      
      if (!user) {
        // Don't reveal if user exists
        this.logger.info('Password reset requested for non-existent email', { email });
        return { resetToken: 'dummy-token' };
      }

      const resetToken = await this.generatePasswordResetToken(user);
      return { resetToken };
    } catch (error) {
      this.logger.error('Password reset request failed', { email, error });
      throw error;
    }
  }

  /**
   * Reset password with token (kept for backward compatibility)
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    try {
      const user = await this.verifyPasswordResetToken(resetToken);
      
      if (!user) {
        throw new UnauthorizedError('Invalid or expired reset token');
      }

      await this.updatePassword(user.id, newPassword);

      this.logger.info('Password reset successfully', { userId: user.id });
    } catch (error) {
      this.logger.error('Password reset failed', { error });
      throw error;
    }
  }

  /**
   * Get user by ID (for auth routes)
   * Mirrors n8n's pattern of using repository directly
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['role'],
      });

      if (!user) {
        this.logger.warn('User not found', { userId });
        return null;
      }

      return user;
    } catch (error) {
      this.logger.error('Failed to get user by ID', { userId, error });
      throw error;
    }
  }

  /**
   * Update user profile (firstName, lastName, email)
   * Mirrors n8n's UserService.update pattern
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['role'],
      });

      if (!user) {
        throw new NotFoundError('User', userId);
      }

      if (user.disabled) {
        throw new UnauthorizedError('Account is disabled');
      }

      // Merge updates into user entity
      Object.assign(user, updates);
      user.updatedAt = new Date();

      // Use save with transaction: true (n8n pattern)
      await this.userRepository.save(user, { transaction: true });

      this.logger.info('User updated successfully', { userId, updates: Object.keys(updates) });

      return user;
    } catch (error) {
      this.logger.error('User update failed', { userId, error });
      throw error;
    }
  }

  /**
   * Logout user by invalidating refresh token
   * In production, this should use InvalidAuthToken table like n8n
   * For now, just decode and log (tokens expire naturally)
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as JWTPayload;
      
      // TODO: In production, add token to InvalidAuthToken table
      // await this.invalidAuthTokenRepository.insert({
      //   token: refreshToken,
      //   expiresAt: new Date(decoded.exp * 1000),
      // });

      this.logger.info('User logged out', { userId: decoded.userId });
    } catch (error) {
      this.logger.warn('Logout with invalid token', { error });
      // Don't throw - logout should succeed even with invalid token
    }
  }

  /**
   * Generate JWT tokens (public for password reset controller)
   */
  generateTokens(user: User): AuthTokens {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role?.slug || 'user',
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry as any,
    }) as string;

    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: this.refreshTokenExpiry as any,
    }) as string;

    // Parse expiry time
    const expiresIn = this.parseExpiry(this.accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (multipliers[unit] || 60);
  }
}

// Export service instance from DI container
import { Container } from '@n8n/di';
export const authService = Container.get(AuthService);
