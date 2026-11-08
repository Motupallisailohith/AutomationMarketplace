import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Toolbar, 
  Button, 
  IconButton, 
  Divider, 
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Menu,
  MenuItem,
  DialogActions,
  Alert
} from '@mui/material';
import {
  Save as SaveIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  MoreVert as MoreVertIcon,
  FileUpload as FileUploadIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  OnConnect,
  OnNodesChange,
  OnEdgesChange,
  NodeTypes,
  EdgeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useAppDispatch, useAppSelector } from '@store/hooks';
import { 
  saveWorkflow, 
  executeWorkflow, 
  stopWorkflow,
  selectCurrentWorkflow,
  selectWorkflowExecution 
} from '@store/slices/workflowSlice';
import { fetchNodeTypes } from '@store/slices/nodeTypesSlice';

// Custom node components
import HttpRequestNode from '@components/nodes/HttpRequestNode';
import DataProcessingNode from '@components/nodes/DataProcessingNode';

// Sidebar components
import NodePalette from '@components/NodePalette/NodePalette';
import NodeDetailView from '@components/NodeDetailView/NodeDetailView';
import TriggerManager from '@components/TriggerManager/TriggerManager';
import WebhookTrigger from '@components/WebhookTrigger/WebhookTrigger';

// Types
import type { WorkflowDefinition, WorkflowStep, WorkflowTrigger, NodeType } from '../../types/workflow';

// Custom node types for ReactFlow
const nodeTypes: NodeTypes = {
  http: HttpRequestNode,  // Register 'http' type
  httpRequest: HttpRequestNode,
  dataTransform: DataProcessingNode,
  dataFilter: DataProcessingNode,
};

// Custom edge types
const edgeTypes: EdgeTypes = {
  // Add custom edge types if needed
};

interface WorkflowEditorProps {
  workflowId?: string;
}

