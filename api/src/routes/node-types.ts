/**
 * Node Types Routes
 * API endpoints for node type information
 * Reference: n8n/packages/cli/src/controllers/node-types.controller.ts
 */

import express from 'express';
import { nodeRegistry } from '../services/node-registry.service';
import { logger } from '../shared/logger';

const router = express.Router();

/**
 * GET /api/node-types
 * Returns all available node types
 */
router.get('/', async (_req, res) => {
  try {
    const nodeTypes = nodeRegistry.getAllNodeTypes();
    
    res.json({
      success: true,
      data: nodeTypes,
      count: nodeTypes.length,
    });
  } catch (error) {
    logger.error('Error fetching node types', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch node types',
    });
  }
});

/**
 * GET /api/node-types/:nodeType
 * Returns specific node type details
 */
router.get('/:nodeType', async (req, res) => {
  try {
    const { nodeType } = req.params;
    const node = await nodeRegistry.getNode(nodeType);
    
    if (!node) {
      return res.status(404).json({
        success: false,
        error: `Node type not found: ${nodeType}`,
      });
    }
    
    return res.json({
      success: true,
      data: node.description,
    });
  } catch (error) {
    logger.error(`Error fetching node type: ${req.params.nodeType}`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch node type',
    });
  }
});

/**
 * GET /api/node-types/registry/stats
 * Returns registry statistics
 */
router.get('/registry/stats', (_req, res) => {
  try {
    const stats = nodeRegistry.getNodeCount();
    const status = nodeRegistry.getStatus();
    
    res.json({
      success: true,
      data: {
        ...stats,
        ...status,
      },
    });
  } catch (error) {
    logger.error('Error fetching registry stats', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch registry stats',
    });
  }
});

/**
 * POST /api/node-types/reload/:nodeType
 * Reload a specific node (development only)
 */
router.post('/reload/:nodeType', async (req, res) => {
  try {
    const { nodeType } = req.params;
    
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Node reloading is not allowed in production',
      });
    }
    
    await nodeRegistry.reloadNode(nodeType);
    
    return res.json({
      success: true,
      message: `Node reloaded: ${nodeType}`,
    });
  } catch (error) {
    logger.error(`Error reloading node: ${req.params.nodeType}`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reload node',
    });
  }
});

export default router;
