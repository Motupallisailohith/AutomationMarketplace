import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import axios from 'axios';

interface WorkflowStats {
  total: number;
  active: number;
  inactive: number;
}

interface ExecutionStats {
  today: number;
  thisWeek: number;
  successRate: number;
  trend: number;
}

interface RecentExecution {
  id: string;
  workflowName: string;
  status: 'success' | 'error' | 'running';
  startedAt: string;
  duration?: number;
}

interface RecentWorkflow {
  id: string;
  name: string;
  updatedAt: string;
  active: boolean;
}

export const ModernDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [workflowStats, setWorkflowStats] = useState<WorkflowStats>({
    total: 0,
    active: 0,
    inactive: 0,
  });
  const [executionStats, setExecutionStats] = useState<ExecutionStats>({
    today: 0,
    thisWeek: 0,
    successRate: 0,
    trend: 0,
  });
  const [recentExecutions, setRecentExecutions] = useState<RecentExecution[]>([]);
  const [recentWorkflows, setRecentWorkflows] = useState<RecentWorkflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch workflows
      const workflowsRes = await axios.get('/api/workflows');
      const workflows = workflowsRes.data;
      
      setWorkflowStats({
        total: workflows.length,
        active: workflows.filter((w: any) => w.active).length,
        inactive: workflows.filter((w: any) => !w.active).length,
      });

      setRecentWorkflows(
        workflows
          .sort((a: any, b: any) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
          .slice(0, 5)
      );

      // TODO: Fetch execution stats from API when available
      setExecutionStats({
        today: 0,
        thisWeek: 0,
        successRate: 0,
        trend: 0,
      });

      setRecentExecutions([]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-success bg-success-tint4';
      case 'error':
        return 'text-danger bg-danger-tint4';
      case 'running':
        return 'text-info bg-info-tint3';
      default:
        return 'text-text bg-background-light1';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <XCircle size={20} />;
      case 'running':
        return <Play size={20} />;
      default:
        return <Clock size={20} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full animate-fade-in">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-foreground border-t-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-shade1 mb-2">Dashboard</h1>
          <p className="text-text">Welcome back! Here's an overview of your workflows.</p>
        </div>
        <button
          onClick={() => navigate('/workflow/new')}
          className="flex items-center space-x-2 px-6 py-3 bg-primary text-text-tint3 rounded-lg font-medium 
                   hover:bg-primary-shade hover:shadow transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={20} />
          <span>Create Workflow</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Workflows */}
        <div className="bg-background-light3 rounded-lg shadow-light border border-foreground p-6 hover:shadow transition-all duration-200 animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-secondary-tint2 rounded-lg flex items-center justify-center">
              <BarChart3 size={24} className="text-secondary" />
            </div>
          </div>
          <h3 className="text-text text-sm font-medium mb-1">Total Workflows</h3>
          <p className="text-3xl font-bold text-text-shade1">{workflowStats.total}</p>
          <div className="mt-2 flex items-center space-x-2 text-sm">
            <span className="text-success font-medium">{workflowStats.active} active</span>
            <span className="text-text-tint1">•</span>
            <span className="text-text-tint1">{workflowStats.inactive} inactive</span>
          </div>
        </div>

        {/* Active Workflows */}
        <div className="bg-background-light3 rounded-lg shadow-light border border-foreground p-6 hover:shadow transition-all duration-200 animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-success-tint4 rounded-lg flex items-center justify-center">
              <CheckCircle size={24} className="text-success" />
            </div>
          </div>
          <h3 className="text-text text-sm font-medium mb-1">Active Workflows</h3>
          <p className="text-3xl font-bold text-text-shade1">{workflowStats.active}</p>
          <div className="mt-2 flex items-center space-x-1 text-sm">
            <TrendingUp size={16} className="text-success" />
            <span className="text-success font-medium">
              {workflowStats.total > 0 ? Math.round((workflowStats.active / workflowStats.total) * 100) : 0}%
            </span>
            <span className="text-text-tint1">of total</span>
          </div>
        </div>

        {/* Executions Today */}
        <div className="bg-background-light3 rounded-lg shadow-light border border-foreground p-6 hover:shadow transition-all duration-200 animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-info-tint3 rounded-lg flex items-center justify-center">
              <Play size={24} className="text-info" />
            </div>
          </div>
          <h3 className="text-text text-sm font-medium mb-1">Executions Today</h3>
          <p className="text-3xl font-bold text-text-shade1">{executionStats.today}</p>
          <div className="mt-2 flex items-center space-x-1 text-sm">
            <span className="text-text-tint1">{executionStats.thisWeek} this week</span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-background-light3 rounded-lg shadow-light border border-foreground p-6 hover:shadow transition-all duration-200 animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-success-tint3 rounded-lg flex items-center justify-center">
              <CheckCircle size={24} className="text-success" />
            </div>
          </div>
          <h3 className="text-text text-sm font-medium mb-1">Success Rate</h3>
          <p className="text-3xl font-bold text-text-shade1">
            {executionStats.successRate.toFixed(1)}%
          </p>
          <div className="mt-2 flex items-center space-x-1 text-sm">
            {executionStats.trend >= 0 ? (
              <>
                <TrendingUp size={16} className="text-success" />
                <span className="text-success font-medium">+{executionStats.trend}%</span>
              </>
            ) : (
              <>
                <TrendingDown size={16} className="text-danger" />
                <span className="text-danger font-medium">{executionStats.trend}%</span>
              </>
            )}
            <span className="text-text-tint1">vs last week</span>
          </div>
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Workflows */}
        <div className="bg-background-light3 rounded-lg shadow-light border border-foreground animate-slide-in">
          <div className="p-6 border-b border-foreground">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-shade1">Recent Workflows</h2>
              <button
                onClick={() => navigate('/workflows')}
                className="text-sm text-primary hover:text-primary-shade font-medium transition-colors duration-200"
              >
                View all →
              </button>
            </div>
          </div>
          <div className="divide-y divide-foreground">
            {recentWorkflows.length === 0 ? (
              <div className="p-12 text-center">
                <BarChart3 size={48} className="text-foreground-shade1 mx-auto mb-4" />
                <p className="text-text mb-4">No workflows yet</p>
                <button
                  onClick={() => navigate('/workflow/new')}
                  className="px-4 py-2 bg-primary text-text-tint3 rounded text-sm font-medium hover:bg-primary-shade 
                           transition-all duration-200 transform hover:scale-105"
                >
                  Create your first workflow
                </button>
              </div>
            ) : (
              recentWorkflows.map((workflow) => (
                <div
                  key={workflow.id}
                  onClick={() => navigate(`/workflow/${workflow.id}`)}
                  className="p-4 hover:bg-background-light1 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-text-shade1 truncate">
                        {workflow.name}
                      </h3>
                      <p className="text-xs text-text-tint1 mt-1">
                        Updated {formatDate(workflow.updatedAt)}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          workflow.active
                            ? 'bg-success-tint4 text-success'
                            : 'bg-background-light1 text-text'
                        }`}
                      >
                        {workflow.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Executions */}
        <div className="bg-background-light3 rounded-lg shadow-light border border-foreground animate-slide-in" style={{ animationDelay: '0.1s' }}>
          <div className="p-6 border-b border-foreground">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-shade1">Recent Executions</h2>
              <button
                onClick={() => navigate('/executions')}
                className="text-sm text-primary hover:text-primary-shade font-medium transition-colors duration-200"
              >
                View all →
              </button>
            </div>
          </div>
          <div className="divide-y divide-foreground">
            {recentExecutions.length === 0 ? (
              <div className="p-12 text-center">
                <Play size={48} className="text-foreground-shade1 mx-auto mb-4" />
                <p className="text-text mb-2">No executions yet</p>
                <p className="text-sm text-text-tint1">
                  Activate a workflow to see executions here
                </p>
              </div>
            ) : (
              recentExecutions.map((execution) => (
                <div
                  key={execution.id}
                  onClick={() => navigate(`/execution/${execution.id}`)}
                  className="p-4 hover:bg-background-light1 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 p-2 rounded ${getStatusColor(execution.status)}`}>
                      {getStatusIcon(execution.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-text-shade1 truncate">
                        {execution.workflowName}
                      </h3>
                      <p className="text-xs text-text-tint1 mt-1">
                        {formatDate(execution.startedAt)}
                        {execution.duration && ` • ${execution.duration}ms`}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/templates')}
            className="flex items-center space-x-3 p-4 bg-white rounded-lg hover:shadow-md transition-all text-left"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 text-sm">Browse Templates</h3>
              <p className="text-xs text-gray-500 mt-0.5">Start from pre-built workflows</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/credentials')}
            className="flex items-center space-x-3 p-4 bg-white rounded-lg hover:shadow-md transition-all text-left"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Plus size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 text-sm">Add Credentials</h3>
              <p className="text-xs text-gray-500 mt-0.5">Connect to external services</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/settings')}
            className="flex items-center space-x-3 p-4 bg-white rounded-lg hover:shadow-md transition-all text-left"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Play size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 text-sm">View Settings</h3>
              <p className="text-xs text-gray-500 mt-0.5">Configure your workspace</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
