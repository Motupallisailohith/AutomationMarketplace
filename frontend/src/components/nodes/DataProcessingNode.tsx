import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  LinearProgress,
} from '@mui/material';
import {
  Transform,
  PlayArrow,
  Stop,
  Error,
  CheckCircle,
} from '@mui/icons-material';

interface DataProcessingData {
  label?: string;
  operation?: string;
  inputType?: string;
  outputType?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed';
  progress?: number;
}

const DataProcessingNode: React.FC<NodeProps<DataProcessingData>> = ({ data, selected }) => {
  const getStatusIcon = () => {
    switch (data.status) {
      case 'running':
        return <PlayArrow color="primary" />;
      case 'completed':
        return <CheckCircle color="success" />;
      case 'failed':
        return <Error color="error" />;
      default:
        return <Transform />;
    }
  };

  const getStatusColor = () => {
    switch (data.status) {
      case 'running':
        return 'primary';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Card
      sx={{
        minWidth: 220,
        border: selected ? 2 : 1,
        borderColor: selected ? 'primary.main' : 'divider',
        borderStyle: 'solid',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: 2,
        },
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#555',
        }}
      />
      
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <IconButton size="small" sx={{ mr: 1, p: 0.5 }}>
            {getStatusIcon()}
          </IconButton>
          <Typography variant="subtitle2" fontWeight="bold">
            {data.label || 'Data Processing'}
          </Typography>
        </Box>
        
        {data.operation && (
          <Chip
            label={data.operation}
            size="small"
            color={getStatusColor()}
            sx={{ mb: 1, fontSize: '0.7rem' }}
          />
        )}
        
        <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
          {data.inputType && (
            <Chip
              label={`In: ${data.inputType}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.6rem' }}
            />
          )}
          {data.outputType && (
            <Chip
              label={`Out: ${data.outputType}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.6rem' }}
            />
          )}
        </Box>
        
        {data.status === 'running' && data.progress !== undefined && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={data.progress}
              sx={{ height: 4, borderRadius: 2 }}
            />
            <Typography variant="caption" color="text.secondary">
              {data.progress}% complete
            </Typography>
          </Box>
        )}
      </CardContent>
      
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#555',
        }}
      />
    </Card>
  );
};

export default DataProcessingNode;