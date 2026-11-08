/**
 * Main n8n API Router for Automation Marketplace
 * 
 * This mounts all n8n-compatible endpoints under /api prefix
 * to work seamlessly with n8n's Vue 3 frontend
 */

import { Router } from 'express';
import n8nAdapter from '../adapters/n8n-api-adapter';

const router = Router();

// Mount n8n API adapter
router.use('/', n8nAdapter);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Automation Marketplace API',
    timestamp: new Date().toISOString(),
  });
});

export default router;