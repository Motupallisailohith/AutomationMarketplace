import { injectable } from 'tsyringe';
import { Repository, DataSource } from 'typeorm';
import { UserEntity } from '../entities';
import { UserRole } from '../types';

@injectable()
export class UserRepository extends Repository<UserEntity> {
  constructor(dataSource: DataSource) {
    super(UserEntity, dataSource.manager);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.findOne({ where: { email } });
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    return this.exist({ where: { email } });
  }

  /**
   * Find user with workflows
   */
  async findWithWorkflows(userId: string): Promise<UserEntity | null> {
    return this.findOne({
      where: { id: userId },
      relations: ['workflows'],
    });
  }

  /**
   * Find user with credentials
   */
  async findWithCredentials(userId: string): Promise<UserEntity | null> {
    return this.findOne({
      where: { id: userId },
      relations: ['credentials'],
    });
  }

  /**
   * Find users by role
   */
  async findByRole(role: UserRole): Promise<UserEntity[]> {
    return this.find({ where: { role } });
  }

  /**
   * Get all admins
   */
  async findAdmins(): Promise<UserEntity[]> {
    return this.find({
      where: [{ role: UserRole.ADMIN }, { role: UserRole.OWNER }],
    });
  }

  /**
   * Update user role
   */
  async updateRole(userId: string, role: UserRole): Promise<void> {
    await this.update(userId, { role });
  }

  /**
   * Search users by name or email
   */
  async search(query: string): Promise<UserEntity[]> {
    return this.createQueryBuilder('user')
      .where('user.email LIKE :query', { query: `%${query}%` })
      .orWhere('user.firstName LIKE :query', { query: `%${query}%` })
      .orWhere('user.lastName LIKE :query', { query: `%${query}%` })
      .getMany();
  }
}
