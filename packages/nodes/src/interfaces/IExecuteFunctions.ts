/**
 * Context provided to nodes during execution
 * Reference: n8n/packages/workflow/src/Interfaces.ts
 */

import { INodeExecutionData } from './INodeExecutionData';

export interface IExecuteFunctions {
  // Get node parameters
  getNodeParameter(
    parameterName: string,
    itemIndex: number,
    fallbackValue?: any
  ): any;
  
  // Get input data
  getInputData(inputIndex?: number, inputName?: string): INodeExecutionData[][];
  
  // Get workflow information
  getWorkflow(): IWorkflowMetadata;
  
  // Get node information
  getNode(): INodeMetadata;
  
  // Get execution information
  getExecutionId(): string;
  getMode(): 'manual' | 'trigger' | 'webhook';
  
  // Get credentials
  getCredentials(type: string): Promise<ICredentialDataDecryptedObject>;
  
  // Error handling
  continueOnFail(): boolean;
  
  // Helper functions
  helpers: IExecuteFunctionsHelpers;
}

export interface IWorkflowMetadata {
  id: string;
  name: string;
  active: boolean;
}

export interface INodeMetadata {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  parameters: { [key: string]: any };
}

export interface IExecuteFunctionsHelpers {
  // HTTP requests
  request(options: IHttpRequestOptions): Promise<any>;
  
  requestWithAuthentication(
    credentialsType: string,
    requestOptions: IHttpRequestOptions
  ): Promise<any>;
  
  // Binary data
  prepareBinaryData(
    binaryData: Buffer | any,
    filePath?: string,
    mimeType?: string
  ): Promise<any>;
  
  getBinaryDataBuffer(
    itemIndex: number,
    propertyName: string
  ): Promise<Buffer>;
}

export interface IHttpRequestOptions {
  method?: string;
  url: string;
  headers?: { [key: string]: string };
  body?: any;
  qs?: { [key: string]: any };
  json?: boolean;
  timeout?: number;
  auth?: {
    username?: string;
    password?: string;
    bearer?: string;
  };
}

export interface ICredentialDataDecryptedObject {
  [key: string]: any;
}

// Trigger-specific interfaces
export interface ITriggerFunctions extends IExecuteFunctions {
  emit(data: INodeExecutionData[][]): void;
  getActivationMode(): 'init' | 'update' | 'activate';
}

export interface ITriggerResponse {
  closeFunction?: () => Promise<void>;
  manualTriggerFunction?: () => Promise<void>;
}

// Webhook-specific interfaces
export interface IWebhookFunctions extends IExecuteFunctions {
  getRequestObject(): any;
  getResponseObject(): any;
  getWebhookName(): string;
}

export interface IWebhookResponse {
  workflowData?: INodeExecutionData[][];
  webhookResponse?: any;
}

// Polling-specific interfaces
export interface IPollFunctions extends IExecuteFunctions {
  getActivationMode(): 'init' | 'update' | 'activate';
}
