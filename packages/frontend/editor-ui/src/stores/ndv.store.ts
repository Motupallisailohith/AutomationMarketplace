import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { INodeUi } from '@/types/canvas.types';

export const useNDVStore = defineStore('ndv', () => {
  // State - Node Details View
  const activeNodeId = ref<string | null>(null);
  const isNDVOpen = ref(false);
  const ndvSessionId = ref<string>('');
  const inputNodeName = ref<string | null>(null);
  const inputRunIndex = ref<number>(-1);
  const outputRunIndex = ref<number>(-1);

  // Computed
  const activeNode = computed(() => activeNodeId.value);
  const isOpen = computed(() => isNDVOpen.value);

  // Actions
  function openNDV(nodeId: string) {
    activeNodeId.value = nodeId;
    isNDVOpen.value = true;
    ndvSessionId.value = `ndv-${Date.now()}-${Math.random()}`;
  }

  function closeNDV() {
    isNDVOpen.value = false;
    // Keep activeNodeId for potential reopen
  }

  function setActiveNode(nodeId: string | null) {
    activeNodeId.value = nodeId;
  }

  function setInputNode(nodeName: string | null) {
    inputNodeName.value = nodeName;
  }

  function setInputRunIndex(index: number) {
    inputRunIndex.value = index;
  }

  function setOutputRunIndex(index: number) {
    outputRunIndex.value = index;
  }

  function reset() {
    activeNodeId.value = null;
    isNDVOpen.value = false;
    ndvSessionId.value = '';
    inputNodeName.value = null;
    inputRunIndex.value = -1;
    outputRunIndex.value = -1;
  }

  return {
    // State
    activeNodeId,
    isNDVOpen,
    ndvSessionId,
    inputNodeName,
    inputRunIndex,
    outputRunIndex,

    // Computed
    activeNode,
    isOpen,

    // Actions
    openNDV,
    closeNDV,
    setActiveNode,
    setInputNode,
    setInputRunIndex,
    setOutputRunIndex,
    reset,
  };
});
