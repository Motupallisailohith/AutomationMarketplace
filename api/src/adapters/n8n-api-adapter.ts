/**
 * n8n Frontend to Automation Marketplace Backend Adapter
 * 
 * This adapter translates between:
 * - n8n's frontend API expectations (Bull Queue based)
 * - Automation Marketplace's Temporal-based backend
 * 
 * Key differences handled:
 * 1. Execution model: Bull Queue → Temporal Workflows
 * 2. Worker architecture: Single Node.js → Multi-language workers
 * 3. Event system: None → Kafka event streaming
 * 4. Storage: TypeORM → PostgreSQL with custom migrations
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ============================================================================
// Type Definitions (n8n compatible)
// ============================================================================

interface N8nWorkflow {
  id?: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  settings?: any;
  tags?: string[];
  pinData?: any;
  versionId?: string;
}

interface N8nExecution {
  id: string;
  finished: boolean;
  mode: 'manual' | 'trigger' | 'webhook';
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  data: any;
  status: 'running' | 'success' | 'error' | 'waiting';
}

// ============================================================================
// WORKFLOW ENDPOINTS (n8n API compatible)
// ============================================================================

/**
 * GET /api/workflows
 * List all workflows (n8n format)
 */
router.get('/workflows', async (req: Request, res: Response) => {
  try {
    // TODO: Fetch from your PostgreSQL database
    // TODO: Map Automation Marketplace workflow schema to n8n format
    
    const mockWorkflows: N8nWorkflow[] = [
      {
        id: uuidv4(),
        name: 'Example Workflow',
        active: true,
        nodes: [],
        connections: {},
        settings: {},
        tags: [],
      }
    ];

    res.json({ data: mockWorkflows, count: mockWorkflows.length });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

/**
 * GET /api/workflows/:id
 * Get single workflow (n8n format)
 */
router.get('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // TODO: Fetch from PostgreSQL
    // TODO: Convert from Automation Marketplace format to n8n format
    
    const mockWorkflow: N8nWorkflow = {
      id,
      name: 'Example Workflow',
      active: true,
      nodes: [],
      connections: {},
      settings: {
        timeout: 300000,
        maxRetries: 3,
        errorHandling: 'stop',
      },
    };

    res.json({ data: mockWorkflow });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

/**
 * POST /api/workflows
 * Create new workflow (n8n format)
 */
router.post('/workflows', async (req: Request, res: Response) => {
  try {
    const workflowData: N8nWorkflow = req.body;
    
    // TODO: Convert n8n workflow format to Automation Marketplace format
    // TODO: Save to PostgreSQL
    // TODO: Register with Temporal if active
    
    const newWorkflow = {
      ...workflowData,
      id: uuidv4(),
    };

    res.json({ data: newWorkflow });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

/**
 * PATCH /api/workflows/:id
 * Update workflow (n8n format)
 */
router.patch('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates: Partial<N8nWorkflow> = req.body;
    
    // TODO: Update in PostgreSQL
    // TODO: If active status changed, update Temporal schedules
    // TODO: Publish update event to Kafka
    
    const updatedWorkflow = {
      id,
      ...updates,
    };

    res.json({ data: updatedWorkflow });
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

/**
 * DELETE /api/workflows/:id
 * Delete workflow (n8n format)
 */
router.delete('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // TODO: Delete from PostgreSQL
    // TODO: Cancel any Temporal schedules
    // TODO: Publish deletion event to Kafka
    
    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

/**
 * POST /api/workflows/:id/activate
 * Activate workflow (create Temporal schedule)
 */
router.post('/workflows/:id/activate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // TODO: Fetch workflow from database
    // TODO: Create Temporal schedule/trigger
    // TODO: Update active status in PostgreSQL
    // TODO: Publish activation event to Kafka
    
    res.json({ data: { active: true } });
  } catch (error) {
    console.error('Error activating workflow:', error);
    res.status(500).json({ error: 'Failed to activate workflow' });
  }
});

/**
 * POST /api/workflows/:id/deactivate
 * Deactivate workflow (remove Temporal schedule)
 */
router.post('/workflows/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // TODO: Cancel Temporal schedule
    // TODO: Update active status in PostgreSQL
    // TODO: Publish deactivation event to Kafka
    
    res.json({ data: { active: false } });
  } catch (error) {
    console.error('Error deactivating workflow:', error);
    res.status(500).json({ error: 'Failed to deactivate workflow' });
  }
});

// ============================================================================
// EXECUTION ENDPOINTS (Bull Queue → Temporal mapping)
// ============================================================================

/**
 * POST /api/workflows/:id/run
 * Execute workflow manually (trigger Temporal workflow)
 */
router.post('/workflows/:id/run', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data: triggerData } = req.body;
    
    // TODO: Start Temporal workflow execution
    // TODO: Return execution ID immediately (async execution)
    // TODO: Publish execution start event to Kafka
    
    const executionId = uuidv4();
    
    const execution: N8nExecution = {
      id: executionId,
      finished: false,
      mode: 'manual',
      startedAt: new Date().toISOString(),
      workflowId: id,
      data: triggerData || {},
      status: 'running',
    };

    res.json({ data: execution });
  } catch (error) {
    console.error('Error executing workflow:', error);
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

/**
 * GET /api/executions
 * List executions (map Temporal execution history)
 */
router.get('/executions', async (req: Request, res: Response) => {
  try {
    const { workflowId, limit = 20, lastId } = req.query;
    
    // TODO: Query Temporal execution history
    // TODO: Map to n8n execution format
    // TODO: Support pagination with lastId
    
    const mockExecutions: N8nExecution[] = [];
    
    res.json({ data: mockExecutions, count: mockExecutions.length });
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

/**
 * GET /api/executions/:id
 * Get execution details (from Temporal)
 */
router.get('/executions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // TODO: Query Temporal for execution details
    // TODO: Get workflow run history and results
    // TODO: Map to n8n execution format with step details
    
    const mockExecution: N8nExecution = {
      id,
      finished: true,
      mode: 'manual',
      startedAt: new Date(Date.now() - 60000).toISOString(),
      stoppedAt: new Date().toISOString(),
      workflowId: 'workflow-id',
      data: {},
      status: 'success',
    };

    res.json({ data: mockExecution });
  } catch (error) {
    console.error('Error fetching execution:', error);
    res.status(500).json({ error: 'Failed to fetch execution' });
  }
});

/**
 * DELETE /api/executions/:id
 * Stop/Cancel execution (cancel Temporal workflow)
 */
router.delete('/executions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // TODO: Cancel Temporal workflow execution
    // TODO: Publish cancellation event to Kafka
    
    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Error stopping execution:', error);
    res.status(500).json({ error: 'Failed to stop execution' });
  }
});

// ============================================================================
// CREDENTIALS ENDPOINTS
// ============================================================================

/**
 * GET /api/credentials
 * List credentials (from PostgreSQL encrypted store)
 */
router.get('/credentials', async (req: Request, res: Response) => {
  try {
    // TODO: Fetch from PostgreSQL credentials table
    // TODO: Decrypt credential data
    // TODO: Map to n8n credential format
    
    const mockCredentials: any[] = [];
    
    res.json({ data: mockCredentials });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

/**
 * POST /api/credentials
 * Create credential (encrypt and store in PostgreSQL)
 */
router.post('/credentials', async (req: Request, res: Response) => {
  try {
    const credentialData = req.body;
    
    // TODO: Encrypt credential data
    // TODO: Store in PostgreSQL
    // TODO: Return credential without sensitive data
    
    const newCredential = {
      ...credentialData,
      id: uuidv4(),
    };

    res.json({ data: newCredential });
  } catch (error) {
    console.error('Error creating credential:', error);
    res.status(500).json({ error: 'Failed to create credential' });
  }
});

/**
 * DELETE /api/credentials/:id
 * Delete credential
 */
router.delete('/credentials/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // TODO: Delete from PostgreSQL
    // TODO: Check if any workflows are using this credential
    
    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Error deleting credential:', error);
    res.status(500).json({ error: 'Failed to delete credential' });
  }
});

// ============================================================================
// NODE TYPES / SETTINGS
// ============================================================================

/**
 * GET /api/node-types
 * Get available node types (400+ n8n nodes + custom nodes)
 */
router.get('/node-types', async (req: Request, res: Response) => {
  try {
    // TODO: Load n8n node registry
    // TODO: Add custom Automation Marketplace nodes
    // TODO: Filter based on available workers (Node.js, Python, Rust)
    
    res.json({ data: [] });
  } catch (error) {
    console.error('Error fetching node types:', error);
    res.status(500).json({ error: 'Failed to fetch node types' });
  }
});

/**
 * GET /api/settings
 * Get frontend settings
 */
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const settings = {
      instanceId: process.env.INSTANCE_ID || 'automation-marketplace',
      timezone: process.env.TZ || 'UTC',
      executionTimeout: parseInt(process.env.EXECUTION_TIMEOUT || '300000'),
      versionCli: '1.0.0',
      urlBaseWebhook: process.env.WEBHOOK_URL || 'http://localhost:3001',
      urlBaseEditor: process.env.EDITOR_URL || 'http://localhost:8080',
      binaryDataMode: 'filesystem',
      // Disable n8n cloud features
      templatesEnabled: false,
      personalizationSurveyEnabled: false,
      telemetryEnabled: false,
    };

    res.json({ data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * GET /api/login
 * Check authentication status
 */
router.get('/login', async (req: Request, res: Response) => {
  try {
    // TODO: Implement authentication check
    // TODO: Return current user if authenticated
    
    res.json({
      data: {
        id: 'user-1',
        email: 'admin@automation-marketplace.com',
        firstName: 'Admin',
        lastName: 'User',
        isDefaultUser: false,
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

/**
 * POST /api/logout
 * Logout user
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    // TODO: Clear session/JWT
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;