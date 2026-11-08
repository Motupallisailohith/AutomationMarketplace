import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Divider,
  AppBar,
  Toolbar,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Settings as SettingsIcon,
  Code as CodeIcon,
  PlayArrow as PlayIcon,
  BugReport as BugReportIcon,
} from '@mui/icons-material';
import type { Node } from 'reactflow';
import type { INodeTypeDescription } from '@automation-marketplace/nodes';
import { useAppSelector } from '@/app/stores/hooks';
import NodeParametersPanel from './NodeParametersPanel';
import NodeSettingsPanel from './NodeSettingsPanel';
import NodeOutputPanel from './NodeOutputPanel';

interface NodeDetailViewProps {
  open: boolean;
  selectedNode: Node | null;
  onClose: () => void;
  onNodeUpdate: (nodeId: string, updates: Partial<Node>) => void;
  onExecuteNode?: (nodeId: string) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ndv-tabpanel-${index}`}
      aria-labelledby={`ndv-tab-${index}`}
      style={{ height: '100%', overflow: 'auto' }}
      {...other}
    >
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </div>
  );
}

const NodeDetailView: React.FC<NodeDetailViewProps> = ({
  open,
  selectedNode,
  onClose,
  onNodeUpdate,
  onExecuteNode,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const { nodeTypes } = useAppSelector((state) => state.nodeTypes);
  const [nodeTypeDescription, setNodeTypeDescription] = useState<INodeTypeDescription | null>(null);

  useEffect(() => {
    if (selectedNode && nodeTypes.length > 0) {
      // Find node type description with fuzzy matching
      let existingType = nodeTypes.find(nt => nt.name === selectedNode.type);
      
      if (!existingType) {
        existingType = nodeTypes.find(nt => 
          nt.name.toLowerCase().includes(selectedNode.type.toLowerCase()) ||
          nt.displayName.toLowerCase().includes(selectedNode.type.toLowerCase())
        );
      }
      
      setNodeTypeDescription(existingType || null);
    }
  }, [selectedNode, nodeTypes]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleExecuteNode = () => {
    if (selectedNode && onExecuteNode) {
      onExecuteNode(selectedNode.id);
    }
  };

  if (!selectedNode || !nodeTypeDescription) {
    return null;
  }

  const nodeStatus = selectedNode.data?.status || 'idle';
  const statusColors = {
    idle: 'default',
    running: 'info',
    success: 'success',
    error: 'error',
  } as const;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: '600px', md: '700px' },
          boxShadow: '-4px 0 16px rgba(0,0,0,0.1)',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <AppBar position="static" color="default" elevation={0}>
          <Toolbar sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'primary.main',
                  color: 'white',
                  mr: 2,
                }}
              >
                {nodeTypeDescription.icon === 'fa:globe' ? '🌐' : 
                 nodeTypeDescription.icon === 'fa:code' ? '💻' : '⚙️'}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {selectedNode.data?.label || nodeTypeDescription.displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {nodeTypeDescription.description}
                </Typography>
              </Box>
              <Chip
                label={nodeStatus}
                color={statusColors[nodeStatus as keyof typeof statusColors]}
                size="small"
                sx={{ mr: 2 }}
              />
            </Box>
            <IconButton onClick={onClose} edge="end">
              <CloseIcon />
            </IconButton>
          </Toolbar>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              minHeight: 48,
            }}
          >
            <Tab label="Parameters" icon={<SettingsIcon />} iconPosition="start" />
            <Tab label="Settings" icon={<CodeIcon />} iconPosition="start" />
            <Tab label="Output" icon={<BugReportIcon />} iconPosition="start" />
          </Tabs>
        </AppBar>

        {/* Tab Content */}
        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <TabPanel value={activeTab} index={0}>
            <NodeParametersPanel
              selectedNode={selectedNode}
              nodeTypeDescription={nodeTypeDescription}
              onNodeUpdate={onNodeUpdate}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <NodeSettingsPanel
              selectedNode={selectedNode}
              nodeTypeDescription={nodeTypeDescription}
              onNodeUpdate={onNodeUpdate}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <NodeOutputPanel
              selectedNode={selectedNode}
              nodeTypeDescription={nodeTypeDescription}
            />
          </TabPanel>
        </Box>

        {/* Footer Actions */}
        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            gap: 1,
            justifyContent: 'flex-end',
          }}
        >
          <Tooltip title="Test this node with current parameters">
            <IconButton
              color="primary"
              onClick={handleExecuteNode}
              disabled={nodeStatus === 'running'}
            >
              <PlayIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Drawer>
  );
};

export default NodeDetailView;
