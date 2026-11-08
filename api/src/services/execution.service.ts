/**
 * Execution Service using @n8n/db repositories
 * Replaces raw SQL with TypeORM
 */

import { Service } from '@n8n/di';
import { ExecutionRepository, ExecutionDataRepository } from '@n8n/db';
import type { ExecutionEntity } from '@n8n/db';
import { generateNanoId } from '@n8n/db';
import { Logger } from '@n8n/backend-common';
import { NotFoundError, UnexpectedError } from '../errors';

@Service()
export class ExecutionService {
  constructor(
    private executionRepo: ExecutionRepository,
    private executionDataRepo: ExecutionDataRepository,
    private logger: Logger
  ) {}

  async createExecution(data: {
    workflowId: string;
    mode: string;
    startedAt?: Date;
    status?: string;
    data?: any;
  }): Promise<ExecutionEntity> {
    try {
      // n8n pattern: use save() which auto-generates the ID
      const executionToSave = {
        finished: false,
        mode: data.mode as any || 'manual',
        createdAt: new Date(),
        startedAt: data.startedAt || new Date(),
        workflowId: data.workflowId,
        stoppedAt: null,
        waitTill: null,
        status: data.status as any || 'running',
      };

      // ExecutionRepository.save() returns ExecutionEntity[] - extract first element
      const execution = (await this.executionRepo.save(executionToSave) as any)[0] as ExecutionEntity;

      // Save execution data if provided
      if (data.data) {
        await this.executionDataRepo.save({
          executionId: execution.id,
          data: JSON.stringify(data.data),
          workflowData: {},
        } as any);
      }

      this.logger.info('Execution created', { executionId: execution.id, workflowId: data.workflowId });
      return execution;
    } catch (error: any) {
      this.logger.error('Failed to create execution', { error: error.message });
      throw error;
    }
  }

  async getExecution(id: string): Promise<ExecutionEntity | null> {
    return await this.executionRepo.findOne({
      where: { id },
      relations: ['workflow'],
    });
  }

  async updateExecution(id: string, updates: Partial<ExecutionEntity>): Promise<ExecutionEntity> {
    const execution = await this.executionRepo.findOne({ where: { id } });
    if (!execution) {
      throw new Error(`Execution ${id} not found`);
    }

    // Update fields
    if (updates.status !== undefined) execution.status = updates.status;
    if (updates.stoppedAt !== undefined) execution.stoppedAt = updates.stoppedAt;
    if (updates.finished !== undefined) execution.finished = updates.finished;

    await this.executionRepo.save(execution);
    this.logger.info('Execution updated', { executionId: id, status: updates.status });
    return execution;
  }

  async completeExecution(id: string, data: {
    status: 'success' | 'error';
    stoppedAt?: Date;
    data?: any;
    error?: string;
  }): Promise<ExecutionEntity> {
    const execution = await this.executionRepo.findOne({ where: { id } });
    if (!execution) {
      throw new Error(`Execution ${id} not found`);
    }

    execution.status = data.status;
    execution.stoppedAt = data.stoppedAt || new Date();
    execution.finished = true;

    await this.executionRepo.save(execution);

    // Update execution data if provided
    if (data.data) {
      const existingData = await this.executionDataRepo.findOne({
        where: { executionId: id },
      });

      if (existingData) {
        existingData.data = JSON.stringify(data.data);
        await this.executionDataRepo.save(existingData);
      }
    }

    this.logger.info('Execution completed', { 
      executionId: id, 
      status: data.status,
      duration: execution.stoppedAt.getTime() - execution.startedAt.getTime(),
    });

    return execution;
  }

  async getExecutions(options?: {
    workflowId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ExecutionEntity[]> {
    const queryBuilder = this.executionRepo
      .createQueryBuilder('execution')
      .leftJoinAndSelect('execution.workflow', 'workflow');

    if (options?.workflowId) {
      queryBuilder.andWhere('execution.workflowId = :workflowId', { 
        workflowId: options.workflowId 
      });
    }

    if (options?.status) {
      queryBuilder.andWhere('execution.status = :status', { status: options.status });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    queryBuilder.orderBy('execution.startedAt', 'DESC');

    return await queryBuilder.getMany();
  }

  async deleteExecution(id: string): Promise<void> {
    // Delete execution data first
    await this.executionDataRepo.delete({ executionId: id });
    
    // Delete execution
    await this.executionRepo.delete(id);
    
    this.logger.info('Execution deleted', { executionId: id });
  }

  async getExecutionStatistics(workflowId?: string): Promise<{
    total: number;
    running: number;
    success: number;
    error: number;
    waiting: number;
  }> {
    const queryBuilder = this.executionRepo.createQueryBuilder('execution');

    if (workflowId) {
      queryBuilder.where('execution.workflowId = :workflowId', { workflowId });
    }

    const executions = await queryBuilder.getMany();

    return {
      total: executions.length,
      running: executions.filter((e) => e.status === 'running').length,
      success: executions.filter((e) => e.status === 'success').length,
      error: executions.filter((e) => e.status === 'error').length,
      waiting: executions.filter((e) => e.status === 'waiting').length,
    };
  }

  async getExecutionData(executionId: string): Promise<any | null> {
    const executionData = await this.executionDataRepo.findOne({
      where: { executionId },
    });

    if (!executionData || !executionData.data) {
      return null;
    }

    try {
      return JSON.parse(executionData.data);
    } catch (error) {
      this.logger.error('Failed to parse execution data', { executionId, error });
      return null;
    }
  }

  async getRecentExecutions(limit = 10): Promise<ExecutionEntity[]> {
    return await this.executionRepo
      .createQueryBuilder('execution')
      .leftJoinAndSelect('execution.workflow', 'workflow')
      .orderBy('execution.startedAt', 'DESC')
      .take(limit)
      .getMany();
  }
}

// Export service instance from DI container
import { Container } from '@n8n/di';
export const executionService = Container.get(ExecutionService);
