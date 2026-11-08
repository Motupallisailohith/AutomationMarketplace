/**
 * Execute Node Activity
 * 
 * This activity executes n8n-style nodes using the Node Registry.
 * It bridges the Temporal workflow (Go) with the Node execution engine (TypeScript).
 */

import axios from 'axios';
import { logger } from '../shared/logger';

export interface ExecuteNodeInput {
  nodeType: string;              // e.g., 'n8n-nodes-base.httpRequest'
  nodeVersion?: number;          // Node version (default: 1)
  parameters: Record<string, any>; // Node parameters from workflow definition
  inputData: any[][];            // Input data from previous node
  credentials?: Record<string, string>; // Credential IDs by type
  executionId: string;           // Execution ID for tracking
  workflowId: string;           // Workflow ID
  nodeId: string;               // Node instance ID in workflow
}

export interface ExecuteNodeOutput {
  success: boolean;
  data: any[][];                // Output data (n8n format)
  error?: string;
  executionTime?: number;
}

// Cache for node types to avoid repeated API calls
const nodeTypesCache = new Map<string, any>();
let nodeTypesCacheExpiry = 0;

/**
 * Execute a node using the Node Registry
 */
export async function executeNode(input: ExecuteNodeInput): Promise<ExecuteNodeOutput> {
  const startTime = Date.now();
  
  logger.info('Executing node', {
    nodeType: input.nodeType,
    nodeId: input.nodeId,
    executionId: input.executionId,
  });

  try {
    // Call the API to execute the node
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    
    const response = await axios.post(
      `${apiUrl}/api/node-types/execute`,
      {
        nodeType: input.nodeType,
        nodeVersion: input.nodeVersion || 1,
        parameters: input.parameters,
        inputData: input.inputData,
        credentials: input.credentials,
        context: {
          executionId: input.executionId,
          workflowId: input.workflowId,
          nodeId: input.nodeId,
        },
      },
      {
        timeout: 300000, // 5 minutes
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const executionTime = Date.now() - startTime;

    logger.info('Node execution completed', {
      nodeType: input.nodeType,
      nodeId: input.nodeId,
      executionId: input.executionId,
      executionTime,
      outputItems: response.data.data?.[0]?.length || 0,
    });

    return {
      success: true,
      data: response.data.data || [[]],
      executionTime,
    };

  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    
    logger.error('Node execution failed', {
      nodeType: input.nodeType,
      nodeId: input.nodeId,
      executionId: input.executionId,
      error: error.response?.data?.error || error.message,
      executionTime,
    });

    return {
      success: false,
      data: [[]],
      error: error.response?.data?.error || error.message,
      executionTime,
    };
  }
}

/**
 * Get available node types (with caching)
 */
export async function getNodeTypes(): Promise<any[]> {
  const now = Date.now();
  
  // Return cached data if still valid (5 minutes cache)
  if (nodeTypesCacheExpiry > now && nodeTypesCache.size > 0) {
    return Array.from(nodeTypesCache.values());
  }

  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    const response = await axios.get(`${apiUrl}/api/node-types`);
    
    // Update cache
    nodeTypesCache.clear();
    response.data.data.forEach((nodeType: any) => {
      nodeTypesCache.set(nodeType.name, nodeType);
    });
    nodeTypesCacheExpiry = now + 5 * 60 * 1000; // 5 minutes
    
    logger.info('Node types cache updated', { count: nodeTypesCache.size });
    
    return response.data.data;
  } catch (error: any) {
    logger.error('Failed to fetch node types', { error: error.message });
    throw error;
  }
}

/**
 * Validate node exists and get its description
 */
export async function validateNode(nodeType: string): Promise<boolean> {
  try {
    const nodeTypes = await getNodeTypes();
    return nodeTypes.some(nt => nt.name === nodeType);
  } catch (error) {
    logger.warn('Failed to validate node type', { nodeType, error });
    return false;
  }
}
