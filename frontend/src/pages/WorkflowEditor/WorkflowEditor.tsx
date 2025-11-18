import React, { useState, useCallback, useEffect } from 'react';
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
  DialogContent
} from '@mui/material';
import {
  Save as SaveIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Add as AddIcon,
  Settings as SettingsIcon
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

// Custom node components
import HttpRequestNode from '@components/nodes/HttpRequestNode';
import DataProcessingNode from '@components/nodes/DataProcessingNode';

// Sidebar components
import NodePalette from '@components/NodePalette/NodePalette';
import NodeProperties from '@components/NodeProperties';
import TriggerManager from '@components/TriggerManager/TriggerManager';
import WebhookTrigger from '@components/WebhookTrigger/WebhookTrigger';

// Types
import type { WorkflowDefinition, WorkflowStep, WorkflowTrigger, NodeType } from '../../types/workflow';

// Custom node types for ReactFlow
const nodeTypes: NodeTypes = {
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

  const handleSaveWorkflow = async () => {
    const workflowDefinition: WorkflowDefinition = {
      id: workflowId || `workflow-${Date.now()}`,
      name: currentWorkflow?.name || 'Untitled Workflow',
      description: currentWorkflow?.description || '',
      version: 1,
      steps: nodes.map((node): WorkflowStep => ({
        id: node.id,
        name: node.data.label,
        type: node.type as any,
        configuration: node.data.configuration,
        position: node.position,
        dependencies: edges
          .filter((edge) => edge.target === node.id)
          .map((edge) => edge.source),
        inputMapping: node.data.inputMapping,
        outputMapping: node.data.outputMapping,
        retryPolicy: node.data.retryPolicy,
      })),
      triggers: currentWorkflow?.triggers || [],
      settings: currentWorkflow?.settings || {
        timeout: 300000,
        maxRetries: 3,
        errorHandling: 'stop',
      },
    };

    try {
      await dispatch(saveWorkflow(workflowDefinition));
      console.log('Workflow saved successfully');
    } catch (error) {
      console.error('Failed to save workflow:', error);
    }
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
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {currentWorkflow?.name || 'Untitled Workflow'}
          </Typography>
          
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

      {/* Right Sidebar - Node Properties */}
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

      {/* Node Configuration Dialog */}
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
    </Box>
  );
};

export default WorkflowEditor;