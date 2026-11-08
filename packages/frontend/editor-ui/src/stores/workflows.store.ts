import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { IWorkflowDb, INodeUi, IConnections } from '@/types/canvas.types';

export const useWorkflowsStore = defineStore('workflows', () => {
  // State
  const workflow = ref<IWorkflowDb | null>(null);
  const workflowId = ref<string>('');
  const workflowName = ref<string>('Untitled Workflow');
  const workflowExecutionData = ref<Record<string, unknown> | null>(null);
  const isWorkflowRunning = ref(false);

  // Computed
  const allNodes = computed(() => workflow.value?.nodes || []);
  const allConnections = computed(() => workflow.value?.connections || {});
  const activeWorkflow = computed(() => workflow.value);

  // Actions
  function setWorkflow(wf: IWorkflowDb) {
    workflow.value = wf;
    workflowId.value = wf.id;
    workflowName.value = wf.name;
  }

  function updateWorkflowName(name: string) {
    workflowName.value = name;
    if (workflow.value) {
      workflow.value.name = name;
    }
  }

  function addNode(node: INodeUi) {
    if (!workflow.value) return;
    workflow.value.nodes.push(node);
  }

  function removeNode(nodeId: string) {
    if (!workflow.value) return;
    workflow.value.nodes = workflow.value.nodes.filter((n) => n.id !== nodeId);
    
    // Remove connections
    const connections = workflow.value.connections;
    delete connections[nodeId];
    
    // Remove connections to this node
    Object.keys(connections).forEach((key) => {
      Object.keys(connections[key]).forEach((type) => {
        connections[key][type] = connections[key][type].map((connGroup) =>
          connGroup.filter((conn) => conn.node !== nodeId)
        );
      });
    });
  }

  function updateNodePosition(nodeId: string, position: [number, number]) {
    if (!workflow.value) return;
    const node = workflow.value.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.position = position;
    }
  }

  function updateNodeParameters(nodeId: string, parameters: Record<string, unknown>) {
    if (!workflow.value) return;
    const node = workflow.value.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.parameters = { ...node.parameters, ...parameters };
    }
  }

  function toggleNodeDisabled(nodeId: string) {
    if (!workflow.value) return;
    const node = workflow.value.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.disabled = !node.disabled;
    }
  }

  function addConnection(connection: {
    source: string;
    sourceType: string;
    sourceIndex: number;
    target: string;
    targetType: string;
    targetIndex: number;
  }) {
    if (!workflow.value) return;
    
    const { source, sourceType, target, targetType, targetIndex } = connection;
    
    if (!workflow.value.connections[source]) {
      workflow.value.connections[source] = {};
    }
    if (!workflow.value.connections[source][sourceType]) {
      workflow.value.connections[source][sourceType] = [];
    }
    if (!workflow.value.connections[source][sourceType][0]) {
      workflow.value.connections[source][sourceType][0] = [];
    }
    
    workflow.value.connections[source][sourceType][0].push({
      node: target,
      type: targetType,
      index: targetIndex,
    });
  }

  function removeConnection(source: string, target: string) {
    if (!workflow.value || !workflow.value.connections[source]) return;
    
    Object.keys(workflow.value.connections[source]).forEach((type) => {
      workflow.value!.connections[source][type] = workflow.value!.connections[source][type].map(
        (connGroup) => connGroup.filter((conn) => conn.node !== target)
      );
    });
  }

  function setWorkflowRunning(running: boolean) {
    isWorkflowRunning.value = running;
  }

  function getNodeById(nodeId: string): INodeUi | undefined {
    return workflow.value?.nodes.find((n) => n.id === nodeId);
  }

  function getNodeByName(nodeName: string): INodeUi | undefined {
    return workflow.value?.nodes.find((n) => n.name === nodeName);
  }

  function resetWorkflow() {
    workflow.value = null;
    workflowId.value = '';
    workflowName.value = 'Untitled Workflow';
    workflowExecutionData.value = null;
    isWorkflowRunning.value = false;
  }

  return {
    // State
    workflow,
    workflowId,
    workflowName,
    workflowExecutionData,
    isWorkflowRunning,

    // Computed
    allNodes,
    allConnections,
    activeWorkflow,

    // Actions
    setWorkflow,
    updateWorkflowName,
    addNode,
    removeNode,
    updateNodePosition,
    updateNodeParameters,
    toggleNodeDisabled,
    addConnection,
    removeConnection,
    setWorkflowRunning,
    getNodeById,
    getNodeByName,
    resetWorkflow,
  };
});
