import { injectable } from 'tsyringe';
import { Repository, DataSource } from 'typeorm';
import { CredentialsEntity } from '../entities';

@injectable()
export class CredentialsRepository extends Repository<CredentialsEntity> {
  constructor(dataSource: DataSource) {
    super(CredentialsEntity, dataSource.manager);
  }

  /**
   * Find credentials by user ID
   */
  async findByUserId(userId: string): Promise<CredentialsEntity[]> {
    return this.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Find credentials by type
   */
  async findByType(type: string, userId?: string): Promise<CredentialsEntity[]> {
    const where: any = { type };
    
    if (userId) {
      where.userId = userId;
    }

    return this.find({ where });
  }

  /**
   * Find by name (exact match)
   */
  async findByName(name: string, userId: string): Promise<CredentialsEntity | null> {
    return this.findOne({
      where: { name, userId },
    });
  }

  /**
   * Check if credentials exist
   */
  async existsByName(name: string, userId: string): Promise<boolean> {
    return this.exist({
      where: { name, userId },
    });
  }
}
