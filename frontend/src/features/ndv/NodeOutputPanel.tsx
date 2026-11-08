import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Chip,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
  DataObject as DataIcon,
  TableChart as TableIcon,
} from '@mui/icons-material';
import type { Node } from 'reactflow';
import type { INodeTypeDescription } from '@automation-marketplace/nodes';

interface NodeOutputPanelProps {
  selectedNode: Node;
  nodeTypeDescription: INodeTypeDescription;
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
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

const NodeOutputPanel: React.FC<NodeOutputPanelProps> = ({
  selectedNode,
  nodeTypeDescription,
}) => {
  const [viewTab, setViewTab] = useState(0);
  const data = selectedNode.data as any;
  const executionData = data.executionData || null;
  const hasExecuted = !!executionData;

  const handleCopyOutput = () => {
    if (executionData) {
      navigator.clipboard.writeText(JSON.stringify(executionData, null, 2));
    }
  };

  const renderJsonView = () => {
    if (!executionData) {
      return (
        <Alert severity="info">
          No execution data available. Run the workflow to see output.
        </Alert>
      );
    }

    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          backgroundColor: 'grey.50',
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          overflow: 'auto',
          maxHeight: '500px',
        }}
      >
        <pre style={{ margin: 0 }}>
          {JSON.stringify(executionData, null, 2)}
        </pre>
      </Paper>
    );
  };

  const renderTableView = () => {
    if (!executionData || !Array.isArray(executionData)) {
      return (
        <Alert severity="info">
          Table view is only available for array data
        </Alert>
      );
    }

    if (executionData.length === 0) {
      return (
        <Alert severity="info">
          No items in output
        </Alert>
      );
    }

    const firstItem = executionData[0];
    const keys = Object.keys(firstItem);

    return (
      <Box sx={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {keys.map((key) => (
                <th
                  key={key}
                  style={{
                    textAlign: 'left',
                    padding: '8px',
                    borderBottom: '2px solid #ddd',
                    fontWeight: 600,
                  }}
                >
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {executionData.map((item: any, index: number) => (
              <tr key={index}>
                {keys.map((key) => (
                  <td
                    key={key}
                    style={{
                      padding: '8px',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    {typeof item[key] === 'object'
                      ? JSON.stringify(item[key])
                      : String(item[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" fontWeight={600}>
            Output Data
          </Typography>
          <Box>
            <IconButton size="small" onClick={handleCopyOutput} disabled={!hasExecuted}>
              <CopyIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" disabled={!hasExecuted}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Status */}
        {hasExecuted ? (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              label={`${executionData.length || 1} items`}
              size="small"
              color="success"
            />
            <Typography variant="caption" color="text.secondary">
              Last executed: {data.lastExecutedAt || 'Just now'}
            </Typography>
          </Box>
        ) : (
          <Alert severity="info" sx={{ py: 0.5 }}>
            This node hasn't been executed yet
          </Alert>
        )}
      </Box>

      {/* View Tabs */}
      {hasExecuted && (
        <Tabs
          value={viewTab}
          onChange={(e, v) => setViewTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<DataIcon />} iconPosition="start" label="JSON" />
          <Tab icon={<TableIcon />} iconPosition="start" label="Table" />
        </Tabs>
      )}

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {!hasExecuted ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
            }}
          >
            <DataIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Output Yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Execute the workflow to see the output from this node
            </Typography>
          </Box>
        ) : (
          <>
            <TabPanel value={viewTab} index={0}>
              {renderJsonView()}
            </TabPanel>
            <TabPanel value={viewTab} index={1}>
              {renderTableView()}
            </TabPanel>
          </>
        )}
      </Box>
    </Box>
  );
};

export default NodeOutputPanel;
