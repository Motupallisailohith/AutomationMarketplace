import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Play, Save, Zap, PanelLeft, PanelLeftClose } from 'lucide-react';
import { useAppSelector } from '@app/stores/hooks';

interface WorkflowHeaderProps {
  onLogout: () => void;
  onToggleLibrary: () => void;
  showLibrary: boolean;
  workflowName?: string;
  onSave?: () => void;
  onExecute?: () => void;
  executionLabel?: string;
}

export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({
  onLogout, onToggleLibrary, showLibrary, workflowName = 'My Workflow', onSave, onExecute, executionLabel = 'Execute',
}) => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm z-50">
      <div className="flex items-center gap-4 min-w-0">
        <button onClick={onToggleLibrary} className="p-2 text-n8n-text-secondary hover:bg-n8n-bg rounded-lg" title="Toggle node library">
          {showLibrary ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
        </button>
        <button onClick={() => navigate('/workflow/new')} className="flex items-center gap-2 min-w-0" title="Research workflow">
          <span className="w-9 h-9 rounded-lg bg-n8n-primary text-white grid place-items-center"><Zap size={20} fill="currentColor" /></span>
          <span className="hidden md:block text-left leading-tight">
            <strong className="block text-sm text-n8n-text-primary">AutomationMarketplace</strong>
            <span className="text-xs text-n8n-text-muted">Sandbox workflow studio</span>
          </span>
        </button>
        <span className="hidden lg:block border-l border-gray-200 pl-4 text-sm font-semibold text-n8n-text-primary truncate">{workflowName}</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onSave} className="px-3 py-2 bg-n8n-bg text-n8n-text-primary rounded-lg hover:bg-gray-200 font-medium text-sm flex items-center gap-2">
          <Save size={16} /> Save
        </button>
        <button onClick={onExecute} className="px-3 py-2 bg-n8n-primary text-white rounded-lg hover:bg-[#FF5744] font-semibold text-sm flex items-center gap-2 shadow-n8n">
          <Play size={16} fill="currentColor" /> {executionLabel}
        </button>
        <span className="hidden sm:block text-xs text-right ml-2">
          <strong className="block text-n8n-text-primary">{user?.firstName || 'Researcher'}</strong>
          <span className="text-n8n-text-muted">{user?.email || 'sandbox session'}</span>
        </span>
        <button onClick={onLogout} className="p-2 text-n8n-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg" title="Sign out"><LogOut size={18} /></button>
      </div>
    </header>
  );
};
