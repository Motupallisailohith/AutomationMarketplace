import { Router } from 'express';
import { Client } from '@temporalio/client';
import crypto from 'crypto';
import { Container } from '@n8n/di';
import { WorkflowService } from '../services/workflow.service.full';
import { logger } from '../shared/logger';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const temporalClient = new Client();
const workflowService = Container.get(WorkflowService);

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all workflows for authenticated user
router.get('/', async (req, res) => {
  try {
    const user = (req as any).user; // Full user object from auth middleware
    
    if (!user || !user.id) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }
    
    const { workflows, count } = await workflowService.getMany(user);
    
    logger.info('Workflows retrieved', { userId: user.id, count });
    
    res.json({
      success: true,
      data: workflows.map(w => ({
        id: w.id,
        name: w.name,
        nodes: w.nodes,
        connections: w.connections,
        settings: w.settings,
        active: w.active,
        versionId: w.versionId,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        tags: w.tags || [],
      })),
    });
  } catch (error: any) {
    logger.error('Failed to retrieve workflows:', { error: error?.message || error });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve workflows' 
    });
  }
});

// Get specific workflow with executions
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id || (req as any).user?.userId;
    
    const workflow = await workflowService.getWorkflow(id);
    
    if (!workflow) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
      return;
    }
    
    // Get executions for this workflow
    const executions = await workflowService.getWorkflowExecutions(id, 10);
    
    // Calculate checksum (n8n pattern)
    const checksum = await workflowService.calculateChecksum(workflow);
    
    logger.info('Workflow retrieved', { workflowId: id, userId });
    
    res.json({
      success: true,
      data: {
        id: workflow.id,
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings,
        active: workflow.active,
        versionId: workflow.versionId,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
        tags: workflow.tags || [],
        recentExecutions: executions,
        checksum,
      },
    });
  } catch (error: any) {
    logger.error('Failed to retrieve workflow:', { 
      workflowId: req.params.id, 
      error: error?.message || error 
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve workflow' 
    });
  }
});

// Create new workflow (POST)
router.post('/', async (req, res) => {
  try {
    const user = (req as any).user; // Full user object from auth middleware
    const { name, description, nodes, connections, settings, tags } = req.body;
    
    if (!name) {
      res.status(400).json({
        success: false,
        error: 'Name is required'
      });
      return;
    }
    
    if (!user || !user.id) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }
    
    // Create workflow using the service with user association
    const workflow = await workflowService.create(user, {
      name,
      nodes: nodes || [],
      connections: connections || {},
      settings: settings || { executionTimeout: 300, timezone: 'America/New_York' },
      active: false,
    }, {
      tagIds: tags,
    });
    
    // Calculate checksum (n8n pattern)
    const checksum = await workflowService.calculateChecksum(workflow);
    
    logger.info('Workflow created', { 
      workflowId: workflow.id, 
      userId: user.id,
      name: workflow.name
    });

    res.status(201).json({
      success: true,
      data: {
        id: workflow.id,
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings,
        active: workflow.active,
        versionId: workflow.versionId,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
        tags: workflow.tags || [],
        checksum,
      },
      message: 'Workflow created successfully',
    });
  } catch (error: any) {
    logger.error('Failed to create workflow:', { error: error?.message || error });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create workflow' 
    });
  }
});

// Update existing workflow (PATCH)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { name, description, nodes, connections, settings, active, tags } = req.body;
    
    if (!user || !user.id) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }
    
    // Check if workflow exists
    const existingWorkflow = await workflowService.getWorkflow(id);
    if (!existingWorkflow) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
      return;
    }
    
    // Prepare updates
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (nodes !== undefined) updates.nodes = nodes;
    if (connections !== undefined) updates.connections = connections;
    if (settings !== undefined) updates.settings = settings;
    if (active !== undefined) updates.active = active;
    
    // Update workflow using the service
    const workflow = await workflowService.update(user, id, updates, {
      tagIds: tags,
    });
    
    // Calculate checksum (n8n pattern)
    const checksum = await workflowService.calculateChecksum(workflow);
    
    logger.info('Workflow updated', { workflowId: id, userId: user.id });
    
    res.json({
      success: true,
      data: {
        id: workflow.id,
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings,
        active: workflow.active,
        versionId: workflow.versionId,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
        tags: workflow.tags || [],
        checksum,
      },
      message: 'Workflow updated successfully',
    });
  } catch (error: any) {
    logger.error('Failed to update workflow:', { 
      workflowId: req.params.id, 
      error: error?.message || error 
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update workflow' 
    });
  }
});

// Delete workflow
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    if (!user || !user.id) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }
    
    // Check if workflow exists
    const workflow = await workflowService.getWorkflow(id);
    if (!workflow) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
      return;
    }
    
    // Delete the workflow
    await workflowService.delete(user, id);
    
    logger.info('Workflow deleted', { workflowId: id, userId: user.id });
    
    res.json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  } catch (error: any) {
    logger.error('Failed to delete workflow:', { 
      workflowId: req.params.id, 
      error: error?.message || error 
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete workflow' 
    });
  }
});

// Execute workflow
router.post('/:id/execute', async (req, res) => {
  try {
    const { id: workflowId } = req.params;
    const userId = (req as any).user?.id || (req as any).user?.userId;
    const { triggerData = {}, triggerId } = req.body;

    // Check if workflow exists
    const workflow = await workflowService.getWorkflow(workflowId);
    if (!workflow) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
      return;
    }
    
    if (!workflow.active) {
      res.status(400).json({
        success: false,
        error: 'Workflow is not active'
      });
      return;
    }

    // Generate execution ID
    const executionId = crypto.randomUUID();
    const temporalRunId = `workflow-${workflowId}-${Date.now()}`;

    // Start Temporal workflow
    const handle = await temporalClient.workflow.start('workflowOrchestrator', {
      taskQueue: 'automation-task-queue',
      workflowId: temporalRunId,
      args: [{ 
        workflowId,
        executionId,
        triggerData,
        definition: { nodes: workflow.nodes, connections: workflow.connections },
        triggerId,
      }],
    });

    logger.info('Workflow execution started', { 
      workflowId, 
      executionId, 
      temporalRunId: handle.workflowId,
      userId 
    });

    res.json({
      success: true,
      data: {
        executionId,
        workflowId,
        temporalRunId: handle.workflowId,
        runId: handle.firstExecutionRunId,
        status: 'running',
        startedAt: new Date().toISOString(),
      },
      message: 'Workflow execution started successfully',
    });
  } catch (error: any) {
    logger.error('Failed to execute workflow:', { 
      workflowId: req.params.id, 
      error: error?.message || error 
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to start workflow execution' 
    });
  }
});

// Get workflow executions
router.get('/:id/executions', async (req, res) => {
  try {
    const { id: workflowId } = req.params;
    const userId = (req as any).user?.id || (req as any).user?.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Check if workflow exists
    const workflow = await workflowService.getWorkflow(workflowId);
    if (!workflow) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
      return;
    }
    
    const executions = await workflowService.getWorkflowExecutions(workflowId, limit);
    
    res.json({
      success: true,
      data: executions.map(e => ({
        id: e.id,
        workflowId: e.workflowId,
        status: e.status,
        startedAt: e.startedAt,
        stoppedAt: e.stoppedAt,
        mode: e.mode,
      })),
    });
  } catch (error: any) {
    logger.error('Failed to retrieve executions:', { 
      workflowId: req.params.id, 
      error: error?.message || error 
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve executions' 
    });
  }
});

export default router;