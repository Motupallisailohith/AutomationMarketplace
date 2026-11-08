import { injectable } from 'tsyringe';
import { Repository, DataSource, FindOptionsWhere, FindManyOptions } from 'typeorm';
import { WorkflowEntity } from '../entities';

@injectable()
export class WorkflowRepository extends Repository<WorkflowEntity> {
  constructor(dataSource: DataSource) {
    super(WorkflowEntity, dataSource.manager);
  }

  /**
   * Find all workflows for a specific user
   */
  async findByUserId(userId: string): Promise<WorkflowEntity[]> {
    return this.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  /**
   * Find workflow with executions
   */
  async findWithExecutions(workflowId: string): Promise<WorkflowEntity | null> {
    return this.findOne({
      where: { id: workflowId },
      relations: ['executions'],
      order: { executions: { startedAt: 'DESC' } },
    });
  }

  /**
   * Find all active workflows
   */
  async findActive(): Promise<WorkflowEntity[]> {
    return this.find({
      where: { active: true },
      relations: ['user'],
    });
  }

  /**
   * Find workflows by name (partial match)
   */
  async findByName(name: string, userId?: string): Promise<WorkflowEntity[]> {
    const where: FindOptionsWhere<WorkflowEntity> = {};
    
    if (userId) {
      where.userId = userId;
    }

    return this.createQueryBuilder('workflow')
      .where('workflow.name LIKE :name', { name: `%${name}%` })
      .andWhere(where)
      .getMany();
  }

  /**
   * Check if workflow exists
   */
  async existsById(id: string): Promise<boolean> {
    return this.exist({ where: { id } });
  }

  /**
   * Get workflow count for user
   */
  async countByUserId(userId: string): Promise<number> {
    return this.count({ where: { userId } });
  }

  /**
   * Get recently updated workflows
   */
  async findRecentlyUpdated(limit: number = 10, userId?: string): Promise<WorkflowEntity[]> {
    const where: FindOptionsWhere<WorkflowEntity> = {};
    
    if (userId) {
      where.userId = userId;
    }

    return this.find({
      where,
      order: { updatedAt: 'DESC' },
      take: limit,
    });
  }
}
