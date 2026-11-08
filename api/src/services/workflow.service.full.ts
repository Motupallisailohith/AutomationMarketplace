/**
 * Workflow Service - Complete n8n implementation
 * Cloned from n8n/packages/cli/src/workflows/workflow.service.ts
 */

import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { User, WorkflowEntity } from '@n8n/db';
import {
	WorkflowRepository,
	SharedWorkflowRepository,
	WorkflowHistoryRepository,
	TagRepository,
	ExecutionRepository,
	SharedWorkflow,
	generateNanoId,
} from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { v4 as uuid } from 'uuid';
import { calculateWorkflowChecksum } from 'n8n-workflow';
import { BadRequestError, NotFoundError, InternalServerError } from '../errors';

interface WorkflowUpdateOptions {
	tagIds?: string[];
	parentFolderId?: string;
	forceSave?: boolean;
	expectedChecksum?: string;
	aiBuilderAssisted?: boolean;
	autosaved?: boolean;
	publicApi?: boolean;
}

@Service()
export class WorkflowService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
		private readonly tagRepository: TagRepository,
		private readonly executionRepository: ExecutionRepository,
	) {}

	/**
	 * Create a new workflow
	 * Mirrors n8n's WorkflowsController.create logic
	 */
	async create(user: User, workflowData: Partial<WorkflowEntity>, options?: {
		projectId?: string;
		tagIds?: string[];
		autosaved?: boolean;
	}): Promise<WorkflowEntity> {
		// Validate workflow ID doesn't exist
		if (workflowData.id) {
			const exists = await this.workflowRepository.existsBy({ id: workflowData.id });
			if (exists) {
				throw new BadRequestError(`Workflow with id ${workflowData.id} exists already.`);
			}
		}

		// Remove fields that shouldn't be accepted
		delete (workflowData as any).shared;
		delete (workflowData as any).activeVersionId;
		delete (workflowData as any).activeVersion;
		workflowData.active = false; // Always create as inactive

		// Create workflow entity
		const newWorkflow = this.workflowRepository.create(workflowData);
		
		// Generate version ID
		newWorkflow.versionId = uuid();

		// Add node IDs if missing
		this.addNodeIds(newWorkflow);

		// Generate workflow ID if not provided
		if (!newWorkflow.id) {
			newWorkflow.id = generateNanoId();
		}

		// Handle tags
		if (options?.tagIds?.length) {
			newWorkflow.tags = await this.tagRepository.findBy({
				id: options.tagIds as any
			});
		}

		// Save workflow
		const savedWorkflow = await this.workflowRepository.save(newWorkflow);

		// Create shared workflow (ownership)
		const projectId = options?.projectId || user.id; // Use user ID as project ID for simplicity
		const sharedWorkflow = this.sharedWorkflowRepository.create({
			role: 'workflow:owner',
			projectId,
			workflowId: savedWorkflow.id,
		});
		await this.sharedWorkflowRepository.save(sharedWorkflow);

		// Save version history
		await this.saveWorkflowHistory(user, savedWorkflow, options?.autosaved || false);

		// Log
		this.logger.info('Workflow created', {
			userId: user.id,
			workflowId: savedWorkflow.id,
			workflowName: savedWorkflow.name,
		});

		// Return with relations
		const result = await this.workflowRepository.findOne({
			where: { id: savedWorkflow.id },
			relations: ['tags', 'shared'],
		});

		if (!result) {
			throw new InternalServerError('Failed to retrieve created workflow');
		}

		return result;
	}

	/**
	 * Update an existing workflow
	 * Mirrors n8n's WorkflowService.update logic
	 */
	async update(
		user: User,
		workflowId: string,
		workflowUpdateData: Partial<WorkflowEntity>,
		options: WorkflowUpdateOptions = {},
	): Promise<WorkflowEntity> {
		// Find workflow
		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: ['tags'],
		});

		if (!workflow) {
			throw new NotFoundError(`Workflow with ID "${workflowId}" not found`);
		}

		// Checksum validation if requested
		if (!options.forceSave && options.expectedChecksum) {
			const currentChecksum = await calculateWorkflowChecksum(workflow);
			if (currentChecksum !== options.expectedChecksum) {
				throw new BadRequestError(
					'Workflow has been modified by another user. Please reload and try again.',
				);
			}
		}

		// Determine if we need to save a new version
		const saveNewVersion =
			('nodes' in workflowUpdateData && JSON.stringify(workflowUpdateData.nodes) !== JSON.stringify(workflow.nodes)) ||
			('connections' in workflowUpdateData && JSON.stringify(workflowUpdateData.connections) !== JSON.stringify(workflow.connections));

		if (saveNewVersion) {
			workflowUpdateData.versionId = uuid();
			this.logger.debug('Updating versionId for workflow', {
				workflowId,
				userId: user.id,
				previousVersionId: workflow.versionId,
				newVersionId: workflowUpdateData.versionId,
			});

			// Ensure we have both nodes and connections for version save
			workflowUpdateData.nodes = workflowUpdateData.nodes ?? workflow.nodes;
			workflowUpdateData.connections = workflowUpdateData.connections ?? workflow.connections;
		} else {
			// Don't let users change versionId directly
			workflowUpdateData.versionId = workflow.versionId;
		}

		// Add node IDs
		this.addNodeIds(workflowUpdateData);

		// Merge settings
		if (workflowUpdateData.settings && workflow.settings) {
			workflowUpdateData.settings = {
				...workflow.settings,
				...workflowUpdateData.settings,
			};
		}

		// Always set updatedAt
		workflowUpdateData.updatedAt = new Date();

		// Update workflow
		await this.workflowRepository.update(workflowId, workflowUpdateData as any);

		// Save version history if needed
		if (saveNewVersion) {
			await this.saveWorkflowHistory(user, {
				...workflow,
				...workflowUpdateData,
			} as WorkflowEntity, options.autosaved || false);
		}

		// Handle tags
		if (options.tagIds) {
			// For simplicity, we'll just update the workflow-tag relations
			// In full n8n, this uses WorkflowTagMappingRepository
			const tags = await this.tagRepository.findBy({
				id: options.tagIds as any
			});
			await this.workflowRepository.update(workflowId, {
				tags: tags as any
			});
		}

		// Get updated workflow
		const updatedWorkflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: ['tags'],
		});

		if (!updatedWorkflow) {
			throw new BadRequestError(`Workflow with ID "${workflowId}" could not be found after update.`);
		}

		this.logger.info('Workflow updated', {
			userId: user.id,
			workflowId,
			workflowName: updatedWorkflow.name,
		});

		return updatedWorkflow;
	}

	/**
	 * Delete a workflow
	 */
	async delete(user: User, workflowId: string): Promise<WorkflowEntity | null> {
		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
		});

		if (!workflow) {
			return null;
		}

		await this.workflowRepository.delete(workflowId);

		this.logger.info('Workflow deleted', {
			userId: user.id,
			workflowId,
			workflowName: workflow.name,
		});

		return workflow;
	}

	/**
	 * Get workflows with scopes (n8n pattern)
	 */
	async getWorkflowScopes(user: User, workflowId: string): Promise<string[]> {
		// Simplified - in full n8n this checks project relations
		// For now, return basic scopes based on ownership
		const shared = await this.sharedWorkflowRepository.findOne({
			where: { workflowId, projectId: user.id },
		});

		if (shared?.role === 'workflow:owner') {
			return [
				'workflow:read',
				'workflow:update',
				'workflow:delete',
				'workflow:execute',
				'workflow:publish',
				'workflow:share',
				'workflow:move',
			];
		}

		return ['workflow:read'];
	}

	/**
	 * Get all workflows for a user
	 */
	async getMany(user: User, options?: any): Promise<{ workflows: WorkflowEntity[], count: number }> {
		// Get workflows shared with user
		const sharedWorkflows = await this.sharedWorkflowRepository.find({
			where: { projectId: user.id },
			relations: ['workflow', 'workflow.tags'],
		});

		const workflows = sharedWorkflows.map(sw => sw.workflow as WorkflowEntity).filter(Boolean);
		
		return {
			workflows,
			count: workflows.length,
		};
	}

	/**
	 * Get a single workflow by ID
	 */
	async getWorkflow(workflowId: string): Promise<WorkflowEntity | null> {
		return await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: ['tags', 'shared'],
		});
	}

	/**
	 * Calculate workflow checksum
	 */
	async calculateChecksum(workflow: WorkflowEntity): Promise<string> {
		try {
			return await calculateWorkflowChecksum(workflow);
		} catch (error) {
			this.logger.warn('Failed to calculate workflow checksum', { workflowId: workflow.id, error });
			return '';
		}
	}

	/**
	 * Get workflow executions
	 */
	async getWorkflowExecutions(workflowId: string, limit = 50): Promise<any[]> {
		return await this.executionRepository
			.createQueryBuilder('execution')
			.where('execution.workflowId = :workflowId', { workflowId })
			.orderBy('execution.startedAt', 'DESC')
			.take(limit)
			.getMany();
	}

	/**
	 * Private helper: Add node IDs if missing
	 * Mirrors n8n's WorkflowHelpers.addNodeIds
	 */
	private addNodeIds(workflow: Partial<WorkflowEntity>): void {
		if (workflow.nodes && Array.isArray(workflow.nodes)) {
			workflow.nodes.forEach((node: any, index: number) => {
				if (!node.id) {
					node.id = uuid();
				}
			});
		}
	}

	/**
	 * Private helper: Save workflow history
	 */
	private async saveWorkflowHistory(
		user: User,
		workflow: Partial<WorkflowEntity>,
		autosaved: boolean,
	): Promise<void> {
		try {
			const history = this.workflowHistoryRepository.create({
				workflowId: workflow.id!,
				versionId: workflow.versionId || uuid(),
				nodes: workflow.nodes || [],
				connections: workflow.connections || {},
				authors: user.email || user.id,
			});

			await this.workflowHistoryRepository.save(history);

			this.logger.debug('Workflow history saved', {
				workflowId: workflow.id,
				versionId: history.versionId,
				autosaved,
			});
		} catch (error) {
			// Don't fail workflow save if history save fails
			this.logger.error('Failed to save workflow history', {
				workflowId: workflow.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Activate workflow
	 */
	async activateWorkflow(user: User, workflowId: string): Promise<WorkflowEntity> {
		const workflow = await this.workflowRepository.findOne({ where: { id: workflowId } });
		
		if (!workflow) {
			throw new NotFoundError(`Workflow with ID "${workflowId}" not found`);
		}

		workflow.active = true;
		workflow.activeVersionId = workflow.versionId;
		await this.workflowRepository.save(workflow);

		this.logger.info('Workflow activated', {
			userId: user.id,
			workflowId,
			workflowName: workflow.name,
		});

		return workflow;
	}

	/**
	 * Deactivate workflow
	 */
	async deactivateWorkflow(user: User, workflowId: string): Promise<WorkflowEntity> {
		const workflow = await this.workflowRepository.findOne({ where: { id: workflowId } });
		
		if (!workflow) {
			throw new NotFoundError(`Workflow with ID "${workflowId}" not found`);
		}

		workflow.active = false;
		workflow.activeVersionId = null as any;
		await this.workflowRepository.save(workflow);

		this.logger.info('Workflow deactivated', {
			userId: user.id,
			workflowId,
			workflowName: workflow.name,
		});

		return workflow;
	}
}
