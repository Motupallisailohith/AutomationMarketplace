import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import axios, { type AxiosInstance } from 'axios';
import type {
	IExecuteResponsePromiseData,
	IWorkflowExecutionDataProcess,
	IRun,
} from 'n8n-workflow';

interface OrchestratorConfig {
	host: string;
	port: number;
	protocol: 'http' | 'https';
}

interface WorkflowExecutionRequest {
	workflowId: string;
	executionId: string;
	executionData: IWorkflowExecutionDataProcess;
	userId?: string;
}

interface WorkflowExecutionResponse {
	success: boolean;
	executionId: string;
	temporalWorkflowId?: string;
	error?: string;
}

interface ExecutionStatusResponse {
	executionId: string;
	status: 'running' | 'success' | 'failed' | 'waiting' | 'cancelled';
	data?: IRun;
	error?: string;
}

@Service()
export class OrchestratorClientService {
	private client: AxiosInstance;
	private readonly config: OrchestratorConfig;

	constructor(private readonly logger: Logger) {
		this.config = {
			host: process.env.ORCHESTRATOR_HOST || 'localhost',
			port: parseInt(process.env.ORCHESTRATOR_PORT || '8080', 10),
			protocol: (process.env.ORCHESTRATOR_PROTOCOL || 'http') as 'http' | 'https',
		};

		const baseURL = `${this.config.protocol}://${this.config.host}:${this.config.port}`;

		this.client = axios.create({
			baseURL,
			timeout: 30000, // 30 seconds
			headers: {
				'Content-Type': 'application/json',
			},
		});

		this.logger.info('Orchestrator client initialized', {
			baseURL,
		});
	}

	/**
	 * Execute a workflow via the Go orchestrator
	 */
	async executeWorkflow(request: WorkflowExecutionRequest): Promise<WorkflowExecutionResponse> {
		try {
			this.logger.debug('Sending workflow execution request to orchestrator', {
				workflowId: request.workflowId,
				executionId: request.executionId,
			});

			const response = await this.client.post<WorkflowExecutionResponse>(
				'/api/workflows/execute',
				request,
			);

			this.logger.info('Workflow execution started successfully', {
				workflowId: request.workflowId,
				executionId: request.executionId,
				temporalWorkflowId: response.data.temporalWorkflowId,
			});

			return response.data;
		} catch (error) {
			this.logger.error('Failed to execute workflow via orchestrator', {
				workflowId: request.workflowId,
				executionId: request.executionId,
				error: error instanceof Error ? error.message : String(error),
			});

			throw new Error(
				`Orchestrator execution failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Get execution status from the orchestrator
	 */
	async getExecutionStatus(executionId: string): Promise<ExecutionStatusResponse> {
		try {
			const response = await this.client.get<ExecutionStatusResponse>(
				`/api/executions/${executionId}/status`,
			);

			return response.data;
		} catch (error) {
			this.logger.error('Failed to get execution status from orchestrator', {
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});

			throw new Error(
				`Failed to get execution status: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Cancel a running workflow execution
	 */
	async cancelExecution(executionId: string): Promise<void> {
		try {
			await this.client.post(`/api/executions/${executionId}/cancel`);

			this.logger.info('Workflow execution cancelled', { executionId });
		} catch (error) {
			this.logger.error('Failed to cancel execution', {
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});

			throw new Error(
				`Failed to cancel execution: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Stream execution updates via Server-Sent Events
	 */
	async streamExecutionUpdates(
		executionId: string,
		onUpdate: (data: ExecutionStatusResponse) => void,
	): Promise<void> {
		// This would use EventSource or similar for SSE
		// For now, implement polling as a fallback
		const pollInterval = setInterval(async () => {
			try {
				const status = await this.getExecutionStatus(executionId);
				onUpdate(status);

				// Stop polling if execution is complete
				if (['success', 'failed', 'cancelled'].includes(status.status)) {
					clearInterval(pollInterval);
				}
			} catch (error) {
				this.logger.error('Error polling execution status', {
					executionId,
					error: error instanceof Error ? error.message : String(error),
				});
				clearInterval(pollInterval);
			}
		}, 2000); // Poll every 2 seconds
	}

	/**
	 * Health check for the orchestrator service
	 */
	async healthCheck(): Promise<boolean> {
		try {
			await this.client.get('/health');
			return true;
		} catch (error) {
			this.logger.warn('Orchestrator health check failed', {
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}

	/**
	 * Get orchestrator metrics
	 */
	async getMetrics(): Promise<Record<string, any>> {
		try {
			const response = await this.client.get('/metrics');
			return response.data;
		} catch (error) {
			this.logger.error('Failed to get orchestrator metrics', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}
}
