<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useUIStore } from '@/stores/ui.store';
import WorkflowCanvas from '@/components/Canvas/WorkflowCanvas.vue';
import WorkflowNode from '@/components/Canvas/WorkflowNode.vue';
import type { CanvasNode, CanvasEdge, XYPosition, IWorkflowDb } from '@/types/canvas.types';

// Stores
const workflowsStore = useWorkflowsStore();
const ndvStore = useNDVStore();
const uiStore = useUIStore();
const route = useRoute();
const router = useRouter();

// Refs
const canvasRef = ref<InstanceType<typeof WorkflowCanvas> | null>(null);
const isLoading = ref(true);

// Computed
const workflowId = computed(() => route.params.id as string);

const canvasNodes = computed<CanvasNode[]>(() => {
  return workflowsStore.allNodes.map((node) => ({
    id: node.id,
    type: 'custom', // We'll register WorkflowNode as 'custom'
    position: { x: node.position[0], y: node.position[1] },
    data: {
      name: node.name,
      type: node.type,
      typeVersion: node.typeVersion,
      disabled: node.disabled || false,
      parameters: node.parameters,
      inputs: [{ type: 'main', index: 0 }], // Simplified
      outputs: [{ type: 'main', index: 0 }], // Simplified
      connections: { input: {}, output: {} },
      execution: {
        running: false,
        waiting: false,
      },
      render: {
        type: 'default' as const,
      },
    },
  }));
});

const canvasEdges = computed<CanvasEdge[]>(() => {
  const edges: CanvasEdge[] = [];
  const connections = workflowsStore.allConnections;

  Object.entries(connections).forEach(([sourceNodeId, outputs]) => {
    Object.entries(outputs).forEach(([outputType, connectionGroups]) => {
      connectionGroups.forEach((connections, outputIndex) => {
        connections.forEach((connection) => {
          edges.push({
            id: `e-${sourceNodeId}-${connection.node}-${outputIndex}-${connection.index}`,
            source: sourceNodeId,
            target: connection.node,
            sourceHandle: `output-${outputType}-${outputIndex}`,
            targetHandle: `input-${connection.type}-${connection.index}`,
          });
        });
      });
    });
  });

  return edges;
});

