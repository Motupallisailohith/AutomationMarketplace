import { Router } from 'express';
import { Client } from '@temporalio/client';
import crypto from 'crypto';
import { databaseService } from '../services/database';
import { logger } from '../shared/logger';

const router = Router();
const temporalClient = new Client();

// Test webhook endpoint
router.all('/test/:triggerId', async (req, res) => {
  try {
    const { triggerId } = req.params;
    
    logger.info('Test webhook triggered', { triggerId, method: req.method });

    // Get trigger configuration
    const trigger = await databaseService.getTrigger(triggerId);
    if (!trigger) {
      res.status(404).json({ 
        success: false, 
        error: 'Webhook trigger not found' 
      });
      return;
    }

    const testData = {
      message: 'Test webhook triggered',
      triggerId,
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body,
      timestamp: new Date().toISOString(),
    };

    logger.info('Webhook test successful', { triggerId });

    res.json({
      success: true,
      message: 'Webhook test successful',
      data: testData,
    });

  } catch (error: any) {
    logger.error('Webhook test failed:', { 
      triggerId: req.params.triggerId,
      error: error?.message || error 
    });
    res.status(500).json({ 
      success: false, 
      error: 'Webhook test failed' 
    });
  }
});

// Production webhook endpoint
router.all('/prod/:triggerId', async (req, res) => {
  try {
    const { triggerId } = req.params;
    const webhookData = {
      headers: req.headers,
      body: req.body,
      query: req.query,
      method: req.method,
      timestamp: new Date().toISOString(),
    };

    logger.info('Production webhook received', { triggerId, method: req.method });

    // Get trigger configuration from database
    const trigger = await databaseService.getTrigger(triggerId);
    if (!trigger) {
      logger.warn('Webhook trigger not found', { triggerId });
      res.status(404).json({ 
        success: false, 
        error: 'Webhook trigger not found' 
      });
      return;
    }

    if (!trigger.is_active) {
      logger.warn('Webhook trigger is inactive', { triggerId });
      res.status(400).json({ 
        success: false, 
        error: 'Webhook trigger is inactive' 
      });
      return;
    }

    // Get workflow information
    const workflow = await databaseService.getWorkflow(trigger.workflow_id);
    if (!workflow) {
      logger.error('Workflow not found for trigger', { 
        triggerId, 
        workflowId: trigger.workflow_id 
      });
      res.status(404).json({ 
        success: false, 
        error: 'Associated workflow not found' 
      });
      return;
    }

    if (!workflow.is_active) {
      logger.warn('Workflow is inactive', { 
        triggerId, 
        workflowId: trigger.workflow_id 
      });
      res.status(400).json({ 
        success: false, 
        error: 'Associated workflow is inactive' 
      });
      return;
    }

    // Validate webhook authentication if configured
    const triggerConfig = trigger.configuration as any;
    if (triggerConfig?.authentication?.enabled) {
      const authType = triggerConfig.authentication.type;
      
      if (authType === 'header') {
        const requiredHeader = triggerConfig.authentication.headerName;
        const expectedValue = triggerConfig.authentication.headerValue;
        const providedValue = req.headers[requiredHeader.toLowerCase()];
        
        if (providedValue !== expectedValue) {
          logger.warn('Webhook authentication failed - invalid header', { 
            triggerId, 
            requiredHeader 
          });
          res.status(401).json({ 
            success: false, 
            error: 'Authentication failed' 
          });
          return;
        }
      } else if (authType === 'query') {
        const requiredParam = triggerConfig.authentication.paramName;
        const expectedValue = triggerConfig.authentication.paramValue;
        const providedValue = req.query[requiredParam];
        
        if (providedValue !== expectedValue) {
          logger.warn('Webhook authentication failed - invalid query param', { 
            triggerId, 
            requiredParam 
          });
          res.status(401).json({ 
            success: false, 
            error: 'Authentication failed' 
          });
          return;
        }
      }
    }

    // Generate execution ID
    const executionId = crypto.randomUUID();
    const temporalRunId = `webhook-${trigger.workflow_id}-${Date.now()}`;

    // Create execution record
    await databaseService.createExecution({
      id: executionId,
      workflowId: trigger.workflow_id,
      triggerId: trigger.id,
      temporalRunId,
      inputData: webhookData,
    });

    // Start Temporal workflow
    const handle = await temporalClient.workflow.start('workflowOrchestrator', {
      taskQueue: 'automation-task-queue',
      workflowId: temporalRunId,
      args: [{
        workflowId: trigger.workflow_id,
        executionId,
        triggerData: webhookData,
        definition: workflow.definition,
        triggerId: trigger.id,
        triggerType: 'webhook',
      }],
    });

    logger.info('Workflow started from webhook', {
      triggerId,
      workflowId: trigger.workflow_id,
      executionId,
      temporalRunId: handle.workflowId,
    });

    // Return appropriate response based on configuration
    const responseConfig = triggerConfig?.response || { format: 'json' };
    
    if (responseConfig.format === 'json') {
      res.status(responseConfig.statusCode || 200).json({
        success: true,
        message: responseConfig.message || 'Webhook processed successfully',
        executionId,
        workflowId: trigger.workflow_id,
        temporalRunId: handle.workflowId,
      });
    } else if (responseConfig.format === 'text') {
      res.status(responseConfig.statusCode || 200).send(
        responseConfig.message || 'Webhook processed successfully'
      );
    } else {
      res.status(responseConfig.statusCode || 200).send(
        responseConfig.customResponse || 'OK'
      );
    }

  } catch (error: any) {
    logger.error('Webhook processing failed:', { 
      triggerId: req.params.triggerId,
      error: error?.message || error 
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process webhook' 
    });
  }
});

