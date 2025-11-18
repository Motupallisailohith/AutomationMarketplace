// Real Kafka Producer for event publishing
import { Kafka, Producer, Message } from 'kafkajs';
import { logger } from './logger';

class RealKafkaProducer {
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'nodejs-worker',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });
    
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.isConnected = true;
      logger.info('Kafka producer connected successfully');
    } catch (error: any) {
      logger.error('Failed to connect to Kafka:', { error: error?.message || error });
      // Fallback to console logging if Kafka is not available
      this.isConnected = false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      this.isConnected = false;
      logger.info('Kafka producer disconnected');
    } catch (error: any) {
      logger.error('Failed to disconnect from Kafka:', { error: error?.message || error });
    }
  }

  async publishEvent(topic: string, event: any, key?: string): Promise<void> {
    try {
      if (!this.isConnected) {
        // Attempt to reconnect
        await this.connect();
      }

      if (this.isConnected) {
        const message: Message = {
          key: key || event.stepId || null,
          value: JSON.stringify({
            ...event,
            timestamp: new Date().toISOString(),
            producedBy: 'nodejs-worker',
          }),
          headers: {
            'content-type': 'application/json',
            'event-type': event.type || 'activity_event',
          },
        };

        await this.producer.send({
          topic,
          messages: [message],
        });

        logger.info('Event published to Kafka successfully', {
          topic,
          eventType: event.type,
          stepId: event.stepId,
        });
      } else {
        // Fallback to structured logging when Kafka is unavailable
        logger.info('Kafka unavailable - logging event locally', {
          topic,
          event,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error('Failed to publish event to Kafka', {
        topic,
        event,
        error: error?.message || error,
      });
      
      // Always log the event locally as fallback
      logger.info('Event logged locally as fallback', { topic, event });
    }
  }

  async publishBatch(topic: string, events: any[]): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      if (this.isConnected && events.length > 0) {
        const messages: Message[] = events.map((event, index) => ({
          key: event.stepId || `batch-${Date.now()}-${index}`,
          value: JSON.stringify({
            ...event,
            timestamp: new Date().toISOString(),
            producedBy: 'nodejs-worker',
          }),
          headers: {
            'content-type': 'application/json',
            'event-type': event.type || 'activity_event',
            'batch-id': `batch-${Date.now()}`,
          },
        }));

        await this.producer.send({
          topic,
          messages,
        });

        logger.info('Batch events published to Kafka successfully', {
          topic,
          eventCount: events.length,
        });
      } else {
        // Fallback logging for batch events
        logger.info('Kafka unavailable - logging batch events locally', {
          topic,
          eventCount: events.length,
          events,
        });
      }
    } catch (error: any) {
      logger.error('Failed to publish batch events to Kafka', {
        topic,
        eventCount: events.length,
        error: error?.message || error,
      });
    }
  }
}

// Singleton instance
const kafkaProducerInstance = new RealKafkaProducer();

// Auto-connect on first use
let autoConnectPromise: Promise<void> | null = null;

export class KafkaProducer {
  static async publishEvent(topic: string, event: any, key?: string): Promise<void> {
    if (!autoConnectPromise) {
      autoConnectPromise = kafkaProducerInstance.connect();
    }
    await autoConnectPromise;
    return kafkaProducerInstance.publishEvent(topic, event, key);
  }

  static async publishBatch(topic: string, events: any[]): Promise<void> {
    if (!autoConnectPromise) {
      autoConnectPromise = kafkaProducerInstance.connect();
    }
    await autoConnectPromise;
    return kafkaProducerInstance.publishBatch(topic, events);
  }

  static async disconnect(): Promise<void> {
    return kafkaProducerInstance.disconnect();
  }
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  await kafkaProducerInstance.disconnect();
});

process.on('SIGINT', async () => {
  await kafkaProducerInstance.disconnect();
  process.exit(0);
});