// Methods
async function loadWorkflow() {
  try {
    isLoading.value = true;
    
    // TODO: Replace with actual API call
    // For now, create a sample workflow
    const sampleWorkflow: IWorkflowDb = {
      id: workflowId.value || 'new',
      name: 'My Workflow',
      active: false,
      nodes: [
        {
          id: '1',
          name: 'Start',
          type: 'trigger',
          typeVersion: 1,
          position: [100, 100],
          parameters: {},
        },
        {
          id: '2',
          name: 'Process',
          type: 'action',
          typeVersion: 1,
          position: [400, 100],
          parameters: {},
        },
      ],
      connections: {
        '1': {
          main: [[{ node: '2', type: 'main', index: 0 }]],
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    workflowsStore.setWorkflow(sampleWorkflow);
  } catch (error) {
    console.error('Failed to load workflow:', error);
  } finally {
    isLoading.value = false;
  }
}

function handleNodeClick(nodeId: string, position: XYPosition) {
  console.log('Node clicked:', nodeId, position);
  uiStore.setSelectedNodes([nodeId]);
}

function handleNodeDoubleClick(nodeId: string) {
  console.log('Node double-clicked:', nodeId);
  ndvStore.openNDV(nodeId);
}

function handlePaneClick(position: XYPosition) {
  console.log('Pane clicked:', position);
  uiStore.clearSelection();
}

function handleCreateConnection(edge: CanvasEdge) {
  console.log('Connection created:', edge);
  
  workflowsStore.addConnection({
    source: edge.source,
    sourceType: 'main',
    sourceIndex: 0,
    target: edge.target,
    targetType: 'main',
    targetIndex: 0,
  });
}

function handleDeleteConnection(edge: CanvasEdge) {
  console.log('Connection deleted:', edge);
  workflowsStore.removeConnection(edge.source, edge.target);
}

function handleNodeMove(nodes: Array<{ id: string; position: XYPosition }>) {
  console.log('Nodes moved:', nodes);
  nodes.forEach((node) => {
    workflowsStore.updateNodePosition(node.id, [node.position.x, node.position.y]);
  });
}

function handleNodesSelect(nodeIds: string[]) {
  console.log('Nodes selected:', nodeIds);
  uiStore.setSelectedNodes(nodeIds);
}

function handleViewportChange(viewport: { x: number; y: number; zoom: number }) {
  uiStore.setCanvasZoom(viewport.zoom);
  uiStore.setCanvasPosition({ x: viewport.x, y: viewport.y });
}

function handleFitView() {
  canvasRef.value?.fitView();
}

function handleZoomIn() {
  canvasRef.value?.zoomIn();
}

function handleZoomOut() {
  canvasRef.value?.zoomOut();
}

async function handleSaveWorkflow() {
  console.log('Saving workflow...');
  // TODO: Implement API call to save workflow
}

async function handleRunWorkflow() {
  console.log('Running workflow...');
  workflowsStore.setWorkflowRunning(true);
  
  // TODO: Implement workflow execution
  setTimeout(() => {
    workflowsStore.setWorkflowRunning(false);
  }, 3000);
}

// Lifecycle
onMounted(() => {
  loadWorkflow();
});
</script>

<template>
  <div class="workflow-editor">
    <!-- Header -->
    <header class="editor-header">
      <div class="header-left">
        <button class="btn-icon" title="Back to workflows" @click="router.push('/workflows')">
          ←
        </button>
        <h1 class="workflow-title">{{ workflowsStore.workflowName }}</h1>
      </div>

      <div class="header-center">
        <div class="header-actions">
          <button class="btn" @click="handleZoomOut">−</button>
          <button class="btn" @click="handleFitView">Fit</button>
          <button class="btn" @click="handleZoomIn">+</button>
        </div>
      </div>

      <div class="header-right">
        <button class="btn btn-secondary" @click="handleSaveWorkflow">
          Save
        </button>
        <button 
          class="btn btn-primary" 
          :disabled="workflowsStore.isWorkflowRunning"
          @click="handleRunWorkflow"
        >
          {{ workflowsStore.isWorkflowRunning ? 'Running...' : 'Execute' }}
        </button>
      </div>
    </header>

    <!-- Canvas -->
    <div class="editor-canvas">
      <WorkflowCanvas
        ref="canvasRef"
        :nodes="canvasNodes"
        :edges="canvasEdges"
        :loading="isLoading"
        @click:node="handleNodeClick"
        @dblclick:node="handleNodeDoubleClick"
        @click:pane="handlePaneClick"
        @create:connection="handleCreateConnection"
        @delete:connection="handleDeleteConnection"
        @nodes:move="handleNodeMove"
        @nodes:select="handleNodesSelect"
        @viewport:change="handleViewportChange"
      >
        <template #node-custom="nodeProps">
          <WorkflowNode
            :id="nodeProps.id"
            :data="nodeProps.data"
            :selected="nodeProps.selected"
            @configure="handleNodeDoubleClick"
            @execute="(id) => console.log('Execute node:', id)"
            @delete="(id) => workflowsStore.removeNode(id)"
          />
        </template>
      </WorkflowCanvas>
    </div>

    <!-- Node Details View (NDV) -->
    <teleport to="body">
      <div v-if="ndvStore.isOpen" class="ndv-overlay" @click="ndvStore.closeNDV">
        <div class="ndv-panel" @click.stop>
          <header class="ndv-header">
            <h2>Node Configuration</h2>
            <button class="btn-close" @click="ndvStore.closeNDV">✕</button>
          </header>
          
          <div class="ndv-content">
            <p>Node ID: {{ ndvStore.activeNodeId }}</p>
            <p class="text-muted">Configuration panel coming soon...</p>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<style lang="scss" scoped>
.workflow-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--color--background);
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing--md);
  background: var(--color--background--light-3);
  border-bottom: 1px solid var(--border-color);
  gap: var(--spacing--md);
  min-height: 64px;
}

.header-left,
.header-center,
.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing--sm);
}

.header-left {
  flex: 1;
}

.header-center {
  flex: 0 0 auto;
}

.header-right {
  flex: 1;
  justify-content: flex-end;
}

.workflow-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color--text--shade-1);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: var(--spacing--xs);
}

.btn,
.btn-icon {
  padding: var(--spacing--sm) var(--spacing--md);
  border: 1px solid var(--border-color);
  background: var(--color--background--light-3);
  color: var(--color--text);
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--color--background--light-2);
    border-color: var(--color--foreground--shade-1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  font-size: 20px;
}

.btn-primary {
  background: var(--color--primary);
  color: white;
  border-color: var(--color--primary);

  &:hover:not(:disabled) {
    background: var(--color--primary--shade-1);
    border-color: var(--color--primary--shade-1);
  }
}

.btn-secondary {
  background: var(--color--background--light-2);
}

.btn-close {
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: none;
  font-size: 20px;
  color: var(--color--text--tint-1);
  cursor: pointer;
  border-radius: var(--radius);
  transition: all 0.2s ease;

  &:hover {
    background: var(--color--background--light-2);
    color: var(--color--text);
  }
}

.editor-canvas {
  flex: 1;
  position: relative;
  overflow: hidden;
}

// NDV (Node Details View)
.ndv-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-index--modal);
  animation: fadeIn 0.2s ease;
}

.ndv-panel {
  width: 90%;
  max-width: 1200px;
  height: 80%;
  background: var(--color--background--light-3);
  border-radius: var(--radius--lg);
  box-shadow: var(--shadow--dark);
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

.ndv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing--md) var(--spacing--lg);
  border-bottom: 1px solid var(--border-color);

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--color--text--shade-1);
  }
}

.ndv-content {
  flex: 1;
  padding: var(--spacing--lg);
  overflow-y: auto;
}

.text-muted {
  color: var(--color--text--tint-1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
