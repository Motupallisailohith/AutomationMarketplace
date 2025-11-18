import { useState } from 'react';
import { useAppSelector } from '@store/hooks';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Box,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  Grid,
  Stack,
  TextField,
  InputAdornment,
  Tab,
  Tabs,
  Avatar,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  MoreVert,
  Delete,
  Edit,
  ContentCopy,
  Add,
  Search,
  FilterList,
  AccountTree,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { Workflow, WorkflowExecution } from '../types/workflow';

interface WorkflowListProps {
  workflows: Workflow[];
  onEdit: (workflow: Workflow) => void;
  onDelete: (workflowId: string) => void;
  onDuplicate: (workflow: Workflow) => void;
  onRun: (workflowId: string) => void;
  onStop: (executionId: string) => void;
}

const WorkflowList = ({
  workflows,
  onEdit,
  onDelete,
  onDuplicate,
  onRun,
  onStop,
}: WorkflowListProps) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  
  const executions = useAppSelector(state => state.execution?.executions || []);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, workflowId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedWorkflow(workflowId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorkflow(null);
  };

  const getWorkflowStatus = (workflowId: string) => {
    const workflowExecutions = executions.filter(exec => exec.workflowId === workflowId);
    if (workflowExecutions.length === 0) return 'idle';
    
    const latestExecution = workflowExecutions.sort((a, b) => 
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )[0];
    
    return latestExecution.status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'primary';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getRunningExecution = (workflowId: string): WorkflowExecution | undefined => {
    return executions.find(exec => 
      exec.workflowId === workflowId && exec.status === 'running'
    );
  };

  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (workflow.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    if (selectedTab === 0) return matchesSearch;
    if (selectedTab === 1) return matchesSearch && workflow.active;
    if (selectedTab === 2) return matchesSearch && !workflow.active;
    
    return matchesSearch;
  });

  const activeCount = workflows.filter(w => w.active).length;
  const inactiveCount = workflows.filter(w => !w.active).length;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight={700}>
            Workflows
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and monitor your automation workflows
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/workflows/new')}
          sx={{
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.4)',
          }}
        >
          Create Workflow
        </Button>
      </Stack>

      {/* Search and Filters */}
      <Stack direction="row" spacing={2} mb={3}>
        <TextField
          placeholder="Search workflows..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1, maxWidth: 500 }}
        />
        <Button variant="outlined" startIcon={<FilterList />}>
          Filters
        </Button>
      </Stack>

      {/* Tabs */}
      <Tabs
        value={selectedTab}
        onChange={(_, newValue) => setSelectedTab(newValue)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={`All (${workflows.length})`} />
        <Tab label={`Active (${activeCount})`} />
        <Tab label={`Inactive (${inactiveCount})`} />
      </Tabs>

      {/* Workflows Grid */}
      {filteredWorkflows.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No workflows found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {searchQuery
              ? 'Try adjusting your search criteria'
              : 'Get started by creating your first workflow'}
          </Typography>
          {!searchQuery && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/workflows/new')}
              sx={{
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              }}
            >
              Create Workflow
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
        {filteredWorkflows.map((workflow) => {
          const status = getWorkflowStatus(workflow.id);
          const runningExecution = getRunningExecution(workflow.id);
          
          return (
            <Grid item xs={12} md={6} lg={4} key={workflow.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  },
                }}
                onClick={() => navigate(`/workflows/${workflow.id}/edit`)}
              >
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Header */}
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      <AccountTree />
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMenuClick(e, workflow.id);
                      }}
                    >
                      <MoreVert />
                    </IconButton>
                  </Stack>

                  {/* Title and Description */}
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {workflow.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      minHeight: 40,
                    }}
                  >
                    {workflow.description || 'No description'}
                  </Typography>

                  {/* Status */}
                  <Stack direction="row" spacing={1} mb={2}>
                    <Chip
                      label={status}
                      color={getStatusColor(status) as any}
                      size="small"
                    />
                    <Chip
                      label={workflow.active ? 'Active' : 'Inactive'}
                      color={workflow.active ? 'success' : 'default'}
                      size="small"
                    />
                  </Stack>

                  {/* Running Execution */}
                  {runningExecution && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" display="block" mb={0.5}>
                        Running: {runningExecution.id.slice(0, 8)}...
                      </Typography>
                      <LinearProgress />
                    </Box>
                  )}

                  {/* Stats */}
                  <Stack spacing={1.5} mb={2}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        {Object.keys(workflow.nodes || {}).length} nodes
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {workflow.edges?.length || 0} connections
                      </Typography>
                    </Stack>
                    
                    <Typography variant="caption" color="text.secondary">
                      Updated: {new Date(workflow.updatedAt).toLocaleDateString()}
                    </Typography>
                  </Stack>

                  {/* Footer */}
                  <Stack direction="row" spacing={1} alignItems="center" mt="auto" mb={2}>
                    <Avatar
                      sx={{
                        width: 24,
                        height: 24,
                        fontSize: '0.75rem',
                        background: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)',
                      }}
                    >
                      {workflow.createdBy?.split(' ').map(n => n[0]).join('') || 'U'}
                    </Avatar>
                    <Typography variant="caption" color="text.secondary">
                      {workflow.createdBy || 'Unknown'}
                    </Typography>
                  </Stack>

                  {/* Action Button */}
                  {status === 'running' && runningExecution ? (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Stop />}
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation();
                        onStop(runningExecution.id);
                      }}
                    >
                      Stop
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      startIcon={<PlayArrow />}
                      fullWidth
                      onClick={(e) => {
                        e.stopPropagation();
                        onRun(workflow.id);
                      }}
                      disabled={!workflow.active}
                      sx={{
                        background: workflow.active 
                          ? 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)'
                          : undefined,
                      }}
                    >
                      Run
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
        </Grid>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          const workflow = workflows.find(w => w.id === selectedWorkflow);
          if (workflow) onEdit(workflow);
          handleMenuClose();
        }}>
          <Edit sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => {
          const workflow = workflows.find(w => w.id === selectedWorkflow);
          if (workflow) onDuplicate(workflow);
          handleMenuClose();
        }}>
          <ContentCopy sx={{ mr: 1 }} />
          Duplicate
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedWorkflow) onDelete(selectedWorkflow);
          handleMenuClose();
        }}>
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default WorkflowList;