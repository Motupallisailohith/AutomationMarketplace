import React, { useState } from 'react';
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
} from '@mui/material';
import {
  ExpandMore,
  Add,
  Delete,
  Settings,
  Code,
} from '@mui/icons-material';
import type { Node } from 'reactflow';

interface NodePropertiesProps {
  selectedNode: Node | null;
  onNodeUpdate: (nodeId: string, updates: Partial<Node>) => void;
}

const NodeProperties: React.FC<NodePropertiesProps> = ({
  selectedNode,
  onNodeUpdate,
}) => {
  const [activeAccordion, setActiveAccordion] = useState<string | false>('general');

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
    onNodeUpdate(selectedNode.id, {
      data: {
        ...selectedNode.data,
        [key]: value,
      },
    });
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
    switch (selectedNode.type) {
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