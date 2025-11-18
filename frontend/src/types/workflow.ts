// Workflow types for the frontend

// Node types for workflow nodes
export type NodeType = 
  | 'http'
  | 'webhook'
  | 'data_processing'
  | 'code'
  | 'ml_inference'
  | 'text_processing'
  | 'database'
  | 'cloud_storage'
  | 'notification';

// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

// Workflow types
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  nodes: Record<string, WorkflowNode>;
  edges: WorkflowEdge[];
  triggers: WorkflowTrigger[];
  settings: WorkflowSettings;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface WorkflowNode {
  id: string;
  type: string;
  data: NodeData;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  selected?: boolean;
}

export interface NodeData {
  label: string;
  description?: string;
  [key: string]: any;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  data?: any;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: number;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  settings: WorkflowSettings;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  configuration: StepConfiguration;
  inputMapping?: Record<string, any>;
  outputMapping?: Record<string, any>;
  retryPolicy?: RetryPolicy;
  position: { x: number; y: number };
  dependencies: string[]; // IDs of steps this step depends on
}

export interface WorkflowTrigger {
  id: string;
  name: string;
  type: TriggerType;
  configuration: TriggerConfiguration;
  isActive: boolean;
}

export interface WorkflowSettings {
  timeout?: number; // milliseconds
  maxRetries?: number;
  retryDelay?: number;
  concurrency?: number;
  errorHandling: 'stop' | 'continue' | 'retry';
}

export interface StepConfiguration {
  // HTTP Request Configuration
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: any;
  credentialId?: string;
  
  // Data Processing Configuration
  operation?: 'filter' | 'map' | 'reduce' | 'sort' | 'group' | 'transform';
  expression?: string;
  fields?: string[];
  
  // ML/AI Configuration
  modelType?: 'text_classification' | 'sentiment_analysis' | 'image_recognition' | 'translation';
  modelId?: string;
  parameters?: Record<string, any>;
  
  // Notification Configuration
  message?: string;
  recipient?: string;
  channel?: 'email' | 'slack' | 'webhook' | 'sms';
  
  // General
  inputData?: any;
  outputPath?: string;
}

export interface TriggerConfiguration {
  // Webhook Configuration
  path?: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  authentication?: 'none' | 'basic' | 'bearer' | 'header' | 'jwt';
  responseMode?: 'immediately' | 'when_finished' | 'custom_response' | 'streaming';
  responseCode?: number;
  responseData?: 'all_entries' | 'first_entry' | 'first_binary' | 'no_response';
  responseMessage?: string;
  
  // Authentication details
  basicAuth?: { username: string; password: string; };
  bearerToken?: string;
  headerAuth?: { name: string; value: string; };
  
  // Schedule Configuration
  cronExpression?: string;
  timezone?: string;
  
  // API Configuration
  apiEndpoint?: string;
  requiresConfirmation?: boolean;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  initialInterval: number;
  maxInterval: number;
  nonRetryableErrors?: string[];
}

export type StepType = 
  | 'http_request'
  | 'webhook' 
  | 'api_call'
  | 'data_processing'
  | 'transformation'
  | 'filter'
  | 'ml_inference'
  | 'text_analysis'
  | 'image_processing'
  | 'conditional'
  | 'loop'
  | 'delay'
  | 'notification';

export type TriggerType =
  | 'webhook'
  | 'schedule'
  | 'manual'
  | 'api'
  | 'file_upload'
  | 'email'
  | 'database_change';

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  triggerData?: any;
  results?: Record<string, any>;
  error?: string;
  stepExecutions: StepExecution[];
}

export interface StepExecution {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  retryCount?: number;
  error?: string;
  output?: any;
}

export interface Organization {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  settings: {
    maxWorkflows: number;
    maxExecutionsPerMonth: number;
    allowedIntegrations: string[];
  };
}