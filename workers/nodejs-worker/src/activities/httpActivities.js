import axios from 'axios';
import FormData from 'form-data';
import { createLogger } from '../logger.js';

const logger = createLogger('HTTPActivities');

/**
 * Execute HTTP request activity
 * @param {Object} params - HTTP request parameters
 * @param {string} params.method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param {string} params.url - Request URL
 * @param {Object} [params.headers] - Request headers
 * @param {Object} [params.body] - Request body
 * @param {Object} [params.config] - Additional axios config
 * @returns {Object} HTTP response data
 */
export async function executeHttpRequest(params) {
  logger.info(`Executing HTTP ${params.method} request to ${params.url}`);
  
  try {
    const config = {
      method: params.method.toLowerCase(),
      url: params.url,
      headers: params.headers || {},
      timeout: params.config?.timeout || 30000,
      ...params.config
    };

    // Handle request body for non-GET requests
    if (params.body && !['get', 'head'].includes(config.method)) {
      if (params.headers?.['Content-Type']?.includes('multipart/form-data')) {
        // Handle form data
        const formData = new FormData();
        Object.entries(params.body).forEach(([key, value]) => {
          formData.append(key, value);
        });
        config.data = formData;
        config.headers = { ...config.headers, ...formData.getHeaders() };
      } else {
        config.data = params.body;
      }
    }

    const response = await axios(config);
    
    logger.info(`HTTP request successful: ${response.status} ${response.statusText}`);
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      config: {
        method: config.method,
        url: config.url
      }
    };
  } catch (error) {
    logger.error('HTTP request failed:', {
      url: params.url,
      method: params.method,
      error: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    
    // Return structured error response
    return {
      error: true,
      status: error.response?.status || 0,
      statusText: error.response?.statusText || 'Request Failed',
      message: error.message,
      data: error.response?.data,
      config: {
        method: params.method,
        url: params.url
      }
    };
  }
}

/**
 * Execute REST API request with authentication
 * @param {Object} params - API request parameters
 * @param {string} params.endpoint - API endpoint
 * @param {string} params.method - HTTP method
 * @param {Object} [params.auth] - Authentication config
 * @param {Object} [params.data] - Request data
 * @param {Object} [params.query] - Query parameters
 * @returns {Object} API response
 */
export async function executeApiRequest(params) {
  logger.info(`Executing API request: ${params.method} ${params.endpoint}`);
  
  const headers = { 'Content-Type': 'application/json' };
  
  // Handle authentication
  if (params.auth) {
    switch (params.auth.type) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${params.auth.token}`;
        break;
      case 'basic':
        const credentials = Buffer.from(`${params.auth.username}:${params.auth.password}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'api-key':
        headers[params.auth.header || 'X-API-Key'] = params.auth.key;
        break;
    }
  }

  // Build URL with query parameters
  let url = params.endpoint;
  if (params.query && Object.keys(params.query).length > 0) {
    const queryString = new URLSearchParams(params.query).toString();
    url += `?${queryString}`;
  }

  return await executeHttpRequest({
    method: params.method,
    url,
    headers,
    body: params.data,
    config: {
      timeout: params.timeout || 30000,
      validateStatus: function (status) {
        return status < 500; // Don't reject on 4xx errors
      }
    }
  });
}

/**
 * Execute webhook call
 * @param {Object} params - Webhook parameters
 * @param {string} params.url - Webhook URL
 * @param {Object} params.payload - Webhook payload
 * @param {Object} [params.headers] - Additional headers
 * @param {string} [params.secret] - Webhook secret for HMAC
 * @returns {Object} Webhook response
 */
export async function executeWebhook(params) {
  logger.info(`Executing webhook to ${params.url}`);
  
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'AutomationMarketplace-Worker/1.0',
    ...params.headers
  };

  // Add HMAC signature if secret is provided
  if (params.secret) {
    const crypto = await import('crypto');
    const signature = crypto
      .createHmac('sha256', params.secret)
      .update(JSON.stringify(params.payload))
      .digest('hex');
    headers['X-Signature-256'] = `sha256=${signature}`;
  }

  return await executeHttpRequest({
    method: 'POST',
    url: params.url,
    headers,
    body: params.payload,
    config: {
      timeout: params.timeout || 15000
    }
  });
}