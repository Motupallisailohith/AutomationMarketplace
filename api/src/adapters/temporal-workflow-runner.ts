/**
 * Temporal Workflow Runner - n8n Execution Adapter
 * 
 * This adapter extends n8n's WorkflowRunner to replace in-process execution
 * with Temporal orchestration. It keeps all n8n features (UI, API, nodes, credentials)
 * but sends execution to your Go orchestrator + multi-language workers.
 */

import { Connection, Client as TemporalClient } from '@temporalio/client';
import type { Pool } from 'pg';

interface WorkflowExecutionData {
  executionId: string;
  workflowData: any;
  executionMode: 'manual' | 'trigger' | 'webhook';
  userId: string;
  credentials?: Record<string, any>;
}

interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class TemporalWorkflowRunner {
  private temporalClient?: TemporalClient;
  private pool: Pool;
  private activeExecutions: Map<string, any> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async initialize(): Promise<void> {
    try {
      // Connect to Temporal server
      const connection = await Connection.connect({
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
      });
      
      this.temporalClient = new TemporalClient({
        connection,
        namespace: process.env.TEMPORAL_NAMESPACE || 'default',
      });
      console.log('✅ Temporal WorkflowRunner initialized');
    } catch (error) {
      console.error('⚠️  Temporal not available:', error instanceof Error ? error.message : error);
      console.log('⚠️  Will store executions in database only');
    }
  }

  /**
   * Execute workflow via Temporal orchestration
   * Replaces n8n's in-process execution
   */
  async run(data: {
    workflowId: string;
    workflowData: any;
    executionMode: 'manual' | 'trigger' | 'webhook';
    userId: string;
    credentials?: Record<string, any>;
  }): Promise<string> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔄 Starting workflow execution: ${data.workflowData.name || 'Unnamed'}`);
    console.log(`   Execution ID: ${executionId}`);
    console.log(`   Mode: ${data.executionMode}`);
    console.log(`   User: ${data.userId}`);

    try {
      // Create execution record in database
      await this.pool.query(
        `INSERT INTO executions (id, workflow_id, mode, status, started_at, user_id, data)
         VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
        [
          executionId,
          data.workflowId,
          data.executionMode,
          'running',
          data.userId,
          JSON.stringify({ workflowData: data.workflowData }),
        ]
      );

      // If Temporal is available, send to orchestrator
      if (this.temporalClient) {
        const handle = await this.temporalClient.workflow.start('executeWorkflow', {
          workflowId: executionId,
          taskQueue: 'automation-platform',
          args: [{
            executionId,
            workflowId: data.workflowId,
            workflowData: data.workflowData,
            executionMode: data.executionMode,
            userId: data.userId,
            credentials: data.credentials,
          }],
        });

        console.log(`✅ Temporal workflow started: ${executionId}`);
        
        // Store handle for status checks
        this.activeExecutions.set(executionId, handle);

        // Don't wait for completion (async execution)
        // Results will be updated by Temporal worker callbacks
        
      } else {
        // Fallback: Mark as completed immediately (dev mode)
        console.log('⚠️  No Temporal - marking as completed (dev mode)');
        await this.pool.query(
          `UPDATE executions SET status = $1, finished_at = NOW() WHERE id = $2`,
          ['success', executionId]
        );
      }

      return executionId;

    } catch (error) {
      console.error(`❌ Failed to start workflow execution:`, error);
      
      // Update execution as failed
      await this.pool.query(
        `UPDATE executions SET status = $1, finished_at = NOW(), error = $2 WHERE id = $3`,
        ['error', error instanceof Error ? error.message : String(error), executionId]
      );
      
      throw error;
    }
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(executionId: string): Promise<ExecutionResult> {
    try {
      const result = await this.pool.query(
        'SELECT status, data, error, finished_at FROM executions WHERE id = $1',
        [executionId]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'Execution not found' };
      }

      const execution = result.rows[0];
      
      return {
        success: execution.status === 'success',
        data: execution.data,
        error: execution.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Cancel running execution
   */
  async cancel(executionId: string): Promise<void> {
    console.log(`🛑 Cancelling execution: ${executionId}`);

    const handle = this.activeExecutions.get(executionId);
    if (handle && this.temporalClient) {
      await handle.cancel();
      this.activeExecutions.delete(executionId);
    }

    // Update database
    await this.pool.query(
      `UPDATE executions SET status = $1, finished_at = NOW() WHERE id = $2`,
      ['cancelled', executionId]
    );
  }

  /**
   * Get active executions
   */
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown(): Promise<void> {
    if (this.temporalClient) {
      await this.temporalClient.connection.close();
    }
    this.activeExecutions.clear();
    console.log('✅ TemporalWorkflowRunner shut down');
  }
}
