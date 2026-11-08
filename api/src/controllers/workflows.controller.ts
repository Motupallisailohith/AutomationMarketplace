/**
 * Workflows Controller - Complete n8n implementation
 * Cloned from n8n/packages/cli/src/workflows/workflows.controller.ts
 */

import { RestController, Get, Post, Put, Patch, Delete, Param, Body, Query } from '@n8n/decorators';
import type { Request, Response } from 'express';
import { Container } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import type { User, WorkflowEntity } from '@n8n/db';
import { WorkflowRepository, SharedWorkflowRepository, TagRepository } from '@n8n/db';
import { calculateWorkflowChecksum } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import axios from 'axios';

// Services
import { WorkflowService } from '../services/workflow.service.full';
import { EventService } from '../services/event.service';
import { ExternalHooks } from '../services/external-hooks.service';
import { ExecutionService } from '../services/execution.service';

// Errors
import { BadRequestError, NotFoundError, InternalServerError, ForbiddenError } from '../errors';

interface AuthRequest extends Request {
	user: User;
}

@RestController('/api/workflows')
export class WorkflowsController {
	private logger: Logger;
	private workflowService: WorkflowService;
	private workflowRepository: WorkflowRepository;
	private sharedWorkflowRepository: SharedWorkflowRepository;
	private tagRepository: TagRepository;
	private eventService: EventService;
	private externalHooks: ExternalHooks;
	private executionService: ExecutionService;

	constructor() {
		this.logger = Container.get(Logger);
		this.workflowService = Container.get(WorkflowService);
		this.workflowRepository = Container.get(WorkflowRepository);
		this.sharedWorkflowRepository = Container.get(SharedWorkflowRepository);
		this.tagRepository = Container.get(TagRepository);
		this.eventService = Container.get(EventService);
		this.externalHooks = Container.get(ExternalHooks);
		this.executionService = Container.get(ExecutionService);
	}

	/**
	 * Create new workflow
	 * Complete implementation from n8n
	 */
	@Post('/')
	async create(req: AuthRequest, res: Response) {
		try {
			const workflowData = req.body;

			// Validate workflow ID doesn't exist
			if (workflowData.id) {
				const workflowExists = await this.workflowRepository.existsBy({ id: workflowData.id });
				if (workflowExists) {
					throw new BadRequestError(`Workflow with id ${workflowData.id} exists already.`);
				}
			}

			// Remove fields that shouldn't be accepted
			delete workflowData.shared;
			delete workflowData.activeVersionId;
			delete workflowData.activeVersion;

			// Always create as inactive
			if (workflowData.active) {
				this.logger.warn(
					'Creating a workflow as active is not supported. The workflow will be created as inactive.',
					{ userId: req.user.id },
				);
				workflowData.active = false;
			}

			const { autosaved = false, tags: tagIds, projectId } = workflowData;

			// Run external hooks before create
			await this.externalHooks.run('workflow.create', [workflowData]);

			// Create workflow using service
			const savedWorkflow = await this.workflowService.create(req.user, workflowData, {
				projectId: projectId || req.user.id,
				tagIds,
				autosaved,
			});

			// Run external hooks after create
			await this.externalHooks.run('workflow.afterCreate', [savedWorkflow]);

			// Emit event
			this.eventService.emit('workflow-created', {
				user: req.user,
				workflow: savedWorkflow,
				publicApi: false,
				projectId: projectId || req.user.id,
				projectType: 'personal',
				uiContext: workflowData.uiContext,
			});

			// Get scopes and checksum
			const scopes = await this.workflowService.getWorkflowScopes(req.user, savedWorkflow.id);
			const checksum = await calculateWorkflowChecksum(savedWorkflow);

			this.logger.info('Workflow created', {
				userId: req.user.id,
				workflowId: savedWorkflow.id,
				workflowName: savedWorkflow.name,
			});

			res.status(201).json({
				success: true,
				data: {
					...savedWorkflow,
					scopes,
					checksum,
				},
			});
		} catch (error: any) {
			this.logger.error('Failed to create workflow:', {
				error: error?.message || error,
				userId: req.user?.id,
			});
			res.status(error.httpStatusCode || 500).json({
				success: false,
				error: error.message || 'Failed to create workflow',
			});
		}
	}

