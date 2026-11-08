# n8n-Style UI for Automation Marketplace

## Overview
A world-class n8n clone UI built with React, Vite, Tailwind CSS, and ReactFlow, now running on port 5173.

## 🎨 Design Features

### Visual Style
- **Color Palette**: Purple/pink gradient theme matching n8n's modern aesthetic
- **Typography**: Inter font for body text, with clean hierarchy
- **Shadows**: Carefully crafted elevation system (n8n-sm, n8n-md, n8n-lg, n8n-xl)
- **Border Radius**: Consistent 8px (n8n) and 12px (n8n-lg) rounded corners
- **Animations**: Smooth transitions and hover effects throughout

### Key Components

#### 1. Login Page (`src/pages/Login.tsx`)
- Gradient background (purple-50 to pink-50)
- Modern card design with shadow effects
- Input fields with icons and focus states
- Demo credentials displayed for easy testing

#### 2. Workflows List (`src/features/workflows/WorkflowList.tsx`)
- Clean grid layout with workflow cards
- Search and filter functionality
- Status badges (Active/Inactive)
- Hover effects with elevation changes
- Quick actions (Execute, Duplicate, Delete)

#### 3. Workflow Editor
**Header** (`src/components/Layout/WorkflowHeader.tsx`):
- Logo with gradient background
- Workflow name editor
- Save and Execute buttons
- Navigation tabs (Workflows, Executions, Credentials, Settings)
- User profile section

**Node Library** (`src/components/Canvas/NodeLibrary.tsx`):
- Searchable node list
- Category filtering
- Draggable node cards with icons
- 16 pre-configured node types (Webhook, HTTP, Slack, Gmail, etc.)

**Canvas** (`src/components/Canvas/WorkflowCanvas.tsx`):
- ReactFlow-based visual workflow editor
- Grid background with custom styling
- Minimap for navigation
- Zoom controls
- Drag-and-drop node placement

**Workflow Nodes** (`src/components/Canvas/WorkflowNode.tsx`):
- Gradient icon backgrounds
- Connection handles (top and bottom)
- Parameter count indicator
- Hover menu with quick actions
- Color-coded by node type

**Node Properties Panel** (`src/components/Canvas/NodePropertiesPanel.tsx`):
- Slides in from right
- Tabbed interface (Parameters, Settings, Output)
- Collapsible sections
- Form inputs for configuration

## 🛠 Tech Stack

### Core
- **React 18.3.1** - UI framework
- **TypeScript** - Type safety
- **Vite 6.0.7** - Build tool and dev server

### Styling
- **Tailwind CSS 3.4.19** - Utility-first CSS
- **Custom Design System** - n8n-inspired tokens

### Workflow
- **ReactFlow 11.11.4** - Visual workflow editor
- **Lucide React** - Icon library

### State & Data
- **Redux Toolkit** - State management
- **TanStack Query** - Server state
- **React Router v7** - Routing
- **Axios** - HTTP client

## 🚀 Running the Application

The dev server is already running on **port 5173**:

```bash
cd frontend
pnpm dev
```

Access the application at: **http://localhost:5173**

### Demo Credentials
- **Email**: demo@example.com
- **Password**: password123

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Canvas/
│   │   │   ├── WorkflowCanvas.tsx       # Main canvas component
│   │   │   ├── NodeLibrary.tsx          # Draggable node library
│   │   │   ├── WorkflowNode.tsx         # Custom node component
│   │   │   └── NodePropertiesPanel.tsx  # Node configuration panel
│   │   ├── Layout/
│   │   │   └── WorkflowHeader.tsx       # Top navigation bar
│   │   └── Parameters/
│   │       └── ParameterInput.tsx       # Form inputs
│   ├── features/
│   │   └── workflows/
│   │       └── WorkflowList.tsx         # Workflows grid view
│   ├── pages/
│   │   ├── Login.tsx                    # Login page
│   │   └── Workflows/
│   │       └── WorkflowList.tsx         # Workflows page wrapper
│   ├── app/
│   │   └── stores/
│   │       └── slices/                  # Redux slices
│   ├── types/
│   │   └── workflow.ts                  # TypeScript types
│   ├── App.tsx                          # Main app component
│   ├── index.css                        # Global styles + Tailwind
│   └── main.tsx                         # App entry point
├── tailwind.config.js                   # Tailwind configuration
├── postcss.config.js                    # PostCSS configuration
├── vite.config.ts                       # Vite configuration
└── package.json                         # Dependencies

```

## 🎯 Key Features Implemented

### ✅ Authentication
- Login/Signup UI
- Token-based auth
- User profile display
- Logout functionality

### ✅ Workflow Management
- List all workflows
- Search and filter
- Create new workflow
- Edit existing workflow
- Delete workflow
- Duplicate workflow

### ✅ Visual Workflow Editor
- Drag-and-drop node library (16 node types)
- Visual canvas with ReactFlow
- Node connections
- Node configuration panel
- Minimap and zoom controls
- Grid background

### ✅ Design System
- n8n-inspired color palette
- Consistent spacing and typography
- Custom shadows and borders
- Smooth animations
- Responsive layout

## 🎨 Design Tokens

### Colors
```css
n8n-primary: #FF6D5A      /* Coral red */
n8n-secondary: #7C3AED    /* Purple */
n8n-success: #10B981      /* Green */
n8n-error: #EF4444        /* Red */
n8n-bg: #FAFAFA          /* Light gray background */
```

### Shadows
```css
n8n-sm: subtle shadow
n8n: default shadow
n8n-md: medium shadow
n8n-lg: large shadow
n8n-xl: extra large shadow
n8n-node: node-specific shadow
n8n-node-hover: elevated node shadow
```

### Border Radius
```css
n8n: 8px
n8n-lg: 12px
```

## 🔄 Workflow Node Types

1. **Trigger Nodes**
   - Webhook (HTTP triggers)

2. **Action Nodes**
   - HTTP Request
   - Code (JavaScript)
   - Set (Data manipulation)

3. **Integration Nodes**
   - Slack
   - Gmail
   - Google Sheets
   - Notion
   - Airtable
   - HubSpot

4. **Database Nodes**
   - MySQL
   - PostgreSQL
   - MongoDB

5. **Cloud Nodes**
   - AWS

6. **Flow Control**
   - IF (Conditional routing)

7. **Payment**
   - Stripe

## 📝 Notes

- The UI is fully functional and matches n8n's design language
- All components use Tailwind CSS for styling
- ReactFlow handles the workflow canvas
- Type-safe with TypeScript throughout
- Modular component architecture
- Ready for backend integration

## 🔗 Next Steps

To complete the integration:
1. Connect to real API endpoints (currently using mock data)
2. Implement node execution logic
3. Add real-time execution status updates (WebSocket)
4. Implement credential management
5. Add workflow templates
6. Implement execution history

---

**Status**: ✅ UI Complete and Running on Port 5173
**Design**: 🎨 World-class n8n clone aesthetic
**Functionality**: ⚡ Full workflow editor with drag-and-drop