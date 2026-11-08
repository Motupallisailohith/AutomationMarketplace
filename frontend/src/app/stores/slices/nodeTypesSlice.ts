import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { INodeTypeDescription } from '@automation-marketplace/nodes';
import { nodeTypesApi } from '@api/nodeTypesApi';

interface NodeTypesState {
  nodeTypes: INodeTypeDescription[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
  stats: {
    total: number;
    loaded: number;
    initialized: boolean;
  } | null;
}

const initialState: NodeTypesState = {
  nodeTypes: [],
  loading: false,
  error: null,
  initialized: false,
  stats: null,
};

// Async thunks
export const fetchNodeTypes = createAsyncThunk(
  'nodeTypes/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await nodeTypesApi.getAllNodeTypes();
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch node types');
    }
  }
);

export const fetchNodeType = createAsyncThunk(
  'nodeTypes/fetchOne',
  async (nodeType: string, { rejectWithValue }) => {
    try {
      const response = await nodeTypesApi.getNodeType(nodeType);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch node type');
    }
  }
);

export const fetchRegistryStats = createAsyncThunk(
  'nodeTypes/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await nodeTypesApi.getRegistryStats();
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch registry stats');
    }
  }
);

const nodeTypesSlice = createSlice({
  name: 'nodeTypes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all node types
    builder
      .addCase(fetchNodeTypes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNodeTypes.fulfilled, (state, action: PayloadAction<INodeTypeDescription[]>) => {
        state.loading = false;
        state.nodeTypes = action.payload;
        state.initialized = true;
      })
      .addCase(fetchNodeTypes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch single node type
    builder
      .addCase(fetchNodeType.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNodeType.fulfilled, (state, action: PayloadAction<INodeTypeDescription>) => {
        state.loading = false;
        // Add or update the node type in the array
        const index = state.nodeTypes.findIndex((n) => n.name === action.payload.name);
        if (index !== -1) {
          state.nodeTypes[index] = action.payload;
        } else {
          state.nodeTypes.push(action.payload);
        }
      })
      .addCase(fetchNodeType.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch registry stats
    builder
      .addCase(fetchRegistryStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRegistryStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchRegistryStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = nodeTypesSlice.actions;
export default nodeTypesSlice.reducer;
