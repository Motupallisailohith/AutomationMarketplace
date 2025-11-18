import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Button,
  Alert,
  Chip,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ContentCopy as CopyIcon,
  PlayArrow as TestIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { WorkflowTrigger } from '../../types/workflow';

interface WebhookTriggerProps {
  trigger: WorkflowTrigger;
  onUpdate: (trigger: WorkflowTrigger) => void;
  workflowId: string;
  isProduction?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

export const WebhookTrigger: React.FC<WebhookTriggerProps> = ({
  trigger,
  onUpdate,
  workflowId,
  isProduction = false,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [lastRequest, setLastRequest] = useState<any>(null);
  
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
  const webhookPath = trigger.configuration.path || '/webhook/default';
  
  const testUrl = `${baseUrl}/webhooks/test${webhookPath}`;
  const prodUrl = `${baseUrl}/webhooks/prod${webhookPath}`;
  const currentUrl = isProduction ? prodUrl : testUrl;

  const handleConfigUpdate = (field: string, value: any) => {
    const updatedTrigger = {
      ...trigger,
      configuration: {
        ...trigger.configuration,
        [field]: value,
      },
    };
    onUpdate(updatedTrigger);
  };

  const generateNewPath = () => {
    const newPath = `/webhook/${Math.random().toString(36).substring(2, 15)}`;
    handleConfigUpdate('path', newPath);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const testWebhook = async () => {
    setIsListening(true);
    // Simulate listening for test event
    setTimeout(() => {
      setLastRequest({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { test: true, timestamp: new Date().toISOString() },
        receivedAt: new Date().toISOString(),
      });
      setIsListening(false);
    }, 2000);
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box display="flex" alignItems="center">
            <SecurityIcon sx={{ mr: 1 }} />
            Webhook Configuration
            <Chip
              label={isProduction ? 'Production' : 'Test'}
              color={isProduction ? 'error' : 'info'}
              size="small"
              sx={{ ml: 2 }}
            />
          </Box>
        }
        action={
          <FormControlLabel
            control={
              <Switch
                checked={trigger.isActive}
                onChange={(e) => handleConfigUpdate('isActive', e.target.checked)}
              />
            }
            label="Active"
          />
        }
      />

      <CardContent>
        {/* Webhook URL Display */}
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Webhook URL
          </Typography>
          <Box 
            p={2} 
            bgcolor="grey.100" 
            borderRadius={1} 
            display="flex" 
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography 
              variant="body2" 
              fontFamily="monospace"
              sx={{ wordBreak: 'break-all', mr: 2 }}
            >
              {currentUrl}
            </Typography>
            <Box>
              <Tooltip title="Copy URL">
                <IconButton size="small" onClick={() => copyToClipboard(currentUrl)}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Test Webhook">
                <IconButton 
                  size="small" 
                  onClick={testWebhook}
                  disabled={isListening}
                  color="primary"
                >
                  <TestIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          {isListening && (
            <Alert severity="info" sx={{ mt: 1 }}>
              Listening for webhook... Send a request to test the endpoint.
            </Alert>
          )}
        </Box>

        {/* Configuration Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab label="Settings" icon={<SettingsIcon />} />
            <Tab label="Authentication" icon={<SecurityIcon />} />
            <Tab label="Response" icon={<CodeIcon />} />
          </Tabs>
        </Box>

        {/* Settings Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>HTTP Method</InputLabel>
                <Select
                  value={trigger.configuration.httpMethod || 'POST'}
                  onChange={(e) => handleConfigUpdate('httpMethod', e.target.value)}
                >
                  <MenuItem value="GET">GET</MenuItem>
                  <MenuItem value="POST">POST</MenuItem>
                  <MenuItem value="PUT">PUT</MenuItem>
                  <MenuItem value="PATCH">PATCH</MenuItem>
                  <MenuItem value="DELETE">DELETE</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center">
                <TextField
                  fullWidth
                  label="Webhook Path"
                  value={trigger.configuration.path || ''}
                  onChange={(e) => handleConfigUpdate('path', e.target.value)}
                  placeholder="/webhook/my-endpoint"
                />
                <Tooltip title="Generate New Path">
                  <IconButton onClick={generateNewPath} sx={{ ml: 1 }}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                The webhook path can include route parameters like /:id or /users/:userId/action
              </Typography>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Authentication Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Authentication Method</InputLabel>
                <Select
                  value={trigger.configuration.authentication || 'none'}
                  onChange={(e) => handleConfigUpdate('authentication', e.target.value)}
                >
                  <MenuItem value="none">None</MenuItem>
                  <MenuItem value="basic">Basic Auth</MenuItem>
                  <MenuItem value="bearer">Bearer Token</MenuItem>
                  <MenuItem value="header">Header Auth</MenuItem>
                  <MenuItem value="jwt">JWT</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {trigger.configuration.authentication === 'basic' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={trigger.configuration.basicAuth?.username || ''}
                    onChange={(e) => handleConfigUpdate('basicAuth', {
                      ...trigger.configuration.basicAuth,
                      username: e.target.value
                    })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Password"
                    value={trigger.configuration.basicAuth?.password || ''}
                    onChange={(e) => handleConfigUpdate('basicAuth', {
                      ...trigger.configuration.basicAuth,
                      password: e.target.value
                    })}
                  />
                </Grid>
              </>
            )}

            {trigger.configuration.authentication === 'bearer' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="Bearer Token"
                  value={trigger.configuration.bearerToken || ''}
                  onChange={(e) => handleConfigUpdate('bearerToken', e.target.value)}
                  placeholder="Enter your bearer token"
                />
              </Grid>
            )}

            {trigger.configuration.authentication === 'header' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Header Name"
                    value={trigger.configuration.headerAuth?.name || ''}
                    onChange={(e) => handleConfigUpdate('headerAuth', {
                      ...trigger.configuration.headerAuth,
                      name: e.target.value
                    })}
                    placeholder="X-API-Key"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Header Value"
                    value={trigger.configuration.headerAuth?.value || ''}
                    onChange={(e) => handleConfigUpdate('headerAuth', {
                      ...trigger.configuration.headerAuth,
                      value: e.target.value
                    })}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </TabPanel>

        {/* Response Tab */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Response Mode</InputLabel>
                <Select
                  value={trigger.configuration.responseMode || 'immediately'}
                  onChange={(e) => handleConfigUpdate('responseMode', e.target.value)}
                >
                  <MenuItem value="immediately">Respond Immediately</MenuItem>
                  <MenuItem value="when_finished">When Last Node Finishes</MenuItem>
                  <MenuItem value="custom_response">Using Response Node</MenuItem>
                  <MenuItem value="streaming">Streaming Response</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Response Code</InputLabel>
                <Select
                  value={trigger.configuration.responseCode || 200}
                  onChange={(e) => handleConfigUpdate('responseCode', e.target.value)}
                >
                  <MenuItem value={200}>200 OK</MenuItem>
                  <MenuItem value={201}>201 Created</MenuItem>
                  <MenuItem value={202}>202 Accepted</MenuItem>
                  <MenuItem value={204}>204 No Content</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Response Data</InputLabel>
                <Select
                  value={trigger.configuration.responseData || 'first_entry'}
                  onChange={(e) => handleConfigUpdate('responseData', e.target.value)}
                >
                  <MenuItem value="all_entries">All Entries</MenuItem>
                  <MenuItem value="first_entry">First Entry JSON</MenuItem>
                  <MenuItem value="first_binary">First Entry Binary</MenuItem>
                  <MenuItem value="no_response">No Response Body</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {trigger.configuration.responseMode === 'immediately' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Custom Response Message"
                  value={trigger.configuration.responseMessage || 'Workflow started successfully'}
                  onChange={(e) => handleConfigUpdate('responseMessage', e.target.value)}
                  placeholder="Enter custom response message"
                />
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* Last Request Info */}
        {lastRequest && (
          <Accordion sx={{ mt: 3 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">
                Last Request ({new Date(lastRequest.receivedAt).toLocaleTimeString()})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box component="pre" sx={{ 
                bgcolor: 'grey.100', 
                p: 2, 
                borderRadius: 1,
                fontSize: '0.75rem',
                overflow: 'auto',
              }}>
                {JSON.stringify(lastRequest, null, 2)}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

export default WebhookTrigger;