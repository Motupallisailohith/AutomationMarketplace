import { AxiosResponse } from 'axios';
import type { WorkflowDefinition, WorkflowExecution } from '../types/workflow';
import { api } from './client';

export const workflowApi = {
  // Get all workflows
  getWorkflows: (): Promise<AxiosResponse<WorkflowDefinition[]>> =>
    api.get('/workflows'),

  // Get single workflow
  getWorkflow: (id: string): Promise<AxiosResponse<WorkflowDefinition>> =>
    api.get(`/workflows/${id}`),

  // Create or update workflow
  saveWorkflow: (workflow: any): Promise<AxiosResponse<any>> => {
    // n8n format: send workflow data directly, not wrapped
    const hasRealId = workflow.id && !workflow.id.startsWith('workflow-');
    
    console.log('📡 API saveWorkflow:', { hasRealId, workflowId: workflow.id });
    
    if (hasRealId) {
      // Update existing workflow (PATCH)
      return api.patch(`/workflows/${workflow.id}`, workflow);
    } else {
      // Create new workflow (POST)
      // Remove temporary ID if present
      const { id, ...workflowData } = workflow;
      return api.post('/workflows', workflowData);
    }
  },

  // Delete workflow
  deleteWorkflow: (id: string): Promise<AxiosResponse<void>> =>
    api.delete(`/workflows/${id}`),

  // Execute workflow
  executeWorkflow: (
    workflowId: string,
    triggerData: any
  ): Promise<AxiosResponse<WorkflowExecution>> =>
    api.post(`/workflows/${workflowId}/execute`, { triggerData }),

  // Get executions
  getExecutions: (workflowId?: string): Promise<AxiosResponse<WorkflowExecution[]>> => {
    const url = workflowId ? `/workflows/${workflowId}/executions` : '/executions';
    return api.get(url);
  },

  // Get single execution
  getExecution: (executionId: string): Promise<AxiosResponse<WorkflowExecution>> =>
    api.get(`/executions/${executionId}`),

  // Stop execution
  stopExecution: (executionId: string): Promise<AxiosResponse<WorkflowExecution>> =>
    api.post(`/executions/${executionId}/stop`),

  // Get execution logs
  getExecutionLogs: (executionId: string): Promise<AxiosResponse<any[]>> =>
    api.get(`/executions/${executionId}/logs`),
};