	/**
	 * Get all workflows for authenticated user
	 */
	@Get('/')
	async getAllWorkflows(req: AuthRequest, res: Response) {
		try {
			const { workflows, count } = await this.workflowService.getMany(req.user);

			this.logger.info('Workflows retrieved', { userId: req.user.id, count });

			res.json({
				success: true,
				count,
				data: workflows,
			});
		} catch (error: any) {
			this.logger.error('Failed to retrieve workflows:', { error: error?.message || error });
			res.status(500).json({
				success: false,
				error: 'Failed to retrieve workflows',
			});
		}
	}

	/**
	 * Get specific workflow by ID
	 */
	@Get('/:id')
	async getWorkflow(@Param('id') id: string, req: AuthRequest, res: Response) {
		try {
			const workflow = await this.workflowRepository.findOne({
				where: { id },
				relations: ['tags', 'shared'],
			});

			if (!workflow) {
				return res.status(404).json({
					success: false,
					error: 'Workflow not found',
				});
			}

			// Get scopes and checksum
			const scopes = await this.workflowService.getWorkflowScopes(req.user, workflow.id);
			const checksum = await calculateWorkflowChecksum(workflow);

			this.logger.info('Workflow retrieved', { workflowId: id, userId: req.user.id });

			res.json({
				success: true,
				data: {
					...workflow,
					scopes,
					checksum,
				},
			});
		} catch (error: any) {
			this.logger.error('Failed to retrieve workflow:', {
				workflowId: id,
				error: error?.message || error,
			});
			res.status(500).json({
				success: false,
				error: 'Failed to retrieve workflow',
			});
		}
	}

	/**
	 * Import workflow from URL
	 */
	@Get('/from-url')
	async getFromUrl(req: AuthRequest, res: Response) {
		try {
			const { url } = req.query;

			if (!url || typeof url !== 'string') {
				return res.status(400).json({
					success: false,
					error: 'URL parameter is required',
				});
			}

			this.logger.info(`Fetching workflow from URL: ${url}`, { userId: req.user.id });

			// Fetch workflow from URL
			const { data: workflowData } = await axios.get(url);

			// Validate it's a workflow JSON
			if (
				!workflowData?.nodes ||
				!Array.isArray(workflowData.nodes) ||
				!workflowData.connections ||
				typeof workflowData.connections !== 'object' ||
				Array.isArray(workflowData.connections)
			) {
				throw new BadRequestError(
					'The data in the file does not seem to be a valid n8n workflow JSON file!',
				);
			}

			this.logger.info('Valid workflow fetched from URL', { userId: req.user.id });
			res.json({
				success: true,
				data: workflowData,
			});
		} catch (error: any) {
			this.logger.error('Error fetching workflow from URL:', { error: error?.message || error });
			res.status(error.httpStatusCode || 500).json({
				success: false,
				error: error.message || 'Failed to fetch workflow from URL',
			});
		}
	}

	/**
	 * Update existing workflow
	 * Complete implementation from n8n
	 */
	@Patch('/:id')
	async updateWorkflow(@Param('id') id: string, req: AuthRequest, res: Response) {
		try {
			const updates = req.body;
			const forceSave = req.query.forceSave === 'true';

			const { tags, parentFolderId, aiBuilderAssisted, expectedChecksum, autosaved, ...rest } =
				updates;

			// Run external hooks
			await this.externalHooks.run('workflow.update', [rest]);

			// Update workflow using service
			const updatedWorkflow = await this.workflowService.update(req.user, id, rest, {
				tagIds: tags,
				parentFolderId,
				forceSave,
				expectedChecksum,
				aiBuilderAssisted,
				autosaved,
			});

			// Run external hooks after update
			await this.externalHooks.run('workflow.afterUpdate', [updatedWorkflow]);

			// Emit event
			this.eventService.emit('workflow-saved', {
				user: req.user,
				workflow: updatedWorkflow,
				publicApi: false,
				aiBuilderAssisted,
			});

			// Get scopes and checksum
			const scopes = await this.workflowService.getWorkflowScopes(req.user, id);
			const checksum = await calculateWorkflowChecksum(updatedWorkflow);

			this.logger.info('Workflow updated', { workflowId: id, userId: req.user.id });

			res.json({
				success: true,
				data: {
					...updatedWorkflow,
					scopes,
					checksum,
				},
			});
		} catch (error: any) {
			this.logger.error('Failed to update workflow:', {
				workflowId: id,
				error: error?.message || error,
			});
			res.status(error.httpStatusCode || 500).json({
				success: false,
				error: error.message || 'Failed to update workflow',
			});
		}
	}

