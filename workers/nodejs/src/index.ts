import { Worker, NativeConnection } from '@temporalio/worker';
import { logger } from './shared/logger';
import * as activities from './activities';

async function startNodeJsWorker() {
  try {
    // Create connection to Temporal server
    const connection = await NativeConnection.connect({
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    });

    // Create worker specialized for HTTP/API activities
    const worker = await Worker.create({
      connection,
      namespace: process.env.TEMPORAL_NAMESPACE || 'default',
      taskQueue: 'nodejs-worker-queue',
      activities,
      maxConcurrentActivityTaskExecutions: 10,
    });

    logger.info('Starting Node.js HTTP Worker...');
    await worker.run();
  } catch (error) {
    logger.error('Failed to start Node.js worker:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down Node.js worker gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down Node.js worker gracefully');
  process.exit(0);
});

if (require.main === module) {
  startNodeJsWorker();
}