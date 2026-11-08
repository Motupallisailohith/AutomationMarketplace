import axios, { AxiosResponse } from 'axios';
import type { INodeTypeDescription } from '@automation-marketplace/nodes';

// Use relative URL to leverage Vite proxy in development
// In production, this will be relative to the deployed domain
const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface NodeTypesResponse {
  success: boolean;
  data: INodeTypeDescription[];
  count: number;
}

export interface NodeTypeResponse {
  success: boolean;
  data: INodeTypeDescription;
}

export interface RegistryStatsResponse {
  success: boolean;
  data: {
    total: number;
    loaded: number;
    initialized: boolean;
    knownNodes: number;
    loadedNodes: number;
    nodeNames: string[];
  };
}

export const nodeTypesApi = {
  // Get all available node types
  getAllNodeTypes: (): Promise<AxiosResponse<NodeTypesResponse>> =>
    apiClient.get('/node-types'),

  // Get specific node type by name
  getNodeType: (nodeType: string): Promise<AxiosResponse<NodeTypeResponse>> =>
    apiClient.get(`/node-types/${nodeType}`),

  // Get registry statistics
  getRegistryStats: (): Promise<AxiosResponse<RegistryStatsResponse>> =>
    apiClient.get('/node-types/registry/stats'),
};
