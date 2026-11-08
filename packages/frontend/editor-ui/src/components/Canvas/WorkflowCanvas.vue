<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { VueFlow, useVueFlow, Panel, PanelPosition, MarkerType } from '@vue-flow/core';
import { MiniMap } from '@vue-flow/minimap';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import type { CanvasNode, CanvasEdge, XYPosition } from '@/types/canvas.types';

const props = withDefaults(
  defineProps<{
    nodes: CanvasNode[];
    edges: CanvasEdge[];
    readOnly?: boolean;
    loading?: boolean;
  }>(),
  {
    readOnly: false,
    loading: false,
  }
);

const emit = defineEmits<{
  'click:node': [nodeId: string, position: XYPosition];
  'dblclick:node': [nodeId: string];
  'click:pane': [position: XYPosition];
  'create:connection': [edge: CanvasEdge];
  'delete:connection': [edge: CanvasEdge];
  'update:node:position': [nodeId: string, position: XYPosition];
  'nodes:move': [nodes: Array<{ id: string; position: XYPosition }>];
  'nodes:select': [nodeIds: string[]];
  'viewport:change': [viewport: { x: number; y: number; zoom: number }];
}>();

const {
  fitView,
  zoomIn,
  zoomOut,
  zoomTo,
  setCenter,
  project,
  getSelectedNodes,
  onNodeClick,
  onNodeDoubleClick,
  onPaneClick,
  onConnect,
  onEdgeClick,
  onNodeDrag,
  onNodeDragStop,
  onNodesChange,
  onEdgesChange,
  viewport,
} = useVueFlow();

// Refs
const canvasRef = ref<HTMLDivElement | null>(null);
const isPaneReady = ref(false);

// Computed
const canvasClasses = computed(() => ({
  'workflow-canvas': true,
  'is-loading': props.loading,
  'is-readonly': props.readOnly,
  'is-ready': isPaneReady.value,
}));

// Vue Flow configuration
const defaultEdgeOptions = {
  type: 'smoothstep',
  markerEnd: MarkerType.ArrowClosed,
  style: { strokeWidth: 2, stroke: 'var(--color--primary)' },
};

const connectionLineStyle = {
  strokeWidth: 2,
  stroke: 'var(--color--primary)',
};

// Event handlers
onNodeClick((event) => {
  const node = event.node as CanvasNode;
  emit('click:node', node.id, event.node.position);
});

onNodeDoubleClick((event) => {
  const node = event.node as CanvasNode;
  emit('dblclick:node', node.id);
});

onPaneClick((event) => {
  const position = project({ x: event.clientX, y: event.clientY });
  emit('click:pane', position);
});

