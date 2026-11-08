/**
 * Abstract Server - Mirrors n8n's AbstractServer pattern
 * Base class for HTTP server setup with common middleware
 */

import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import express from 'express';
import cors from 'cors';
import type { Server as HttpServer } from 'http';

export abstract class AbstractServer {
  protected logger: Logger;
  protected server: HttpServer;
  readonly app: express.Application;
  protected dbConnection: DbConnection;
  protected restEndpoint: string;

  constructor() {
    this.app = express();
    this.app.disable('x-powered-by');
    
    this.logger = Container.get(Logger);
    this.dbConnection = Container.get(DbConnection);
    this.restEndpoint = 'api';
  }

  abstract configure(): Promise<void>;

  async init(): Promise<void> {
    const { app } = this;
    const http = await import('http');
    this.server = http.createServer(app);

    const port = process.env.PORT || 3000;
    const address = '0.0.0.0';

    await new Promise<void>((resolve) => {
      this.server.listen(Number(port), address, () => resolve());
    });

    this.logger.info(`Server ready on ${address}, port ${port}`);
  }

  async start(): Promise<void> {
    // Setup common middleware
    this.setupCommonMiddlewares();
    
    // Call abstract configure method
    await this.configure();
  }

  private setupCommonMiddlewares() {
    // CORS
    this.app.use(cors({
      origin: ['http://localhost:5173', 'http://localhost:5174'],
      credentials: true
    }));

    // Body parser
    this.app.use(express.json());

    // Request logging
    this.app.use((req, _res, next) => {
      this.logger.debug(`${req.method} ${req.path}`);
      next();
    });
  }

  protected setupHealthCheck() {
    this.app.get('/healthz', (_req, res) => {
      res.send({ status: 'ok' });
    });

    const { connectionState } = this.dbConnection;

    this.app.get('/healthz/readiness', (_req, res) => {
      const { connected, migrated } = connectionState;
      if (connected && migrated) {
        res.status(200).send({ status: 'ok' });
      } else {
        res.status(503).send({ status: 'error' });
      }
    });
  }
}
