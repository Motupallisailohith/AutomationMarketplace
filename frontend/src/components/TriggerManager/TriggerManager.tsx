import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Grid,
} from '@mui/material';
import {
  Webhook as WebhookIcon,
  Schedule as ScheduleIcon,
  PlayArrow as ManualIcon,
  Api as ApiIcon,
  Event as EventIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { WorkflowTrigger, TriggerType } from '../../types/workflow';

interface TriggerManagerProps {
  triggers: WorkflowTrigger[];
  onAddTrigger: (trigger: WorkflowTrigger) => void;
  onEditTrigger: (triggerId: string, trigger: WorkflowTrigger) => void;
  onRemoveTrigger: (triggerId: string) => void;
}

interface TriggerTypeOption {
  type: TriggerType;
  title: string;
  description: string;
  icon: React.ReactElement;
  category: 'Core' | 'Advanced' | 'External';
  isPremium?: boolean;
}

const triggerTypes: TriggerTypeOption[] = [
  {
    type: 'webhook',
    title: 'Webhook',
    description: 'Trigger workflow when HTTP request is received',
    icon: <WebhookIcon />,
    category: 'Core',
  },
  {
    type: 'manual',
    title: 'Manual Trigger',
    description: 'Start workflow manually from the UI',
    icon: <ManualIcon />,
    category: 'Core',
  },
  {
    type: 'schedule',
    title: 'Schedule',
    description: 'Run workflow on a schedule (cron expression)',
    icon: <ScheduleIcon />,
    category: 'Core',
  },
  {
    type: 'api',
    title: 'API Trigger',
    description: 'Trigger via REST API endpoint',
    icon: <ApiIcon />,
    category: 'Core',
  },
  {
    type: 'event',
    title: 'Event Trigger',
    description: 'React to system or custom events',
    icon: <EventIcon />,
    category: 'Advanced',
  },
];

export const TriggerManager: React.FC<TriggerManagerProps> = ({
  triggers,
  onAddTrigger,
  onEditTrigger,
  onRemoveTrigger,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Core');

  const handleTriggerSelect = (triggerType: TriggerType) => {
    // Create a new trigger with default configuration
    const newTrigger: WorkflowTrigger = {
      id: `trigger-${Date.now()}`,
      type: triggerType,
      name: `${triggerType.charAt(0).toUpperCase() + triggerType.slice(1)} Trigger`,
      configuration: getDefaultConfiguration(triggerType),
      isActive: true,
    };
    
    onAddTrigger(newTrigger);
    setIsDialogOpen(false);
  };

  const getDefaultConfiguration = (type: TriggerType) => {
    switch (type) {
      case 'webhook':
        return {
          path: `/webhook/${Math.random().toString(36).substring(2, 15)}`,
          httpMethod: 'POST' as const,
          authentication: 'none' as const,
          responseMode: 'immediately' as const,
          responseCode: 200,
        };
      case 'schedule':
        return {
          cronExpression: '0 9 * * 1-5', // 9 AM weekdays
          timezone: 'UTC',
        };
      case 'api':
        return {
          endpoint: '/api/trigger',
          method: 'POST' as const,
          authentication: 'bearer' as const,
        };
      case 'event':
        return {
          eventType: 'custom',
          eventFilters: {},
        };
      default:
        return {};
    }
  };

  const getCategories = () => {
    const categories = [...new Set(triggerTypes.map(t => t.category))];
    return categories;
  };

  const filteredTriggers = triggerTypes.filter(t => t.category === selectedCategory);

  return (
    <Box>
      {/* Current Triggers */}
      <Box mb={3}>
        <Typography variant="h6" gutterBottom>
          Workflow Triggers
        </Typography>
        
        {triggers.length === 0 ? (
          <Box 
            p={3} 
            border="2px dashed" 
            borderColor="grey.300" 
            borderRadius={2}
            textAlign="center"
          >
            <Typography color="text.secondary" mb={2}>
              No triggers configured. Add a trigger to start your workflow.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsDialogOpen(true)}
            >
              Add Your First Trigger
            </Button>
          </Box>
        ) : (
          <Box>
            {triggers.map((trigger) => (
              <Box
                key={trigger.id}
                p={2}
                mb={2}
                border="1px solid"
                borderColor="grey.300"
                borderRadius={2}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box display="flex" alignItems="center">
                  <Box mr={2}>
                    {triggerTypes.find(t => t.type === trigger.type)?.icon}
                  </Box>
                  <Box>
                    <Typography variant="subtitle1">
                      {trigger.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {triggerTypes.find(t => t.type === trigger.type)?.description}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Chip
                    label={trigger.isActive ? 'Active' : 'Inactive'}
                    color={trigger.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>
            ))}
            
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setIsDialogOpen(true)}
              sx={{ mt: 1 }}
            >
              Add Another Trigger
            </Button>
          </Box>
        )}
      </Box>

      {/* Add Trigger Dialog */}
      <Dialog 
        open={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Choose a Trigger Type
        </DialogTitle>
        <DialogContent>
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Triggers determine when your workflow starts. You can add multiple triggers to the same workflow.
            </Typography>
            
            {/* Category Tabs */}
            <Box mb={3}>
              {getCategories().map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'contained' : 'outlined'}
                  onClick={() => setSelectedCategory(category)}
                  sx={{ mr: 1, mb: 1 }}
                  size="small"
                >
                  {category}
                </Button>
              ))}
            </Box>
          </Box>

          {/* Trigger Options */}
          <Grid container spacing={2}>
            {filteredTriggers.map((triggerType) => (
              <Grid item xs={12} sm={6} key={triggerType.type}>
                <Box
                  component="button"
                  p={2}
                  border="1px solid"
                  borderColor="grey.300"
                  borderRadius={2}
                  width="100%"
                  textAlign="left"
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: 'background.paper',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'action.hover',
                    },
                  }}
                  onClick={() => handleTriggerSelect(triggerType.type)}
                >
                  <Box display="flex" alignItems="flex-start">
                    <Box mr={2} color="primary.main">
                      {triggerType.icon}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" component="div">
                        {triggerType.title}
                        {triggerType.isPremium && (
                          <Chip label="Premium" size="small" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {triggerType.description}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TriggerManager;