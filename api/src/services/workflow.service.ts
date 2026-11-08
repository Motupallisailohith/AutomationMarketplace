/**
 * Workflow Service - mirrors n8n implementation
 * Uses @n8n/db repositories with proper validation and versioning
 */

import { Service } from '@n8n/di';
import { WorkflowRepository, ExecutionRepository, SharedWorkflowRepository } from '@n8n/db';
import type { WorkflowEntity } from '@n8n/db';
import { generateNanoId } from '@n8n/db';
import { Logger } from '@n8n/backend-common';
import { calculateWorkflowChecksum } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { WorkflowValidationService } from './workflow-validation.service';
import { NotFoundError, UnexpectedError } from '../errors';

@Service()
export class WorkflowService {
  constructor(
    private workflowRepo: WorkflowRepository,
    private executionRepo: ExecutionRepository,
    private sharedWorkflowRepo: SharedWorkflowRepository,
    private workflowValidationService: WorkflowValidationService,
    private logger: Logger
  ) {}

  async createWorkflow(data: {
    name: string;
    nodes?: any;
    connections?: any;
    settings?: any;
    active?: boolean;
    tags?: string[];
  }): Promise<WorkflowEntity> {
    try {
      // Validate workflow name
      const validation = this.workflowValidationService.validateForSave(data);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const workflow = this.workflowRepo.create({
        name: data.name,
        nodes: data.nodes || [],
        connections: data.connections || {},
        settings: data.settings || {},
        active: data.active ?? false,
      });
      
      workflow.id = generateNanoId();
      workflow.versionId = uuid(); // Add version tracking like n8n

      await this.workflowRepo.save(workflow);
      this.logger.info('Workflow created', { workflowId: workflow.id, name: workflow.name });
      return workflow;
    } catch (error: any) {
      this.logger.error('Failed to create workflow', { error: error.message });
      throw error;
    }
  }

  async getWorkflow(id: string): Promise<WorkflowEntity | null> {
    return await this.workflowRepo.findOne({
      where: { id },
      relations: ['tags', 'shared', 'shared.project', 'shared.role'],
    });
  }

  async updateWorkflow(id: string, updates: Partial<WorkflowEntity>): Promise<WorkflowEntity> {
    const workflow = await this.workflowRepo.findOne({ where: { id } });
    if (!workflow) {
      throw new NotFoundError(`Workflow ${id} not found`);
    }

    // Validate if name is being updated
    if (updates.name !== undefined) {
      const validation = this.workflowValidationService.validateWorkflowName(updates.name);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
    }

    // Update version ID when content changes (n8n pattern)
    if (updates.nodes !== undefined || updates.connections !== undefined) {
      updates.versionId = uuid();
      updates.updatedAt = new Date();
    }

    // Update fields
    if (updates.name !== undefined) workflow.name = updates.name;
    if (updates.nodes !== undefined) workflow.nodes = updates.nodes;
    if (updates.connections !== undefined) workflow.connections = updates.connections;
    if (updates.settings !== undefined) workflow.settings = { ...workflow.settings, ...updates.settings };
    if (updates.active !== undefined) workflow.active = updates.active;
    if (updates.versionId !== undefined) workflow.versionId = updates.versionId;
    if (updates.updatedAt !== undefined) workflow.updatedAt = updates.updatedAt;

    await this.workflowRepo.save(workflow);
    this.logger.info('Workflow updated', { workflowId: id });
    return workflow;
  }

  async calculateChecksum(workflow: WorkflowEntity): Promise<string> {
    try {
      return await calculateWorkflowChecksum(workflow);
    } catch (error) {
      this.logger.warn('Failed to calculate workflow checksum', { workflowId: workflow.id, error });
      return '';
    }
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.workflowRepo.delete(id);
    this.logger.info('Workflow deleted', { workflowId: id });
  }

  async getWorkflows(options?: {
    active?: boolean;
    limit?: number;
    offset?: number;
    projectId?: string;
  }): Promise<WorkflowEntity[]> {
    const queryBuilder = this.workflowRepo
      .createQueryBuilder('workflow')
      .leftJoinAndSelect('workflow.tags', 'tags')
      .leftJoinAndSelect('workflow.shared', 'shared')
      .leftJoinAndSelect('shared.project', 'project');

    if (options?.active !== undefined) {
      queryBuilder.andWhere('workflow.active = :active', { active: options.active });
    }

    if (options?.projectId) {
      queryBuilder.andWhere('project.id = :projectId', { projectId: options.projectId });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    queryBuilder.orderBy('workflow.updatedAt', 'DESC');

    return await queryBuilder.getMany();
  }

  async activateWorkflow(id: string): Promise<WorkflowEntity> {
    return await this.updateWorkflow(id, { active: true });
  }

  async deactivateWorkflow(id: string): Promise<WorkflowEntity> {
    return await this.updateWorkflow(id, { active: false });
  }

  async getWorkflowExecutions(workflowId: string, limit = 50): Promise<any[]> {
    return await this.executionRepo
      .createQueryBuilder('execution')
      .where('execution.workflowId = :workflowId', { workflowId })
      .orderBy('execution.startedAt', 'DESC')
      .take(limit)
      .getMany();
  }

  async getWorkflowStatistics(workflowId: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageDuration: number;
  }> {
    const executions = await this.executionRepo
      .createQueryBuilder('execution')
      .where('execution.workflowId = :workflowId', { workflowId })
      .getMany();

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter((e) => e.status === 'success').length;
    const failedExecutions = executions.filter((e) => e.status === 'error').length;

    const completedExecutions = executions.filter((e) => e.stoppedAt);
    const totalDuration = completedExecutions.reduce((sum, e) => {
      if (e.startedAt && e.stoppedAt) {
        return sum + (e.stoppedAt.getTime() - e.startedAt.getTime());
      }
      return sum;
    }, 0);

    const averageDuration = completedExecutions.length > 0 
      ? totalDuration / completedExecutions.length 
      : 0;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageDuration,
    };
  }

  async findByName(name: string): Promise<WorkflowEntity | null> {
    return await this.workflowRepo.findOne({ where: { name } });
  }

  async getActiveWorkflows(): Promise<WorkflowEntity[]> {
    return await this.workflowRepo.find({
      where: { active: true },
      relations: ['tags', 'shared'],
    });
  }
}

// Export service instance from DI container
import { Container } from '@n8n/di';
export const workflowService = Container.get(WorkflowService);
