import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';

interface Variable {
  id: string;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean';
  isSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

const Variables = () => {
  const [variables, setVariables] = useState<Variable[]>([
    {
      id: '1',
      key: 'API_KEY',
      value: 'sk-1234567890abcdef',
      type: 'string',
      isSecret: true,
      createdAt: '2025-12-29T00:00:00Z',
      updatedAt: '2025-12-29T00:00:00Z',
    },
    {
      id: '2',
      key: 'DATABASE_URL',
      value: 'postgresql://localhost:5432/mydb',
      type: 'string',
      isSecret: true,
      createdAt: '2025-12-29T00:00:00Z',
      updatedAt: '2025-12-29T00:00:00Z',
    },
    {
      id: '3',
      key: 'MAX_RETRIES',
      value: '3',
      type: 'number',
      isSecret: false,
      createdAt: '2025-12-29T00:00:00Z',
      updatedAt: '2025-12-29T00:00:00Z',
    },
  ]);

  const [openDialog, setOpenDialog] = useState(false);
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);
  const [formData, setFormData] = useState({ key: '', value: '', type: 'string' as const, isSecret: false });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedVariable, setSelectedVariable] = useState<string | null>(null);
  const [revealedVariables, setRevealedVariables] = useState<Set<string>>(new Set());

  const handleOpenDialog = (variable?: Variable) => {
    if (variable) {
      setEditingVariable(variable);
      setFormData({
        key: variable.key,
        value: variable.value,
        type: variable.type,
        isSecret: variable.isSecret,
      });
    } else {
      setEditingVariable(null);
      setFormData({ key: '', value: '', type: 'string', isSecret: false });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingVariable(null);
    setFormData({ key: '', value: '', type: 'string', isSecret: false });
  };

  const handleSave = () => {
    if (editingVariable) {
      setVariables(variables.map(v => 
        v.id === editingVariable.id 
          ? { ...v, ...formData, updatedAt: new Date().toISOString() }
          : v
      ));
    } else {
      setVariables([
        ...variables,
        {
          id: Date.now().toString(),
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    }
    handleCloseDialog();
  };

  const handleDelete = (id: string) => {
    setVariables(variables.filter(v => v.id !== id));
    setAnchorEl(null);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, variableId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedVariable(variableId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedVariable(null);
  };

  const toggleReveal = (id: string) => {
    const newRevealed = new Set(revealedVariables);
    if (newRevealed.has(id)) {
      newRevealed.delete(id);
    } else {
      newRevealed.add(id);
    }
    setRevealedVariables(newRevealed);
  };

  const maskValue = (value: string) => {
    return '•'.repeat(Math.min(value.length, 20));
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Variables
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage environment variables and secrets for your workflows
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Add Variable
        </Button>
      </Box>

      {/* Info Card */}
      <Card sx={{ mb: 3, bgcolor: 'info.lighter' }}>
        <CardContent>
          <Typography variant="body2" color="info.main">
            Variables can be used in your workflows using the syntax: <code>{'$env.VARIABLE_NAME'}</code>
          </Typography>
        </CardContent>
      </Card>

      {/* Variables Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Key</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {variables.map((variable) => (
              <TableRow key={variable.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontFamily="monospace">{variable.key}</Typography>
                    {variable.isSecret && (
                      <Chip label="Secret" size="small" color="warning" />
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontFamily="monospace">
                      {variable.isSecret && !revealedVariables.has(variable.id)
                        ? maskValue(variable.value)
                        : variable.value}
                    </Typography>
                    {variable.isSecret && (
                      <IconButton size="small" onClick={() => toggleReveal(variable.id)}>
                        {revealedVariables.has(variable.id) ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip label={variable.type} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  {new Date(variable.updatedAt).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={(e) => handleMenuClick(e, variable.id)}>
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {variables.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No variables yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            Add your first environment variable to get started
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Add Variable
          </Button>
        </Box>
      )}

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            const variable = variables.find(v => v.id === selectedVariable);
            if (variable) handleOpenDialog(variable);
            handleMenuClose();
          }}
        >
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedVariable) handleDelete(selectedVariable);
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingVariable ? 'Edit Variable' : 'Add Variable'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Key"
              fullWidth
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              placeholder="API_KEY"
              helperText="Use UPPER_SNAKE_CASE for variable names"
            />
            <TextField
              label="Value"
              fullWidth
              multiline
              rows={3}
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              type={formData.isSecret ? 'password' : 'text'}
            />
            <TextField
              select
              label="Type"
              fullWidth
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            >
              <MenuItem value="string">String</MenuItem>
              <MenuItem value="number">Number</MenuItem>
              <MenuItem value="boolean">Boolean</MenuItem>
            </TextField>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2">Mark as secret?</Typography>
              <Button
                size="small"
                variant={formData.isSecret ? 'contained' : 'outlined'}
                onClick={() => setFormData({ ...formData, isSecret: !formData.isSecret })}
              >
                {formData.isSecret ? 'Yes' : 'No'}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.key || !formData.value}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Variables;
