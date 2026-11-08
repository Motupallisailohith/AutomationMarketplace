import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WorkflowCanvas } from './components/Canvas/WorkflowCanvas';
import { NodeLibrary } from './components/Canvas/NodeLibrary';
import { Login } from './pages/Login';
import { WorkflowHeader } from './components/Layout/WorkflowHeader';
import { Node, Edge } from 'reactflow';
import axios from 'axios';
import { researchProposalDemo } from './demo/researchProposalDemo';

interface SandboxExecution {
  id: string;
  status: 'running' | 'completed' | 'failed';
  completedSteps: string[];
  currentStep?: string;
}

// Configure axios defaults  
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Add auth token to requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showLibrary, setShowLibrary] = useState(true);

  // These states can be managed inside canvas now, but keeping for broader app awareness if needed
  const [workflowNodes, setWorkflowNodes] = useState<Node[]>(researchProposalDemo.nodes);
  const [workflowEdges, setWorkflowEdges] = useState<Edge[]>(researchProposalDemo.edges);
  const [executionState, setExecutionState] = useState<Record<string, 'running' | 'completed' | 'skipped'>>({});
  const [demoStatus, setDemoStatus] = useState('Ready — sandbox data only');

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('auth_user');
    console.log('🔐 App.tsx - Checking auth on mount');
    console.log('🎫 Token exists:', !!token);
    console.log('👤 User data from localStorage:', userData);

    if (token && userData) {
      const parsedUser = JSON.parse(userData);
      console.log('✅ User authenticated:', parsedUser);
      setIsAuthenticated(true);
      setUser(parsedUser);
    } else {
      console.log('❌ No authentication found');
    }
  }, []);

  const handleLoginSuccess = () => {
    const userData = localStorage.getItem('auth_user');
    console.log('✅ App.tsx - Login successful');
    console.log('👤 Setting user from localStorage:', userData);
    if (userData) {
      const parsedUser = JSON.parse(userData);
      console.log('📝 Parsed user data:', parsedUser);
      setUser(parsedUser);
    }
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setIsAuthenticated(false);
    setUser(null);
  };

  const handleSaveWorkflow = async (nodes: Node[], edges: Edge[]) => {
    localStorage.setItem('automation-marketplace:research-demo', JSON.stringify({
      name: researchProposalDemo.name, nodes, edges, savedAt: new Date().toISOString(),
    }));
    setWorkflowNodes(nodes);
    setWorkflowEdges(edges);
    setDemoStatus('Saved locally — ready for repeatable demo execution');
  };

  const handleDemoExecution = async () => {
    if (Object.values(executionState).includes('running')) return;
    setExecutionState({});
    setDemoStatus('Submitting workflow to the local sandbox executor…');
    try {
      const baseUrl = import.meta.env.VITE_DEMO_API_URL || 'http://localhost:3002/api/demo';
      const response = await fetch(`${baseUrl}/executions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowName: researchProposalDemo.name, steps: researchProposalDemo.executionOrder }),
      });
      if (!response.ok) throw new Error(`Executor returned ${response.status}`);
      const started = await response.json() as SandboxExecution;
      const poll = window.setInterval(async () => {
        try {
          const statusResponse = await fetch(`${baseUrl}/executions/${started.id}`);
          if (!statusResponse.ok) throw new Error(`Executor returned ${statusResponse.status}`);
          const execution = await statusResponse.json() as SandboxExecution;
          const next: Record<string, 'running' | 'completed' | 'skipped'> = {};
          execution.completedSteps.forEach((id) => { next[id] = 'completed'; });
          if (execution.status === 'running' && execution.currentStep && !next[execution.currentStep]) next[execution.currentStep] = 'running';
          setExecutionState(next);
          setDemoStatus(execution.status === 'completed'
            ? 'Completed by local executor — audit events retained in the execution service'
            : `Executing ${execution.currentStep?.replace('-', ' ') || 'workflow'} via local executor`);
          if (execution.status !== 'running') window.clearInterval(poll);
        } catch (error) {
          window.clearInterval(poll);
          setDemoStatus(`Execution status error: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      }, 300);
    } catch (error) {
      setDemoStatus(`Could not start execution: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  };

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        
        {/* Workflow editor - full screen without layout */}
        <Route 
          path="/workflow/new" 
          element={
            isAuthenticated ? (
              <div className="h-screen w-screen flex flex-col overflow-hidden bg-n8n-bg font-sans">
                {/* Header */}
                <WorkflowHeader 
                  onLogout={handleLogout}
                  onToggleLibrary={() => setShowLibrary(!showLibrary)}
                  showLibrary={showLibrary}
                  workflowName={researchProposalDemo.name}
                  onSave={() => handleSaveWorkflow(workflowNodes, workflowEdges)}
                  onExecute={handleDemoExecution}
                  executionLabel={demoStatus.startsWith('Executing') ? 'Running…' : 'Run sandbox'}
                />

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Sidebar (Node Library) */}
                  {showLibrary && <NodeLibrary />}

                  {/* Canvas */}
                  <div className="flex-1 relative">
                    <WorkflowCanvas
                      initialNodes={workflowNodes}
                      initialEdges={workflowEdges}
                      onSave={handleSaveWorkflow}
                      executionState={executionState}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/workflow/:id" 
          element={
            isAuthenticated ? (
              <div className="h-screen w-screen flex flex-col overflow-hidden bg-n8n-bg font-sans">
                {/* Header */}
                <WorkflowHeader 
                  onLogout={handleLogout}
                  onToggleLibrary={() => setShowLibrary(!showLibrary)}
                  showLibrary={showLibrary}
                  workflowName={researchProposalDemo.name}
                  onSave={() => handleSaveWorkflow(workflowNodes, workflowEdges)}
                  onExecute={handleDemoExecution}
                  executionLabel={demoStatus.startsWith('Executing') ? 'Running…' : 'Run sandbox'}
                />

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Sidebar (Node Library) */}
                  {showLibrary && <NodeLibrary />}

                  {/* Canvas */}
                  <div className="flex-1 relative">
                    <WorkflowCanvas
                      initialNodes={workflowNodes}
                      initialEdges={workflowEdges}
                      onSave={handleSaveWorkflow}
                      executionState={executionState}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        
        <Route path="*" element={<Navigate to={isAuthenticated ? "/workflow/new" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
