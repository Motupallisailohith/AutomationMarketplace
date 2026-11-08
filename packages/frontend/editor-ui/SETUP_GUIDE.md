# Automation Marketplace - Vue 3 Workflow Editor Setup

## 🎉 What We've Built

A complete Vue 3-based workflow editor inspired by n8n's architecture, featuring:

- **Modern Tech Stack**: Vue 3, TypeScript, Pinia, Vue Flow
- **Drag & Drop Canvas**: Full workflow editing with zoom, pan, and minimap
- **Design System**: Custom CSS tokens and theme system
- **State Management**: Pinia stores for workflows, UI, and NDV
- **Node System**: Reusable node components with execution states
- **Configuration Panel**: Node Details View (NDV) modal

## 📁 Project Structure

```
packages/frontend/editor-ui/
├── src/
│   ├── App.vue                      # Main app component
│   ├── main.ts                      # App entry point
│   ├── router/
│   │   └── index.ts                 # Vue Router configuration
│   ├── views/
│   │   ├── WorkflowsList.vue        # Workflows list view
│   │   └── WorkflowEditor.vue       # Main workflow editor
│   ├── components/
│   │   └── Canvas/
│   │       ├── WorkflowCanvas.vue   # Canvas wrapper with Vue Flow
│   │       └── WorkflowNode.vue     # Individual node component
│   ├── stores/
│   │   ├── workflows.store.ts       # Workflow state management
│   │   ├── ndv.store.ts             # Node details view state
│   │   └── ui.store.ts              # UI state management
│   ├── types/
│   │   └── canvas.types.ts          # TypeScript type definitions
│   └── design-system/
│       ├── primitives.scss          # Base color palette
│       ├── tokens.scss              # Semantic design tokens
│       └── global.scss              # Global styles
├── vite.config.ts                   # Vite configuration
├── package.json                     # Dependencies
└── tsconfig.json                    # TypeScript configuration
```

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd packages/frontend/editor-ui
pnpm install
```

Required dependencies:
- `vue` (^3.5.13)
- `vue-router` (^4.5.0)
- `pinia` (^2.2.8)
- `@vue-flow/core` (^1.42.1)
- `@vue-flow/minimap` (^1.5.0)
- `@vue-flow/background` (^1.4.0)
- `@vue-flow/controls` (^1.2.0)
- `@vueuse/core` (^11.3.0)

### 2. Run Development Server

```bash
pnpm dev
```

The editor will be available at `http://localhost:5678`

### 3. Build for Production

```bash
pnpm build
```

## 🎨 Design System

### Color Tokens

The design system uses CSS custom properties organized in layers:

**Primitives** (`primitives.scss`):
- Base color palette (neutral, blue, purple, green, red, etc.)
- Never used directly in components

**Tokens** (`tokens.scss`):
- Semantic color assignments
- Used throughout components

Key tokens:
```scss
--color--primary          // Main brand color (blue)
--color--secondary        // Secondary brand (purple)
--color--success          // Success states (green)
--color--warning          // Warning states (gold)
--color--danger           // Error states (red)

--color--background       // Canvas background
--color--foreground       // Borders, dividers
--color--text             // Text colors

--node--color--background  // Node background
--node--border-color--selected // Selected node border
--node--border-color--running  // Running node border
```

### Using Design Tokens

```vue
<style lang="scss">
.my-component {
  background: var(--color--background--light-3);
  color: var(--color--text);
  border: 1px solid var(--border-color);
  border-radius: var(--radius--lg);
  padding: var(--spacing--md);
}
</style>
```

## 🗺️ Canvas Architecture

### Vue Flow Integration

The canvas uses `@vue-flow/core` which provides:
- Drag & drop nodes
- Connection drawing
- Zoom & pan
- Minimap
- Background grid

### Node Structure

```typescript
interface CanvasNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: CanvasNodeData;
}

interface CanvasNodeData {
  name: string;
  type: string;
  disabled: boolean;
  parameters: Record<string, unknown>;
  inputs: CanvasConnectionPort[];
  outputs: CanvasConnectionPort[];
  execution: {
    running: boolean;
    waiting: boolean;
    status?: 'success' | 'error';
  };
}
```

### Connection/Edge Structure

```typescript
interface CanvasEdge {
  id: string;
  source: string;        // Source node ID
  target: string;        // Target node ID
  sourceHandle?: string; // Output handle ID
  targetHandle?: string; // Input handle ID
}
```

## 📦 State Management (Pinia)

### Workflows Store

