import { Request } from 'express';

// ==================== User Types ====================
export interface IUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  OWNER = 'owner',
}

export interface AuthenticatedRequest extends Request {
  user: IUser;
}

// ==================== Workflow Types ====================
export interface IWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: INode[];
  connections: IConnections;
  settings?: IWorkflowSettings;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface INode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: INodeParameters;
  credentials?: INodeCredentials;
  disabled?: boolean;
  notes?: string;
  notesInFlow?: boolean;
  color?: string;
  continueOnFail?: boolean;
  alwaysOutputData?: boolean;
  executeOnce?: boolean;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
}

export interface INodeParameters {
  [key: string]: any;
}

export interface INodeCredentials {
  [key: string]: {
    id: string;
    name: string;
  };
}

export interface IConnections {
  [sourceNodeName: string]: {
    [outputType: string]: Array<
      Array<{
        node: string;
        type: string;
        index: number;
      }>
    >;
  };
}

export interface IWorkflowSettings {
  timezone?: string;
  saveDataErrorExecution?: string;
  saveDataSuccessExecution?: string;
  saveManualExecutions?: boolean;
  executionTimeout?: number;
  maxExecutionTimeout?: number;
  errorWorkflow?: string;
}

// ==================== Execution Types ====================
export interface IExecution {
  id: string;
  workflowId: string;
  mode: ExecutionMode;
  status: ExecutionStatus;
  startedAt: Date;
  finishedAt?: Date;
  data?: IRunExecutionData;
  error?: string;
  userId?: string;
}

export enum ExecutionMode {
  MANUAL = 'manual',
  TRIGGER = 'trigger',
  WEBHOOK = 'webhook',
  RETRY = 'retry',
  ERROR_TRIGGER = 'error_trigger',
}

export enum ExecutionStatus {
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  WAITING = 'waiting',
  CANCELED = 'canceled',
}

export interface IRunExecutionData {
  startData?: {
    destinationNode?: string;
    runNodeFilter?: string[];
  };
  resultData: {
    runData: IRunData;
    error?: IExecutionError;
    lastNodeExecuted?: string;
  };
  executionData?: {
    contextData: IContextData;
    metadata: IExecutionMetadata;
    nodeExecutionStack: IExecutionNode[];
    waitingExecution: IWaitingForExecution;
  };
}

export interface IRunData {
  [nodeId: string]: ITaskData[];
}

export interface ITaskData {
  startTime: number;
  executionTime: number;
  executionStatus?: 'success' | 'error';
  data?: ITaskDataConnections;
  error?: IExecutionError;
  source: ITaskDataSource[];
}

export interface ITaskDataConnections {
  main?: INodeExecutionData[][];
}

export interface INodeExecutionData {
  [key: string]: IDataObject | IDataObject[] | NodeApiError | NodeOperationError;
  json: IDataObject;
  binary?: IBinaryKeyData;
  error?: IExecutionError;
  pairedItem?: IPairedItemData | IPairedItemData[];
}

export interface IDataObject {
  [key: string]: unknown;
}

export interface IBinaryKeyData {
  [key: string]: IBinaryData;
}

export interface IBinaryData {
  data: string; // Base64 encoded
  mimeType: string;
  fileName?: string;
  fileExtension?: string;
  fileSize?: string;
}

export interface IPairedItemData {
  item: number;
  input?: number;
}

export interface ITaskDataSource {
  previousNode: string;
  previousNodeOutput?: number;
  previousNodeRun?: number;
}

export interface IExecutionError {
  message: string;
  stack?: string;
  name?: string;
  description?: string;
  timestamp: number;
  node?: string;
  lineNumber?: number;
}

export interface IContextData {
  [key: string]: any;
}

export interface IExecutionMetadata {
  [key: string]: any;
}

export interface IExecutionNode {
  node: INode;
  data: INodeExecutionData[][];
  source: ITaskDataSource[];
}

export interface IWaitingForExecution {
  [nodeId: string]: {
    [runIndex: number]: ITaskDataConnections;
  };
}

export class NodeApiError extends Error {
  constructor(
    public nodeType: string,
    public description?: string,
    public httpCode?: number
  ) {
    super(`API Error in ${nodeType}: ${description}`);
    this.name = 'NodeApiError';
  }
}

export class NodeOperationError extends Error {
  constructor(
    public nodeType: string,
    public description?: string
  ) {
    super(`Operation Error in ${nodeType}: ${description}`);
    this.name = 'NodeOperationError';
  }
}

// ==================== Node Type Definitions ====================
export interface INodeType {
  description: INodeTypeDescription;
  execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
  webhook?(this: IWebhookFunctions): Promise<IWebhookResponseData>;
  trigger?(this: ITriggerFunctions): Promise<ITriggerResponse | undefined>;
  poll?(this: IPollFunctions): Promise<INodeExecutionData[][] | null>;
}

export interface INodeTypeDescription {
  displayName: string;
  name: string;
  icon?: string;
  group: string[];
  version: number | number[];
  description: string;
  defaults: {
    name: string;
    color: string;
  };
  inputs: string[];
  outputs: string[];
  credentials?: INodeCredentialDescription[];
  properties: INodeProperties[];
  webhooks?: IWebhookDescription[];
  polling?: boolean;
}

export interface INodeCredentialDescription {
  name: string;
  required?: boolean;
  displayOptions?: IDisplayOptions;
}

export interface INodeProperties {
  displayName: string;
  name: string;
  type: NodePropertyTypes;
  default: any;
  description?: string;
  placeholder?: string;
  required?: boolean;
  displayOptions?: IDisplayOptions;
  options?: INodePropertyOptions[];
  typeOptions?: INodePropertyTypeOptions;
}

