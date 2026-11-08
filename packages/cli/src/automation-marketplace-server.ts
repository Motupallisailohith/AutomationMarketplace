import 'reflect-metadata';
import express, { Application } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { container } from 'tsyringe';
import { DataSource } from 'typeorm';
import 'dotenv/config';

import { initializeDatabase, AppDataSource } from './config/database.config';
import { errorMiddleware, notFoundMiddleware } from './middleware';
import { PushService } from './services';
import * as repositories from './repositories';
import * as services from './services';

// Controllers
import { workflowsController, executionsController } from './controllers';

export class AutomationMarketplaceServer {
  private app: Application;
  private server: http.Server | null = null;
  private dataSource: DataSource | null = null;

  constructor() {
    this.app = express();
  }

  /**
   * Initialize the server
   */
  async init(): Promise<void> {
    console.log('🚀 Initializing Automation Marketplace server...');

    // Initialize database
    this.dataSource = await initializeDatabase();

    // Register dependencies in DI container
    this.registerDependencies();

    // Setup Express middleware
    this.setupMiddleware();

    // Setup routes
    this.setupRoutes();

    // Setup error handlers
    this.setupErrorHandlers();

    // Setup WebSocket
    this.setupWebSocket();

    console.log('✅ Server initialized');
  }

  /**
   * Register dependencies in DI container
   */
  private registerDependencies(): void {
    if (!this.dataSource) {
      throw new Error('DataSource not initialized');
    }

    // Register DataSource
    container.registerInstance(DataSource, this.dataSource);

    // Register repositories
    Object.entries(repositories).forEach(([name, Repository]) => {
      const instance = new Repository(this.dataSource!);
      container.registerInstance(name, instance);
      container.registerInstance(Repository, instance);
    });

    // Register services (they auto-resolve dependencies)
    Object.values(services).forEach((Service) => {
      container.registerSingleton(Service);
    });

    console.log('✅ Dependencies registered');
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
      })
    );

    // Body parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      message: 'Too many requests from this IP, please try again later',
    });
    this.app.use('/api', limiter);

    console.log('✅ Middleware configured');
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // API routes
    this.app.use('/api/workflows', workflowsController);
    this.app.use('/api/executions', executionsController);

    console.log('✅ Routes configured');
  }

  /**
   * Setup error handlers
   */
  private setupErrorHandlers(): void {
    this.app.use(notFoundMiddleware);
    this.app.use(errorMiddleware);
  }

  /**
   * Setup WebSocket server
   */
  private setupWebSocket(): void {
    if (!this.server) {
      return; // Server not started yet, will setup later
    }

    const pushService = container.resolve(PushService);
    const wsPath = process.env.WS_PATH || '/ws';

    pushService.init(this.server, wsPath);

    console.log(`✅ WebSocket server ready on ${wsPath}`);
  }

  /**
   * Start the server
   */
  async start(port?: number): Promise<void> {
    const PORT = port || parseInt(process.env.PORT || '5678');
    const HOST = process.env.HOST || 'localhost';

    this.server = http.createServer(this.app);

    // Setup WebSocket now that server is created
    if (process.env.WS_ENABLED !== 'false') {
      this.setupWebSocket();
    }

    this.server.listen(PORT, () => {
      console.log('');
      console.log('╔════════════════════════════════════════════╗');
      console.log('║   Automation Marketplace Backend          ║');
      console.log('╠════════════════════════════════════════════╣');
      console.log(`║   Server:    http://${HOST}:${PORT}        ║`);
      console.log(`║   API:       http://${HOST}:${PORT}/api    ║`);
      console.log(`║   WebSocket: ws://${HOST}:${PORT}/ws       ║`);
      console.log(`║   Health:    http://${HOST}:${PORT}/health ║`);
      console.log('╚════════════════════════════════════════════╝');
      console.log('');
      console.log('✅ Server is running!');
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    console.log('Shutting down server...');

    // Close WebSocket connections
    const pushService = container.resolve(PushService);
    pushService.closeAll();

    // Close HTTP server
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Close database connection
    if (this.dataSource) {
      await this.dataSource.destroy();
    }

    console.log('✅ Server stopped');
  }

  /**
   * Get Express app instance
   */
  getApp(): Application {
    return this.app;
  }

  /**
   * Get HTTP server instance
   */
  getServer(): http.Server | null {
    return this.server;
  }

  /**
   * Get DataSource instance
   */
  getDataSource(): DataSource | null {
    return this.dataSource;
  }
}