```typescript
import { useWorkflowsStore } from '@/stores/workflows.store';

const workflowsStore = useWorkflowsStore();

// Access workflow data
workflowsStore.allNodes
workflowsStore.allConnections
workflowsStore.workflowName

// Modify workflow
workflowsStore.addNode(node);
workflowsStore.removeNode(nodeId);
workflowsStore.updateNodePosition(nodeId, position);
workflowsStore.addConnection(connection);
```

### UI Store

```typescript
import { useUIStore } from '@/stores/ui.store';

const uiStore = useUIStore();

// Selection
uiStore.setSelectedNodes(['node1', 'node2']);
uiStore.clearSelection();

// Modals
uiStore.openModal('settings');
uiStore.closeModal();
```

### NDV Store

```typescript
import { useNDVStore } from '@/stores/ndv.store';

const ndvStore = useNDVStore();

// Open node configuration
ndvStore.openNDV(nodeId);
ndvStore.closeNDV();

// Current node
ndvStore.activeNodeId
```

## 🔧 Key Features

### 1. Canvas Controls

- **Zoom In/Out**: Mouse wheel or controls
- **Pan**: Drag canvas or middle-click
- **Fit View**: Automatically fit all nodes
- **Minimap**: Overview navigation

### 2. Node Interaction

- **Single Click**: Select node
- **Double Click**: Open configuration
- **Drag**: Move node
- **Hover**: Show toolbar (configure, execute, delete)

### 3. Connections

- **Create**: Drag from output handle to input handle
- **Delete**: Click on connection line
- **Animated**: Running connections can be animated

### 4. Node States

- **Normal**: Default state
- **Selected**: Blue border with shadow
- **Running**: Orange border + pulse animation
- **Success**: Green border
- **Error**: Red border + red background
- **Disabled**: Grayed out

## 🎯 Next Steps

### Immediate Enhancements

1. **Node Creator Panel**
   - Searchable node library
   - Drag & drop new nodes
   - Categories and filters

2. **Enhanced NDV (Node Details View)**
   - Input/output data panels
   - Parameter editors
   - Execution data display

3. **Workflow Execution**
   - Connect to backend API
   - Real-time execution updates
   - Result visualization

4. **Keyboard Shortcuts**
   - Delete (Del/Backspace)
   - Copy/Paste (Ctrl+C/V)
   - Undo/Redo (Ctrl+Z/Y)
   - Save (Ctrl+S)

### Advanced Features

1. **Node Types**
   - Trigger nodes
   - Action nodes
   - Transform nodes
   - Conditional nodes
   - Sticky notes

2. **Connection Types**
   - Main connections
   - Error connections
   - Conditional branches
   - AI tool connections

3. **Workflow Features**
   - Variables & expressions
   - Execution history
   - Version control
   - Workflow templates

4. **Collaboration**
   - Multi-user editing
   - Comments & annotations
   - Share workflows

## 🎨 Customization

### Adding New Node Types

1. Create node type definition:
```typescript
// types/nodeTypes.ts
export const MY_NODE_TYPE: INodeTypeDescription = {
  displayName: 'My Node',
  name: 'myNode',
  icon: '🎯',
  group: ['transform'],
  description: 'Does something cool',
  version: 1,
  defaults: { name: 'My Node', color: '#0088cc' },
  inputs: ['main'],
  outputs: ['main'],
  properties: [
    // Parameter definitions
  ],
};
```

2. Register in node registry
3. Use in workflow

### Customizing Theme

Modify `design-system/primitives.scss` for colors:

```scss
--color--blue-600: hsl(210, 85%, 45%); // Change primary color
```

Or override tokens in `design-system/tokens.scss`:

```scss
--color--primary: var(--color--blue-600); // Use different primitive
```

## 📚 Resources

- [Vue 3 Documentation](https://vuejs.org/)
- [Vue Flow Documentation](https://vueflow.dev/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [VueUse Utilities](https://vueuse.org/)

## 🐛 Troubleshooting

### Canvas not rendering

1. Check Vue Flow styles are imported in `main.ts`
2. Verify nodes have position data
3. Check browser console for errors

### Connections not working

1. Ensure nodes have correct input/output definitions
2. Verify handle IDs match connection data
3. Check connection permissions (readOnly mode)

### Performance issues

1. Throttle viewport updates
2. Implement virtual rendering for large workflows
3. Optimize node re-renders with `shallowRef`

## ✅ Implementation Complete

All core features are implemented and ready for development:

✅ Vue 3 + TypeScript setup
✅ Design system with CSS tokens
✅ Workflow canvas with Vue Flow
✅ Node components with states
✅ Pinia stores for state management
✅ Router configuration
✅ Node configuration modal (NDV)
✅ Workflows list view

**Ready to start building!** 🚀
