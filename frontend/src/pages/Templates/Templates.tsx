import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  TextField,
  InputAdornment,
  Grid,
  Chip,
  Button,
  Stack,
  Tab,
  Tabs,
} from '@mui/material';
import { Search, Add } from '@mui/icons-material';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: number;
  uses: number;
  imageUrl?: string;
}

const Templates = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);

  // Mock templates data
  const templates: Template[] = [
    {
      id: '1',
      name: 'Send Slack notification on new Gmail',
      description: 'Automatically send a Slack message when you receive important emails in Gmail',
      category: 'Productivity',
      nodes: 3,
      uses: 1234,
      imageUrl: 'https://via.placeholder.com/300x200',
    },
    {
      id: '2',
      name: 'Sync Google Sheets with Database',
      description: 'Keep your Google Sheets in sync with your PostgreSQL database',
      category: 'Data',
      nodes: 4,
      uses: 856,
      imageUrl: 'https://via.placeholder.com/300x200',
    },
    {
      id: '3',
      name: 'Twitter to Discord notifications',
      description: 'Post new tweets from specific accounts to your Discord channel',
      category: 'Social Media',
      nodes: 2,
      uses: 543,
      imageUrl: 'https://via.placeholder.com/300x200',
    },
  ];

  const categories = ['All', 'Productivity', 'Data', 'Social Media', 'Marketing', 'Development'];

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedTab === 0 || template.category === categories[selectedTab];
    return matchesSearch && matchesCategory;
  });

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Workflow Templates
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse and use pre-built workflow templates to get started quickly
        </Typography>
      </Box>

      {/* Search and Filter */}
      <Stack spacing={3} sx={{ mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />

        <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
          {categories.map((category) => (
            <Tab key={category} label={category} />
          ))}
        </Tabs>
      </Stack>

      {/* Templates Grid */}
      <Grid container spacing={3}>
        {filteredTemplates.map((template) => (
          <Grid item xs={12} sm={6} md={4} key={template.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardMedia
                component="div"
                sx={{
                  height: 160,
                  bgcolor: 'grey.200',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h6" color="text.secondary">
                  Template Preview
                </Typography>
              </CardMedia>
              <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>
                  {template.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flexGrow: 1 }}>
                  {template.description}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Chip label={template.category} size="small" color="primary" variant="outlined" />
                  <Typography variant="caption" color="text.secondary">
                    {template.nodes} nodes
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    • {template.uses} uses
                  </Typography>
                </Stack>
                <Button variant="contained" startIcon={<Add />} fullWidth>
                  Use Template
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredTemplates.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No templates found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Try adjusting your search or filter criteria
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default Templates;
