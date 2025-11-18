import { Kafka } from 'kafkajs';
import { createLogger } from './logger.js';

const logger = createLogger('KafkaService');

export class KafkaService {
  constructor(brokers = ['localhost:9092'], clientId = 'nodejs-worker') {
    this.kafka = Kafka({
      clientId,
      brokers,
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ 
      groupId: `${clientId}-consumer`,
      maxWaitTimeInMs: 3000,
    });
  }

  async connect() {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      logger.info('Kafka producer and consumer connected');
    } catch (error) {
      logger.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      logger.info('Kafka producer and consumer disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Kafka:', error);
    }
  }

  async sendMessage(topic, message, key = null) {
    try {
      const result = await this.producer.send({
        topic,
        messages: [{
          key,
          value: JSON.stringify(message),
          headers: {
            source: 'nodejs-worker',
            timestamp: new Date().toISOString(),
          }
        }]
      });
      
      logger.info(`Message sent to topic ${topic}`, { 
        key, 
        partition: result[0].partition,
        offset: result[0].baseOffset 
      });
      
      return result;
    } catch (error) {
      logger.error(`Failed to send message to topic ${topic}:`, error);
      throw error;
    }
  }

  async subscribeToTopics(topics, messageHandler) {
    try {
      await this.consumer.subscribe({ 
        topics,
        fromBeginning: false 
      });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const parsedMessage = {
              topic,
              partition,
              offset: message.offset,
              key: message.key?.toString(),
              value: JSON.parse(message.value.toString()),
              headers: {},
              timestamp: message.timestamp
            };

            // Parse headers
            if (message.headers) {
              for (const [key, value] of Object.entries(message.headers)) {
                parsedMessage.headers[key] = value?.toString();
              }
            }

            await messageHandler(parsedMessage);
          } catch (error) {
            logger.error('Error processing message:', error, {
              topic,
              partition,
              offset: message.offset
            });
          }
        },
      });

      logger.info('Consumer started for topics:', topics);
    } catch (error) {
      logger.error('Failed to subscribe to topics:', error);
      throw error;
    }
  }

  // Worker-specific event publishing
  async publishActivityResult(workflowId, activityType, result, success = true) {
    const event = {
      id: `activity-result-${workflowId}-${Date.now()}`,
      type: success ? 'activity.completed' : 'activity.failed',
      source: 'nodejs-worker',
      timestamp: new Date().toISOString(),
      workflow_id: workflowId,
      data: {
        activity_type: activityType,
        result,
        success
      }
    };

    return this.sendMessage('activity-events', event, workflowId);
  }

  async publishWorkerStatus(status, details = {}) {
    const event = {
      id: `worker-status-${Date.now()}`,
      type: 'worker.status',
      source: 'nodejs-worker',
      timestamp: new Date().toISOString(),
      data: {
        status,
        ...details
      }
    };

    return this.sendMessage('system-events', event);
  }

  async publishNotification(type, recipient, message, details = {}) {
    const event = {
      id: `notification-${type}-${Date.now()}`,
      type: `notification.${type}`,
      source: 'nodejs-worker',
      timestamp: new Date().toISOString(),
      data: {
        recipient,
        message,
        ...details
      }
    };

    return this.sendMessage('notifications', event, recipient);
  }
}