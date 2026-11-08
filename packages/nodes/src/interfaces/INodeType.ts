/**
 * Main interface that all nodes must implement
 * Reference: n8n/packages/workflow/src/Interfaces.ts
 */

import { INodeTypeDescription } from './INodeTypeDescription';
import { 
  IExecuteFunctions, 
  ITriggerFunctions, 
  ITriggerResponse,
  IWebhookFunctions,
  IWebhookResponse,
  IPollFunctions
} from './IExecuteFunctions';
import { INodeExecutionData } from './INodeExecutionData';

export interface INodeType {
  description: INodeTypeDescription;
  
  // Main execution method (required)
  execute(
    this: IExecuteFunctions
  ): Promise<INodeExecutionData[][] | null>;
  
  // For trigger nodes (optional)
  trigger?(
    this: ITriggerFunctions
  ): Promise<ITriggerResponse | undefined>;
  
  // For webhook nodes (optional)
  webhook?(
    this: IWebhookFunctions
  ): Promise<IWebhookResponse | undefined>;
  
  // For polling trigger nodes (optional)
  poll?(
    this: IPollFunctions
  ): Promise<INodeExecutionData[][] | null>;
}

// Versioned node type (for nodes with multiple versions)
export interface IVersionedNodeType {
  description: INodeTypeBaseDescription;
  nodeVersions: {
    [key: number]: INodeType;
  };
}

export interface INodeTypeBaseDescription {
  displayName: string;
  name: string;
  icon?: string;
  group: string[];
  description: string;
  defaultVersion?: number;
}