// Legacy webhook format for backward compatibility
router.post('/:workflowId/:triggerId', async (req, res) => {
  try {
    const { workflowId, triggerId } = req.params;
    
    logger.info('Legacy webhook received', { workflowId, triggerId });
    
    const triggerData = {
      type: 'webhook',
      method: req.method,
      headers: req.headers,
      query: req.query,
      body: req.body,
      receivedAt: new Date().toISOString(),
      triggerId,
    };
    
    // Generate execution ID
    const executionId = crypto.randomUUID();
    const temporalRunId = `legacy-${workflowId}-${Date.now()}`;

    // Create execution record if workflow exists
    try {
      await databaseService.createExecution({
        id: executionId,
        workflowId,
        triggerId,
        temporalRunId,
        inputData: triggerData,
      });
    } catch (dbError) {
      logger.warn('Could not create execution record for legacy webhook', { 
        workflowId, 
        triggerId,
        error: (dbError as Error).message 
      });
    }
    
    // Start Temporal workflow
    const handle = await temporalClient.workflow.start('workflowOrchestrator', {
      taskQueue: 'automation-task-queue',
      workflowId: temporalRunId,
      args: [{ 
        workflowId,
        executionId,
        triggerData,
        triggerId,
        triggerType: 'webhook-legacy',
      }],
    });
    
    logger.info('Legacy workflow started', {
      workflowId,
      triggerId,
      executionId,
      temporalRunId: handle.workflowId,
    });
    
    res.json({
      success: true,
      message: 'Webhook received and workflow started',
      workflowId,
      executionId,
      temporalRunId: handle.workflowId,
    });
    
  } catch (error: any) {
    logger.error('Legacy webhook processing error:', { 
      workflowId: req.params.workflowId,
      triggerId: req.params.triggerId,
      error: error?.message || error 
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process webhook' 
    });
  }
});

// Get webhook URL for trigger (public endpoint for frontend)
router.get('/:triggerId/url', async (req, res) => {
  try {
    const { triggerId } = req.params;
    
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    const testUrl = `${baseUrl}/api/webhooks/test/${triggerId}`;
    const prodUrl = `${baseUrl}/api/webhooks/prod/${triggerId}`;

    res.json({
      success: true,
      data: {
        testUrl,
        prodUrl,
        triggerId,
        instructions: {
          test: 'Use the test URL for development and testing webhook triggers',
          prod: 'Use the production URL for live webhook integrations'
        }
      },
    });

  } catch (error: any) {
    logger.error('Failed to get webhook URL:', { 
      triggerId: req.params.triggerId,
      error: error?.message || error 
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get webhook URL' 
    });
  }
});

export default router;