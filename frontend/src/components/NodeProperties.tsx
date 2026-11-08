import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Paper,
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  IconButton,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore,
  Add,
  Delete,
  Settings,
  Code,
} from '@mui/icons-material';
import type { Node } from 'reactflow';
import type { INodeTypeDescription, INodeProperties } from '@automation-marketplace/nodes';
import { RootState } from '../store';
import { fetchNodeType } from '../store/slices/nodeTypesSlice';

interface NodePropertiesProps {
  selectedNode: Node | null;
  onNodeUpdate: (nodeId: string, updates: Partial<Node>) => void;
}

const NodeProperties: React.FC<NodePropertiesProps> = ({
  selectedNode,
  onNodeUpdate,
}) => {
  const dispatch = useDispatch();
  const { nodeTypes } = useSelector((state: RootState) => state.nodeTypes);
  const [activeAccordion, setActiveAccordion] = useState<string | false>('parameters');
  const [nodeTypeDescription, setNodeTypeDescription] = useState<INodeTypeDescription | null>(null);

  // Fetch node type definition when node is selected
  useEffect(() => {
    if (selectedNode) {
      console.log('[NodeProperties] Selected node:', selectedNode.type, selectedNode);
      console.log('[NodeProperties] Available nodeTypes:', nodeTypes.map(nt => nt.name));
      
      // Try to find by exact match first
      let existingType = nodeTypes.find(nt => nt.name === selectedNode.type);
      
      // If not found, try partial matches
      if (!existingType) {
        // Try case-insensitive match
        existingType = nodeTypes.find(nt => 
          nt.name.toLowerCase() === selectedNode.type.toLowerCase()
        );
      }
      
      // Try matching by display name or contained in name
      if (!existingType) {
        existingType = nodeTypes.find(nt => 
          nt.name.toLowerCase().includes(selectedNode.type.toLowerCase()) ||
          nt.displayName.toLowerCase().includes(selectedNode.type.toLowerCase())
        );
      }
      
      if (existingType) {
        console.log('[NodeProperties] Found existing type:', existingType.name);
        setNodeTypeDescription(existingType);
      } else {
        console.log('[NodeProperties] Node type not found in nodeTypes array');
        console.log('[NodeProperties] Attempting to fetch all node types...');
        // Try to fetch all node types if we don't have them yet
        if (nodeTypes.length === 0) {
          // This will trigger the nodeTypes to be loaded
          console.log('[NodeProperties] nodeTypes array is empty, should be loaded on mount');
        }
      }
    }
  }, [selectedNode, dispatch, nodeTypes]);
  
  // Update nodeTypeDescription when nodeTypes array changes
  useEffect(() => {
    if (selectedNode && nodeTypes.length > 0) {
      // Try multiple matching strategies
      let existingType = nodeTypes.find(nt => nt.name === selectedNode.type);
      
      if (!existingType) {
        existingType = nodeTypes.find(nt => 
          nt.name.toLowerCase() === selectedNode.type.toLowerCase()
        );
      }
      
      if (!existingType) {
        existingType = nodeTypes.find(nt => 
          nt.name.toLowerCase().includes(selectedNode.type.toLowerCase()) ||
          nt.displayName.toLowerCase().includes(selectedNode.type.toLowerCase())
        );
      }
      
      if (existingType) {
        console.log('[NodeProperties] Updated nodeTypeDescription:', existingType.name);
        setNodeTypeDescription(existingType);
      }
    }
  }, [nodeTypes, selectedNode]);

  if (!selectedNode) {
    return (
      <Paper
        sx={{
          width: 320,
          height: '100%',
          borderLeft: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box textAlign="center" sx={{ p: 3 }}>
          <Settings sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Select a node to configure its properties
          </Typography>
        </Box>
      </Paper>
    );
  }

  const handleAccordionChange = (panel: string) => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setActiveAccordion(isExpanded ? panel : false);
  };

  const updateNodeData = (key: string, value: any) => {
    console.log('[NodeProperties] updateNodeData called:', key, '=', value);
    console.log('[NodeProperties] Current data:', selectedNode.data);
    onNodeUpdate(selectedNode.id, {
      data: {
        ...selectedNode.data,
        [key]: value,
      },
    });
  };

  // Check if a property should be displayed based on displayOptions
  const shouldDisplayProperty = (property: INodeProperties): boolean => {
    if (!property.displayOptions) return true;
    
    const data = selectedNode.data as any;
    const { show, hide } = property.displayOptions;
    
    if (show) {
      for (const [key, values] of Object.entries(show)) {
        const currentValue = data[key];
        if (!values.includes(currentValue)) {
          return false;
        }
      }
    }
    
    if (hide) {
      for (const [key, values] of Object.entries(hide)) {
        const currentValue = data[key];
        if (values.includes(currentValue)) {
          return false;
        }
      }
    }
    
    return true;
  };

  // Render a single property based on its type
  const renderProperty = (property: INodeProperties) => {
    const data = selectedNode.data as any;
    const value = data[property.name] || property.default;

    switch (property.type) {
      case 'string':
        return (
          <TextField
            key={property.name}
            label={property.displayName}
            value={value || ''}
            onChange={(e) => updateNodeData(property.name, e.target.value)}
            fullWidth
            size="small"
            placeholder={property.placeholder}
            helperText={property.description}
            type={property.typeOptions?.password ? 'password' : 'text'}
            multiline={property.typeOptions?.rows ? true : false}
            rows={property.typeOptions?.rows || 1}
            required={property.required}
          />
        );
      
      case 'number':
        return (
          <TextField
            key={property.name}
            label={property.displayName}
            value={value || ''}
            onChange={(e) => updateNodeData(property.name, parseFloat(e.target.value))}
            fullWidth
            size="small"
            type="number"
          />
        );
      
      case 'boolean':
        return (
          <FormControlLabel
            key={property.name}
            control={
              <Switch
                checked={value || false}
                onChange={(e) => updateNodeData(property.name, e.target.checked)}
              />
            }
            label={property.displayName}
          />
        );
      
      case 'options':
        console.log(`[NodeProperties] Rendering options field: ${property.name}, value:`, value, 'default:', property.default);
        return (
          <FormControl key={property.name} fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>{property.displayName}</InputLabel>
            <Select
              value={value || property.default || ''}
              label={property.displayName}
              onChange={(e) => {
                console.log(`[NodeProperties] Select onChange: ${property.name} = ${e.target.value}`);
                updateNodeData(property.name, e.target.value);
              }}
            >
              {property.options?.map((option) => (
                <MenuItem key={String(option.value)} value={String(option.value)}>
                  {option.name}
                </MenuItem>
              ))}
            </Select>
            {property.description && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
                {property.description}
              </Typography>
            )}
          </FormControl>
        );
      
      case 'json':
        return (
          <TextField
            key={property.name}
            label={property.displayName}
            value={typeof value === 'string' ? value : JSON.stringify(value || {}, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                updateNodeData(property.name, parsed);
              } catch (err) {
                updateNodeData(property.name, e.target.value);
              }
            }}
            fullWidth
            multiline
            rows={4}
            size="small"
            InputProps={{
              sx: { fontFamily: 'monospace', fontSize: '0.85rem' }
            }}
          />
        );
      
      case 'fixedCollection':
        // Render key-value pairs UI
        const collectionValue = value || [];
        const optionName = property.options?.[0]?.name || 'parameter';
        const fields = property.options?.[0]?.values || [];
        
        return (
          <Box key={property.name} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {property.displayName}
            </Typography>
            {collectionValue[optionName]?.map((item: any, index: number) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                {fields.map((field: INodeProperties) => (
                  <TextField
                    key={field.name}
                    label={field.displayName}
                    value={item[field.name] || ''}
                    onChange={(e) => {
                      const newCollection = { ...value };
                      if (!newCollection[optionName]) newCollection[optionName] = [];
                      newCollection[optionName][index] = {
                        ...item,
                        [field.name]: e.target.value,
                      };
                      updateNodeData(property.name, newCollection);
                    }}
                    size="small"
                    fullWidth
                  />
                ))}
                <IconButton
                  size="small"
                  onClick={() => {
                    const newCollection = { ...value };
                    newCollection[optionName].splice(index, 1);
                    updateNodeData(property.name, newCollection);
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button
              size="small"
              startIcon={<Add />}
              onClick={() => {
                const newCollection = { ...value };
                if (!newCollection[optionName]) newCollection[optionName] = [];
                const newItem: any = {};
                fields.forEach((field: INodeProperties) => {
                  newItem[field.name] = field.default || '';
                });
                newCollection[optionName].push(newItem);
                updateNodeData(property.name, newCollection);
              }}
            >
              Add {property.displayName}
            </Button>
          </Box>
        );
      
      default:
        return null;
    }
  };

  // Render dynamic properties from API
  const renderDynamicProperties = () => {
    console.log('[NodeProperties] renderDynamicProperties called');
    console.log('[NodeProperties] nodeTypeDescription:', nodeTypeDescription);
    
    if (!nodeTypeDescription) {
      console.log('[NodeProperties] No nodeTypeDescription, showing loader');
      return (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress size={24} />
        </Box>
      );
    }

    const properties = nodeTypeDescription.properties || [];
    console.log('[NodeProperties] Properties to render:', properties.length);
    const data = selectedNode.data as any;
    
    return (
      <>
        {/* General Section - Always show node name and description */}
        <Accordion
          expanded={activeAccordion === 'general'}
          onChange={handleAccordionChange('general')}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>General</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Node Name"
                value={data.label || nodeTypeDescription.defaults?.name || ''}
                onChange={(e) => updateNodeData('label', e.target.value)}
                fullWidth
                size="small"
                helperText="Custom name for this node instance"
              />
              <TextField
                label="Notes"
                value={data.notes || ''}
                onChange={(e) => updateNodeData('notes', e.target.value)}
                fullWidth
                multiline
                rows={2}
                size="small"
                helperText="Optional notes about this node"
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Node-specific Properties */}
        <Accordion
          expanded={activeAccordion === 'parameters'}
          onChange={handleAccordionChange('parameters')}
          defaultExpanded
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Parameters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {properties.length > 0 ? (
                properties
                  .filter(shouldDisplayProperty)
                  .map(renderProperty)
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No parameters defined for this node type.
                </Typography>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      </>
    );
  };

  const renderHTTPRequestProperties = () => {
    const data = selectedNode.data as any;
    
    return (
      <>
        <Accordion
          expanded={activeAccordion === 'general'}
          onChange={handleAccordionChange('general')}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>General</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Node Name"
                value={data.label || ''}
                onChange={(e) => updateNodeData('label', e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Description"
                value={data.description || ''}
                onChange={(e) => updateNodeData('description', e.target.value)}
                fullWidth
                multiline
                rows={2}
                size="small"
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={activeAccordion === 'http'}
          onChange={handleAccordionChange('http')}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>HTTP Configuration</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Method</InputLabel>
                <Select
                  value={data.method || 'GET'}
                  label="Method"
                  onChange={(e) => updateNodeData('method', e.target.value)}
                >
                  <MenuItem value="GET">GET</MenuItem>
                  <MenuItem value="POST">POST</MenuItem>
                  <MenuItem value="PUT">PUT</MenuItem>
                  <MenuItem value="PATCH">PATCH</MenuItem>
                  <MenuItem value="DELETE">DELETE</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="URL"
                value={data.url || ''}
                onChange={(e) => updateNodeData('url', e.target.value)}
                fullWidth
                size="small"
                placeholder="https://api.example.com/endpoint"
              />
              
              <TextField
                label="Headers (JSON)"
                value={JSON.stringify(data.headers || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value);
                    updateNodeData('headers', headers);
                  } catch (err) {
                    // Invalid JSON, don't update
                  }
                }}
                fullWidth
                multiline
                rows={3}
                size="small"
                placeholder='{"Content-Type": "application/json"}'
              />
              
              {['POST', 'PUT', 'PATCH'].includes(data.method) && (
                <TextField
                  label="Request Body (JSON)"
                  value={JSON.stringify(data.body || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const body = JSON.parse(e.target.value);
                      updateNodeData('body', body);
                    } catch (err) {
                      // Invalid JSON, don't update
                    }
                  }}
                  fullWidth
                  multiline
                  rows={4}
                  size="small"
                  placeholder='{"key": "value"}'
                />
              )}
            </Box>
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={activeAccordion === 'options'}
          onChange={handleAccordionChange('options')}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Timeout (ms)"
                type="number"
                value={data.timeout || 5000}
                onChange={(e) => updateNodeData('timeout', parseInt(e.target.value))}
                fullWidth
                size="small"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={data.followRedirects !== false}
                    onChange={(e) => updateNodeData('followRedirects', e.target.checked)}
                  />
                }
                label="Follow Redirects"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={data.continueOnError || false}
                    onChange={(e) => updateNodeData('continueOnError', e.target.checked)}
                  />
                }
                label="Continue on Error"
              />
            </Box>
          </AccordionDetails>
        </Accordion>
      </>
    );
  };

  const renderDataProcessingProperties = () => {
    const data = selectedNode.data as any;
    
    return (
      <>
        <Accordion
          expanded={activeAccordion === 'general'}
          onChange={handleAccordionChange('general')}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>General</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Node Name"
                value={data.label || ''}
                onChange={(e) => updateNodeData('label', e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Description"
                value={data.description || ''}
                onChange={(e) => updateNodeData('description', e.target.value)}
                fullWidth
                multiline
                rows={2}
                size="small"
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        <Accordion
          expanded={activeAccordion === 'processing'}
          onChange={handleAccordionChange('processing')}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Data Processing</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Operation</InputLabel>
                <Select
                  value={data.operation || 'transform'}
                  label="Operation"
                  onChange={(e) => updateNodeData('operation', e.target.value)}
                >
                  <MenuItem value="transform">Transform</MenuItem>
                  <MenuItem value="filter">Filter</MenuItem>
                  <MenuItem value="aggregate">Aggregate</MenuItem>
                  <MenuItem value="sort">Sort</MenuItem>
                  <MenuItem value="validate">Validate</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="JavaScript Code"
                value={data.code || ''}
                onChange={(e) => updateNodeData('code', e.target.value)}
                fullWidth
                multiline
                rows={6}
                size="small"
                placeholder="// Transform the input data\nreturn data.map(item => ({ ...item, processed: true }));"
                InputProps={{
                  sx: { fontFamily: 'monospace', fontSize: '0.85rem' }
                }}
              />
            </Box>
          </AccordionDetails>
        </Accordion>
      </>
    );
  };

  const renderDefaultProperties = () => {
    const data = selectedNode.data as any;
    
    return (
      <Accordion
        expanded={activeAccordion === 'general'}
        onChange={handleAccordionChange('general')}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>General</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Node Name"
              value={data.label || ''}
              onChange={(e) => updateNodeData('label', e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Description"
              value={data.description || ''}
              onChange={(e) => updateNodeData('description', e.target.value)}
              fullWidth
              multiline
              rows={2}
              size="small"
            />
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderProperties = () => {
    console.log('[NodeProperties] renderProperties called');
    console.log('[NodeProperties] Node type:', selectedNode.type);
    console.log('[NodeProperties] nodeTypeDescription:', nodeTypeDescription);
    console.log('[NodeProperties] nodeTypes count:', nodeTypes.length);
    
    if (nodeTypeDescription && nodeTypeDescription.properties) {
      console.log('[NodeProperties] Using dynamic properties, property count:', nodeTypeDescription.properties.length);
      return renderDynamicProperties();
    }
    
    console.log('[NodeProperties] Using fallback properties');
    
    // Fallback to hardcoded properties for older nodes
    switch (selectedNode.type) {
      case 'http':
      case 'httpRequest':
        return renderHTTPRequestProperties();
      case 'dataTransform':
      case 'dataFilter':
        return renderDataProcessingProperties();
      default:
        return renderDefaultProperties();
    }
  };

  return (
    <Paper
      sx={{
        width: 320,
        height: '100%',
        borderLeft: 1,
        borderColor: 'divider',
        overflow: 'auto',
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Node Properties
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={selectedNode.type}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Typography variant="body2" color="text.secondary">
            {selectedNode.id.slice(0, 8)}...
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 0 }}>
        {renderProperties()}
      </Box>
    </Paper>
  );
};

export default NodeProperties;