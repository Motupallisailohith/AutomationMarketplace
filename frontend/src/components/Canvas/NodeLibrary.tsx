import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Globe, 
  MessageSquare, 
  Terminal, 
  Zap, 
  Activity, 
  Database,
  Mail,
  Calendar,
  FileText,
  Code,
  GitBranch,
  Cloud,
  Lock,
  Users,
  TrendingUp,
  Filter
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface NodeTypeStub {
  name: string;
  displayName: string;
  icon: string;
  category: string;
  categories?: string[];
  description?: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  'globe': <Globe size={18} />,
  'message-square': <MessageSquare size={18} />,
  'terminal': <Terminal size={18} />,
  'zap': <Zap size={18} />,
  'database': <Database size={18} />,
  'mail': <Mail size={18} />,
  'calendar': <Calendar size={18} />,
  'file-text': <FileText size={18} />,
  'code': <Code size={18} />,
  'git-branch': <GitBranch size={18} />,
  'cloud': <Cloud size={18} />,
  'lock': <Lock size={18} />,
  'users': <Users size={18} />,
  'trending-up': <TrendingUp size={18} />,
  'default': <Activity size={18} />
};

const MOCK_NODES: NodeTypeStub[] = [
  { name: 'webhook', displayName: 'Webhook', icon: 'zap', category: 'Trigger', description: 'Receive HTTP requests' },
  { name: 'http', displayName: 'HTTP Request', icon: 'globe', category: 'Action', description: 'Make HTTP requests' },
  { name: 'slack', displayName: 'Slack', icon: 'message-square', category: 'Communication', description: 'Send messages to Slack' },
  { name: 'gmail', displayName: 'Gmail', icon: 'mail', category: 'Communication', description: 'Work with Gmail' },
  { name: 'googleSheets', displayName: 'Google Sheets', icon: 'file-text', category: 'Productivity', description: 'Work with spreadsheets' },
  { name: 'code', displayName: 'Code', icon: 'terminal', category: 'Core', description: 'Run JavaScript code' },
  { name: 'if', displayName: 'IF', icon: 'git-branch', category: 'Flow', description: 'Conditional routing' },
  { name: 'set', displayName: 'Set', icon: 'code', category: 'Core', description: 'Set node data' },
  { name: 'mysql', displayName: 'MySQL', icon: 'database', category: 'Database', description: 'Work with MySQL' },
  { name: 'postgres', displayName: 'PostgreSQL', icon: 'database', category: 'Database', description: 'Work with PostgreSQL' },
  { name: 'mongodb', displayName: 'MongoDB', icon: 'database', category: 'Database', description: 'Work with MongoDB' },
  { name: 'airtable', displayName: 'Airtable', icon: 'file-text', category: 'Productivity', description: 'Work with Airtable' },
  { name: 'aws', displayName: 'AWS', icon: 'cloud', category: 'Cloud', description: 'Amazon Web Services' },
  { name: 'notion', displayName: 'Notion', icon: 'file-text', category: 'Productivity', description: 'Work with Notion' },
  { name: 'hubspot', displayName: 'HubSpot', icon: 'users', category: 'CRM', description: 'HubSpot integration' },
  { name: 'stripe', displayName: 'Stripe', icon: 'trending-up', category: 'Payment', description: 'Payment processing' },
];

export const NodeLibrary: React.FC = () => {
  const [nodes, setNodes] = useState<NodeTypeStub[]>([]);
  const [filteredNodes, setFilteredNodes] = useState<NodeTypeStub[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/types/nodes.json`);
        setNodes(response.data);
        setFilteredNodes(response.data);
        setError(null);
      } catch (error) {
        console.error('Failed to fetch nodes:', error);
        setError('Failed to load nodes');
        // Use mock data as fallback
        setNodes(MOCK_NODES);
        setFilteredNodes(MOCK_NODES);
      } finally {
        setLoading(false);
      }
    };
    fetchNodes();
  }, []);

  // Get all unique categories from nodes
  const categories = ['All', ...Array.from(new Set(
    nodes.flatMap(n => n.categories || [n.category]).filter(Boolean)
  ))];

  useEffect(() => {
    let filtered = nodes;
    
    if (searchQuery) {
      filtered = filtered.filter(node => 
        node.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(node => 
        (node.categories?.includes(selectedCategory) || node.category === selectedCategory)
      );
    }
    
    setFilteredNodes(filtered);
  }, [searchQuery, selectedCategory, nodes]);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-n8n-sm z-20">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-n8n-text-primary uppercase tracking-wider mb-3">
          Nodes {!loading && `(${nodes.length})`}
        </h3>
        
        {/* Error Message */}
        {error && (
          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            {error} - Using fallback data
          </div>
        )}
        
        {/* Loading State */}
        {loading && (
          <div className="mb-3 text-sm text-gray-500 text-center py-2">
            Loading nodes...
          </div>
        )}
        
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-n8n-text-muted" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-n8n-bg border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-n8n-secondary focus:ring-2 focus:ring-purple-100 transition-all"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 py-3 border-b border-gray-100 bg-n8n-bg/30">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-n8n-text-muted" />
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-n8n-secondary text-white shadow-n8n-sm'
                  : 'bg-white text-n8n-text-secondary hover:bg-n8n-bg border border-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Nodes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="text-center py-8 text-n8n-text-muted text-sm">Loading nodes...</div>
        ) : filteredNodes.length === 0 ? (
          <div className="text-center py-8 text-n8n-text-muted text-sm">No nodes found</div>
        ) : (
          filteredNodes.map((node) => (
            <div
              key={node.name}
              className="group flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-grab hover:border-n8n-secondary hover:shadow-n8n-node transition-all active:cursor-grabbing"
              draggable
              onDragStart={(e) => onDragStart(e, node.name)}
            >
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg flex items-center justify-center text-n8n-secondary group-hover:from-purple-100 group-hover:to-pink-100 transition-all">
                {ICON_MAP[node.icon] || ICON_MAP['default']}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-n8n-text-primary truncate">{node.displayName}</span>
                  <span className="flex-shrink-0 text-[10px] px-2 py-0.5 bg-n8n-bg text-n8n-text-muted rounded-full font-medium">
                    {node.category}
                  </span>
                </div>
                {node.description && (
                  <p className="text-xs text-n8n-text-muted mt-1 line-clamp-2">{node.description}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-n8n-bg/30">
        <p className="text-xs text-n8n-text-muted text-center">
          <span className="font-semibold">{filteredNodes.length}</span> nodes available
        </p>
        <p className="text-xs text-n8n-text-muted text-center mt-1">
          Drag nodes to canvas to use
        </p>
      </div>
    </div>
  );
};