const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ workflowId }) => {
  const dispatch = useAppDispatch();
  const currentWorkflow = useAppSelector(selectCurrentWorkflow);
  const execution = useAppSelector(selectWorkflowExecution);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showNodeConfig, setShowNodeConfig] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [triggers, setTriggers] = useState<WorkflowTrigger[]>([]);
  const [showTriggerConfig, setShowTriggerConfig] = useState(false);
  const [workflowName, setWorkflowName] = useState<string>('Untitled Workflow');
  const [workflowDescription, setWorkflowDescription] = useState<string>('');
  
  // Import menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [showImportUrlDialog, setShowImportUrlDialog] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize workflow name and description when currentWorkflow loads
  useEffect(() => {
    if (currentWorkflow) {
      setWorkflowName(currentWorkflow.name || 'Untitled Workflow');
      setWorkflowDescription(currentWorkflow.description || '');
    }
  }, [currentWorkflow]);

  // Fetch node types from API on mount
  useEffect(() => {
    console.log('[WorkflowEditor] Fetching node types from API');
    dispatch(fetchNodeTypes() as any);
  }, [dispatch]);

  // WebSocket connection for real-time execution updates
  useEffect(() => {
    if (!workflowId) return;

    const ws = new WebSocket(`ws://localhost:3001/ws/workflows/${workflowId}/executions`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleExecutionUpdate(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => ws.close();
  }, [workflowId]);

  const handleExecutionUpdate = (data: any) => {
    // Update node status based on execution progress
    setNodes((nodes) =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          status: data.stepId === node.id ? data.status : node.data.status,
          executionTime: data.stepId === node.id ? data.duration : node.data.executionTime,
        },
      }))
    );
  };

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#1976d2', strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setShowNodeConfig(true);
  };

  // Handle adding new node from palette or position
  const handleAddNode = (nodeType: string, position?: { x: number; y: number }) => {
    const nodePosition = position || {
      x: Math.random() * 400,
      y: Math.random() * 300
    };
    
    const newNode: Node = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      position: nodePosition,
      data: {
        label: `${nodeType} Node`,
        configuration: {},
        status: 'idle',
      },
    };

    setNodes((nodes) => [...nodes, newNode]);
  };

  // Auto-save workflow when name changes (after user stops typing)
  const handleNameBlur = async () => {
    const trimmedName = workflowName.trim();
    
    // Validate name
    if (!trimmedName) {
      setWorkflowName(currentWorkflow?.name || 'Untitled Workflow');
      return;
    }
    
    // Only save if name actually changed
    if (trimmedName !== currentWorkflow?.name) {
      await handleSaveWorkflow();
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur(); // Trigger save via blur
    }
  };

  const handleSaveWorkflow = async () => {
    const trimmedName = workflowName.trim();
    
    // Validate name before saving
    if (!trimmedName) {
      console.error('Workflow name cannot be empty');
      return;
    }

    // n8n format - exactly as n8n sends it
    const workflowData = {
      // Only include id if updating existing workflow
      ...(workflowId && !workflowId.startsWith('workflow-') ? { id: workflowId } : {}),
      
      name: trimmedName,
      description: workflowDescription,
      
      // n8n nodes format (array of node objects)
      nodes: nodes.map((node) => ({
        id: node.id,
        name: node.data.label || node.id,
        type: node.type,
        typeVersion: 1,
        position: [node.position.x, node.position.y],
        parameters: node.data.configuration || {},
      })),
      
      // n8n connections format (nested object structure)
      connections: edges.reduce((acc, edge) => {
        const sourceNode = edge.source;
        const targetNode = edge.target;
        
        if (!acc[sourceNode]) {
          acc[sourceNode] = { main: [[]] };
        }
        if (!acc[sourceNode].main) {
          acc[sourceNode].main = [[]];
        }
        if (!acc[sourceNode].main[0]) {
          acc[sourceNode].main[0] = [];
        }
        
        acc[sourceNode].main[0].push({
          node: targetNode,
          type: 'main',
          index: 0,
        });
        
        return acc;
      }, {} as any),
      
      // n8n settings format
      settings: {
        executionTimeout: 300,
        timezone: 'America/New_York',
        executionOrder: 'v1',
        ...((currentWorkflow as any)?.settings || {}),
      },
      
      // n8n workflow state
      active: false, // Always create as inactive (n8n pattern)
      tags: (currentWorkflow as any)?.tags || [],
      versionId: (currentWorkflow as any)?.versionId, // Include versionId for updates
    };

    try {
      console.log('📤 Saving workflow (n8n format):', workflowData);
      await dispatch(saveWorkflow(workflowData as any));
      console.log('✅ Workflow saved successfully');
    } catch (error) {
      console.error('❌ Failed to save workflow:', error);
    }
  };

  // Import workflow handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleImportFile = () => {
    handleMenuClose();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setImportError('');
      
      const text = await file.text();
      const workflowData = JSON.parse(text);
      
      // Validate workflow structure
      if (!workflowData.nodes || !Array.isArray(workflowData.nodes)) {
        throw new Error('Invalid workflow file: missing nodes array');
      }
      if (!workflowData.connections || typeof workflowData.connections !== 'object') {
        throw new Error('Invalid workflow file: missing connections object');
      }

      // Load workflow into editor
      loadImportedWorkflow(workflowData);
      console.log('✅ Workflow imported from file successfully');
    } catch (error: any) {
      setImportError(error.message || 'Failed to import workflow from file');
      console.error('Error importing file:', error);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportFromUrl = () => {
    handleMenuClose();
    setShowImportUrlDialog(true);
    setImportUrl('');
    setImportError('');
  };

  const handleImportUrlSubmit = async () => {
    if (!importUrl.trim()) {
      setImportError('Please enter a URL');
      return;
    }

    try {
      setIsImporting(true);
      setImportError('');

      const response = await fetch(
        `http://localhost:3000/api/workflows/from-url?url=${encodeURIComponent(importUrl)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch workflow from URL');
      }

      const workflowData = await response.json();
      
      // Load workflow into editor
      loadImportedWorkflow(workflowData);
      
      setShowImportUrlDialog(false);
      console.log('✅ Workflow imported from URL successfully');
    } catch (error: any) {
      setImportError(error.message || 'Failed to import workflow from URL');
      console.error('Error importing from URL:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const loadImportedWorkflow = (workflowData: any) => {
    // Set workflow name and description
    if (workflowData.name) {
      setWorkflowName(workflowData.name);
    }
    if (workflowData.description) {
      setWorkflowDescription(workflowData.description);
    }

    // Convert nodes to ReactFlow format
    const importedNodes: Node[] = workflowData.nodes.map((node: any) => ({
      id: node.id || node.name,
      type: node.type,
      position: node.position || { x: Math.random() * 500, y: Math.random() * 300 },
      data: {
        label: node.name || node.type,
        configuration: node.parameters || {},
        status: 'idle',
        ...node.data,
      },
    }));

    // Convert connections to ReactFlow edges
    const importedEdges: Edge[] = [];
    Object.entries(workflowData.connections || {}).forEach(([sourceNode, outputs]: [string, any]) => {
      Object.entries(outputs || {}).forEach(([outputKey, connections]: [string, any]) => {
        (connections || []).forEach((conn: any, index: number) => {
          importedEdges.push({
            id: `e-${sourceNode}-${conn.node}-${index}`,
            source: sourceNode,
            target: conn.node,
            sourceHandle: outputKey,
            targetHandle: conn.type || 'main',
            type: 'default',
          });
        });
      });
    });

    setNodes(importedNodes);
    setEdges(importedEdges);
  };

  const handleExecuteWorkflow = async () => {
    if (!workflowId) {
      console.error('Cannot execute workflow without ID');
      return;
    }

    setIsExecuting(true);
    
    try {
      await dispatch(executeWorkflow({
        workflowId,
        triggerData: {},
      }));
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const handleStopExecution = async () => {
    if (!execution?.id) return;

    try {
      await dispatch(stopWorkflow(execution.id));
      setIsExecuting(false);
    } catch (error) {
      console.error('Failed to stop workflow:', error);
    }
  };

  const updateNodeConfiguration = (nodeId: string, configuration: any) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, configuration } }
          : node
      )
    );
  };

  // Handle trigger management
  const handleAddTrigger = (trigger: WorkflowTrigger) => {
    setTriggers(prev => [...prev, trigger]);
  };

  const handleEditTrigger = (triggerId: string, trigger: WorkflowTrigger) => {
    setTriggers(prev => prev.map(t => t.id === triggerId ? trigger : t));
  };

  const handleRemoveTrigger = (triggerId: string) => {
    setTriggers(prev => prev.filter(t => t.id !== triggerId));
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Left Sidebar - Triggers and Node Management */}
      <Paper sx={{ width: 350, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Workflow Configuration
          </Typography>
          
          {/* Trigger Management */}
          <TriggerManager
            triggers={triggers}
            onAddTrigger={handleAddTrigger}
            onEditTrigger={handleEditTrigger}
            onRemoveTrigger={handleRemoveTrigger}
          />
        </Box>
      </Paper>

      {/* Main Editor Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <Toolbar sx={{ borderBottom: '1px solid #e0e0e0' }}>
          <TextField
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            placeholder="Workflow Name"
            variant="standard"
            inputProps={{
              maxLength: 128,
            }}
            sx={{ 
              flexGrow: 1,
              '& .MuiInput-root': {
                fontSize: '1.25rem',
                fontWeight: 500,
              },
              '& .MuiInput-input': {
                cursor: 'text',
              }
            }}
          />
          
          <Button
            startIcon={<SaveIcon />}
            onClick={handleSaveWorkflow}
            variant="outlined"
            sx={{ mr: 1 }}
          >
            Save
          </Button>

          {isExecuting ? (
            <Button
              startIcon={<StopIcon />}
              onClick={handleStopExecution}
              variant="contained"
              color="error"
            >
              Stop
            </Button>
          ) : (
            <Button
              startIcon={<PlayIcon />}
              onClick={handleExecuteWorkflow}
              variant="contained"
              color="primary"
              disabled={nodes.length === 0}
            >
              Execute
            </Button>
          )}

          {/* Three-dot menu for import options */}
          <IconButton onClick={handleMenuOpen} sx={{ ml: 1 }}>
            <MoreVertIcon />
          </IconButton>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleImportFile}>
              <FileUploadIcon sx={{ mr: 1 }} />
              Import from File
            </MenuItem>
            <MenuItem onClick={handleImportFromUrl}>
              <LinkIcon sx={{ mr: 1 }} />
              Import from URL
            </MenuItem>
          </Menu>
        </Toolbar>

        {/* React Flow Editor */}
        <Box sx={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
          >
            <Controls />
            <MiniMap />
            <Background color="#aaa" gap={16} />
          </ReactFlow>
        </Box>
      </Box>

      {/* Node Detail View (NDV) - Replaces NodeProperties */}
      <NodeDetailView
        open={!!selectedNode}
        selectedNode={selectedNode}
        onClose={() => setSelectedNode(null)}
        onNodeUpdate={(nodeId, updates) => {
          setNodes((nodes) =>
            nodes.map((node) =>
              node.id === nodeId ? { ...node, ...updates } : node
            )
          );
        }}
        onExecuteNode={(nodeId) => {
          console.log('[WorkflowEditor] Execute single node:', nodeId);
          // TODO: Implement single node execution
        }}
      />

      {/* Floating Node Palette */}
      <NodePalette onAddNode={handleAddNode} />

      {/* Trigger Configuration Dialog */}
      <Dialog
        open={showTriggerConfig}
        onClose={() => setShowTriggerConfig(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Configure Webhook Trigger</DialogTitle>
        <DialogContent>
          {triggers.find(t => t.type === 'webhook') && (
            <WebhookTrigger
              trigger={triggers.find(t => t.type === 'webhook')!}
              onUpdate={(trigger) => handleEditTrigger(trigger.id, trigger)}
              workflowId={workflowId || ''}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Remove old Node Configuration Dialog - now using NDV */}
      {/*
      <Dialog
        open={showNodeConfig}
        onClose={() => setShowNodeConfig(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Configure Node: {selectedNode?.data.label}
        </DialogTitle>
        <DialogContent>
          {selectedNode && (
            <NodeProperties
              selectedNode={selectedNode}
              onNodeUpdate={(nodeId, updates) => {
                setNodes((nodes) =>
                  nodes.map((node) =>
                    node.id === nodeId ? { ...node, ...updates } : node
                  )
                );
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      */}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Import from URL Dialog */}
      <Dialog
        open={showImportUrlDialog}
        onClose={() => !isImporting && setShowImportUrlDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Import Workflow from URL</DialogTitle>
        <DialogContent>
          {importError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {importError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Workflow JSON URL"
            type="url"
            fullWidth
            variant="outlined"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="https://example.com/workflow.json"
            disabled={isImporting}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowImportUrlDialog(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button 
            onClick={handleImportUrlSubmit} 
            variant="contained" 
            disabled={isImporting || !importUrl.trim()}
          >
            {isImporting ? 'Importing...' : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowEditor;