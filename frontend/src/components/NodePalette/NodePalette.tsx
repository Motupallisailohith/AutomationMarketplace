import React, { useState } from 'react';
import {
  Box,
  Fab,
  Drawer,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  Chip,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Http as HttpIcon,
  DataObject as DataIcon,
  Psychology as AIIcon,
  Notifications as NotificationIcon,
  Storage as DatabaseIcon,
  Cloud as CloudIcon,
  Code as CodeIcon,
  Transform as TransformIcon,
} from '@mui/icons-material';
import { WorkflowNode, NodeType } from '../../types/workflow';

interface NodePaletteProps {
  onAddNode: (nodeType: NodeType) => void;
  position?: { x: number; y: number };
}

interface NodeCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactElement;
  nodes: NodeDefinition[];
}

interface NodeDefinition {
  type: NodeType;
  name: string;
  description: string;
  icon: React.ReactElement;
  category: string;
  isPremium?: boolean;
  isNew?: boolean;
  tags: string[];
}

const nodeDefinitions: NodeDefinition[] = [
  // Core Nodes
  {
    type: 'http' as NodeType,
    name: 'HTTP Request',
    description: 'Make HTTP requests to APIs and web services',
    icon: <HttpIcon />,
    category: 'Core',
    tags: ['api', 'rest', 'http', 'request', 'web'],
  },
  {
    type: 'webhook' as NodeType,
    name: 'Webhook',
    description: 'Receive HTTP webhooks from external services',
    icon: <HttpIcon />,
    category: 'Core',
    tags: ['webhook', 'trigger', 'http', 'receive'],
  },
  
  // Data Processing
  {
    type: 'data_processing' as NodeType,
    name: 'Data Transform',
    description: 'Transform and manipulate data',
    icon: <TransformIcon />,
    category: 'Data',
    tags: ['transform', 'data', 'processing', 'json', 'xml'],
  },
  {
    type: 'code' as NodeType,
    name: 'Code',
    description: 'Execute custom JavaScript code',
    icon: <CodeIcon />,
    category: 'Data',
    tags: ['code', 'javascript', 'custom', 'logic'],
  },
  
  // AI & ML
  {
    type: 'ml_inference' as NodeType,
    name: 'AI Model',
    description: 'Run AI/ML models for predictions',
    icon: <AIIcon />,
    category: 'AI',
    tags: ['ai', 'ml', 'model', 'prediction', 'inference'],
    isNew: true,
  },
  {
    type: 'text_processing' as NodeType,
    name: 'Text Processing',
    description: 'Process and analyze text content',
    icon: <AIIcon />,
    category: 'AI',
    tags: ['text', 'nlp', 'processing', 'analysis'],
  },
  
  // Integrations
  {
    type: 'database' as NodeType,
    name: 'Database',
    description: 'Connect to SQL and NoSQL databases',
    icon: <DatabaseIcon />,
    category: 'Integrations',
    tags: ['database', 'sql', 'nosql', 'storage'],
  },
  {
    type: 'cloud_storage' as NodeType,
    name: 'Cloud Storage',
    description: 'Work with cloud storage services',
    icon: <CloudIcon />,
    category: 'Integrations',
    tags: ['cloud', 'storage', 's3', 'azure', 'gcp'],
    isPremium: true,
  },
  
  // Communication
  {
    type: 'notification' as NodeType,
    name: 'Notification',
    description: 'Send notifications via email, SMS, Slack',
    icon: <NotificationIcon />,
    category: 'Communication',
    tags: ['notification', 'email', 'sms', 'slack', 'alert'],
  },
];

const categories: NodeCategory[] = [
  {
    id: 'core',
    name: 'Core',
    description: 'Essential workflow nodes',
    icon: <DataIcon />,
    nodes: nodeDefinitions.filter(n => n.category === 'Core'),
  },
  {
    id: 'data',
    name: 'Data',
    description: 'Data processing and transformation',
    icon: <TransformIcon />,
    nodes: nodeDefinitions.filter(n => n.category === 'Data'),
  },
  {
    id: 'ai',
    name: 'AI & ML',
    description: 'Artificial Intelligence and Machine Learning',
    icon: <AIIcon />,
    nodes: nodeDefinitions.filter(n => n.category === 'AI'),
  },
  {
    id: 'integrations',
    name: 'Integrations',
    description: 'Third-party service integrations',
    icon: <CloudIcon />,
    nodes: nodeDefinitions.filter(n => n.category === 'Integrations'),
  },
  {
    id: 'communication',
    name: 'Communication',
    description: 'Messaging and notification services',
    icon: <NotificationIcon />,
    nodes: nodeDefinitions.filter(n => n.category === 'Communication'),
  },
];

export const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode, position }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['core']);

  const handleToggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleNodeSelect = (nodeType: NodeType) => {
    onAddNode(nodeType);
    setIsOpen(false);
  };

  const filteredNodes = nodeDefinitions.filter(node =>
    node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getFilteredCategories = () => {
    if (searchTerm) {
      return [{
        id: 'search',
        name: 'Search Results',
        description: `Found ${filteredNodes.length} nodes`,
        icon: <SearchIcon />,
        nodes: filteredNodes,
      }];
    }
    return categories;
  };

  return (
    <>
      {/* Floating Add Button */}
      <Fab
        color="primary"
        aria-label="add node"
        onClick={() => setIsOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          zIndex: 1000,
        }}
      >
        <AddIcon />
      </Fab>

      {/* Node Palette Drawer */}
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 400,
            maxWidth: '90vw',
          },
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box p={2} borderBottom="1px solid" borderColor="divider">
            <Typography variant="h6" gutterBottom>
              Add Workflow Node
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Choose a node to add to your workflow
            </Typography>
            
            {/* Search */}
            <TextField
              fullWidth
              size="small"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* Categories and Nodes */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {getFilteredCategories().map((category) => (
              <Accordion
                key={category.id}
                expanded={searchTerm ? true : expandedCategories.includes(category.id)}
                onChange={() => !searchTerm && handleToggleCategory(category.id)}
                disableGutters
                elevation={0}
                sx={{
                  '&:before': {
                    display: 'none',
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={!searchTerm && <ExpandMoreIcon />}
                  sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '& .MuiAccordionSummary-content': {
                      alignItems: 'center',
                    },
                  }}
                >
                  <Box display="flex" alignItems="center">
                    <Box mr={2} color="primary.main">
                      {category.icon}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2">
                        {category.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {category.description}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails sx={{ p: 0 }}>
                  <List dense>
                    {category.nodes.map((node) => (
                      <ListItem key={node.type} disablePadding>
                        <ListItemButton
                          onClick={() => handleNodeSelect(node.type)}
                          sx={{ py: 1.5 }}
                        >
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <Box color="primary.main">
                              {node.icon}
                            </Box>
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center">
                                <Typography variant="body2">
                                  {node.name}
                                </Typography>
                                {node.isNew && (
                                  <Chip label="New" size="small" color="success" sx={{ ml: 1, height: 16 }} />
                                )}
                                {node.isPremium && (
                                  <Chip label="Pro" size="small" color="warning" sx={{ ml: 1, height: 16 }} />
                                )}
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {node.description}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>

          {/* Footer */}
          <Divider />
          <Box p={2} textAlign="center">
            <Typography variant="caption" color="text.secondary">
              {nodeDefinitions.length} nodes available
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default NodePalette;