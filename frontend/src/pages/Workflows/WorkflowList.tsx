import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WorkflowList from '../../features/workflows/WorkflowList';
import { useAppSelector, useAppDispatch } from '@app/stores/hooks';
import { fetchWorkflows, deleteWorkflow } from '@app/stores/slices/workflowSlice';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import type { Workflow } from '../../types/workflow';

const WorkflowListPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const workflows = useAppSelector(state => state.workflow.workflows);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);

  // Fetch workflows from API on component mount
  useEffect(() => {
    dispatch(fetchWorkflows());
  }, [dispatch]);

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
    navigate(`/workflow/${workflow.id}`);
  };

  const handleDelete = (workflowId: string) => {
    setWorkflowToDelete(workflowId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (workflowToDelete) {
      await dispatch(deleteWorkflow(workflowToDelete));
      // Refetch workflows to ensure list is up to date
      await dispatch(fetchWorkflows());
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setWorkflowToDelete(null);
  };

  const handleDuplicate = async (workflow: Workflow) => {
    // Create a copy with a new name
    const duplicatedWorkflow = {
      ...workflow,
      id: `workflow-${Date.now()}`,
      name: `${workflow.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Navigate to the editor with the duplicated workflow
    navigate(`/workflow/new`, { state: { workflow: duplicatedWorkflow } });
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
    <>
      <WorkflowList
        workflows={convertedWorkflows}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onRun={handleRun}
        onStop={handleStop}
      />
      
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Workflow?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this workflow? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WorkflowListPage;