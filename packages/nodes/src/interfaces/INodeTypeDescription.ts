/**
 * Describes a node (metadata)
 * Reference: n8n/packages/workflow/src/Interfaces.ts
 */

import { INodeProperties } from './INodeProperties';

export interface INodeTypeDescription {
  displayName: string;
  name: string;                  // Unique identifier (e.g., 'slack', 'httpRequest')
  icon?: string;                 // Icon path or FA icon (e.g., 'file:slack.svg', 'fa:at')
  iconColor?: string;
  group: string[];               // ['input', 'output', 'trigger']
  version: number | number[];    // Node version(s)
  description: string;
  subtitle?: string;
  
  defaults: {
    name: string;                // Default node name in canvas
    color?: string;
  };
  
  // Inputs and outputs
  inputs: string[];              // ['main'] or ['main', 'main']
  outputs: string[];             // ['main'] or ['main', 'main']
  
  // Credentials this node needs
  credentials?: INodeCredentialDescription[];
  
  // Webhooks (for trigger nodes)
  webhooks?: IWebhookDescription[];
  
  // Polling (for trigger nodes)
  polling?: boolean;
  
  // Node parameters
  properties: INodeProperties[];
}

export interface INodeCredentialDescription {
  name: string;                  // Credential type name
  required?: boolean;
  displayOptions?: {
    show?: { [key: string]: any[] };
    hide?: { [key: string]: any[] };
  };
}

export interface IWebhookDescription {
  name: string;
  httpMethod: string | string[];
  responseMode?: 'onReceived' | 'lastNode';
  path: string;
  isFullPath?: boolean;
}