onConnect((connection) => {
  const edge: CanvasEdge = {
    id: `e${connection.source}-${connection.target}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle || undefined,
    targetHandle: connection.targetHandle || undefined,
  };
  emit('create:connection', edge);
});

onEdgeClick((event) => {
  if (props.readOnly) return;
  const edge = event.edge as CanvasEdge;
  emit('delete:connection', edge);
});

onNodeDragStop((event) => {
  const movedNodes = event.nodes.map((node) => ({
    id: node.id,
    position: node.position,
  }));
  emit('nodes:move', movedNodes);
});

// Watch for selection changes
watch(getSelectedNodes, (nodes) => {
  emit('nodes:select', nodes.map((n) => n.id));
});

// Watch viewport changes
watch(viewport, (vp) => {
  emit('viewport:change', { x: vp.x, y: vp.y, zoom: vp.zoom });
});

// Methods
function handleFitView() {
  fitView({ padding: 0.2, duration: 300 });
}

function handleZoomIn() {
  zoomIn({ duration: 300 });
}

function handleZoomOut() {
  zoomOut({ duration: 300 });
}

function handleZoomReset() {
  zoomTo(1, { duration: 300 });
}

// Lifecycle
onMounted(() => {
  setTimeout(() => {
    isPaneReady.value = true;
    handleFitView();
  }, 100);
});

// Expose methods to parent
defineExpose({
  fitView: handleFitView,
  zoomIn: handleZoomIn,
  zoomOut: handleZoomOut,
  zoomTo,
  setCenter,
});
</script>

<template>
  <div ref="canvasRef" :class="canvasClasses" class="workflow-canvas-wrapper">
    <VueFlow
      v-model:nodes="props.nodes"
      v-model:edges="props.edges"
      :default-edge-options="defaultEdgeOptions"
      :connection-line-style="connectionLineStyle"
      :snap-to-grid="true"
      :snap-grid="[16, 16]"
      :nodes-draggable="!readOnly"
      :nodes-connectable="!readOnly"
      :elements-selectable="!readOnly"
      :zoom-on-scroll="true"
      :pan-on-scroll="false"
      :zoom-on-pinch="true"
      :pan-on-drag="true"
      :select-nodes-on-drag="false"
      :fit-view-on-init="true"
      :min-zoom="0.1"
      :max-zoom="4"
      class="canvas-vueflow"
    >
      <Background
        pattern-color="var(--canvas--dot--color)"
        :gap="16"
        :size="1"
        variant="dots"
      />

      <Controls
        v-if="!loading"
        :show-zoom="true"
        :show-fit-view="true"
        :show-interactive="false"
        :position="PanelPosition.BottomLeft"
        class="canvas-controls"
      />

      <MiniMap
        v-if="!loading && !readOnly"
        :node-color="() => 'var(--node--color--background)'"
        :node-stroke-color="() => 'var(--color--primary)'"
        :node-stroke-width="2"
        :mask-color="'var(--canvas--color--background)'"
        :position="PanelPosition.BottomRight"
        class="canvas-minimap"
      />

      <Panel :position="PanelPosition.TopLeft" class="canvas-info">
        <slot name="header" />
      </Panel>

      <Panel :position="PanelPosition.TopRight" class="canvas-actions">
        <slot name="actions" />
      </Panel>
    </VueFlow>

    <div v-if="loading" class="canvas-loading">
      <div class="loading-spinner"></div>
      <p>Loading workflow...</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.workflow-canvas-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  background: var(--canvas--color--background);

  &.is-loading {
    pointer-events: none;
  }
}

.canvas-vueflow {
  width: 100%;
  height: 100%;
}

.canvas-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--canvas--color--background);
  z-index: 1000;
  gap: var(--spacing--md);

  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--color--foreground--tint-1);
    border-top-color: var(--color--primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  p {
    color: var(--color--text--tint-1);
    font-size: 14px;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

:deep(.vue-flow__node) {
  background: var(--node--color--background);
  border: 2px solid var(--color--foreground);
  border-radius: var(--radius--lg);
  padding: var(--spacing--sm);
  cursor: pointer;
  transition: all 0.2s ease;

  &.selected {
    border-color: var(--node--border-color--selected);
    box-shadow: 0 0 0 4px var(--canvas--color--selected);
  }

  &:hover {
    box-shadow: var(--shadow);
  }

  &.executing {
    background: var(--node--color--background--executing);
    border-color: var(--node--border-color--running);
  }
}

:deep(.vue-flow__edge) {
  cursor: pointer;

  &.selected {
    .vue-flow__edge-path {
      stroke: var(--color--primary) !important;
      stroke-width: 3 !important;
    }
  }

  &:hover {
    .vue-flow__edge-path {
      stroke: var(--color--primary--tint-1) !important;
    }
  }
}

:deep(.vue-flow__handle) {
  width: 12px;
  height: 12px;
  background: var(--color--primary);
  border: 2px solid var(--node--color--background);
  transition: all 0.2s ease;

  &:hover {
    width: 16px;
    height: 16px;
    background: var(--color--primary--shade-1);
  }

  &.source {
    right: -6px;
  }

  &.target {
    left: -6px;
  }
}

.canvas-info,
.canvas-actions {
  background: var(--color--background--light-3);
  padding: var(--spacing--sm) var(--spacing--md);
  border-radius: var(--radius--lg);
  box-shadow: var(--shadow);
}

:deep(.vue-flow__controls) {
  background: var(--color--background--light-3);
  border-radius: var(--radius--lg);
  box-shadow: var(--shadow);
  border: 1px solid var(--border-color);

  button {
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border-color);
    color: var(--color--text);
    padding: var(--spacing--sm);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--color--background--light-2);
      color: var(--color--primary);
    }

    &:last-child {
      border-bottom: none;
    }
  }
}

:deep(.vue-flow__minimap) {
  background: var(--color--background--light-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius--lg);
  box-shadow: var(--shadow);
}
</style>
