import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';

// Import layout components
import Layout from './components/Layout/Layout';

// Import pages
import Dashboard from './pages/Dashboard/Dashboard';
import WorkflowEditor from './pages/WorkflowEditor/WorkflowEditor';
import WorkflowList from './pages/Workflows/WorkflowList';
import ExecutionHistory from './pages/Executions/ExecutionHistory';
import Settings from './pages/Settings/Settings';
import Credentials from './pages/Credentials/Credentials';

function App() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workflows" element={<WorkflowList />} />
          <Route path="/workflows/new" element={<WorkflowEditor />} />
          <Route path="/workflows/:id/edit" element={<WorkflowEditor />} />
          <Route path="/executions" element={<ExecutionHistory />} />
          <Route path="/credentials" element={<Credentials />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Box>
  );
}

export default App;