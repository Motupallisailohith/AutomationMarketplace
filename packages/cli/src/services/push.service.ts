import { injectable } from 'tsyringe';
import WebSocket from 'ws';
import http from 'http';
import { IPushMessage, PushEvents } from '../types';

@injectable()
export class PushService {
  private wss: WebSocket.Server | null = null;
  private clients = new Map<string, WebSocket>();

  /**
   * Initialize WebSocket server
   */
  init(server: http.Server, path: string = '/ws'): void {
    this.wss = new WebSocket.Server({
      server,
      path,
    });

    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      const sessionId = this.getSessionIdFromRequest(req);

      console.log(`WebSocket client connected: ${sessionId}`);
      this.clients.set(sessionId, ws);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(sessionId, data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket client disconnected: ${sessionId}`);
        this.clients.delete(sessionId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for ${sessionId}:`, error);
        this.clients.delete(sessionId);
      });

      // Send welcome message
      this.sendToClient(sessionId, {
        event: 'connected',
        data: { sessionId },
      });
    });

    console.log(`✅ WebSocket server initialized on ${path}`);
  }

  /**
   * Send message to specific client
   */
  sendToClient(sessionId: string, message: IPushMessage): void {
    const client = this.clients.get(sessionId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(message: IPushMessage): void {
    const payload = JSON.stringify(message);

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  /**
   * Send execution started event
   */
  sendExecutionStarted(executionId: string, workflowId: string, sessionId?: string): void {
    const message: IPushMessage = {
      event: PushEvents.EXECUTION_STARTED,
      data: {
        executionId,
        workflowId,
        timestamp: new Date().toISOString(),
      },
    };

    if (sessionId) {
      this.sendToClient(sessionId, message);
    } else {
      this.broadcast(message);
    }
  }

  /**
   * Send execution finished event
   */
  sendExecutionFinished(executionId: string, workflowId: string, status: string, sessionId?: string): void {
    const message: IPushMessage = {
      event: PushEvents.EXECUTION_FINISHED,
      data: {
        executionId,
        workflowId,
        status,
        timestamp: new Date().toISOString(),
      },
    };

    if (sessionId) {
      this.sendToClient(sessionId, message);
    } else {
      this.broadcast(message);
    }
  }

  /**
   * Send execution error event
   */
  sendExecutionError(executionId: string, workflowId: string, error: string, sessionId?: string): void {
    const message: IPushMessage = {
      event: PushEvents.EXECUTION_ERROR,
      data: {
        executionId,
        workflowId,
        error,
        timestamp: new Date().toISOString(),
      },
    };

    if (sessionId) {
      this.sendToClient(sessionId, message);
    } else {
      this.broadcast(message);
    }
  }

  /**
   * Send node executed event
   */
  sendNodeExecuted(executionId: string, nodeId: string, nodeName: string, sessionId?: string): void {
    const message: IPushMessage = {
      event: PushEvents.NODE_EXECUTED,
      data: {
        executionId,
        nodeId,
        nodeName,
        timestamp: new Date().toISOString(),
      },
    };

    if (sessionId) {
      this.sendToClient(sessionId, message);
    } else {
      this.broadcast(message);
    }
  }

  /**
   * Send workflow activation/deactivation events
   */
  sendWorkflowStatusChange(workflowId: string, active: boolean, sessionId?: string): void {
    const event = active ? PushEvents.WORKFLOW_ACTIVATED : PushEvents.WORKFLOW_DEACTIVATED;

    const message: IPushMessage = {
      event,
      data: {
        workflowId,
        active,
        timestamp: new Date().toISOString(),
      },
    };

    if (sessionId) {
      this.sendToClient(sessionId, message);
    } else {
      this.broadcast(message);
    }
  }

  /**
   * Get session ID from request
   */
  private getSessionIdFromRequest(req: http.IncomingMessage): string {
    // Extract from query string or generate new
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    return url.searchParams.get('sessionId') || `session-${Date.now()}-${Math.random()}`;
  }

  /**
   * Handle incoming messages from clients
   */
  private handleMessage(sessionId: string, data: any): void {
    console.log(`Received message from ${sessionId}:`, data);

    // You can add custom message handlers here
    switch (data.type) {
      case 'ping':
        this.sendToClient(sessionId, {
          event: 'pong',
          data: { timestamp: new Date().toISOString() },
        });
        break;

      default:
        console.log(`Unknown message type: ${data.type}`);
    }
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    this.clients.forEach((client) => {
      client.close();
    });
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
    }
  }
}
