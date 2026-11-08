import { injectable, inject } from 'tsyringe';
import { v4 as uuid } from 'uuid';
import { ExecutionRepository, WorkflowRepository } from '../repositories';
import { ExecutionEntity } from '../entities';
import { ExecutionMode, ExecutionStatus, IExecuteWorkflowRequest, IRunExecutionData } from '../types';

@injectable()
export class ExecutionsService {
  constructor(
    @inject('ExecutionRepository') private executionRepo: ExecutionRepository,
    @inject('WorkflowRepository') private workflowRepo: WorkflowRepository
  ) {}

  /**
   * Get all executions (with optional filters)
   */
  async getAll(userId?: string, workflowId?: string, limit?: number): Promise<ExecutionEntity[]> {
    if (workflowId) {
      return this.executionRepo.findByWorkflowId(workflowId, limit);
    }

    if (userId) {
      return this.executionRepo.findByUserId(userId, limit);
    }

    return this.executionRepo.findRecent(limit);
  }

  /**
   * Get execution by ID
   */
  async getById(executionId: string): Promise<ExecutionEntity> {
    const execution = await this.executionRepo.findOne({
      where: { id: executionId },
      relations: ['workflow'],
    });

    if (!execution) {
      throw new Error(`Execution with ID ${executionId} not found`);
    }

    return execution;
  }

  /**
   * Create a new execution record
   */
  async create(
    workflowId: string,
    mode: ExecutionMode,
    userId?: string
  ): Promise<ExecutionEntity> {
    // Verify workflow exists
    const workflow = await this.workflowRepo.findOne({ where: { id: workflowId } });
    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }

    const execution = this.executionRepo.create({
      id: uuid(),
      workflowId,
      mode,
      status: ExecutionStatus.RUNNING,
      startedAt: new Date(),
      userId: userId || null,
    });

    return this.executionRepo.save(execution);
  }

  /**
   * Update execution status
   */
  async updateStatus(
    executionId: string,
    status: ExecutionStatus,
    data?: IRunExecutionData,
    error?: string
  ): Promise<ExecutionEntity> {
    const execution = await this.getById(executionId);

    execution.status = status;

    if (data) {
      execution.data = data;
    }

    if (error) {
      execution.error = error;
    }

    if (status !== ExecutionStatus.RUNNING && !execution.finishedAt) {
      execution.finishedAt = new Date();
    }

    return this.executionRepo.save(execution);
  }

  /**
   * Get executions for a workflow
   */
  async getByWorkflowId(workflowId: string, limit?: number): Promise<ExecutionEntity[]> {
    return this.executionRepo.findByWorkflowId(workflowId, limit);
  }

  /**
   * Get running executions
   */
  async getRunning(): Promise<ExecutionEntity[]> {
    return this.executionRepo.findRunning();
  }

  /**
   * Delete an execution
   */
  async delete(executionId: string): Promise<void> {
    const execution = await this.getById(executionId);

    if (execution.status === ExecutionStatus.RUNNING) {
      throw new Error('Cannot delete a running execution. Please stop it first.');
    }

    await this.executionRepo.remove(execution);
  }

  /**
   * Stop a running execution
   */
  async stop(executionId: string): Promise<ExecutionEntity> {
    return this.updateStatus(executionId, ExecutionStatus.CANCELED, undefined, 'Execution stopped by user');
  }

  /**
   * Get execution statistics
   */
  async getStatistics(workflowId?: string): Promise<{
    total: number;
    success: number;
    error: number;
    running: number;
    successRate: number;
  }> {
    const stats = await this.executionRepo.getStatistics(workflowId);

    return {
      ...stats,
      successRate: stats.total > 0 ? (stats.success / stats.total) * 100 : 0,
    };
  }

  /**
   * Clean up old executions
   */
  async cleanup(daysToKeep: number = 30): Promise<number> {
    return this.executionRepo.deleteOlderThan(daysToKeep);
  }

  /**
   * Get executions within date range
   */
  async getByDateRange(
    startDate: Date,
    endDate: Date,
    workflowId?: string
  ): Promise<ExecutionEntity[]> {
    return this.executionRepo.findByDateRange(startDate, endDate, workflowId);
  }
}
