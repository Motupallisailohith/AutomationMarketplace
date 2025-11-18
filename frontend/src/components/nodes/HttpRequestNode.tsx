import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Http,
  PlayArrow,
  Stop,
  Error,
  CheckCircle,
} from '@mui/icons-material';

interface HttpRequestData {
  label?: string;
  method?: string;
  url?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed';
}

const HttpRequestNode: React.FC<NodeProps<HttpRequestData>> = ({ data, selected }) => {
  const getStatusIcon = () => {
    switch (data.status) {
      case 'running':
        return <PlayArrow color="primary" />;
      case 'completed':
        return <CheckCircle color="success" />;
      case 'failed':
        return <Error color="error" />;
      default:
        return <Http />;
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
        minWidth: 200,
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
            {data.label || 'HTTP Request'}
          </Typography>
        </Box>
        
        {data.method && (
          <Chip
            label={data.method.toUpperCase()}
            size="small"
            color={getStatusColor()}
            sx={{ mb: 1, fontSize: '0.7rem' }}
          />
        )}
        
        {data.url && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {data.url}
          </Typography>
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

export default HttpRequestNode;