import React from 'react';
import {
  Container,
  Typography,
  Box,
} from '@mui/material';

const ExecutionHistory: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Execution History
      </Typography>
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="body1" color="text.secondary">
          Execution history will be displayed here.
        </Typography>
      </Box>
    </Container>
  );
};

export default ExecutionHistory;