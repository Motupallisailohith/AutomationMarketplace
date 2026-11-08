import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Activity, 
  Globe, 
  MessageSquare, 
  Terminal, 
  Zap,
  Database,
  Mail,
  FileText,
  Code,
  GitBranch,
  MoreVertical,
  Play,
  Trash2
} from 'lucide-react';

const ICONS: Record<string, React.ReactNode> = {
  'http': <Globe size={18} />,
  'webhook': <Zap size={18} />,
  'slack': <MessageSquare size={18} />,
  'gmail': <Mail size={18} />,
  'code': <Terminal size={18} />,
  'if': <GitBranch size={18} />,
  'set': <Code size={18} />,
  'mysql': <Database size={18} />,
  'postgres': <Database size={18} />,
  'mongodb': <Database size={18} />,
  'googleSheets': <FileText size={18} />,
  'default': <Activity size={18} />
};

const NODE_COLORS: Record<string, { bg: string; icon: string; border: string }> = {
  'webhook': { bg: 'from-orange-50 to-red-50', icon: 'text-orange-600', border: 'border-orange-200' },
  'http': { bg: 'from-blue-50 to-cyan-50', icon: 'text-blue-600', border: 'border-blue-200' },
  'slack': { bg: 'from-purple-50 to-pink-50', icon: 'text-purple-600', border: 'border-purple-200' },
  'gmail': { bg: 'from-red-50 to-pink-50', icon: 'text-red-600', border: 'border-red-200' },
  'code': { bg: 'from-green-50 to-teal-50', icon: 'text-green-600', border: 'border-green-200' },
  'if': { bg: 'from-yellow-50 to-amber-50', icon: 'text-yellow-600', border: 'border-yellow-200' },
  'database': { bg: 'from-indigo-50 to-blue-50', icon: 'text-indigo-600', border: 'border-indigo-200' },
  'default': { bg: 'from-gray-50 to-slate-50', icon: 'text-gray-600', border: 'border-gray-200' }
};

export const WorkflowNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeType = data.nodeType || 'default';
  const icon = ICONS[nodeType] || ICONS['default'];
  
  const colorScheme = NODE_COLORS[nodeType] || NODE_COLORS['default'];
  
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <div
      className={`
        relative group
        min-w-[220px] rounded-xl border-2 transition-all duration-200
        bg-white shadow-n8n-node hover:shadow-n8n-node-hover
        ${selected
          ? `${colorScheme.border} shadow-[0_0_0_4px_rgba(124,58,237,0.1)]`
          : 'border-gray-200 hover:border-purple-300'
        }
      `}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white rounded-full !-top-1.5 hover:!bg-purple-500 transition-all hover:scale-125"
      />

      {/* Node Content */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`
            flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center
            bg-gradient-to-br ${colorScheme.bg} ${colorScheme.icon}
            transition-all duration-200
            ${selected ? 'shadow-n8n-sm' : ''}
          `}>
            {icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase font-bold tracking-wider text-n8n-text-muted mb-1">
              {nodeType}
            </div>
            <div className="font-semibold text-n8n-text-primary text-sm leading-tight">
              {data.label || data.nodeType}
            </div>
          </div>

          {/* Action Menu */}
          <div className={`
            transition-opacity duration-200
            ${showMenu ? 'opacity-100' : 'opacity-0'}
          `}>
            <button className="p-1 hover:bg-n8n-bg rounded text-n8n-text-muted hover:text-n8n-text-primary transition-all">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* Parameters indicator */}
        {data.parameters && Object.keys(data.parameters).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-n8n-text-muted font-medium">
              {Object.keys(data.parameters).length} parameter{Object.keys(data.parameters).length !== 1 ? 's' : ''} configured
            </span>
          </div>
        )}

        {/* Status badge (for execution state) */}
        {data.execution?.running && (
          <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-medium">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            Running...
          </div>
        )}
        {data.execution?.status === 'completed' && (
          <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            Completed — audit event recorded
          </div>
        )}
      </div>

      {/* Quick Actions (on hover) */}
      <div className={`
        absolute -bottom-10 left-1/2 transform -translate-x-1/2
        flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-n8n-md p-1
        transition-opacity duration-200
        ${showMenu ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}>
        <button 
          className="p-1.5 hover:bg-blue-50 text-blue-600 rounded transition-all"
          title="Execute node"
        >
          <Play size={14} />
        </button>
        <div className="w-px h-4 bg-gray-200"></div>
        <button 
          className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-all"
          title="Delete node"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white rounded-full !-bottom-1.5 hover:!bg-purple-500 transition-all hover:scale-125"
      />
    </div>
  );
};
