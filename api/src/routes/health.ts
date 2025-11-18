import { Router, Request, Response } from 'express';
import { logger } from '../shared/logger';

const router = Router();

// Basic health check
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Detailed health check
router.get('/detailed', async (_req: Request, res: Response) => {
  const healthChecks = {
    api: 'healthy',
    database: await checkDatabase(),
    redis: await checkRedis(),
    temporal: await checkTemporal(),
    kafka: await checkKafka(),
  };

  const isHealthy = Object.values(healthChecks).every(status => status === 'healthy');
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: healthChecks,
  });
});

async function checkDatabase(): Promise<string> {
  try {
    // Add actual database health check here
    return 'healthy';
  } catch (error) {
    logger.error('Database health check failed:', error);
    return 'unhealthy';
  }
}

async function checkRedis(): Promise<string> {
  try {
    // Add actual Redis health check here
    return 'healthy';
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return 'unhealthy';
  }
}

async function checkTemporal(): Promise<string> {
  try {
    // Add actual Temporal health check here
    return 'healthy';
  } catch (error) {
    logger.error('Temporal health check failed:', error);
    return 'unhealthy';
  }
}

async function checkKafka(): Promise<string> {
  try {
    // Add actual Kafka health check here
    return 'healthy';
  } catch (error) {
    logger.error('Kafka health check failed:', error);
    return 'unhealthy';
  }
}

export default router;