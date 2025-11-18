import { Worker } from '@temporalio/worker';
import { createLogger } from './logger.js';
import { KafkaService } from './kafka.js';
import * as activities from './activities/index.js';

const logger = createLogger('NodeJSWorker');

async function main() {
  // Initialize Kafka
  const kafkaService = new KafkaService(
    process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    'nodejs-worker'
  );

  try {
    await kafkaService.connect();
    await kafkaService.publishWorkerStatus('starting', { 
      activities: Object.keys(activities) 
    });
  } catch (error) {
    logger.warn('Failed to connect to Kafka, continuing without event streaming:', error);
  }

  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows'),
    activities,
    taskQueue: 'nodejs-worker',
    namespace: 'default',
  });

  logger.info('Node.js worker starting up...');
  logger.info(`Worker activities: ${Object.keys(activities).join(', ')}`);

  // Publish worker ready status
  try {
    await kafkaService.publishWorkerStatus('ready', {
      activities: Object.keys(activities),
      task_queue: 'nodejs-worker'
    });
  } catch (error) {
    logger.warn('Failed to publish ready status:', error);
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    
    try {
      await kafkaService.publishWorkerStatus('shutting_down');
      await kafkaService.disconnect();
    } catch (error) {
      logger.warn('Error during Kafka cleanup:', error);
    }
    
    await worker.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await worker.run();
}

main().catch((error) => {
  logger.error('Failed to start worker:', error);
  process.exit(1);
});