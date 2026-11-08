import React, { useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  IconButton,
  CircularProgress,
  Alert,
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
  Extension,
} from '@mui/icons-material';
import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchNodeTypes } from '../store/slices/nodeTypesSlice';
import type { INodeTypeDescription } from '@automation-marketplace/nodes';

// Map icon names to MUI icons
const iconMap: Record<string, React.ReactNode> = {
  Http: <Http />,
  Transform: <Transform />,
  Schedule: <Schedule />,
  DataObject: <DataObject />,
  SmartToy: <SmartToy />,
  Storage: <Storage />,
  Email: <Email />,
  Webhook: <Webhook />,
  Extension: <Extension />,
};

const getIconForNode = (node: INodeTypeDescription): React.ReactNode => {
  // Try to get icon from node definition
  if (node.icon && iconMap[node.icon]) {
    return iconMap[node.icon];
  }
  // Default icon based on category
  const category = node.group?.[0] || 'other';
  if (category.includes('http') || category.includes('api')) return <Http />;
  if (category.includes('data')) return <DataObject />;
  if (category.includes('ai')) return <SmartToy />;
  if (category.includes('database')) return <Storage />;
  if (category.includes('communication')) return <Email />;
  return <Extension />;
};

interface NodeCategory {
  name: string;
  nodes: INodeTypeDescription[];
}

const groupNodesByCategory = (nodes: INodeTypeDescription[]): NodeCategory[] => {
  const categoryMap = new Map<string, INodeTypeDescription[]>();
  
  nodes.forEach((node) => {
    const category = node.group?.[0] || 'Other';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(node);
  });

  return Array.from(categoryMap.entries()).map(([name, nodes]) => ({
    name,
    nodes,
  }));
};

interface NodePaletteProps {
  onNodeDragStart: (nodeType: string, nodeConfig: any) => void;
}

const NodePalette: React.FC<NodePaletteProps> = ({ onNodeDragStart }) => {
  const dispatch = useAppDispatch();
  const { nodeTypes, loading, error, initialized } = useAppSelector((state) => state.nodeTypes);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!initialized) {
      dispatch(fetchNodeTypes());
    }
  }, [dispatch, initialized]);

  useEffect(() => {
    // Auto-expand first category when nodes are loaded
    if (nodeTypes.length > 0 && expandedCategories.length === 0) {
      const categories = groupNodesByCategory(nodeTypes);
      if (categories.length > 0) {
        setExpandedCategories([categories[0].name]);
      }
    }
  }, [nodeTypes, expandedCategories.length]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleDragStart = (event: React.DragEvent, node: INodeTypeDescription) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: node.name,
      label: node.displayName,
      category: node.group?.[0] || 'Other',
    }));
    event.dataTransfer.effectAllowed = 'move';
    
    onNodeDragStart(node.name, {
      type: node.name,
      label: node.displayName,
      category: node.group?.[0] || 'Other',
    });
  };

  const nodeCategories = groupNodesByCategory(nodeTypes);

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

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={40} />
        </Box>
      )}

      {error && (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      {!loading && !error && nodeTypes.length === 0 && (
        <Box sx={{ p: 3 }}>
          <Alert severity="info">
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              No nodes available
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Node implementations will be added in the next phase. The Node Registry is working correctly and ready to load nodes.
            </Typography>
          </Alert>
        </Box>
      )}

      {!loading && !error && nodeTypes.length > 0 && (
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
                      key={node.name}
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
                        {getIconForNode(node)}
                      </ListItemIcon>
                      <ListItemText
                        primary={node.displayName}
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
      )}
    </Paper>
  );
};

export default NodePalette;