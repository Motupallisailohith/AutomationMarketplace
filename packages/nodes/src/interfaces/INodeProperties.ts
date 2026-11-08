/**
 * Defines parameters that nodes can have
 * Reference: n8n/packages/workflow/src/Interfaces.ts
 */

export type NodePropertyTypes =
  | 'string'
  | 'number'
  | 'boolean'
  | 'options'
  | 'multiOptions'
  | 'collection'
  | 'fixedCollection'
  | 'json'
  | 'dateTime'
  | 'color'
  | 'hidden';

export interface INodeProperties {
  displayName: string;
  name: string;
  type: NodePropertyTypes;
  default: any;
  description?: string;
  required?: boolean;
  placeholder?: string;
  
  // For 'options' and 'multiOptions'
  options?: INodePropertyOptions[];
  
  // Conditional display
  displayOptions?: {
    show?: { [key: string]: Array<string | number | boolean> };
    hide?: { [key: string]: Array<string | number | boolean> };
  };
  
  // Type-specific options
  typeOptions?: {
    multipleValues?: boolean;
    multipleValueButtonText?: string;
    minValue?: number;
    maxValue?: number;
    rows?: number;
    password?: boolean;
  };
  
  // For collection types
  values?: INodeProperties[];
}

export interface INodePropertyOptions {
  name: string;
  value?: string | number | boolean;
  description?: string;
  action?: string;
  // For fixedCollection and collection items
  values?: INodeProperties[];
}
