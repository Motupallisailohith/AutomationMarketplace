/**
 * Workflow Executor Service
 * Orchestrates the execution of workflow nodes in sequence
 */

import axios from 'axios';
// WorkflowRunner is deprecated - this service needs refactoring
// import { WorkflowRunner } from 'n8n-core';
type WorkflowRunner = any; // Stub type until refactored

import {
  IExecuteFunctions,
  INodeExecutionData,
  IWorkflowMetadata,
  INodeMetadata,
  IExecuteFunctionsHelpers,
  IHttpRequestOptions,
  ICredentialDataDecryptedObject
} from '@automation-marketplace/nodes';
import { NodeRegistry } from './node-registry.service';

interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  configuration: Record<string, any>;
  dependencies: string[];
}

interface WorkflowDefinition {
  id: string;
  name: string;
  steps: WorkflowStep[];
}

interface ExecutionContext {
  workflowId: string;
  executionId: string;
  mode: 'manual' | 'trigger' | 'webhook';
  nodeOutputs: Map<string, INodeExecutionData[][]>;
  nodeParameters: Map<string, Record<string, any>>;
}

/**
 * Implementation of IExecuteFunctions that nodes use during execution
 */
class ExecuteFunctionsContext implements IExecuteFunctions {
  constructor(
    private context: ExecutionContext,
    private currentNode: WorkflowStep,
    private workflow: WorkflowDefinition
  ) { }

  getNodeParameter(parameterName: string, itemIndex: number, fallbackValue?: any): any {
    const nodeParams = this.context.nodeParameters.get(this.currentNode.id);
    if (!nodeParams) {
      console.log(`[ExecuteFunctions] No parameters found for node ${this.currentNode.id}`);
      return fallbackValue;
    }

    const value = nodeParams[parameterName];

    // If value contains expressions like {{ $json.field }}, resolve them
    if (typeof value === 'string' && value.includes('{{')) {
      return this.resolveExpression(value, itemIndex);
    }

    return value !== undefined ? value : fallbackValue;
  }

  getInputData(inputIndex: number = 0, _inputName: string = 'main'): INodeExecutionData[][] {
    // Get data from dependent nodes
    const dependencies = this.currentNode.dependencies || [];

    if (dependencies.length === 0) {
      // No dependencies, return empty input (e.g., for trigger nodes)
      return [[]];
    }

    // Get output from the first dependency (main input)
    const dependencyNodeId = dependencies[inputIndex] || dependencies[0];
    const dependencyOutput = this.context.nodeOutputs.get(dependencyNodeId);

    if (!dependencyOutput) {
      console.log(`[ExecuteFunctions] No output found for dependency ${dependencyNodeId}`);
      return [[]];
    }

    return dependencyOutput;
  }

  getWorkflow(): IWorkflowMetadata {
    return {
      id: this.workflow.id,
      name: this.workflow.name,
      active: true,
    };
  }

  getNode(): INodeMetadata {
    return {
      id: this.currentNode.id,
      name: this.currentNode.name,
      type: this.currentNode.type,
      typeVersion: 1,
      parameters: this.currentNode.configuration,
    };
  }

  getExecutionId(): string {
    return this.context.executionId;
  }

  getMode(): 'manual' | 'trigger' | 'webhook' {
    return this.context.mode;
  }

  async getCredentials(type: string): Promise<ICredentialDataDecryptedObject> {
    console.log(`[ExecuteFunctions] Mocking credentials for: ${type}`);
    // Mock return to prevent crash - in production this queries the DB/Vault
    return {
      apiKey: "mock-api-key",
      token: "mock-token",
      clientId: "mock-client-id",
      clientSecret: "mock-client-secret",
      // Add other common fields
    };
  }

  continueOnFail(): boolean {
    // Default: stop on failure
    return false;
  }

