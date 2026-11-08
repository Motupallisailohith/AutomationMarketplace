/**
 * Node Execution Service
 * 
 * Provides API endpoint for executing nodes through the Node Registry.
 * This is called by the Temporal Node.js worker activity.
 */

import { Request, Response, Router } from 'express';
import { nodeRegistry } from '../services/node-registry.service';
import { credentialService } from '../services/credential';
import { logger } from '../shared/logger';
import type { IExecuteFunctions, IHttpRequestOptions } from '@automation-marketplace/nodes';
import axios from 'axios';

const router = Router();

interface ExecuteNodeRequest {
  nodeType: string;
  nodeVersion?: number;
  parameters: Record<string, any>;
  inputData: any[][];
  credentials?: Record<string, string>;
  context: {
    executionId: string;
    workflowId: string;
    nodeId: string;
  };
}

/**
 * POST /api/node-types/execute
 * Execute a node with given parameters
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const {
      nodeType,
      parameters,
      inputData,
      credentials,
      context,
    } = req.body as ExecuteNodeRequest;

    logger.info('Executing node via API', {
      nodeType,
      nodeId: context.nodeId,
      executionId: context.executionId,
    });

    // Get node from registry
    const node = await nodeRegistry.getNode(nodeType);
    if (!node) {
      logger.error('Node type not found', { nodeType });
      res.status(404).json({
        success: false,
        error: `Node type not found: ${nodeType}`,
      });
      return;
    }

    // Create execution context
    const executeFunctions = createExecuteContext(
      node,
      parameters,
      inputData,
      credentials || {},
      context
    );

    // Execute the node
    const startTime = Date.now();
    const outputData = await node.execute.call(executeFunctions);
    const executionTime = Date.now() - startTime;

    logger.info('Node executed successfully', {
      nodeType,
      nodeId: context.nodeId,
      executionId: context.executionId,
      executionTime,
      outputItems: outputData?.[0]?.length || 0,
    });

    res.json({
      success: true,
      data: outputData || [[]],
      executionTime,
    });

  } catch (error: any) {
    logger.error('Node execution failed', {
      error: error.message,
      stack: error.stack,
      nodeType: req.body.nodeType,
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Node execution failed',
    });
  }
});

/**
 * Create execution context for node execution
 */
function createExecuteContext(
  node: any,
  parameters: Record<string, any>,
  inputData: any[][],
  credentialIds: Record<string, string>,
  context: { executionId: string; workflowId: string; nodeId: string }
): IExecuteFunctions {
  const executeFn: IExecuteFunctions = {
    // Get node parameters
    getNodeParameter: (parameterName: string, _itemIndex: number, fallbackValue?: any) => {
      const value = parameters[parameterName];
      return value !== undefined ? value : fallbackValue;
    },

    // Get input data
    getInputData: (_inputIndex = 0, _inputName?: string) => {
      return inputData || [[]];
    },

    // Get workflow information
    getWorkflow: () => ({
      id: context.workflowId,
      name: 'Workflow',
      active: true,
    }),

    // Get node information
    getNode: () => ({
      id: context.nodeId,
      name: node.description.displayName,
      type: node.description.name,
      typeVersion: node.description.version,
      parameters,
    }),

    // Get execution information
    getExecutionId: () => context.executionId,
    getMode: () => 'manual' as const,

    // Get credentials (decrypt from database)
    getCredentials: async (type: string) => {
      const credentialId = credentialIds[type];
      if (!credentialId) {
        throw new Error(`Credential type '${type}' not provided`);
      }

      // Get decrypted credential from database
      // Note: This requires userId - we'll need to get it from the execution context
      // For now, we'll fetch the credential without user validation (internal call)
      const credential = await credentialService.getDecryptedCredentialById(credentialId);
      
      if (!credential) {
        throw new Error(`Credential '${credentialId}' not found`);
      }

      return credential.data;
    },

    // Error handling
    continueOnFail: () => false,

    // Helper functions
    helpers: {
      // HTTP requests
      request: async (options: IHttpRequestOptions) => {
        try {
          const response = await axios({
            method: options.method || 'GET',
            url: options.url,
            headers: options.headers,
            data: options.body,
            params: options.qs,
            timeout: options.timeout || 60000,
            auth: options.auth ? {
              username: options.auth.username || '',
              password: options.auth.password || '',
            } : undefined,
          });

          return options.json !== false ? response.data : response;
        } catch (error: any) {
          logger.error('HTTP request failed', {
            url: options.url,
            error: error.message,
          });
          throw error;
        }
      },

      requestWithAuthentication: async (
        credentialsType: string,
        requestOptions: IHttpRequestOptions
      ) => {
        // Get credentials
        const creds = await executeFn.getCredentials(credentialsType);
        
        // Apply authentication
        if (creds.accessToken) {
          requestOptions.headers = requestOptions.headers || {};
          requestOptions.headers['Authorization'] = `Bearer ${creds.accessToken}`;
        } else if (creds.apiKey) {
          requestOptions.headers = requestOptions.headers || {};
          requestOptions.headers['Authorization'] = `Bearer ${creds.apiKey}`;
        }

        return executeFn.helpers.request(requestOptions);
      },

      // Binary data helpers (placeholder)
      prepareBinaryData: async (binaryData: Buffer | any, filePath?: string, mimeType?: string) => {
        // TODO: Implement binary data handling with MinIO
        return {
          data: binaryData.toString('base64'),
          mimeType: mimeType || 'application/octet-stream',
          fileName: filePath,
        };
      },

      getBinaryDataBuffer: async (_itemIndex: number, _propertyName: string) => {
        // TODO: Implement binary data retrieval
        throw new Error('Binary data not yet implemented');
      },
    },
  };
  
  return executeFn;
}

export default router;
