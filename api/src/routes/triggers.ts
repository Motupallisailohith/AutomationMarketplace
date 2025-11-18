import { Router } from 'express';
import crypto from 'crypto';
import { databaseService } from '../services/database';
import { logger } from '../shared/logger';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all triggers for authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const workflowId = req.query.workflowId as string;
    
    let triggers;
    if (workflowId) {
      // Verify user owns the workflow
      const workflow = await databaseService.getWorkflow(workflowId);
      if (!workflow || (workflow.created_by !== userId && (req as any).user.role !== 'admin')) {
        res.status(403).json({
          success: false,
          error: 'Access denied to workflow triggers'
        });
        return;
      }
      triggers = await databaseService.getTriggers(workflowId);
    } else {
      // Get all triggers for workflows owned by user
      const userWorkflows = await databaseService.getWorkflows(userId);
      const workflowIds = userWorkflows.map(w => w.id);
      triggers = [];
      for (const wfId of workflowIds) {
        const wfTriggers = await databaseService.getTriggers(wfId);
        triggers.push(...wfTriggers);
      }
    }
    
    logger.info('Triggers retrieved', { userId, count: triggers.length, workflowId });
    
    res.json({
      success: true,
      data: triggers.map(t => ({
        id: t.id,
        workflowId: t.workflow_id,
        type: t.type,
        configuration: t.configuration,
        isActive: t.is_active,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })),
    });
  } catch (error: any) {
    logger.error('Failed to retrieve triggers:', { error: error?.message || error });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve triggers' 
    });
  }
});

// Get specific trigger
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    
    const trigger = await databaseService.getTrigger(id);
    
    if (!trigger) {
      res.status(404).json({
        success: false,
        error: 'Trigger not found'
      });
      return;
    }
    
    // Check if user owns the workflow containing this trigger
    const workflow = await databaseService.getWorkflow(trigger.workflow_id);
    if (!workflow || (workflow.created_by !== userId && (req as any).user.role !== 'admin')) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }
    
    logger.info('Trigger retrieved', { triggerId: id, userId });
    
    res.json({
      success: true,
      data: {
        id: trigger.id,
        workflowId: trigger.workflow_id,
        type: trigger.type,
        configuration: trigger.configuration,
        isActive: trigger.is_active,
        createdAt: trigger.created_at,
        updatedAt: trigger.updated_at,
      },
    });
  } catch (error: any) {
    logger.error('Failed to retrieve trigger:', { 
      triggerId: req.params.id, 
      error: error?.message || error 
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve trigger' 
    });
  }
});

// Create new trigger
router.post('/', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { workflowId, type, configuration, isActive = true } = req.body;
    
    if (!workflowId || !type || !configuration) {
      res.status(400).json({
        success: false,
        error: 'Workflow ID, type, and configuration are required'
      });
      return;
    }
    
    // Check if user owns the workflow
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
    
    // Validate trigger type
    const validTypes = ['webhook', 'schedule', 'manual', 'api', 'email'];
    if (!validTypes.includes(type)) {
      res.status(400).json({
        success: false,
        error: `Invalid trigger type. Must be one of: ${validTypes.join(', ')}`
      });
      return;
    }
    
    const triggerId = crypto.randomUUID();
    
    // Create trigger
    const trigger = await databaseService.createTrigger({
      id: triggerId,
      workflowId,
      type,
      configuration,
      isActive,
    });
    
    logger.info('Trigger created', { triggerId, workflowId, type, userId });
    
    res.status(201).json({
      success: true,
      data: {
        id: trigger.id,
        workflowId: trigger.workflow_id,
        type: trigger.type,
        configuration: trigger.configuration,
        isActive: trigger.is_active,
        createdAt: trigger.created_at,
        updatedAt: trigger.updated_at,
      },
      message: 'Trigger created successfully',
    });
  } catch (error: any) {
    logger.error('Failed to create trigger:', { error: error?.message || error });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create trigger' 
    });
  }
});

