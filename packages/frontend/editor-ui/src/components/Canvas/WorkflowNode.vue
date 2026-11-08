<script setup lang="ts">
import { computed } from 'vue';
import { Handle, Position } from '@vue-flow/core';
import type { CanvasNodeData } from '@/types/canvas.types';

const props = defineProps<{
  id: string;
  data: CanvasNodeData;
  selected?: boolean;
}>();

const emit = defineEmits<{
  execute: [nodeId: string];
  delete: [nodeId: string];
  configure: [nodeId: string];
}>();

// Computed
const nodeClasses = computed(() => ({
  'workflow-node': true,
  'is-disabled': props.data.disabled,
  'is-running': props.data.execution.running,
  'is-waiting': props.data.execution.waiting,
  'has-error': props.data.execution.status === 'error',
  'has-success': props.data.execution.status === 'success',
}));

const nodeIcon = computed(() => {
  // Default icons based on node type
  const typeIcons: Record<string, string> = {
    trigger: '⚡',
    action: '⚙️',
    transform: '🔄',
    condition: '🔀',
    default: '📦',
  };
  return typeIcons[props.data.type] || typeIcons.default;
});

const hasInputs = computed(() => props.data.inputs.length > 0);
const hasOutputs = computed(() => props.data.outputs.length > 0);

// Event handlers
function handleConfigure() {
  emit('configure', props.id);
}

function handleExecute() {
  emit('execute', props.id);
}

function handleDelete() {
  emit('delete', props.id);
}
</script>

<template>
  <div :class="nodeClasses" class="node-wrapper" @dblclick="handleConfigure">
    <!-- Input Handle -->
    <Handle
      v-if="hasInputs"
      type="target"
      :position="Position.Left"
      class="node-handle node-handle-input"
    />

    <!-- Node Content -->
    <div class="node-content">
      <!-- Node Header -->
      <div class="node-header">
        <span class="node-icon">{{ nodeIcon }}</span>
        <span class="node-name">{{ data.name }}</span>
      </div>

      <!-- Node Type -->
      <div class="node-type">{{ data.type }}</div>

      <!-- Execution Status -->
      <div v-if="data.execution.running" class="node-status">
        <span class="status-indicator running"></span>
        <span class="status-text">Running...</span>
      </div>
      <div v-else-if="data.execution.waiting" class="node-status">
        <span class="status-indicator waiting"></span>
        <span class="status-text">Waiting...</span>
      </div>
      <div v-else-if="data.execution.status === 'success'" class="node-status">
        <span class="status-indicator success">✓</span>
      </div>
      <div v-else-if="data.execution.status === 'error'" class="node-status">
        <span class="status-indicator error">✕</span>
      </div>

      <!-- Disabled Indicator -->
      <div v-if="data.disabled" class="node-disabled-badge">Disabled</div>
    </div>

    <!-- Toolbar (visible on hover or when selected) -->
    <div v-if="selected" class="node-toolbar">
      <button
        class="toolbar-button"
        title="Configure Node"
        @click.stop="handleConfigure"
      >
        <span>⚙️</span>
      </button>
      <button
        class="toolbar-button"
        title="Execute Node"
        @click.stop="handleExecute"
      >
        <span>▶️</span>
      </button>
      <button
        class="toolbar-button toolbar-button-danger"
        title="Delete Node"
        @click.stop="handleDelete"
      >
        <span>🗑️</span>
      </button>
    </div>

    <!-- Output Handle -->
    <Handle
      v-if="hasOutputs"
      type="source"
      :position="Position.Right"
      class="node-handle node-handle-output"
    />
  </div>
</template>

<style lang="scss" scoped>
.node-wrapper {
  position: relative;
  min-width: 180px;
  background: var(--node--color--background);
  border: 2px solid var(--color--foreground);
  border-radius: var(--radius--lg);
  padding: var(--spacing--sm);
  transition: all 0.2s ease;
  cursor: pointer;

  &.is-disabled {
    opacity: 0.6;
    background: var(--color--background--light-2);
  }

  &.is-running {
    background: var(--node--color--background--executing);
    border-color: var(--node--border-color--running);
    animation: pulse 2s ease-in-out infinite;
  }

  &.is-waiting {
    border-color: var(--color--warning);
  }

  &.has-success {
    border-color: var(--color--success);
  }

  &.has-error {
    border-color: var(--color--danger);
    background: var(--color--danger--tint-4);
  }

  &:hover {
    box-shadow: var(--shadow);
  }
}

.node-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing--xs);
}

.node-header {
  display: flex;
  align-items: center;
  gap: var(--spacing--xs);
  font-weight: 600;
  color: var(--color--text--shade-1);
}

.node-icon {
  font-size: 20px;
  line-height: 1;
}

.node-name {
  flex: 1;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-type {
  font-size: 12px;
  color: var(--color--text--tint-1);
  text-transform: capitalize;
}

.node-status {
  display: flex;
  align-items: center;
  gap: var(--spacing--xs);
  font-size: 12px;
  margin-top: var(--spacing--xs);
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;

  &.running {
    background: var(--color--primary);
    animation: pulse 1.5s ease-in-out infinite;
  }

  &.waiting {
    background: var(--color--warning);
  }

  &.success {
    background: var(--color--success);
    color: white;
    font-size: 10px;
  }

  &.error {
    background: var(--color--danger);
    color: white;
    font-size: 10px;
  }
}

.status-text {
  color: var(--color--text--tint-1);
  font-size: 11px;
}

.node-disabled-badge {
  background: var(--color--background--shade-1);
  color: var(--color--text--tint-1);
  padding: 2px var(--spacing--xs);
  border-radius: var(--radius--sm);
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 600;
  text-align: center;
  margin-top: var(--spacing--xs);
}

.node-toolbar {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: var(--spacing--xs);
  background: var(--color--background--light-3);
  padding: var(--spacing--xs);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  border: 1px solid var(--border-color);
  z-index: 10;
}

.toolbar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: var(--radius--sm);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;

  &:hover {
    background: var(--color--background--light-2);
  }

  &.toolbar-button-danger:hover {
    background: var(--color--danger--tint-4);
  }
}

.node-handle {
  width: 12px;
  height: 12px;
  background: var(--color--primary);
  border: 2px solid var(--node--color--background);
  border-radius: 50%;
  transition: all 0.2s ease;

  &:hover {
    width: 16px;
    height: 16px;
    background: var(--color--primary--shade-1);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
