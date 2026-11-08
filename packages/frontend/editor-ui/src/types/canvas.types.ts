// Canvas Types
export interface CanvasNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: CanvasNodeData;
  selected?: boolean;
  dragging?: boolean;
}

export interface CanvasNodeData {
  name: string;
  type: string;
  typeVersion: number;
  disabled: boolean;
  parameters: Record<string, unknown>;
  inputs: CanvasConnectionPort[];
  outputs: CanvasConnectionPort[];
  connections: CanvasNodeConnections;
  execution: CanvasNodeExecution;
  render: CanvasNodeRender;
}

export interface CanvasNodeRender {
  type: CanvasNodeRenderType;
  options?: Record<string, unknown>;
}

export enum CanvasNodeRenderType {
  Default = 'default',
  StickyNote = 'sticky',
  AddNodes = 'addNodes',
}

export interface CanvasNodeExecution {
  running: boolean;
  waiting: boolean;
  status?: 'success' | 'error' | 'waiting' | 'running';
}

export interface CanvasConnectionPort {
  type: string;
  index: number;
  required?: boolean;
  maxConnections?: number;
}

export interface CanvasNodeConnections {
  input: Record<string, CanvasConnection[][]>;
  output: Record<string, CanvasConnection[][]>;
}

export interface CanvasConnection {
  node: string;
  type: string;
  index: number;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, string>;
}

export enum CanvasConnectionMode {
  Input = 'inputs',
  Output = 'outputs',
}

// Workflow Types
export interface IWorkflowDb {
  id: string;
  name: string;
  active: boolean;
  nodes: INodeUi[];
  connections: IConnections;
  settings?: IWorkflowSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface INodeUi {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  disabled?: boolean;
  parameters: INodeParameters;
  credentials?: INodeCredentials;
}

export interface INodeParameters {
  [key: string]: unknown;
}

export interface INodeCredentials {
  [key: string]: {
    id: string;
    name?: string;
  };
}

export interface IConnections {
  [key: string]: {
    [key: string]: IConnection[][];
  };
}

export interface IConnection {
  node: string;
  type: string;
  index: number;
}

export interface IWorkflowSettings {
  executionOrder?: 'v0' | 'v1';
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
  saveManualExecutions?: boolean;
  callerPolicy?: string;
  timezone?: string;
}

// Node Type Definitions
export interface INodeTypeDescription {
  displayName: string;
  name: string;
  icon?: string;
  iconUrl?: string;
  group: string[];
  description: string;
  version: number;
  defaults: {
    name?: string;
    color?: string;
  };
  inputs: string[];
  outputs: string[];
  properties: INodeProperties[];
  credentials?: INodeCredentialDescription[];
  webhooks?: IWebhookDescription[];
}

export interface INodeProperties {
  displayName: string;
  name: string;
  type: NodePropertyTypes;
  default: unknown;
  description?: string;
  required?: boolean;
  displayOptions?: IDisplayOptions;
  options?: INodePropertyOptions[];
  placeholder?: string;
}

export type NodePropertyTypes =
  | 'string'
  | 'number'
  | 'boolean'
  | 'options'
  | 'multiOptions'
  | 'json'
  | 'color'
  | 'dateTime'
  | 'collection'
  | 'fixedCollection';

export interface INodePropertyOptions {
  name: string;
  value: string | number;
  description?: string;
}

export interface IDisplayOptions {
  show?: { [key: string]: unknown[] };
  hide?: { [key: string]: unknown[] };
}

export interface INodeCredentialDescription {
  name: string;
  required?: boolean;
  displayOptions?: IDisplayOptions;
}

export interface IWebhookDescription {
  name: string;
  httpMethod: string;
  path: string;
  responseMode?: string;
}

// Event types
export interface CanvasEventBusEvents {
  'nodes:select': { ids: string[] };
  'nodes:action': { action: string; ids: string[]; payload?: unknown };
  'nodes:move': { nodes: CanvasNodeMoveEvent[] };
  'connection:create': { connection: CanvasEdge };
  'connection:delete': { connection: CanvasEdge };
  fitView: void;
}

export interface CanvasNodeMoveEvent {
  id: string;
  position: { x: number; y: number };
}

// UI Types
export interface XYPosition {
  x: number;
  y: number;
}

export type NodeCreatorOpenSource =
  | 'context_menu'
  | 'plus_endpoint'
  | 'node_connection_action'
  | 'node_connection_drop'
  | 'add_node_button';
