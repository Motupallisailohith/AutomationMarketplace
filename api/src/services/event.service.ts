/**
 * Event Service - Workflow event emission
 * Simplified version of n8n's EventService
 */

import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import type { User, WorkflowEntity } from '@n8n/db';

type WorkflowEvent = 'workflow-created' | 'workflow-saved' | 'workflow-deleted' | 'workflow-activated' | 'workflow-deactivated' | 'workflow-sharing-updated';

interface WorkflowCreatedEvent {
	user: User;
	workflow: WorkflowEntity;
	publicApi: boolean;
	projectId: string;
	projectType?: string;
	uiContext?: string;
}

interface WorkflowSavedEvent {
	user: User;
	workflow: WorkflowEntity;
	publicApi?: boolean;
	previousWorkflow?: WorkflowEntity;
	aiBuilderAssisted?: boolean;
	settingsChanged?: any;
}

interface WorkflowDeletedEvent {
	user: User;
	workflowId: string;
	workflow?: WorkflowEntity;
}

interface WorkflowActivatedEvent {
	user: User;
	workflowId: string;
	workflow: WorkflowEntity;
	publicApi?: boolean;
}

interface WorkflowDeactivatedEvent {
	user: User;
	workflowId: string;
	workflow: WorkflowEntity;
	publicApi?: boolean;
}

interface WorkflowSharingUpdatedEvent {
	workflowId: string;
	userIdSharer: string;
	userIdList: string[];
}

type EventData =
	| WorkflowCreatedEvent
	| WorkflowSavedEvent
	| WorkflowDeletedEvent
	| WorkflowActivatedEvent
	| WorkflowDeactivatedEvent
	| WorkflowSharingUpdatedEvent;

@Service()
export class EventService {
	constructor(private readonly logger: Logger) {}

	emit(event: WorkflowEvent, data: EventData): void {
		this.logger.info(`Event emitted: ${event}`, {
			event,
			...this.sanitizeEventData(data),
		});

		// In full n8n, this would:
		// 1. Send to message queue
		// 2. Send to analytics
		// 3. Trigger webhooks
		// 4. Update metrics

		// For now, just log
	}

	private sanitizeEventData(data: any): any {
		// Remove sensitive data before logging
		const sanitized = { ...data };
		
		if (sanitized.workflow) {
			sanitized.workflow = {
				id: sanitized.workflow.id,
				name: sanitized.workflow.name,
				active: sanitized.workflow.active,
			};
		}

		if (sanitized.user) {
			sanitized.user = {
				id: sanitized.user.id,
				email: sanitized.user.email,
			};
		}

		return sanitized;
	}
}
