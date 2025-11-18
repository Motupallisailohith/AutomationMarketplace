import React from 'react';
import WorkflowList from '../../components/WorkflowList';
import { useAppSelector } from '../../store/hooks';
import type { Workflow } from '../../types/workflow';

const WorkflowListPage: React.FC = () => {
  const workflows = useAppSelector(state => state.workflow.workflows);

  // Convert WorkflowDefinition to Workflow format for the component
  const convertedWorkflows: Workflow[] = workflows.map(def => ({
    id: def.id,
    name: def.name,
    description: def.description,
    active: true, // Default to active
    nodes: {}, // Convert from steps if needed
    edges: [], // Convert from dependencies if needed
    triggers: def.triggers || [],
    settings: def.settings,
    createdAt: def.createdAt || new Date().toISOString(),
    updatedAt: def.updatedAt || new Date().toISOString(),
    createdBy: def.createdBy || 'unknown',
  }));

  const handleEdit = (workflow: Workflow) => {
    // Navigate to edit page
    console.log('Edit workflow:', workflow);
  };

  const handleDelete = (workflowId: string) => {
    // Delete workflow
    console.log('Delete workflow:', workflowId);
  };

  const handleDuplicate = (workflow: Workflow) => {
    // Duplicate workflow
    console.log('Duplicate workflow:', workflow);
  };

  const handleRun = (workflowId: string) => {
    // Run workflow
    console.log('Run workflow:', workflowId);
  };

  const handleStop = (executionId: string) => {
    // Stop execution
    console.log('Stop execution:', executionId);
  };

  return (
    <WorkflowList
      workflows={convertedWorkflows}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onDuplicate={handleDuplicate}
      onRun={handleRun}
      onStop={handleStop}
    />
  );
};

export default WorkflowListPage;