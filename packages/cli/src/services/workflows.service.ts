import { injectable, inject } from 'tsyringe';
import { v4 as uuid } from 'uuid';
import { WorkflowRepository } from '../repositories';
import { WorkflowEntity } from '../entities';
import { ICreateWorkflowRequest, IUpdateWorkflowRequest, INode, IConnections } from '../types';

@injectable()
export class WorkflowsService {
  constructor(
    @inject('WorkflowRepository') private workflowRepo: WorkflowRepository
  ) {}

  /**
   * Get all workflows for a user
   */
  async getAllForUser(userId: string): Promise<WorkflowEntity[]> {
    return this.workflowRepo.findByUserId(userId);
  }

  /**
   * Get workflow by ID
   */
  async getById(workflowId: string, userId?: string): Promise<WorkflowEntity> {
    const workflow = await this.workflowRepo.findOne({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }

    // Check ownership if userId is provided
    if (userId && workflow.userId !== userId) {
      throw new Error('You do not have permission to access this workflow');
    }

    return workflow;
  }

  /**
   * Create a new workflow
   */
  async create(data: ICreateWorkflowRequest, userId: string): Promise<WorkflowEntity> {
    const workflow = this.workflowRepo.create({
      id: uuid(),
      name: data.name,
      nodes: data.nodes || [],
      connections: data.connections || {},
      settings: data.settings || null,
      active: data.active || false,
      userId,
    });

    return this.workflowRepo.save(workflow);
  }

  /**
   * Update an existing workflow
   */
  async update(workflowId: string, data: IUpdateWorkflowRequest, userId: string): Promise<WorkflowEntity> {
    const workflow = await this.getById(workflowId, userId);

    // Update fields
    if (data.name !== undefined) workflow.name = data.name;
    if (data.nodes !== undefined) workflow.nodes = data.nodes;
    if (data.connections !== undefined) workflow.connections = data.connections;
    if (data.settings !== undefined) workflow.settings = data.settings;
    if (data.active !== undefined) workflow.active = data.active;

    return this.workflowRepo.save(workflow);
  }

  /**
   * Delete a workflow
   */
  async delete(workflowId: string, userId: string): Promise<void> {
    const workflow = await this.getById(workflowId, userId);

    if (workflow.active) {
      throw new Error('Cannot delete an active workflow. Please deactivate it first.');
    }

    await this.workflowRepo.remove(workflow);
  }

  /**
   * Activate a workflow
   */
  async activate(workflowId: string, userId: string): Promise<WorkflowEntity> {
    const workflow = await this.getById(workflowId, userId);

    if (workflow.active) {
      throw new Error('Workflow is already active');
    }

    workflow.active = true;
    return this.workflowRepo.save(workflow);
  }

  /**
   * Deactivate a workflow
   */
  async deactivate(workflowId: string, userId: string): Promise<WorkflowEntity> {
    const workflow = await this.getById(workflowId, userId);

    if (!workflow.active) {
      throw new Error('Workflow is already inactive');
    }

    workflow.active = false;
    return this.workflowRepo.save(workflow);
  }

  /**
   * Get active workflows
   */
  async getActiveWorkflows(): Promise<WorkflowEntity[]> {
    return this.workflowRepo.findActive();
  }

  /**
   * Get workflow with executions
   */
  async getWithExecutions(workflowId: string, userId?: string): Promise<WorkflowEntity> {
    const workflow = await this.workflowRepo.findWithExecutions(workflowId);

    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }

    // Check ownership
    if (userId && workflow.userId !== userId) {
      throw new Error('You do not have permission to access this workflow');
    }

    return workflow;
  }

  /**
   * Search workflows by name
   */
  async search(query: string, userId: string): Promise<WorkflowEntity[]> {
    return this.workflowRepo.findByName(query, userId);
  }

  /**
   * Duplicate a workflow
   */
  async duplicate(workflowId: string, userId: string, newName?: string): Promise<WorkflowEntity> {
    const original = await this.getById(workflowId, userId);

    const duplicated = this.workflowRepo.create({
      id: uuid(),
      name: newName || `${original.name} (Copy)`,
      nodes: JSON.parse(JSON.stringify(original.nodes)), // Deep clone
      connections: JSON.parse(JSON.stringify(original.connections)),
      settings: original.settings ? JSON.parse(JSON.stringify(original.settings)) : null,
      active: false, // Always inactive on duplicate
      userId,
    });

    return this.workflowRepo.save(duplicated);
  }

  /**
   * Get workflow statistics
   */
  async getStatistics(userId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const workflows = await this.workflowRepo.findByUserId(userId);

    return {
      total: workflows.length,
      active: workflows.filter((w) => w.active).length,
      inactive: workflows.filter((w) => !w.active).length,
    };
  }
}
