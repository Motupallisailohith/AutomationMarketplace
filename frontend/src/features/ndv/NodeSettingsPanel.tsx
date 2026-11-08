import React from 'react';
import {
  Box,
  TextField,
  Typography,
  FormControlLabel,
  Switch,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import type { Node } from 'reactflow';
import type { INodeTypeDescription } from '@automation-marketplace/nodes';

interface NodeSettingsPanelProps {
  selectedNode: Node;
  nodeTypeDescription: INodeTypeDescription;
  onNodeUpdate: (nodeId: string, updates: Partial<Node>) => void;
}

const NodeSettingsPanel: React.FC<NodeSettingsPanelProps> = ({
  selectedNode,
  nodeTypeDescription,
  onNodeUpdate,
}) => {
  const updateNodeData = (key: string, value: any) => {
    onNodeUpdate(selectedNode.id, {
      data: {
        ...selectedNode.data,
        [key]: value,
      },
    });
  };

  const data = selectedNode.data as any;

  return (
    <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
      {/* Node Info */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Node Info</Typography>
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
              rows={3}
              size="small"
              helperText="Optional notes about this node"
            />

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Node Type
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {nodeTypeDescription.displayName}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Version
              </Typography>
              <Typography variant="body2">
                {nodeTypeDescription.version || '1.0'}
              </Typography>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Divider sx={{ my: 2 }} />

      {/* Execution Settings */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Execution</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={data.continueOnFail || false}
                  onChange={(e) => updateNodeData('continueOnFail', e.target.checked)}
                />
              }
              label="Continue On Fail"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
              By default, the workflow stops executing if this node has an error. Enable this to continue anyway.
            </Typography>

            <TextField
              label="Retry On Fail"
              type="number"
              value={data.retryOnFail || 0}
              onChange={(e) => updateNodeData('retryOnFail', parseInt(e.target.value))}
              fullWidth
              size="small"
              helperText="Number of times to retry this node if it fails"
              inputProps={{ min: 0, max: 5 }}
            />

            <TextField
              label="Wait Between Tries (ms)"
              type="number"
              value={data.waitBetween || 0}
              onChange={(e) => updateNodeData('waitBetween', parseInt(e.target.value))}
              fullWidth
              size="small"
              helperText="Time to wait between retry attempts"
              inputProps={{ min: 0, step: 100 }}
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      <Divider sx={{ my: 2 }} />

      {/* Advanced Settings */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={600}>Advanced</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={data.alwaysOutputData || false}
                  onChange={(e) => updateNodeData('alwaysOutputData', e.target.checked)}
                />
              }
              label="Always Output Data"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
              Output empty item even if the node does not return data
            </Typography>

            <TextField
              label="Execution Timeout (seconds)"
              type="number"
              value={data.timeout || ''}
              onChange={(e) => updateNodeData('timeout', parseInt(e.target.value))}
              fullWidth
              size="small"
              helperText="Max time this node can run before timing out"
              placeholder="No timeout"
              inputProps={{ min: 1 }}
            />
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default NodeSettingsPanel;
