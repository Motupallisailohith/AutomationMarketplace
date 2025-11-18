// Node.js Worker Activities for HTTP/API Integration Tasks
// These activities handle web requests, API calls, and HTTP-based integrations

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Context } from '@temporalio/activity';
import { logger } from '../shared/logger';
import FormData from 'form-data';
import { KafkaProducer } from '../shared/kafka';

export interface HttpActivityInput {
  stepId: string;
  stepName: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: any;
  credentials?: Record<string, any>;
  timeout?: number;
  retries?: number;
}

export interface HttpActivityOutput {
  success: boolean;
  data?: any;
  statusCode?: number;
  headers?: Record<string, string>;
  error?: string;
  metadata?: {
    duration: number;
    retryCount: number;
    executedAt: string;
    workerId: string;
  };
}

export async function executeHttpRequest(input: HttpActivityInput): Promise<HttpActivityOutput> {
  const startTime = Date.now();
  const context = Context.current();
  const workerId = `nodejs-worker-${process.env.HOSTNAME || 'local'}`;

  logger.info(`Executing HTTP request: ${input.method} ${input.url}`, {
    stepId: input.stepId,
    stepName: input.stepName,
    activityId: context.info.activityId,
  });

  try {
    // Prepare request configuration
    const config: AxiosRequestConfig = {
      method: input.method,
      url: input.url,
      headers: input.headers || {},
      params: input.queryParams,
      timeout: input.timeout || 30000,
      maxRedirects: 5,
    };

    // Handle authentication
    if (input.credentials) {
      applyAuthentication(config, input.credentials);
    }

    // Handle request body
    if (input.body && ['POST', 'PUT', 'PATCH'].includes(input.method)) {
      if (typeof input.body === 'object' && input.body.constructor === Object) {
        config.data = input.body;
        config.headers = { ...config.headers, 'Content-Type': 'application/json' };
      } else {
        config.data = input.body;
      }
    }

    // Execute request
    const response: AxiosResponse = await axios(config);

    const result: HttpActivityOutput = {
      success: true,
      data: response.data,
      statusCode: response.status,
      headers: response.headers as Record<string, string>,
      metadata: {
        duration: Date.now() - startTime,
        retryCount: context.info.attempt - 1,
        executedAt: new Date().toISOString(),
        workerId,
      },
    };

    // Publish success event to Kafka
    await KafkaProducer.publishEvent('workflow-events', {
      type: 'activity_completed',
      stepId: input.stepId,
      stepName: input.stepName,
      workerId,
      duration: result.metadata!.duration,
      success: true,
    });

    logger.info(`HTTP request completed successfully: ${response.status}`, {
      stepId: input.stepId,
      statusCode: response.status,
      duration: result.metadata!.duration,
    });

    return result;

  } catch (error: any) {
    const result: HttpActivityOutput = {
      success: false,
      error: error.message,
      statusCode: error.response?.status,
      headers: error.response?.headers,
      metadata: {
        duration: Date.now() - startTime,
        retryCount: context.info.attempt - 1,
        executedAt: new Date().toISOString(),
        workerId,
      },
    };

    // Publish failure event to Kafka
    await KafkaProducer.publishEvent('workflow-events', {
      type: 'activity_failed',
      stepId: input.stepId,
      stepName: input.stepName,
      workerId,
      duration: result.metadata!.duration,
      error: error.message,
      success: false,
    });

    logger.error('HTTP request failed:', {
      stepId: input.stepId,
      error: error.message,
      statusCode: error.response?.status,
      duration: result.metadata!.duration,
    });

    return result;
  }
}

function applyAuthentication(config: AxiosRequestConfig, credentials: Record<string, any>): void {
  switch (credentials.type) {
    case 'bearer':
      config.headers!['Authorization'] = `Bearer ${credentials.token}`;
      break;
    case 'basic':
      const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
      config.headers!['Authorization'] = `Basic ${auth}`;
      break;
    case 'api_key':
      if (credentials.location === 'header') {
        config.headers![credentials.key] = credentials.value;
      } else if (credentials.location === 'query') {
        config.params = { ...config.params, [credentials.key]: credentials.value };
      }
      break;
    case 'oauth2':
      config.headers!['Authorization'] = `Bearer ${credentials.access_token}`;
      break;
  }
}

export async function executeWebhookCall(input: HttpActivityInput): Promise<HttpActivityOutput> {
  // Special handling for webhook calls
  return executeHttpRequest({
    ...input,
    headers: {
      ...input.headers,
      'User-Agent': 'Automation-Platform-Webhook/1.0',
    },
  });
}

export async function executeFileUpload(input: HttpActivityInput & {
  files: Array<{ fieldName: string; filename: string; content: Buffer; mimeType: string; }>
}): Promise<HttpActivityOutput> {
  const startTime = Date.now();
  const context = Context.current();
  const workerId = `nodejs-worker-${process.env.HOSTNAME || 'local'}`;

  logger.info(`Executing file upload: ${input.url}`, {
    stepId: input.stepId,
    fileCount: input.files.length,
  });

  try {
    const formData = new FormData();

    // Add files
    for (const file of input.files) {
      formData.append(file.fieldName, file.content, {
        filename: file.filename,
        contentType: file.mimeType,
      });
    }

    // Add other form fields
    if (input.body) {
      for (const [key, value] of Object.entries(input.body)) {
        formData.append(key, String(value));
      }
    }

    const config: AxiosRequestConfig = {
      method: 'POST',
      url: input.url,
      data: formData,
      headers: {
        ...input.headers,
        ...formData.getHeaders(),
      },
      timeout: input.timeout || 60000, // Longer timeout for file uploads
    };

    if (input.credentials) {
      applyAuthentication(config, input.credentials);
    }

    const response: AxiosResponse = await axios(config);

    const result: HttpActivityOutput = {
      success: true,
      data: response.data,
      statusCode: response.status,
      headers: response.headers as Record<string, string>,
      metadata: {
        duration: Date.now() - startTime,
        retryCount: context.info.attempt - 1,
        executedAt: new Date().toISOString(),
        workerId,
      },
    };

    logger.info(`File upload completed successfully: ${response.status}`, {
      stepId: input.stepId,
      statusCode: response.status,
    });

    return result;

  } catch (error: any) {
    const result: HttpActivityOutput = {
      success: false,
      error: error.message,
      statusCode: error.response?.status,
      metadata: {
        duration: Date.now() - startTime,
        retryCount: context.info.attempt - 1,
        executedAt: new Date().toISOString(),
        workerId,
      },
    };

    logger.error('File upload failed:', {
      stepId: input.stepId,
      error: error.message,
    });

    return result;
  }
}

// Placeholder for Kafka producer
// MockKafkaProducer - temporarily unused
/*
class MockKafkaProducer {
  static async publishEvent(topic: string, event: any): Promise<void> {
    logger.info('Publishing event to Kafka:', { topic, event });
    // Implementation will be added when Kafka integration is complete
  }
}
*/