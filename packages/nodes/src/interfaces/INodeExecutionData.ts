/**
 * Main data structure for data flowing between nodes
 * Reference: n8n/packages/workflow/src/Interfaces.ts
 */

export interface INodeExecutionData {
  // The actual data (JSON object)
  json: { [key: string]: any };
  
  // Binary data (files, images, etc.)
  binary?: IBinaryDataIncoming;
  
  // Pairing information (which input item created this output)
  pairedItem?: IPairedItemData | IPairedItemData[];
  
  // Error information
  error?: Error;
}

export interface IBinaryData {
  data: string;              // Base64 encoded data
  mimeType: string;
  fileName?: string;
  fileExtension?: string;
  fileSize?: string;
  directory?: string;
  id?: string;
}

export interface IBinaryDataIncoming {
  [key: string]: IBinaryData;
}

export interface IPairedItemData {
  item: number;              // Item index in input
  input?: number;            // Input index (for multiple inputs)
}
