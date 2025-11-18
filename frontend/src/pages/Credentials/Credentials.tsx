import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  FormControl,
  InputLabel,
  Avatar,
} from '@mui/material';
import {
  Add,
  Search,
  MoreVert,
  Edit,
  Delete,
  Key,
  Visibility,
  VisibilityOff,
  Lock,
} from '@mui/icons-material';

interface Credential {
  id: string;
  name: string;
  type: 'oauth' | 'api_key' | 'basic_auth' | 'bearer_token';
  service: string;
  createdAt: string;
  lastUsed: string;
  usageCount: number;
}

const Credentials = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCredential, setSelectedCredential] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  const credentials: Credential[] = [
    {
      id: '1',
      name: 'Salesforce Production',
      type: 'oauth',
      service: 'Salesforce',
      createdAt: '2024-01-15',
      lastUsed: '2 hours ago',
      usageCount: 1247,
    },
    {
      id: '2',
      name: 'SendGrid API',
      type: 'api_key',
      service: 'SendGrid',
      createdAt: '2024-01-10',
      lastUsed: '5 hours ago',
      usageCount: 856,
    },
    {
      id: '3',
      name: 'Stripe Payment Gateway',
      type: 'bearer_token',
      service: 'Stripe',
      createdAt: '2024-01-08',
      lastUsed: '1 day ago',
      usageCount: 423,
    },
    {
      id: '4',
      name: 'AWS S3 Storage',
      type: 'api_key',
      service: 'AWS',
      createdAt: '2024-01-05',
      lastUsed: '30 minutes ago',
      usageCount: 2341,
    },
  ];

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, credentialId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedCredential(credentialId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCredential(null);
  };

  const handleEdit = () => {
    console.log('Edit credential:', selectedCredential);
    handleMenuClose();
  };

  const handleDelete = () => {
    console.log('Delete credential:', selectedCredential);
    handleMenuClose();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'oauth':
        return '#6366F1';
      case 'api_key':
        return '#EC4899';
      case 'basic_auth':
        return '#10B981';
      case 'bearer_token':
        return '#F59E0B';
      default:
        return '#94A3B8';
    }
  };

  const getServiceIcon = (service: string) => {
    return service.charAt(0).toUpperCase();
  };

  const filteredCredentials = credentials.filter((credential) =>
    credential.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    credential.service.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight={700}>
            Credentials
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage API keys, OAuth tokens, and authentication credentials
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.4)',
          }}
        >
          Add Credential
        </Button>
      </Stack>

      {/* Search */}
      <TextField
        placeholder="Search credentials..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3, maxWidth: 500 }}
      />

      {/* Credentials Grid */}
      <Grid container spacing={3}>
        {filteredCredentials.map((credential) => (
          <Grid item xs={12} md={6} lg={4} key={credential.id}>
            <Card
              sx={{
                height: '100%',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                },
              }}
            >
              <CardContent>
                {/* Header */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      backgroundColor: getTypeColor(credential.type),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <Key />
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, credential.id)}
                  >
                    <MoreVert />
                  </IconButton>
                </Stack>

                {/* Title and Service */}
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {credential.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {credential.service}
                </Typography>

                {/* Type */}
                <Chip
                  label={credential.type.replace('_', ' ')}
                  size="small"
                  sx={{
                    backgroundColor: `${getTypeColor(credential.type)}15`,
                    color: getTypeColor(credential.type),
                    fontWeight: 500,
                    mb: 2,
                  }}
                />

                {/* Stats */}
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Usage Count
                    </Typography>
                    <Typography variant="caption" fontWeight={600}>
                      {credential.usageCount}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Last Used
                    </Typography>
                    <Typography variant="caption" fontWeight={600}>
                      {credential.lastUsed}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Created: {new Date(credential.createdAt).toLocaleDateString()}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Add Credential Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Credential</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Credential Name"
              fullWidth
              placeholder="e.g., Salesforce Production"
            />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select label="Type" defaultValue="">
                <MenuItem value="oauth">OAuth 2.0</MenuItem>
                <MenuItem value="api_key">API Key</MenuItem>
                <MenuItem value="basic_auth">Basic Auth</MenuItem>
                <MenuItem value="bearer_token">Bearer Token</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Service"
              fullWidth
              placeholder="e.g., Salesforce, SendGrid"
            />
            <TextField
              label="API Key / Token"
              type="password"
              fullWidth
              placeholder="Enter your credential"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => setOpenDialog(false)}
            sx={{
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            }}
          >
            Add Credential
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Credentials;