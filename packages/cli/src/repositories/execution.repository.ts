import { injectable } from 'tsyringe';
import { Repository, DataSource, FindOptionsWhere, Between, LessThan, MoreThan } from 'typeorm';
import { ExecutionEntity } from '../entities';
import { ExecutionStatus } from '../types';

@injectable()
export class ExecutionRepository extends Repository<ExecutionEntity> {
  constructor(dataSource: DataSource) {
    super(ExecutionEntity, dataSource.manager);
  }

  /**
   * Find executions by workflow ID
   */
  async findByWorkflowId(workflowId: string, limit?: number): Promise<ExecutionEntity[]> {
    return this.find({
      where: { workflowId },
      order: { startedAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find executions by status
   */
  async findByStatus(status: ExecutionStatus, limit?: number): Promise<ExecutionEntity[]> {
    return this.find({
      where: { status },
      order: { startedAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find running executions
   */
  async findRunning(): Promise<ExecutionEntity[]> {
    return this.find({
      where: { status: ExecutionStatus.RUNNING },
      relations: ['workflow'],
      order: { startedAt: 'ASC' },
    });
  }

  /**
   * Find executions for a user
   */
  async findByUserId(userId: string, limit?: number): Promise<ExecutionEntity[]> {
    return this.find({
      where: { userId },
      order: { startedAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Find execution with workflow details
   */
  async findWithWorkflow(executionId: string): Promise<ExecutionEntity | null> {
    return this.findOne({
      where: { id: executionId },
      relations: ['workflow'],
    });
  }

  /**
   * Get execution statistics
   */
  async getStatistics(workflowId?: string): Promise<{
    total: number;
    success: number;
    error: number;
    running: number;
  }> {
    const where: FindOptionsWhere<ExecutionEntity> = {};
    if (workflowId) {
      where.workflowId = workflowId;
    }

    const [total, success, error, running] = await Promise.all([
      this.count({ where }),
      this.count({ where: { ...where, status: ExecutionStatus.SUCCESS } }),
      this.count({ where: { ...where, status: ExecutionStatus.ERROR } }),
      this.count({ where: { ...where, status: ExecutionStatus.RUNNING } }),
    ]);

    return { total, success, error, running };
  }

  /**
   * Find executions within date range
   */
  async findByDateRange(startDate: Date, endDate: Date, workflowId?: string): Promise<ExecutionEntity[]> {
    const where: FindOptionsWhere<ExecutionEntity> = {
      startedAt: Between(startDate, endDate),
    };

    if (workflowId) {
      where.workflowId = workflowId;
    }

    return this.find({
      where,
      order: { startedAt: 'DESC' },
    });
  }

  /**
   * Delete old executions
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.delete({
      startedAt: LessThan(cutoffDate),
      status: ExecutionStatus.SUCCESS, // Only delete successful executions
    });

    return result.affected || 0;
  }

  /**
   * Get recent executions
   */
  async findRecent(limit: number = 20): Promise<ExecutionEntity[]> {
    return this.find({
      order: { startedAt: 'DESC' },
      take: limit,
      relations: ['workflow'],
    });
  }

  /**
   * Count executions by workflow
   */
  async countByWorkflowId(workflowId: string): Promise<number> {
    return this.count({ where: { workflowId } });
  }
}
