/**
 * Workflow Execution Routes
 * API endpoints for executing workflows
 */

import { Router, Request, Response } from 'express';
import { WorkflowExecutorService } from '../services/workflow-executor.service';
import { nodeRegistry } from '../services/node-registry.service';

const router = Router();

// Get singleton instance
const workflowExecutor = new WorkflowExecutorService(nodeRegistry);

/**
 * POST /api/workflows/execute
 * Execute a workflow with provided configuration
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { workflow, triggerData } = req.body;

    if (!workflow || !workflow.steps) {
      return res.status(400).json({
        error: 'Invalid workflow definition',
        message: 'Workflow must contain steps array',
      });
    }

    console.log(`[WorkflowExecutionAPI] Executing workflow: ${workflow.name}`);
    console.log(`[WorkflowExecutionAPI] Steps: ${workflow.steps.length}`);

    const result = await workflowExecutor.executeWorkflow(workflow, triggerData || {});

    // Convert Map to object for JSON response
    const outputs: any = {};
    result.outputs.forEach((value, key) => {
      outputs[key] = value;
    });

    return res.json({
      success: result.success,
      executionId: `exec_${Date.now()}`,
      outputs,
      error: result.error,
    });
  } catch (error: any) {
    console.error('[WorkflowExecutionAPI] Execution error:', error);
    return res.status(500).json({
      error: 'Workflow execution failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/workflows/:id/execute
 * Execute a workflow by ID
 */
router.post('/:id/execute', async (_req: Request, res: Response) => {
  try {
    // TODO: Load workflow from database
    // const workflowId = req.params.id;
    // const { triggerData } = req.body;

    // TODO: Load workflow from database
    // For now, return error
    return res.status(501).json({
      error: 'Not implemented',
      message: 'Loading workflows from database not implemented yet',
    });
  } catch (error: any) {
    console.error('[WorkflowExecutionAPI] Execution error:', error);
    return res.status(500).json({
      error: 'Workflow execution failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/executions/:id
 * Get execution status and results
 */
router.get('/executions/:id', async (_req: Request, res: Response) => {
  try {
    // TODO: Implement execution status tracking
    // const executionId = req.params.id;

    // TODO: Implement execution status tracking
    return res.status(501).json({
      error: 'Not implemented',
      message: 'Execution status tracking not implemented yet',
    });
  } catch (error: any) {
    console.error('[WorkflowExecutionAPI] Error:', error);
    return res.status(500).json({
      error: 'Failed to get execution status',
      message: error.message,
    });
  }
});

export default router;