export type NodePropertyTypes =
  | 'string'
  | 'number'
  | 'boolean'
  | 'collection'
  | 'fixedCollection'
  | 'multiOptions'
  | 'options'
  | 'color'
  | 'dateTime'
  | 'json'
  | 'notice'
  | 'hidden'
  | 'resourceLocator';

export interface INodePropertyOptions {
  name: string;
  value: string | number;
  description?: string;
}

export interface INodePropertyTypeOptions {
  minValue?: number;
  maxValue?: number;
  numberStepSize?: number;
  loadOptionsMethod?: string;
  loadOptionsDependsOn?: string[];
  multipleValues?: boolean;
  multipleValueButtonText?: string;
  [key: string]: any;
}

export interface IDisplayOptions {
  show?: {
    [key: string]: Array<string | number | boolean>;
  };
  hide?: {
    [key: string]: Array<string | number | boolean>;
  };
}

export interface IWebhookDescription {
  name: string;
  httpMethod: string;
  path: string;
  responseBinaryPropertyName?: string;
  responseMode?: string;
  responseData?: string;
  restartWebhook?: boolean;
  isFullPath?: boolean;
}

// ==================== Function Types ====================
export interface IExecuteFunctions {
  getNodeParameter(parameterName: string, itemIndex: number): any;
  getInputData(inputIndex?: number, inputName?: string): INodeExecutionData[];
  getWorkflow(): IWorkflow;
  getNode(): INode;
  helpers: INodeHelpers;
  logger: ILogger;
}

export interface IWebhookFunctions {
  getNodeParameter(parameterName: string): any;
  getWebhookName(): string;
  getWorkflow(): IWorkflow;
  getNode(): INode;
  helpers: INodeHelpers;
  logger: ILogger;
}

export interface ITriggerFunctions {
  getNodeParameter(parameterName: string): any;
  getWorkflow(): IWorkflow;
  getNode(): INode;
  emit(data: INodeExecutionData[][]): void;
  helpers: INodeHelpers;
  logger: ILogger;
}

export interface IPollFunctions {
  getNodeParameter(parameterName: string): any;
  getWorkflow(): IWorkflow;
  getNode(): INode;
  helpers: INodeHelpers;
  logger: ILogger;
}

export interface ITriggerResponse {
  closeFunction?: () => Promise<void>;
  manualTriggerFunction?: () => Promise<void>;
}

export interface IWebhookResponseData {
  workflowData?: INodeExecutionData[][];
  webhookResponse?: any;
  noWebhookResponse?: boolean;
}

export interface INodeHelpers {
  request(options: IHttpRequestOptions): Promise<any>;
  requestWithAuthentication(credentialType: string, options: IHttpRequestOptions): Promise<any>;
  returnJsonArray(jsonData: IDataObject | IDataObject[]): INodeExecutionData[];
}

export interface IHttpRequestOptions {
  url: string;
  method?: string;
  headers?: { [key: string]: string };
  body?: any;
  qs?: { [key: string]: string };
  json?: boolean;
  timeout?: number;
}

export interface ILogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

// ==================== Credentials Types ====================
export interface ICredential {
  id: string;
  name: string;
  type: string;
  data: string; // Encrypted JSON string
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICredentialDataDecrypted {
  [key: string]: string | number | boolean;
}

export interface ICredentialType {
  name: string;
  displayName: string;
  documentationUrl?: string;
  properties: INodeProperties[];
  authenticate?: IAuthenticateGeneric | IAuthenticateBearer | IAuthenticateCustom;
}

export interface IAuthenticateGeneric {
  type: 'generic';
  properties: {
    [key: string]: string;
  };
}

export interface IAuthenticateBearer {
  type: 'bearer';
  properties: {
    tokenPropertyName: string;
  };
}

export interface IAuthenticateCustom {
  type: 'custom';
  authenticate: (credentials: ICredentialDataDecrypted, requestOptions: IHttpRequestOptions) => Promise<IHttpRequestOptions>;
}

// ==================== Webhook Types ====================
export interface IWebhookData {
  id: string;
  workflowId: string;
  webhookPath: string;
  httpMethod: string;
  node: string;
  active: boolean;
}

// ==================== Push / WebSocket Types ====================
export interface IPushMessage {
  event: string;
  data: any;
}

export enum PushEvents {
  EXECUTION_STARTED = 'executionStarted',
  EXECUTION_FINISHED = 'executionFinished',
  EXECUTION_ERROR = 'executionError',
  NODE_EXECUTED = 'nodeExecuted',
  WORKFLOW_ACTIVATED = 'workflowActivated',
  WORKFLOW_DEACTIVATED = 'workflowDeactivated',
}

// ==================== API Request/Response Types ====================
export interface ICreateWorkflowRequest {
  name: string;
  nodes?: INode[];
  connections?: IConnections;
  settings?: IWorkflowSettings;
  active?: boolean;
}

export interface IUpdateWorkflowRequest {
  name?: string;
  nodes?: INode[];
  connections?: IConnections;
  settings?: IWorkflowSettings;
  active?: boolean;
}

export interface IExecuteWorkflowRequest {
  startNode?: string;
  data?: IDataObject;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IRegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface IAuthResponse {
  token: string;
  user: Omit<IUser, 'password'>;
}

// ==================== Service Response Types ====================
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ==================== Queue Types ====================
export interface IJobData {
  executionId: string;
  workflowId: string;
  userId?: string;
  data?: IDataObject;
}

export interface IJobResponse {
  success: boolean;
  executionId: string;
  error?: string;
}
