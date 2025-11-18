import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from '../shared/logger';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  email?: string;
  role?: string;
  subscriptions?: Set<string>;
}

interface WebSocketMessage {
  type: string;
  data?: any;
  subscriptionId?: string;
}

interface WorkflowExecutionUpdate {
  executionId: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  progress?: number;
  currentStep?: string;
  result?: any;
  error?: string;
  timestamp: string;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, AuthenticatedWebSocket> = new Map();
  private JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

  initialize(server: any) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this),
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    logger.info('WebSocket server initialized');
  }

  private verifyClient(info: { req: IncomingMessage }): boolean {
    try {
      const url = new URL(info.req.url || '', 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        logger.warn('WebSocket connection rejected: No token provided');
        return false;
      }

      jwt.verify(token, this.JWT_SECRET);
      return true;
    } catch (error) {
      logger.warn('WebSocket connection rejected: Invalid token', {
        error: (error as Error).message,
      });
      return false;
    }
  }

  private handleConnection(ws: AuthenticatedWebSocket, req: IncomingMessage) {
    try {
      const url = new URL(req.url || '', 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(1008, 'Token required');
        return;
      }

      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      ws.userId = decoded.userId;
      ws.email = decoded.email;
      ws.role = decoded.role;
      ws.subscriptions = new Set();

      // Add to clients map
      if (ws.userId) {
        this.clients.set(ws.userId, ws);
      }

      logger.info('WebSocket client connected', {
        userId: ws.userId,
        email: ws.email,
        totalClients: this.clients.size,
      });

      // Send welcome message
      this.sendMessage(ws, {
        type: 'connection',
        data: {
          message: 'Connected to AutomationMarketplace WebSocket',
          userId: ws.userId,
          timestamp: new Date().toISOString(),
        },
      });

      // Handle messages
      ws.on('message', (message: Buffer) => {
        this.handleMessage(ws, message);
      });

      // Handle disconnect
      ws.on('close', () => {
        this.clients.delete(ws.userId!);
        logger.info('WebSocket client disconnected', {
          userId: ws.userId,
          totalClients: this.clients.size,
        });
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error('WebSocket error:', {
          userId: ws.userId,
          error: error.message,
        });
      });

      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

    } catch (error) {
      logger.error('WebSocket connection error:', {
        error: (error as Error).message,
      });
      ws.close(1011, 'Internal error');
    }
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: Buffer) {
    try {
      const parsedMessage: WebSocketMessage = JSON.parse(message.toString());

      logger.debug('WebSocket message received', {
        userId: ws.userId,
        type: parsedMessage.type,
      });

      switch (parsedMessage.type) {
        case 'subscribe':
          this.handleSubscription(ws, parsedMessage);
          break;
        case 'unsubscribe':
          this.handleUnsubscription(ws, parsedMessage);
          break;
        case 'ping':
          this.sendMessage(ws, { type: 'pong' });
          break;
        default:
          logger.warn('Unknown WebSocket message type', {
            userId: ws.userId,
            type: parsedMessage.type,
          });
      }
    } catch (error) {
      logger.error('Error handling WebSocket message:', {
        userId: ws.userId,
        error: (error as Error).message,
      });
    }
  }

  private handleSubscription(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    const { subscriptionId } = message;

    if (!subscriptionId) {
      this.sendMessage(ws, {
        type: 'error',
        data: { message: 'Subscription ID is required' },
      });
      return;
    }

    // Validate subscription format: workflowId, executionId, or userId
    const validFormats = [
      /^workflow-[a-f0-9-]{36}$/,  // workflow-{uuid}
      /^execution-[a-f0-9-]{36}$/, // execution-{uuid}
      /^user-[a-f0-9-]{36}$/,      // user-{uuid}
    ];

    const isValidFormat = validFormats.some(pattern => pattern.test(subscriptionId));
    
    if (!isValidFormat) {
      this.sendMessage(ws, {
        type: 'error',
        data: { message: 'Invalid subscription ID format' },
      });
      return;
    }

    // Check if user has permission for this subscription
    if (subscriptionId.startsWith('user-') && !subscriptionId.endsWith(ws.userId!)) {
      if (ws.role !== 'admin') {
        this.sendMessage(ws, {
          type: 'error',
          data: { message: 'Access denied to this subscription' },
        });
        return;
      }
    }

    ws.subscriptions!.add(subscriptionId);

    logger.info('WebSocket subscription added', {
      userId: ws.userId,
      subscriptionId,
      totalSubscriptions: ws.subscriptions!.size,
    });

    this.sendMessage(ws, {
      type: 'subscribed',
      data: {
        subscriptionId,
        message: 'Successfully subscribed to updates',
      },
    });
  }

  private handleUnsubscription(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    const { subscriptionId } = message;

    if (!subscriptionId) {
      this.sendMessage(ws, {
        type: 'error',
        data: { message: 'Subscription ID is required' },
      });
      return;
    }

    ws.subscriptions!.delete(subscriptionId);

    logger.info('WebSocket subscription removed', {
      userId: ws.userId,
      subscriptionId,
      totalSubscriptions: ws.subscriptions!.size,
    });

    this.sendMessage(ws, {
      type: 'unsubscribed',
      data: {
        subscriptionId,
        message: 'Successfully unsubscribed from updates',
      },
    });
  }

  private sendMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Public methods for sending updates

  public broadcastWorkflowExecutionUpdate(update: WorkflowExecutionUpdate) {
    const message: WebSocketMessage = {
      type: 'workflow_execution_update',
      data: update,
    };

    // Send to clients subscribed to this execution
    const executionSubscription = `execution-${update.executionId}`;
    const workflowSubscription = `workflow-${update.workflowId}`;

    for (const [userId, ws] of this.clients) {
      if (ws.subscriptions?.has(executionSubscription) || 
          ws.subscriptions?.has(workflowSubscription) ||
          ws.subscriptions?.has(`user-${userId}`)) {
        this.sendMessage(ws, message);
      }
    }

    logger.debug('Workflow execution update broadcasted', {
      executionId: update.executionId,
      status: update.status,
      clientsNotified: Array.from(this.clients.keys()).filter(userId => {
        const ws = this.clients.get(userId);
        return ws?.subscriptions?.has(executionSubscription) || 
               ws?.subscriptions?.has(workflowSubscription) ||
               ws?.subscriptions?.has(`user-${userId}`);
      }).length,
    });
  }

  public sendUserNotification(userId: string, notification: any) {
    const ws = this.clients.get(userId);
    if (ws) {
      this.sendMessage(ws, {
        type: 'notification',
        data: notification,
      });
    }
  }

  public broadcastSystemMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    const broadcastMessage: WebSocketMessage = {
      type: 'system_message',
      data: {
        message,
        level,
        timestamp: new Date().toISOString(),
      },
    };

    for (const ws of this.clients.values()) {
      this.sendMessage(ws, broadcastMessage);
    }

    logger.info('System message broadcasted', {
      message,
      level,
      clientsNotified: this.clients.size,
    });
  }

  public getConnectedClients(): string[] {
    return Array.from(this.clients.keys());
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public isUserConnected(userId: string): boolean {
    return this.clients.has(userId);
  }

  public disconnectUser(userId: string, reason?: string) {
    const ws = this.clients.get(userId);
    if (ws) {
      ws.close(1000, reason || 'Disconnected by server');
      this.clients.delete(userId);
      logger.info('User disconnected by server', { userId, reason });
    }
  }

  public close() {
    if (this.wss) {
      this.wss.close();
      logger.info('WebSocket server closed');
    }
  }
}

export const webSocketService = new WebSocketService();