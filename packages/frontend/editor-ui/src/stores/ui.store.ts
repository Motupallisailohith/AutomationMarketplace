import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUIStore = defineStore('ui', () => {
  // State
  const sidebarOpen = ref(true);
  const activeModal = ref<string | null>(null);
  const nodeCreatorOpen = ref(false);
  const selectedNodes = ref<string[]>([]);
  const canvasZoom = ref(1);
  const canvasPosition = ref({ x: 0, y: 0 });

  // Computed
  const isSidebarOpen = computed(() => sidebarOpen.value);
  const hasActiveModal = computed(() => activeModal.value !== null);
  const isNodeCreatorOpen = computed(() => nodeCreatorOpen.value);
  const selectedNodeIds = computed(() => selectedNodes.value);

  // Actions
  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value;
  }

  function setSidebarOpen(open: boolean) {
    sidebarOpen.value = open;
  }

  function openModal(modalKey: string) {
    activeModal.value = modalKey;
  }

  function closeModal() {
    activeModal.value = null;
  }

  function openNodeCreator() {
    nodeCreatorOpen.value = true;
  }

  function closeNodeCreator() {
    nodeCreatorOpen.value = false;
  }

  function setSelectedNodes(nodeIds: string[]) {
    selectedNodes.value = nodeIds;
  }

  function addSelectedNode(nodeId: string) {
    if (!selectedNodes.value.includes(nodeId)) {
      selectedNodes.value.push(nodeId);
    }
  }

  function removeSelectedNode(nodeId: string) {
    selectedNodes.value = selectedNodes.value.filter((id) => id !== nodeId);
  }

  function clearSelection() {
    selectedNodes.value = [];
  }

  function setCanvasZoom(zoom: number) {
    canvasZoom.value = zoom;
  }

  function setCanvasPosition(position: { x: number; y: number }) {
    canvasPosition.value = position;
  }

  function reset() {
    sidebarOpen.value = true;
    activeModal.value = null;
    nodeCreatorOpen.value = false;
    selectedNodes.value = [];
    canvasZoom.value = 1;
    canvasPosition.value = { x: 0, y: 0 };
  }

  return {
    // State
    sidebarOpen,
    activeModal,
    nodeCreatorOpen,
    selectedNodes,
    canvasZoom,
    canvasPosition,

    // Computed
    isSidebarOpen,
    hasActiveModal,
    isNodeCreatorOpen,
    selectedNodeIds,

    // Actions
    toggleSidebar,
    setSidebarOpen,
    openModal,
    closeModal,
    openNodeCreator,
    closeNodeCreator,
    setSelectedNodes,
    addSelectedNode,
    removeSelectedNode,
    clearSelection,
    setCanvasZoom,
    setCanvasPosition,
    reset,
  };
});
