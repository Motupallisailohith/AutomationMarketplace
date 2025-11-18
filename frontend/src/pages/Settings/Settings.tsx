import React from 'react';
import {
  Container,
  Typography,
  Box,
} from '@mui/material';

const Settings: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="body1" color="text.secondary">
          Settings panel will be displayed here.
        </Typography>
      </Box>
    </Container>
  );
};

export default Settings;