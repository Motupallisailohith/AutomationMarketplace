import { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  IconButton,
  LinearProgress,
  Avatar,
  AvatarGroup,
  Button,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  PlayArrow,
  CheckCircle,
  Error,
  Schedule,
  MoreVert,
  Add,
  ArrowForward,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  // Mock data for charts
  const executionData = [
    { name: 'Mon', executions: 45, successful: 42, failed: 3 },
    { name: 'Tue', executions: 52, successful: 48, failed: 4 },
    { name: 'Wed', executions: 48, successful: 46, failed: 2 },
    { name: 'Thu', executions: 61, successful: 58, failed: 3 },
    { name: 'Fri', executions: 55, successful: 51, failed: 4 },
    { name: 'Sat', executions: 38, successful: 36, failed: 2 },
    { name: 'Sun', executions: 42, successful: 40, failed: 2 },
  ];

  const workflowTypeData = [
    { name: 'HTTP Requests', value: 35, color: '#6366F1' },
    { name: 'Data Processing', value: 28, color: '#EC4899' },
    { name: 'ML Inference', value: 20, color: '#10B981' },
    { name: 'Notifications', value: 17, color: '#F59E0B' },
  ];

  const recentWorkflows = [
    {
      id: '1',
      name: 'Customer Data Sync',
      status: 'active',
      lastRun: '2 hours ago',
      successRate: 98,
      executions: 1247,
    },
    {
      id: '2',
      name: 'Email Campaign Automation',
      status: 'active',
      lastRun: '5 hours ago',
      successRate: 95,
      executions: 856,
    },
    {
      id: '3',
      name: 'Invoice Processing',
      status: 'paused',
      lastRun: '1 day ago',
      successRate: 92,
      executions: 423,
    },
    {
      id: '4',
      name: 'Social Media Analytics',
      status: 'active',
      lastRun: '30 minutes ago',
      successRate: 99,
      executions: 2341,
    },
  ];

  const recentExecutions = [
    {
      id: '1',
      workflow: 'Customer Data Sync',
      status: 'completed',
      duration: '2.3s',
      time: '5 min ago',
    },
    {
      id: '2',
      workflow: 'Email Campaign Automation',
      status: 'completed',
      duration: '1.8s',
      time: '12 min ago',
    },
    {
      id: '3',
      workflow: 'Social Media Analytics',
      status: 'failed',
      duration: '0.5s',
      time: '18 min ago',
    },
    {
      id: '4',
      workflow: 'Invoice Processing',
      status: 'running',
      duration: '4.2s',
      time: '2 min ago',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'info';
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle fontSize="small" />;
      case 'failed':
        return <Error fontSize="small" />;
      case 'running':
        return <PlayArrow fontSize="small" />;
      default:
        return <Schedule fontSize="small" />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight={700}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Welcome back! Here's what's happening with your workflows.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/workflow/new')}
          sx={{
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.4)',
          }}
        >
          Create Workflow
        </Button>
      </Stack>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ position: 'relative', overflow: 'visible' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Workflows
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    24
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" mt={1}>
                    <TrendingUp fontSize="small" color="success" />
                    <Typography variant="caption" color="success.main" fontWeight={600}>
                      +12%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      vs last month
                    </Typography>
                  </Stack>
                </Box>
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
                  <PlayArrow />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Executions Today
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    341
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" mt={1}>
                    <TrendingUp fontSize="small" color="success" />
                    <Typography variant="caption" color="success.main" fontWeight={600}>
                      +8%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      vs yesterday
                    </Typography>
                  </Stack>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <CheckCircle />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Success Rate
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    96.8%
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" mt={1}>
                    <TrendingDown fontSize="small" color="error" />
                    <Typography variant="caption" color="error.main" fontWeight={600}>
                      -2%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      vs last week
                    </Typography>
                  </Stack>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <TrendingUp />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Avg. Duration
                  </Typography>
                  <Typography variant="h4" fontWeight={700}>
                    2.4s
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" mt={1}>
                    <TrendingUp fontSize="small" color="success" />
                    <Typography variant="caption" color="success.main" fontWeight={600}>
                      15% faster
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      vs last week
                    </Typography>
                  </Stack>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <Schedule />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    Execution Trends
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last 7 days performance
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Chip label="Successful" size="small" color="success" variant="outlined" />
                  <Chip label="Failed" size="small" color="error" variant="outlined" />
                </Stack>
              </Stack>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={executionData}>
                  <defs>
                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="successful"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSuccess)"
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFailed)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Workflow Types
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Distribution by category
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={workflowTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {workflowTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <Stack spacing={1} mt={2}>
                {workflowTypeData.map((item) => (
                  <Stack
                    key={item.name}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: 1,
                          backgroundColor: item.color,
                        }}
                      />
                      <Typography variant="body2">{item.name}</Typography>
                    </Stack>
                    <Typography variant="body2" fontWeight={600}>
                      {item.value}%
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity Section */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight={600}>
                  Active Workflows
                </Typography>
                <Button
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/workflows')}
                  size="small"
                >
                  View All
                </Button>
              </Stack>
              <Stack spacing={2}>
                {recentWorkflows.map((workflow) => (
                  <Box
                    key={workflow.id}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: 'grey.50',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'grey.100',
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box flex={1}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {workflow.name}
                          </Typography>
                          <Chip
                            label={workflow.status}
                            size="small"
                            color={getStatusColor(workflow.status) as any}
                            sx={{ height: 20 }}
                          />
                        </Stack>
                        <Stack direction="row" spacing={3} mb={1}>
                          <Typography variant="caption" color="text.secondary">
                            Last run: {workflow.lastRun}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {workflow.executions} executions
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <LinearProgress
                            variant="determinate"
                            value={workflow.successRate}
                            sx={{ flex: 1, height: 6, borderRadius: 1 }}
                            color="success"
                          />
                          <Typography variant="caption" fontWeight={600}>
                            {workflow.successRate}%
                          </Typography>
                        </Stack>
                      </Box>
                      <IconButton size="small">
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight={600}>
                  Recent Executions
                </Typography>
                <Button
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/executions')}
                  size="small"
                >
                  View All
                </Button>
              </Stack>
              <Stack spacing={2}>
                {recentExecutions.map((execution) => (
                  <Stack
                    key={execution.id}
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: 'grey.50',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'grey.100',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        backgroundColor: `${getStatusColor(execution.status)}.main`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      {getStatusIcon(execution.status)}
                    </Box>
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight={600} gutterBottom>
                        {execution.workflow}
                      </Typography>
                      <Stack direction="row" spacing={2}>
                        <Typography variant="caption" color="text.secondary">
                          {execution.duration}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {execution.time}
                        </Typography>
                      </Stack>
                    </Box>
                    <Chip
                      label={execution.status}
                      size="small"
                      color={getStatusColor(execution.status) as any}
                      sx={{ height: 24 }}
                    />
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;