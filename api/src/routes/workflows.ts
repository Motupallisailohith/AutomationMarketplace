import { Router } from 'express';
import { Client } from '@temporalio/client';
import crypto from 'crypto';
import { databaseService } from '../services/database';
import { logger } from '../shared/logger';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const temporalClient = new Client();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all workflows for authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const workflows = await databaseService.getWorkflows(userId);
    
    logger.info('Workflows retrieved', { userId, count: workflows.length });
    
    res.json({
      success: true,
      data: workflows.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        definition: w.definition,
        isActive: w.is_active,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
        createdBy: w.created_by,
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

// Get specific workflow with triggers
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    
    const workflow = await databaseService.getWorkflow(id);
    
    if (!workflow) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
      return;
    }
    
    // Check if user owns the workflow or is admin
    if (workflow.created_by !== userId && (req as any).user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }
    
    // Get triggers for this workflow
    const triggers = await databaseService.getTriggers(id);
    
    logger.info('Workflow retrieved', { workflowId: id, userId });
    
    res.json({
      success: true,
      data: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        definition: workflow.definition,
        isActive: workflow.is_active,
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at,
        createdBy: workflow.created_by,
        triggers: triggers.map(t => ({
          id: t.id,
          type: t.type,
          configuration: t.configuration,
          isActive: t.is_active,
          createdAt: t.created_at,
        })),
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

// Create new workflow
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { name, description, definition, triggers = [] } = req.body;
    
    if (!name || !definition) {
      res.status(400).json({
        success: false,
        error: 'Name and definition are required'
      });
      return;
    }
    
    const workflowId = crypto.randomUUID();
    
    // Create workflow
    const workflow = await databaseService.createWorkflow({
      id: workflowId,
      name,
      description,
      definition,
      createdBy: userId,
    });
    
    // Create triggers if provided
    const createdTriggers = [];
    for (const trigger of triggers) {
      const createdTrigger = await databaseService.createTrigger({
        id: crypto.randomUUID(),
        workflowId,
        type: trigger.type,
        configuration: trigger.configuration,
        isActive: trigger.isActive ?? true,
      });
      createdTriggers.push(createdTrigger);
    }
    
    logger.info('Workflow created', { 
      workflowId, 
      userId, 
      triggerCount: createdTriggers.length 
    });
    
    res.status(201).json({
      success: true,
      data: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        definition: workflow.definition,
        isActive: workflow.is_active,
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at,
        createdBy: workflow.created_by,
        triggers: createdTriggers.map(t => ({
          id: t.id,
          type: t.type,
          configuration: t.configuration,
          isActive: t.is_active,
          createdAt: t.created_at,
        })),
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

// Update existing workflow
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const { name, description, definition, isActive } = req.body;
    
    // Check if workflow exists and user owns it
    const existingWorkflow = await databaseService.getWorkflow(id);
    if (!existingWorkflow) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
      return;
    }
    
    if (existingWorkflow.created_by !== userId && (req as any).user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }
    
    // Update workflow
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (definition !== undefined) updates.definition = JSON.stringify(definition);
    if (isActive !== undefined) updates.is_active = isActive;
    
    const workflow = await databaseService.updateWorkflow(id, updates);
    
    logger.info('Workflow updated', { workflowId: id, userId });
    
    res.json({
      success: true,
      data: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        definition: workflow.definition,
        isActive: workflow.is_active,
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at,
        createdBy: workflow.created_by,
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

// Execute workflow
router.post('/:id/execute', async (req, res) => {
  try {
    const { id: workflowId } = req.params;
    const userId = (req as any).user.userId;
    const { triggerData = {}, triggerId } = req.body;

    // Check if workflow exists and user has access
    const workflow = await databaseService.getWorkflow(workflowId);
    if (!workflow) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
      return;
    }
    
    if (workflow.created_by !== userId && (req as any).user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }
    
    if (!workflow.is_active) {
      res.status(400).json({
        success: false,
        error: 'Workflow is not active'
      });
      return;
    }

    // Generate execution ID
    const executionId = crypto.randomUUID();
    const temporalRunId = `workflow-${workflowId}-${Date.now()}`;

    // Create execution record
    await databaseService.createExecution({
      id: executionId,
      workflowId,
      triggerId,
      temporalRunId,
      inputData: triggerData,
    });

    // Start Temporal workflow
    const handle = await temporalClient.workflow.start('workflowOrchestrator', {
      taskQueue: 'automation-task-queue',
      workflowId: temporalRunId,
      args: [{ 
        workflowId,
        executionId,
        triggerData,
        definition: workflow.definition,
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
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Check if workflow exists and user has access
    const workflow = await databaseService.getWorkflow(workflowId);
    if (!workflow) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
      return;
    }
    
    if (workflow.created_by !== userId && (req as any).user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }
    
    const executions = await databaseService.getExecutions(workflowId, limit);
    
    res.json({
      success: true,
      data: executions.map(e => ({
        id: e.id,
        workflowId: e.workflow_id,
        triggerId: e.trigger_id,
        temporalRunId: e.temporal_run_id,
        status: e.status,
        inputData: e.input_data,
        outputData: e.output_data,
        errorMessage: e.error_message,
        startedAt: e.started_at,
        completedAt: e.completed_at,
        durationMs: e.duration_ms,
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