import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { WorkflowExecution, StepExecution } from '@/types/workflow';

interface ExecutionState {
  executions: WorkflowExecution[];
  currentExecution: WorkflowExecution | null;
  loading: boolean;
  error: string | null;
}

const initialState: ExecutionState = {
  executions: [],
  currentExecution: null,
  loading: false,
  error: null,
};

const executionSlice = createSlice({
  name: 'execution',
  initialState,
  reducers: {
    setExecutions: (state, action: PayloadAction<WorkflowExecution[]>) => {
      state.executions = action.payload;
    },
    addExecution: (state, action: PayloadAction<WorkflowExecution>) => {
      state.executions.unshift(action.payload);
    },
    updateExecution: (state, action: PayloadAction<WorkflowExecution>) => {
      const index = state.executions.findIndex(e => e.id === action.payload.id);
      if (index >= 0) {
        state.executions[index] = action.payload;
      }
      if (state.currentExecution?.id === action.payload.id) {
        state.currentExecution = action.payload;
      }
    },
    updateStepExecution: (state, action: PayloadAction<{ executionId: string; stepExecution: StepExecution }>) => {
      const { executionId, stepExecution } = action.payload;
      const execution = state.executions.find(e => e.id === executionId);
      if (execution) {
        const stepIndex = execution.stepExecutions.findIndex((s: StepExecution) => s.stepId === stepExecution.stepId);
        if (stepIndex >= 0) {
          execution.stepExecutions[stepIndex] = stepExecution;
        } else {
          execution.stepExecutions.push(stepExecution);
        }
      }
      if (state.currentExecution?.id === executionId) {
        const stepIndex = state.currentExecution.stepExecutions.findIndex((s: StepExecution) => s.stepId === stepExecution.stepId);
        if (stepIndex >= 0) {
          state.currentExecution.stepExecutions[stepIndex] = stepExecution;
        } else {
          state.currentExecution.stepExecutions.push(stepExecution);
        }
      }
    },
    setCurrentExecution: (state, action: PayloadAction<WorkflowExecution | null>) => {
      state.currentExecution = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setExecutions,
  addExecution,
  updateExecution,
  updateStepExecution,
  setCurrentExecution,
  setLoading,
  setError,
} = executionSlice.actions;

export default executionSlice.reducer;