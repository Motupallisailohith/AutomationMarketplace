import { Router } from 'express';

const router = Router();

/**
 * ARCHITECTURAL NOTE:
 * Webhook handling is implemented in the Go orchestrator (port 8080), not in this Node.js API.
 * The Go orchestrator handles:
 * - Webhook routing and validation
 * - Workflow execution via Temporal
 * - Trigger data processing
 * 
 * This API server (port 5678) handles:
 * - User authentication and management
 * - Workflow CRUD operations
 * - Credentials management
 * - Node type definitions
 * 
 * Webhook requests should be directed to: http://localhost:8080/api/v1/webhooks/:workflowId
 */

// Redirect all webhook requests to the Go orchestrator
router.all('*', (req, res) => {
  const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:8080';
  const webhookPath = req.path;
  
  res.status(307).json({
    success: false,
    error: 'Webhook handling is managed by the orchestrator service',
    message: `Please send webhook requests to: ${orchestratorUrl}/api/v1/webhooks${webhookPath}`,
    redirectTo: `${orchestratorUrl}/api/v1/webhooks${webhookPath}`,
    documentation: 'Webhooks are processed by the Go orchestrator service which handles workflow execution'
  });
});

export default router;