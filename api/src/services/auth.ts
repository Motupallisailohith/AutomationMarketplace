import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Pool } from 'pg';
import { logger } from '../shared/logger';
import { databaseService, User } from './database';

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

export class AuthService {
  private pool: Pool;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private accessTokenExpiry = '15m';
  private refreshTokenExpiry = '7d';

  constructor() {
    this.pool = (databaseService as any).pool; // Access the internal pool
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';
    
    if (this.jwtSecret === 'your-secret-key-change-in-production') {
      logger.warn('Using default JWT secret - change this in production!');
    }
  }

  // User registration
  async register(
    email: string,
    password: string,
    options?: { firstName?: string; lastName?: string; role?: 'admin' | 'user' | 'viewer' }
  ): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthTokens }> {
    const client = await this.pool.connect();
    
    try {
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Generate user ID
      const userId = crypto.randomUUID();

      // Insert user
      const result = await client.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
         RETURNING id, email, first_name, last_name, role, is_active, created_at, updated_at`,
        [userId, email.toLowerCase(), passwordHash, options?.firstName, options?.lastName, options?.role || 'user']
      );

      const user = result.rows[0];
      
      // Generate tokens
      const tokens = this.generateTokens(user);

      logger.info('User registered successfully', { userId: user.id, email: user.email });

      return { user, tokens };
    } finally {
      client.release();
    }
  }

  // User login
  async login(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthTokens }> {
    const client = await this.pool.connect();
    
    try {
      // Get user with password hash
      const result = await client.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid email or password');
      }

      const user = result.rows[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await client.query(
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        [user.id]
      );

      // Remove password hash from response
      const { password_hash, ...userWithoutPassword } = user;

      // Generate tokens
      const tokens = this.generateTokens(userWithoutPassword);

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      return { user: userWithoutPassword, tokens };
    } finally {
      client.release();
    }
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as JWTPayload;
      
      const client = await this.pool.connect();
      try {
        // Verify user still exists and is active
        const result = await client.query(
          'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1 AND is_active = true',
          [decoded.userId]
        );

        if (result.rows.length === 0) {
          throw new Error('User not found or inactive');
        }

        const user = result.rows[0];
        return this.generateTokens(user);
      } finally {
        client.release();
      }
    } catch (error: any) {
      logger.error('Token refresh failed:', { error: error?.message || error });
      throw new Error('Invalid refresh token');
    }
  }

  // Verify access token
  async verifyToken(token: string): Promise<User> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
      
      const client = await this.pool.connect();
      try {
        const result = await client.query(
          'SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at FROM users WHERE id = $1 AND is_active = true',
          [decoded.userId]
        );

        if (result.rows.length === 0) {
          throw new Error('User not found or inactive');
        }

        return result.rows[0];
      } finally {
        client.release();
      }
    } catch (error: any) {
      logger.error('Token verification failed:', { error: error?.message || error });
      throw new Error('Invalid or expired token');
    }
  }

  // Generate JWT tokens
  private generateTokens(user: Omit<User, 'password_hash'>): AuthTokens {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: this.refreshTokenExpiry,
    } as jwt.SignOptions);

    const decodedToken = jwt.decode(accessToken) as JWTPayload;
    const expiresIn = decodedToken.exp - decodedToken.iat;

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  // Get user profile
  async getUserProfile(userId: string): Promise<Omit<User, 'password_hash'> | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: {
    firstName?: string;
    lastName?: string;
    email?: string;
  }): Promise<Omit<User, 'password_hash'>> {
    const client = await this.pool.connect();
    try {
      const fields = [];
      const values = [userId];
      let paramCount = 2;

      if (updates.firstName) {
        fields.push(`first_name = $${paramCount}`);
        values.push(updates.firstName);
        paramCount++;
      }
      if (updates.lastName) {
        fields.push(`last_name = $${paramCount}`);
        values.push(updates.lastName);
        paramCount++;
      }
      if (updates.email) {
        fields.push(`email = $${paramCount}`);
        values.push(updates.email.toLowerCase());
        paramCount++;
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push('updated_at = NOW()');

      const result = await client.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $1 
         RETURNING id, email, first_name, last_name, role, is_active, created_at, updated_at`,
        values
      );

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Change password
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Get current password hash
      const result = await client.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, userId]
      );

      logger.info('Password changed successfully', { userId });
    } finally {
      client.release();
    }
  }

  // Get user by ID (for auth routes)
  async getUserById(userId: string): Promise<Omit<User, 'password_hash'> | null> {
    return this.getUserProfile(userId);
  }

  // Update user (for auth routes)
  async updateUser(userId: string, updates: {
    firstName?: string;
    lastName?: string;
    email?: string;
  }): Promise<{ success: boolean; user?: Omit<User, 'password_hash'>; error?: string }> {
    try {
      const updatedUser = await this.updateUserProfile(userId, updates);
      return { success: true, user: updatedUser };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Update failed' };
    }
  }

  // Logout (invalidate refresh token - requires token blacklisting in production)
  async logout(refreshToken: string): Promise<void> {
    // In production, you would add the refresh token to a blacklist
    // For now, we'll just log the logout
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as JWTPayload;
      logger.info('User logged out', { userId: decoded.userId });
    } catch (error: any) {
      logger.warn('Logout with invalid token', { error: error?.message || error });
    }
  }
}

// Singleton instance
export const authService = new AuthService();
export default AuthService;