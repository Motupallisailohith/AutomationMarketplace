import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode, INodes } from 'n8n-workflow';

export interface WorkflowValidationResult {
  isValid: boolean;
  error?: string;
}

@Service()
export class WorkflowValidationService {
  constructor(private readonly workflowRepository: WorkflowRepository) {}

  validateNodes(nodes: INodes): WorkflowValidationResult {
    if (!nodes || Object.keys(nodes).length === 0) {
      return {
        isValid: false,
        error: 'Workflow must have at least one node',
      };
    }

    return { isValid: true };
  }

  validateWorkflowName(name: string): WorkflowValidationResult {
    if (!name || name.trim().length === 0) {
      return {
        isValid: false,
        error: 'Workflow name is required',
      };
    }

    if (name.length > 255) {
      return {
        isValid: false,
        error: 'Workflow name must be less than 255 characters',
      };
    }

    return { isValid: true };
  }

  validateForSave(workflow: { name: string; nodes?: any }): WorkflowValidationResult {
    const nameValidation = this.validateWorkflowName(workflow.name);
    if (!nameValidation.isValid) {
      return nameValidation;
    }

    return { isValid: true };
  }
}

// Export service instance
import { Container } from '@n8n/di';
export const workflowValidationService = Container.get(WorkflowValidationService);
