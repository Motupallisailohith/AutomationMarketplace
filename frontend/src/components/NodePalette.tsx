import React from 'react';
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Http,
  Transform,
  Schedule,
  DataObject,
  SmartToy,
  Storage,
  Email,
  Webhook,
  ExpandLess,
  ExpandMore,
  DragIndicator,
} from '@mui/icons-material';
import { useState } from 'react';

interface NodeType {
  type: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  category: string;
}

interface NodeCategory {
  name: string;
  nodes: NodeType[];
}

const nodeCategories: NodeCategory[] = [
  {
    name: 'HTTP & APIs',
    nodes: [
      {
        type: 'httpRequest',
        label: 'HTTP Request',
        icon: <Http />,
        description: 'Make HTTP requests to external APIs',
        category: 'http',
      },
      {
        type: 'webhook',
        label: 'Webhook',
        icon: <Webhook />,
        description: 'Receive HTTP webhooks',
        category: 'http',
      },
    ],
  },
  {
    name: 'Data Processing',
    nodes: [
      {
        type: 'dataTransform',
        label: 'Transform Data',
        icon: <Transform />,
        description: 'Transform and manipulate data',
        category: 'data',
      },
      {
        type: 'dataFilter',
        label: 'Filter Data',
        icon: <DataObject />,
        description: 'Filter data based on conditions',
        category: 'data',
      },
    ],
  },
  {
    name: 'AI & ML',
    nodes: [
      {
        type: 'aiInference',
        label: 'AI Inference',
        icon: <SmartToy />,
        description: 'Run AI model inference',
        category: 'ai',
      },
    ],
  },
  {
    name: 'Database',
    nodes: [
      {
        type: 'dbQuery',
        label: 'Database Query',
        icon: <Storage />,
        description: 'Query database records',
        category: 'database',
      },
    ],
  },
  {
    name: 'Communication',
    nodes: [
      {
        type: 'sendEmail',
        label: 'Send Email',
        icon: <Email />,
        description: 'Send email notifications',
        category: 'communication',
      },
    ],
  },
  {
    name: 'Control Flow',
    nodes: [
      {
        type: 'delay',
        label: 'Delay',
        icon: <Schedule />,
        description: 'Add delay to workflow',
        category: 'control',
      },
    ],
  },
];

interface NodePaletteProps {
  onNodeDragStart: (nodeType: string, nodeConfig: any) => void;
}

const NodePalette: React.FC<NodePaletteProps> = ({ onNodeDragStart }) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    'HTTP & APIs',
    'Data Processing',
  ]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: nodeType.type,
      label: nodeType.label,
      category: nodeType.category,
    }));
    event.dataTransfer.effectAllowed = 'move';
    
    onNodeDragStart(nodeType.type, {
      type: nodeType.type,
      label: nodeType.label,
      category: nodeType.category,
    });
  };

  return (
    <Paper
      sx={{
        width: 280,
        height: '100%',
        overflow: 'auto',
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Node Palette
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Drag and drop nodes to build your workflow
        </Typography>
      </Box>

      <List sx={{ p: 0 }}>
        {nodeCategories.map((category) => (
          <Box key={category.name}>
            <ListItem
              button
              onClick={() => toggleCategory(category.name)}
              sx={{
                py: 1,
                backgroundColor: 'grey.50',
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <ListItemText
                primary={category.name}
                primaryTypographyProps={{
                  variant: 'subtitle2',
                  fontWeight: 'medium',
                }}
              />
              {expandedCategories.includes(category.name) ? (
                <ExpandLess />
              ) : (
                <ExpandMore />
              )}
            </ListItem>
            
            <Collapse
              in={expandedCategories.includes(category.name)}
              timeout="auto"
              unmountOnExit
            >
              <List component="div" disablePadding>
                {category.nodes.map((node) => (
                  <ListItem
                    key={node.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, node)}
                    sx={{
                      pl: 3,
                      cursor: 'grab',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                      '&:active': {
                        cursor: 'grabbing',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {node.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={node.label}
                      secondary={node.description}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: 'medium',
                      }}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        sx: { fontSize: '0.7rem' },
                      }}
                    />
                    <IconButton
                      size="small"
                      sx={{
                        opacity: 0.5,
                        cursor: 'grab',
                        '&:active': {
                          cursor: 'grabbing',
                        },
                      }}
                    >
                      <DragIndicator fontSize="small" />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </Box>
        ))}
      </List>
    </Paper>
  );
};

export default NodePalette;