  helpers: IExecuteFunctionsHelpers = {
    request: async (options: IHttpRequestOptions): Promise<any> => {
      console.log(`[ExecuteFunctions] HTTP Request: ${options.method} ${options.url}`);

      try {
        const response = await axios({
          ...(options as any),
          // Ensure we don't crash on 4xx/5xx if 'ignoreHttpStatusErrors' is not set
          validateStatus: () => true
        });

        return options.json !== false ? response.data : response;
      } catch (error: any) {
        console.error('[ExecuteFunctions] Request failed:', error.message);
        throw error;
      }
    },

    requestWithAuthentication: async (
      credentialsType: string,
      requestOptions: IHttpRequestOptions
    ): Promise<any> => {
      console.log(`[ExecuteFunctions] Authenticated Request (${credentialsType})`);
      // In a real impl, we'd fetch creds and inject headers
      // For now, pass through
      return this.helpers.request(requestOptions);
    },

    prepareBinaryData: async (
      binaryData: Buffer | any,
      filePath?: string,
      mimeType?: string
    ): Promise<any> => {
      console.log('[ExecuteFunctions] Mocking Binary Data preparation');
      return {
        mimeType: mimeType || 'application/octet-stream',
        fileExtension: 'bin',
        data: 'mock-base64-data'
      };
    },

    getBinaryDataBuffer: async (
      itemIndex: number,
      propertyName: string
    ): Promise<Buffer> => {
      console.log('[ExecuteFunctions] Mocking Binary Data Buffer');
      return Buffer.from('mock-data');
    },
  };

  /**
   * Resolve expressions like {{ $json.field }} in parameter values
   */
  private resolveExpression(expression: string, itemIndex: number): any {
    // Get input data for expression resolution
    const inputData = this.getInputData();
    const inputItems = inputData[0] || [];
    const item = inputItems[itemIndex];

    if (!item) {
      console.log(`[ExecuteFunctions] No input item at index ${itemIndex}`);
      return expression;
    }

    // Simple expression resolver (will be enhanced in C.2)
    let resolved = expression;

    // Replace {{ $json.field }} with actual value
    const jsonPattern = /\{\{\s*\$json\.(\w+)\s*\}\}/g;
    resolved = resolved.replace(jsonPattern, (match, fieldName) => {
      const value = item.json?.[fieldName];
      return value !== undefined ? String(value) : match;
    });

    // If the entire string is just an expression, return the actual value
    if (expression.trim().startsWith('{{') && expression.trim().endsWith('}}')) {
      const fieldMatch = expression.match(/\$json\.(\w+)/);
      if (fieldMatch) {
        const value = item.json?.[fieldMatch[1]];
        return value;
      }
    }

    return resolved;
  }
}

/**
 * Workflow Executor Service
 * Executes workflows by running nodes in dependency order
 */
export class WorkflowExecutorService {
  private runner: WorkflowRunner | null = null;

  constructor(private nodeRegistry: NodeRegistry) {
    // this.runner = new WorkflowRunner(); // Disabled until refactored
  }

  /**
   * Execute a workflow with the given trigger data
   */
  async executeWorkflow(
    workflow: WorkflowDefinition,
    triggerData: any = {}
  ): Promise<{ success: boolean; outputs: Map<string, INodeExecutionData[][]>; error?: string }> {
    // Delegate execution to WorkflowRunner
    return this.runner.run(workflow, { triggerData, nodeRegistry: this.nodeRegistry });
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    step: WorkflowStep,
    workflow: WorkflowDefinition,
    context: ExecutionContext,
    triggerData: any
  ): Promise<INodeExecutionData[][]> {
    // Get node type implementation
    const nodeType = await this.nodeRegistry.getNode(step.type);

    if (!nodeType) {
      throw new Error(`Node type ${step.type} not found`);
    }

    // Special handling for trigger nodes
    if (step.dependencies.length === 0) {
      // This is a trigger node - inject trigger data
      return [[{ json: triggerData }]];
    }

    // Create execution context for this node
    const executeFunctions = new ExecuteFunctionsContext(
      context,
      step,
      workflow
    );

    // Execute the node
    const output = await nodeType.execute.call(executeFunctions);

    return output || [[]];
  }

  /**
   * Sort workflow steps in execution order (topological sort)
   */
  private topologicalSort(steps: WorkflowStep[]): WorkflowStep[] {
    const sorted: WorkflowStep[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const stepMap = new Map(steps.map(s => [s.id, s]));

    const visit = (stepId: string) => {
      if (visited.has(stepId)) return;
      if (visiting.has(stepId)) {
        throw new Error('Circular dependency detected in workflow');
      }

      visiting.add(stepId);
      const step = stepMap.get(stepId);

      if (step) {
        // Visit dependencies first
        for (const depId of step.dependencies) {
          visit(depId);
        }

        visiting.delete(stepId);
        visited.add(stepId);
        sorted.push(step);
      }
    };

    // Visit all nodes
    for (const step of steps) {
      visit(step.id);
    }

    return sorted;
  }
}