// Update existing trigger
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const { type, configuration, isActive } = req.body;
    
    // Check if trigger exists
    const existingTrigger = await databaseService.getTrigger(id);
    if (!existingTrigger) {
      res.status(404).json({
        success: false,
        error: 'Trigger not found'
      });
      return;
    }
    
    // Check if user owns the workflow containing this trigger
    const workflow = await databaseService.getWorkflow(existingTrigger.workflow_id);
    if (!workflow || (workflow.created_by !== userId && (req as any).user.role !== 'admin')) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }
    
    // Validate trigger type if provided
    if (type) {
      const validTypes = ['webhook', 'schedule', 'manual', 'api', 'email'];
      if (!validTypes.includes(type)) {
        res.status(400).json({
          success: false,
          error: `Invalid trigger type. Must be one of: ${validTypes.join(', ')}`
        });
        return;
      }
    }
    
    // Update trigger
    const updates: any = {};
    if (type !== undefined) updates.type = type;
    if (configuration !== undefined) updates.configuration = JSON.stringify(configuration);
    if (isActive !== undefined) updates.is_active = isActive;
    
    const trigger = await databaseService.updateTrigger(id, updates);
    
    logger.info('Trigger updated', { triggerId: id, userId });
    
    res.json({
      success: true,
      data: {
        id: trigger.id,
        workflowId: trigger.workflow_id,
        type: trigger.type,
        configuration: trigger.configuration,
        isActive: trigger.is_active,
        createdAt: trigger.created_at,
        updatedAt: trigger.updated_at,
      },
      message: 'Trigger updated successfully',
    });
  } catch (error: any) {
    logger.error('Failed to update trigger:', { 
      triggerId: req.params.id, 
      error: error?.message || error 
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update trigger' 
    });
  }
});

// Delete trigger
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    
    // Check if trigger exists
    const existingTrigger = await databaseService.getTrigger(id);
    if (!existingTrigger) {
      res.status(404).json({
        success: false,
        error: 'Trigger not found'
      });
      return;
    }
    
    // Check if user owns the workflow containing this trigger
    const workflow = await databaseService.getWorkflow(existingTrigger.workflow_id);
    if (!workflow || (workflow.created_by !== userId && (req as any).user.role !== 'admin')) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }
    
    // Delete trigger
    await databaseService.deleteTrigger(id);
    
    logger.info('Trigger deleted', { triggerId: id, userId });
    
    res.json({
      success: true,
      message: 'Trigger deleted successfully',
    });
  } catch (error: any) {
    logger.error('Failed to delete trigger:', { 
      triggerId: req.params.id, 
      error: error?.message || error 
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete trigger' 
    });
  }
});

// Get webhook URLs for a webhook trigger
router.get('/:id/webhook-urls', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    
    const trigger = await databaseService.getTrigger(id);
    
    if (!trigger) {
      res.status(404).json({
        success: false,
        error: 'Trigger not found'
      });
      return;
    }
    
    if (trigger.type !== 'webhook') {
      res.status(400).json({
        success: false,
        error: 'This endpoint is only for webhook triggers'
      });
      return;
    }
    
    // Check if user owns the workflow containing this trigger
    const workflow = await databaseService.getWorkflow(trigger.workflow_id);
    if (!workflow || (workflow.created_by !== userId && (req as any).user.role !== 'admin')) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }
    
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    const testUrl = `${baseUrl}/api/webhooks/test/${id}`;
    const prodUrl = `${baseUrl}/api/webhooks/prod/${id}`;
    
    res.json({
      success: true,
      data: {
        triggerId: id,
        testUrl,
        prodUrl,
        isActive: trigger.is_active,
        configuration: trigger.configuration,
        instructions: {
          test: 'Use the test URL for development and testing webhook triggers',
          prod: 'Use the production URL for live webhook integrations'
        }
      },
    });
  } catch (error: any) {
    logger.error('Failed to get webhook URLs:', { 
      triggerId: req.params.id, 
      error: error?.message || error 
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get webhook URLs' 
    });
  }
});

// Test trigger (for manual testing)
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const { testData = {} } = req.body;
    
    const trigger = await databaseService.getTrigger(id);
    
    if (!trigger) {
      res.status(404).json({
        success: false,
        error: 'Trigger not found'
      });
      return;
    }
    
    // Check if user owns the workflow containing this trigger
    const workflow = await databaseService.getWorkflow(trigger.workflow_id);
    if (!workflow || (workflow.created_by !== userId && (req as any).user.role !== 'admin')) {
      res.status(403).json({
        success: false,
        error: 'Access denied'
      });
      return;
    }
    
    logger.info('Trigger test initiated', { triggerId: id, userId, triggerType: trigger.type });
    
    // For webhook triggers, return test URL info
    if (trigger.type === 'webhook') {
      const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
      const testUrl = `${baseUrl}/api/webhooks/test/${id}`;
      
      res.json({
        success: true,
        data: {
          triggerId: id,
          type: trigger.type,
          testUrl,
          message: 'Use the test URL to simulate webhook triggers',
          configuration: trigger.configuration,
        },
      });
    } else {
      // For other trigger types, just return test confirmation
      res.json({
        success: true,
        data: {
          triggerId: id,
          type: trigger.type,
          message: `Test data received for ${trigger.type} trigger`,
          testData,
          configuration: trigger.configuration,
        },
      });
    }
  } catch (error: any) {
    logger.error('Failed to test trigger:', { 
      triggerId: req.params.id, 
      error: error?.message || error 
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to test trigger' 
    });
  }
});

export default router;