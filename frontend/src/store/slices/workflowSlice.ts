import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { WorkflowDefinition, WorkflowExecution } from '../../types/workflow';
import { workflowApi } from '@api/workflowApi';

interface WorkflowState {
  workflows: WorkflowDefinition[];
  currentWorkflow: WorkflowDefinition | null;
  executions: WorkflowExecution[];
  currentExecution: WorkflowExecution | null;
  loading: boolean;
  error: string | null;
}

const initialState: WorkflowState = {
  workflows: [],
  currentWorkflow: null,
  executions: [],
  currentExecution: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchWorkflows = createAsyncThunk(
  'workflow/fetchWorkflows',
  async () => {
    const response = await workflowApi.getWorkflows();
    return response.data;
  }
);

export const fetchWorkflow = createAsyncThunk(
  'workflow/fetchWorkflow',
  async (workflowId: string) => {
    const response = await workflowApi.getWorkflow(workflowId);
    return response.data;
  }
);

export const saveWorkflow = createAsyncThunk(
  'workflow/saveWorkflow',
  async (workflow: WorkflowDefinition) => {
    const response = await workflowApi.saveWorkflow(workflow);
    return response.data;
  }
);

export const executeWorkflow = createAsyncThunk(
  'workflow/executeWorkflow',
  async ({ workflowId, triggerData }: { workflowId: string; triggerData: any }) => {
    const response = await workflowApi.executeWorkflow(workflowId, triggerData);
    return response.data;
  }
);

export const stopWorkflow = createAsyncThunk(
  'workflow/stopWorkflow',
  async (executionId: string) => {
    const response = await workflowApi.stopExecution(executionId);
    return response.data;
  }
);

export const fetchExecutions = createAsyncThunk(
  'workflow/fetchExecutions',
  async (workflowId?: string) => {
    const response = await workflowApi.getExecutions(workflowId);
    return response.data;
  }
);

const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    setCurrentWorkflow: (state, action: PayloadAction<WorkflowDefinition | null>) => {
      state.currentWorkflow = action.payload;
    },
    setCurrentExecution: (state, action: PayloadAction<WorkflowExecution | null>) => {
      state.currentExecution = action.payload;
    },
    updateExecutionStatus: (state, action: PayloadAction<{ executionId: string; status: any }>) => {
      const { executionId, status } = action.payload;
      const execution = state.executions.find(e => e.id === executionId);
      if (execution) {
        Object.assign(execution, status);
      }
      if (state.currentExecution?.id === executionId) {
        Object.assign(state.currentExecution, status);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch workflows
      .addCase(fetchWorkflows.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkflows.fulfilled, (state, action) => {
        state.loading = false;
        state.workflows = action.payload;
      })
      .addCase(fetchWorkflows.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch workflows';
      })
      
      // Fetch single workflow
      .addCase(fetchWorkflow.fulfilled, (state, action) => {
        state.currentWorkflow = action.payload;
      })
      
      // Save workflow
      .addCase(saveWorkflow.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveWorkflow.fulfilled, (state, action) => {
        state.loading = false;
        state.currentWorkflow = action.payload;
        
        // Update or add to workflows list
        const index = state.workflows.findIndex(w => w.id === action.payload.id);
        if (index >= 0) {
          state.workflows[index] = action.payload;
        } else {
          state.workflows.push(action.payload);
        }
      })
      .addCase(saveWorkflow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to save workflow';
      })
      
      // Execute workflow
      .addCase(executeWorkflow.fulfilled, (state, action) => {
        state.currentExecution = action.payload;
        state.executions.unshift(action.payload);
      })
      
      // Stop workflow
      .addCase(stopWorkflow.fulfilled, (state, action) => {
        if (state.currentExecution?.id === action.payload.id) {
          state.currentExecution = action.payload;
        }
      })
      
      // Fetch executions
      .addCase(fetchExecutions.fulfilled, (state, action) => {
        state.executions = action.payload;
      });
  },
});

export const {
  setCurrentWorkflow,
  setCurrentExecution,
  updateExecutionStatus,
  clearError,
} = workflowSlice.actions;

// Selectors
export const selectWorkflows = (state: { workflow: WorkflowState }) => state.workflow.workflows;
export const selectCurrentWorkflow = (state: { workflow: WorkflowState }) => state.workflow.currentWorkflow;
export const selectWorkflowExecution = (state: { workflow: WorkflowState }) => state.workflow.currentExecution;
export const selectWorkflowExecutions = (state: { workflow: WorkflowState }) => state.workflow.executions;
export const selectWorkflowLoading = (state: { workflow: WorkflowState }) => state.workflow.loading;
export const selectWorkflowError = (state: { workflow: WorkflowState }) => state.workflow.error;

export default workflowSlice.reducer;