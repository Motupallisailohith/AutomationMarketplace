import { injectable, inject } from 'tsyringe';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories';
import { UserEntity } from '../entities';
import { ILoginRequest, IRegisterRequest, IAuthResponse, IUser, UserRole } from '../types';

@injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly bcryptRounds: number;

  constructor(@inject('UserRepository') private userRepo: UserRepository) {
    this.jwtSecret = process.env.JWT_SECRET || 'change-this-secret';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
  }

  /**
   * Register a new user
   */
  async register(data: IRegisterRequest): Promise<IAuthResponse> {
    // Check if email exists
    const existingUser = await this.userRepo.findByEmail(data.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, this.bcryptRounds);

    // Create user
    const user = this.userRepo.create({
      id: uuid(),
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      role: UserRole.USER,
    });

    await this.userRepo.save(user);

    // Generate token
    const token = this.generateToken(user);

    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Login a user
   */
  async login(data: ILoginRequest): Promise<IAuthResponse> {
    // Find user
    const user = await this.userRepo.findByEmail(data.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate token
    const token = this.generateToken(user);

    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<IUser> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string };
      
      const user = await this.userRepo.findOne({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return this.sanitizeUser(user);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId: string): Promise<IUser> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Change password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid current password');
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, this.bcryptRounds);
    await this.userRepo.save(user);
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string }
  ): Promise<IUser> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (data.firstName !== undefined) user.firstName = data.firstName;
    if (data.lastName !== undefined) user.lastName = data.lastName;

    await this.userRepo.save(user);

    return this.sanitizeUser(user);
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: UserEntity): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      this.jwtSecret,
      {
        expiresIn: this.jwtExpiresIn,
      }
    );
  }

  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: UserEntity): IUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
