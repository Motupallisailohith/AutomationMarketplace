import React, { useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  IconButton,
  Button,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import type { Node } from 'reactflow';
import type { INodeTypeDescription, INodeProperties } from '@automation-marketplace/nodes';

interface NodeParametersPanelProps {
  selectedNode: Node;
  nodeTypeDescription: INodeTypeDescription;
  onNodeUpdate: (nodeId: string, updates: Partial<Node>) => void;
}

const NodeParametersPanel: React.FC<NodeParametersPanelProps> = ({
  selectedNode,
  nodeTypeDescription,
  onNodeUpdate,
}) => {
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>(['parameters']);

  const updateNodeData = (key: string, value: any) => {
    console.log('[NodeParametersPanel] Updating:', key, '=', value);
    onNodeUpdate(selectedNode.id, {
      data: {
        ...selectedNode.data,
        [key]: value,
      },
    });
  };

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

  const renderProperty = (property: INodeProperties) => {
    const data = selectedNode.data as any;
    const value = data[property.name] !== undefined ? data[property.name] : property.default;

    const commonProps = {
      fullWidth: true,
      size: 'small' as const,
      sx: { mb: 2 },
    };

    switch (property.type) {
      case 'string':
        return (
          <TextField
            {...commonProps}
            key={property.name}
            label={property.displayName}
            value={value || ''}
            onChange={(e) => updateNodeData(property.name, e.target.value)}
            placeholder={property.placeholder}
            helperText={property.description}
            type={property.typeOptions?.password ? 'password' : 'text'}
            multiline={!!property.typeOptions?.rows}
            rows={property.typeOptions?.rows || 1}
            required={property.required}
            InputProps={{
              endAdornment: property.hint ? (
                <InputAdornment position="end">
                  <Tooltip title={property.hint}>
                    <CodeIcon fontSize="small" color="action" />
                  </Tooltip>
                </InputAdornment>
              ) : null,
            }}
          />
        );
      
      case 'number':
        return (
          <TextField
            {...commonProps}
            key={property.name}
            label={property.displayName}
            value={value || ''}
            onChange={(e) => updateNodeData(property.name, parseFloat(e.target.value))}
            type="number"
            helperText={property.description}
            required={property.required}
          />
        );
      
      case 'boolean':
        return (
          <Box key={property.name} sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={value || false}
                  onChange={(e) => updateNodeData(property.name, e.target.checked)}
                />
              }
              label={property.displayName}
            />
            {property.description && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4 }}>
                {property.description}
              </Typography>
            )}
          </Box>
        );
      
      case 'options':
        return (
          <FormControl {...commonProps} key={property.name}>
            <InputLabel>{property.displayName}</InputLabel>
            <Select
              value={value || property.default || ''}
              label={property.displayName}
              onChange={(e) => {
                console.log(`[NodeParametersPanel] Dropdown changed: ${property.name} = ${e.target.value}`);
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
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                {property.description}
              </Typography>
            )}
          </FormControl>
        );
      
      case 'json':
        return (
          <TextField
            {...commonProps}
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
            multiline
            rows={6}
            helperText={property.description}
            InputProps={{
              sx: { fontFamily: 'monospace', fontSize: '0.875rem' }
            }}
          />
        );
      
      case 'fixedCollection':
        const collectionValue = value || {};
        const optionName = property.options?.[0]?.name || 'parameter';
        const fields = property.options?.[0]?.values || [];
        const items = collectionValue[optionName] || [];
        
        return (
          <Box key={property.name} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom fontWeight={600}>
              {property.displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              {property.description}
            </Typography>
            
            {items.map((item: any, index: number) => (
              <Box key={index} sx={{ p: 2, mb: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                {fields.map((field: INodeProperties) => (
                  <TextField
                    key={field.name}
                    label={field.displayName}
                    value={item[field.name] || ''}
                    onChange={(e) => {
                      const newCollection = { ...collectionValue };
                      if (!newCollection[optionName]) newCollection[optionName] = [];
                      newCollection[optionName][index] = {
                        ...item,
                        [field.name]: e.target.value,
                      };
                      updateNodeData(property.name, newCollection);
                    }}
                    size="small"
                    fullWidth
                    sx={{ mb: 1 }}
                  />
                ))}
                <Button
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={() => {
                    const newCollection = { ...collectionValue };
                    newCollection[optionName].splice(index, 1);
                    updateNodeData(property.name, newCollection);
                  }}
                  color="error"
                >
                  Remove
                </Button>
              </Box>
            ))}
            
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                const newCollection = { ...collectionValue };
                if (!newCollection[optionName]) newCollection[optionName] = [];
                const newItem: any = {};
                fields.forEach((field: INodeProperties) => {
                  newItem[field.name] = field.default || '';
                });
                newCollection[optionName].push(newItem);
                updateNodeData(property.name, newCollection);
              }}
              variant="outlined"
            >
              Add {property.displayName}
            </Button>
          </Box>
        );
      
      default:
        return null;
    }
  };

  const properties = nodeTypeDescription.properties || [];
  const visibleProperties = properties.filter(shouldDisplayProperty);

  const handleAccordionToggle = (accordion: string) => {
    setExpandedAccordions(prev =>
      prev.includes(accordion)
        ? prev.filter(a => a !== accordion)
        : [...prev, accordion]
    );
  };

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {/* Parameters Accordion */}
      <Accordion
        expanded={expandedAccordions.includes('parameters')}
        onChange={() => handleAccordionToggle('parameters')}
        defaultExpanded
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Parameters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ pt: 1 }}>
            {visibleProperties.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                This node has no configurable parameters
              </Typography>
            ) : (
              visibleProperties.map(renderProperty)
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default NodeParametersPanel;