	/**
	 * Delete workflow
	 */
	@Delete('/:id')
	async deleteWorkflow(@Param('id') id: string, req: AuthRequest, res: Response) {
		try {
			const workflow = await this.workflowService.delete(req.user, id);

			if (!workflow) {
				this.logger.warn('User attempted to delete a workflow without permissions', {
					workflowId: id,
					userId: req.user.id,
				});
				throw new ForbiddenError(
					'Could not delete the workflow - workflow was not found in your projects',
				);
			}

			// Emit event
			this.eventService.emit('workflow-deleted', {
				user: req.user,
				workflowId: id,
				workflow,
			});

			this.logger.info('Workflow deleted', { workflowId: id, userId: req.user.id });

			res.json({
				success: true,
				message: 'Workflow deleted successfully',
			});
		} catch (error: any) {
			this.logger.error('Failed to delete workflow:', {
				workflowId: id,
				error: error?.message || error,
			});
			res.status(error.httpStatusCode || 500).json({
				success: false,
				error: error.message || 'Failed to delete workflow',
			});
		}
	}

	/**
	 * Activate workflow
	 */
	@Post('/:id/activate')
	async activateWorkflow(@Param('id') id: string, req: AuthRequest, res: Response) {
		try {
			const workflow = await this.workflowService.activateWorkflow(req.user, id);

			// Emit event
			this.eventService.emit('workflow-activated', {
				user: req.user,
				workflowId: id,
				workflow,
				publicApi: false,
			});

			// Get scopes and checksum
			const scopes = await this.workflowService.getWorkflowScopes(req.user, id);
			const checksum = await calculateWorkflowChecksum(workflow);

			this.logger.info('Workflow activated', { workflowId: id, userId: req.user.id });

			res.json({
				success: true,
				data: {
					...workflow,
					scopes,
					checksum,
				},
			});
		} catch (error: any) {
			this.logger.error('Failed to activate workflow:', {
				workflowId: id,
				error: error?.message || error,
			});
			res.status(error.httpStatusCode || 500).json({
				success: false,
				error: error.message || 'Failed to activate workflow',
			});
		}
	}

	/**
	 * Deactivate workflow
	 */
	@Post('/:id/deactivate')
	async deactivateWorkflow(@Param('id') id: string, req: AuthRequest, res: Response) {
		try {
			const workflow = await this.workflowService.deactivateWorkflow(req.user, id);

			// Emit event
			this.eventService.emit('workflow-deactivated', {
				user: req.user,
				workflowId: id,
				workflow,
				publicApi: false,
			});

			// Get scopes and checksum
			const scopes = await this.workflowService.getWorkflowScopes(req.user, id);
			const checksum = await calculateWorkflowChecksum(workflow);

			this.logger.info('Workflow deactivated', { workflowId: id, userId: req.user.id });

			res.json({
				success: true,
				data: {
					...workflow,
					scopes,
					checksum,
				},
			});
		} catch (error: any) {
			this.logger.error('Failed to deactivate workflow:', {
				workflowId: id,
				error: error?.message || error,
			});
			res.status(error.httpStatusCode || 500).json({
				success: false,
				error: error.message || 'Failed to deactivate workflow',
			});
		}
	}
}
