/**
 * Node Executor - Executes individual nodes
 * Bridges between the registry and the actual node execution
 */

import { INodeType, IExecuteFunctions, INodeExecutionData } from '@automation-marketplace/workflow';
import { NodeRegistry, getNodeRegistry } from './NodeRegistry';

export interface NodeExecutionParams {
    nodeName: string;
    nodeParameters: Record<string, any>;
    inputData: INodeExecutionData[][];
    credentials?: Record<string, any>;
}

export interface NodeExecutionResult {
    success: boolean;
    data?: INodeExecutionData[][];
    error?: Error;
    executionTime: number;
}

export class NodeExecutor {
    private registry: NodeRegistry;

    constructor() {
        this.registry = getNodeRegistry();
    }

    /**
     * Execute a node with given parameters
     */
    async executeNode(params: NodeExecutionParams): Promise<NodeExecutionResult> {
        const startTime = Date.now();

        try {
            // Get the node from registry
            const node = this.registry.getNode(params.nodeName);

            if (!node) {
                throw new Error(`Node not found: ${params.nodeName}`);
            }

            console.log(`▶️  Executing node: ${params.nodeName}`);

            // Create execution context
            const executionContext = this.createExecutionContext(params);

            // Execute the node
            const result = await node.execute!.call(executionContext);

            const executionTime = Date.now() - startTime;

            console.log(`✅ Node executed successfully in ${executionTime}ms: ${params.nodeName}`);

            return {
                success: true,
                data: result,
                executionTime,
            };
        } catch (error) {
            const executionTime = Date.now() - startTime;

            console.error(`❌ Node execution failed after ${executionTime}ms:`, error);

            return {
                success: false,
                error: error as Error,
                executionTime,
            };
        }
    }

    /**
     * Create execution context for the node
     * This provides the 'this' context that nodes expect
     */
    private createExecutionContext(params: NodeExecutionParams): IExecuteFunctions {
        return {
            // Get node parameter
            getNodeParameter: (parameterName: string, itemIndex: number) => {
                return params.nodeParameters[parameterName];
            },

            // Get input data
            getInputData: (inputIndex = 0) => {
                return params.inputData[inputIndex] || [];
            },

            // Get credentials
            getCredentials: async (type: string) => {
                return params.credentials?.[type] || {};
            },

            // Helper functions (simplified for now)
            helpers: {
                request: async (options: any) => {
                    // Will be implemented with actual HTTP client
                    throw new Error('HTTP request not implemented yet');
                },
            },

            // Return JSON
            helpers: {
                returnJsonArray: (data: any[]) => {
                    return data.map(item => ({
                        json: item,
                    }));
                },
            },
        } as any; // Type assertion for now, will properly implement IExecuteFunctions
    }

    /**
     * Validate node parameters
     */
    validateNodeParameters(nodeName: string, parameters: Record<string, any>): boolean {
        const nodeData = this.registry.getNodeData(nodeName);

        if (!nodeData) {
            return false;
        }

        // Check required parameters
        const requiredParams = nodeData.description.properties?.filter(p => p.required) || [];

        for (const param of requiredParams) {
            if (!(param.name in parameters)) {
                console.error(`Missing required parameter: ${param.name}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Get node metadata
     */
    getNodeMetadata(nodeName: string) {
        return this.registry.getNodeData(nodeName);
    }
}
