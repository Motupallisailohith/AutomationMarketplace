import axios, { AxiosResponse } from 'axios';
import type { WorkflowDefinition, WorkflowExecution } from '../types/workflow';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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

export const workflowApi = {
  // Get all workflows
  getWorkflows: (): Promise<AxiosResponse<WorkflowDefinition[]>> =>
    apiClient.get('/workflows'),

  // Get single workflow
  getWorkflow: (id: string): Promise<AxiosResponse<WorkflowDefinition>> =>
    apiClient.get(`/workflows/${id}`),

  // Create or update workflow
  saveWorkflow: (workflow: WorkflowDefinition): Promise<AxiosResponse<WorkflowDefinition>> => {
    if (workflow.id && workflow.id !== `workflow-${Date.now()}`) {
      return apiClient.put(`/workflows/${workflow.id}`, workflow);
    } else {
      return apiClient.post('/workflows', workflow);
    }
  },

  // Delete workflow
  deleteWorkflow: (id: string): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/workflows/${id}`),

  // Execute workflow
  executeWorkflow: (
    workflowId: string, 
    triggerData: any
  ): Promise<AxiosResponse<WorkflowExecution>> =>
    apiClient.post(`/workflows/${workflowId}/execute`, { triggerData }),

  // Get executions
  getExecutions: (workflowId?: string): Promise<AxiosResponse<WorkflowExecution[]>> => {
    const url = workflowId ? `/workflows/${workflowId}/executions` : '/executions';
    return apiClient.get(url);
  },

  // Get single execution
  getExecution: (executionId: string): Promise<AxiosResponse<WorkflowExecution>> =>
    apiClient.get(`/executions/${executionId}`),

  // Stop execution
  stopExecution: (executionId: string): Promise<AxiosResponse<WorkflowExecution>> =>
    apiClient.post(`/executions/${executionId}/stop`),

  // Get execution logs
  getExecutionLogs: (executionId: string): Promise<AxiosResponse<any[]>> =>
    apiClient.get(`/executions/${executionId}/logs`),
};