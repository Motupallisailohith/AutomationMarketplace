import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { logger } from './shared/logger';
import { databaseService } from './services/database';
import { webSocketService } from './services/websocket';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Route imports
import authRoutes from './routes/auth';
import workflowRoutes from './routes/workflows';
import triggerRoutes from './routes/triggers';
import credentialRoutes from './routes/credentials';
import webhookRoutes from './routes/webhooks';
import healthRoutes from './routes/health';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws://localhost:*", "wss://localhost:*"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
}));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Health check (before authentication)
app.use('/health', healthRoutes);

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/triggers', triggerRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/webhooks', webhookRoutes);

// API documentation
app.get('/api', (_req, res) => {
  res.json({
    name: 'Automation Platform API',
    version: '1.0.0',
    description: 'REST API for workflow automation platform',
    endpoints: {
      auth: '/api/auth',
      workflows: '/api/workflows',
      triggers: '/api/triggers',
      credentials: '/api/credentials',
      webhooks: '/api/webhooks',
      health: '/health',
      websocket: '/ws',
    },
    websocket: {
      url: `ws://localhost:${PORT}/ws`,
      authentication: 'Query parameter: ?token=<jwt_token>',
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(errorHandler);

async function startServer() {
  try {
    // Initialize database connection
    await databaseService.connect();
    logger.info('Database connected successfully');

    // Initialize WebSocket service
    webSocketService.initialize(server);
    logger.info('WebSocket service initialized');

    // Start server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API documentation: http://localhost:${PORT}/api`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Received shutdown signal, closing server gracefully...');
      
      // Close WebSocket connections
      webSocketService.close();
      
      // Close database connections
      await databaseService.disconnect();
      
      // Close HTTP server
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export default app;