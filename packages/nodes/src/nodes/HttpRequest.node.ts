import type {
  INodeType,
  INodeTypeDescription,
  IExecuteFunctions,
  INodeExecutionData,
} from '../interfaces';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export class HttpRequest implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'HTTP Request',
    name: 'n8n-nodes-base.httpRequest',
    icon: 'fa:globe',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["requestMethod"] + ": " + $parameter["url"]}}',
    description: 'Makes an HTTP request and returns the response data',
    defaults: {
      name: 'HTTP Request',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [],
    properties: [
      // Authentication
      {
        displayName: 'Authentication',
        name: 'authentication',
        type: 'options',
        options: [
          { name: 'None', value: 'none' },
          { name: 'Basic Auth', value: 'basicAuth' },
          { name: 'Bearer Token', value: 'bearerToken' },
          { name: 'Header Auth', value: 'headerAuth' },
          { name: 'Query Auth', value: 'queryAuth' },
        ],
        default: 'none',
        description: 'Authentication method',
      },
      // Basic Auth fields
      {
        displayName: 'Username',
        name: 'basicAuthUser',
        type: 'string',
        default: '',
        displayOptions: { show: { authentication: ['basicAuth'] } },
      },
      {
        displayName: 'Password',
        name: 'basicAuthPassword',
        type: 'string',
        default: '',
        displayOptions: { show: { authentication: ['basicAuth'] } },
      },
      // Bearer Token
      {
        displayName: 'Token',
        name: 'bearerToken',
        type: 'string',
        default: '',
        displayOptions: { show: { authentication: ['bearerToken'] } },
      },
      // Header Auth
      {
        displayName: 'Header Name',
        name: 'headerAuthName',
        type: 'string',
        default: 'X-API-Key',
        displayOptions: { show: { authentication: ['headerAuth'] } },
      },
      {
        displayName: 'Header Value',
        name: 'headerAuthValue',
        type: 'string',
        default: '',
        displayOptions: { show: { authentication: ['headerAuth'] } },
      },
      // Query Auth
      {
        displayName: 'Query Parameter Name',
        name: 'queryAuthName',
        type: 'string',
        default: 'api_key',
        displayOptions: { show: { authentication: ['queryAuth'] } },
      },
      {
        displayName: 'Query Parameter Value',
        name: 'queryAuthValue',
        type: 'string',
        default: '',
        displayOptions: { show: { authentication: ['queryAuth'] } },
      },
      // Method
      {
        displayName: 'Method',
        name: 'requestMethod',
        type: 'options',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'DELETE', value: 'DELETE' },
          { name: 'PATCH', value: 'PATCH' },
          { name: 'HEAD', value: 'HEAD' },
          { name: 'OPTIONS', value: 'OPTIONS' },
        ],
        default: 'GET',
        description: 'HTTP method',
      },
      // URL
      {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        default: '',
        placeholder: 'https://api.example.com/endpoint',
        required: true,
        description: 'URL to make the request to',
      },
      // Send Query Parameters
      {
        displayName: 'Send Query Parameters',
        name: 'sendQuery',
        type: 'boolean',
        default: false,
        description: 'Whether to send query parameters',
      },
      {
        displayName: 'Specify Query Parameters',
        name: 'specifyQuery',
        type: 'options',
        displayOptions: { show: { sendQuery: [true] } },
        options: [
          { name: 'Using Fields Below', value: 'keypair' },
          { name: 'Using JSON', value: 'json' },
        ],
        default: 'keypair',
      },
      {
        displayName: 'Query Parameters',
        name: 'queryParametersUi',
        type: 'fixedCollection',
        displayOptions: { show: { sendQuery: [true], specifyQuery: ['keypair'] } },
        typeOptions: { multipleValues: true },
        default: {},
        placeholder: 'Add Parameter',
        options: [
          {
            name: 'parameter',
            values: [
              { displayName: 'Name', name: 'name', type: 'string', default: '' },
              { displayName: 'Value', name: 'value', type: 'string', default: '' },
            ],
          },
        ],
      },
      {
        displayName: 'Query Parameters (JSON)',
        name: 'queryParametersJson',
        type: 'json',
        displayOptions: { show: { sendQuery: [true], specifyQuery: ['json'] } },
        default: '{}',
      },
      // Send Headers
      {
        displayName: 'Send Headers',
        name: 'sendHeaders',
        type: 'boolean',
        default: false,
        description: 'Whether to send headers',
      },
      {
        displayName: 'Specify Headers',
        name: 'specifyHeaders',
        type: 'options',
        displayOptions: { show: { sendHeaders: [true] } },
        options: [
          { name: 'Using Fields Below', value: 'keypair' },
          { name: 'Using JSON', value: 'json' },
        ],
        default: 'keypair',
      },
      {
        displayName: 'Headers',
        name: 'headersUi',
        type: 'fixedCollection',
        displayOptions: { show: { sendHeaders: [true], specifyHeaders: ['keypair'] } },
        typeOptions: { multipleValues: true },
        default: {},
        placeholder: 'Add Header',
        options: [
          {
            name: 'parameter',
            values: [
              { displayName: 'Name', name: 'name', type: 'string', default: '' },
              { displayName: 'Value', name: 'value', type: 'string', default: '' },
            ],
          },
        ],
      },
      {
        displayName: 'Headers (JSON)',
        name: 'headersJson',
        type: 'json',
        displayOptions: { show: { sendHeaders: [true], specifyHeaders: ['json'] } },
        default: '{}',
      },
      // Send Body
      {
        displayName: 'Send Body',
        name: 'sendBody',
        type: 'boolean',
        displayOptions: { show: { requestMethod: ['POST', 'PUT', 'PATCH', 'DELETE'] } },
        default: false,
      },
      {
        displayName: 'Body Content Type',
        name: 'contentType',
        type: 'options',
        displayOptions: { show: { sendBody: [true] } },
        options: [
          { name: 'JSON', value: 'json' },
          { name: 'Form URL Encoded', value: 'form-urlencoded' },
          { name: 'Raw', value: 'raw' },
        ],
        default: 'json',
      },
      {
        displayName: 'Specify Body',
        name: 'specifyBody',
        type: 'options',
        displayOptions: { show: { sendBody: [true], contentType: ['json', 'form-urlencoded'] } },
        options: [
          { name: 'Using Fields Below', value: 'keypair' },
          { name: 'Using JSON', value: 'json' },
        ],
        default: 'keypair',
      },
      {
        displayName: 'Body Parameters',
        name: 'bodyParametersUi',
        type: 'fixedCollection',
        displayOptions: { show: { sendBody: [true], contentType: ['json', 'form-urlencoded'], specifyBody: ['keypair'] } },
        typeOptions: { multipleValues: true },
        default: {},
        placeholder: 'Add Parameter',
        options: [
          {
            name: 'parameter',
            values: [
              { displayName: 'Name', name: 'name', type: 'string', default: '' },
              { displayName: 'Value', name: 'value', type: 'string', default: '' },
            ],
          },
        ],
      },
      {
        displayName: 'Body (JSON)',
        name: 'bodyJson',
        type: 'json',
        displayOptions: { show: { sendBody: [true], contentType: ['json', 'form-urlencoded'], specifyBody: ['json'] } },
        default: '{}',
      },
      {
        displayName: 'Body (Raw)',
        name: 'bodyRaw',
        type: 'string',
        displayOptions: { show: { sendBody: [true], contentType: ['raw'] } },
        default: '',
      },
      // Response Format
      {
        displayName: 'Response Format',
        name: 'responseFormat',
        type: 'options',
        options: [
          { name: 'JSON', value: 'json' },
          { name: 'String', value: 'string' },
        ],
        default: 'json',
      },
      // Options
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        values: [
          {
            displayName: 'Timeout',
            name: 'timeout',
            type: 'number',
            default: 10000,
            description: 'Timeout in milliseconds',
          },
          {
            displayName: 'Full Response',
            name: 'fullResponse',
            type: 'boolean',
            default: false,
            description: 'Return full response (headers, status)',
          },
          {
            displayName: 'Follow Redirects',
            name: 'followRedirects',
            type: 'boolean',
            default: true,
          },
          {
            displayName: 'Ignore SSL Issues',
            name: 'ignoreSSLIssues',
            type: 'boolean',
            default: false,
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        const method = this.getNodeParameter('requestMethod', itemIndex) as string;
        const url = this.getNodeParameter('url', itemIndex) as string;
        const auth = this.getNodeParameter('authentication', itemIndex, 'none') as string;
        const responseFormat = this.getNodeParameter('responseFormat', itemIndex, 'json') as string;
        const options = this.getNodeParameter('options', itemIndex, {}) as any;

        const config: AxiosRequestConfig = {
          method: method.toLowerCase() as any,
          url,
          headers: {},
          timeout: options.timeout || 10000,
          maxRedirects: options.followRedirects !== false ? 5 : 0,
        };

        // SSL
        if (options.ignoreSSLIssues) {
          const https = require('https');
          config.httpsAgent = new https.Agent({ rejectUnauthorized: false });
        }

        // Authentication
        if (auth === 'basicAuth') {
          const user = this.getNodeParameter('basicAuthUser', itemIndex) as string;
          const pass = this.getNodeParameter('basicAuthPassword', itemIndex) as string;
          config.auth = { username: user, password: pass };
        } else if (auth === 'bearerToken') {
          const token = this.getNodeParameter('bearerToken', itemIndex) as string;
          config.headers!.Authorization = `Bearer ${token}`;
        } else if (auth === 'headerAuth') {
          const name = this.getNodeParameter('headerAuthName', itemIndex) as string;
          const value = this.getNodeParameter('headerAuthValue', itemIndex) as string;
          config.headers![name] = value;
        } else if (auth === 'queryAuth') {
          const name = this.getNodeParameter('queryAuthName', itemIndex) as string;
          const value = this.getNodeParameter('queryAuthValue', itemIndex) as string;
          config.params = { [name]: value };
        }

        // Query Parameters
        const sendQuery = this.getNodeParameter('sendQuery', itemIndex, false) as boolean;
        if (sendQuery) {
          const specifyQuery = this.getNodeParameter('specifyQuery', itemIndex, 'keypair') as string;
          config.params = config.params || {};

          if (specifyQuery === 'keypair') {
            const queryUi = this.getNodeParameter('queryParametersUi', itemIndex, {}) as any;
            if (queryUi.parameter) {
              queryUi.parameter.forEach((p: any) => {
                if (p.name) config.params![p.name] = p.value;
              });
            }
          } else {
            const queryJson = this.getNodeParameter('queryParametersJson', itemIndex, '{}') as string;
            Object.assign(config.params, JSON.parse(queryJson));
          }
        }

        // Headers
        const sendHeaders = this.getNodeParameter('sendHeaders', itemIndex, false) as boolean;
        if (sendHeaders) {
          const specifyHeaders = this.getNodeParameter('specifyHeaders', itemIndex, 'keypair') as string;

          if (specifyHeaders === 'keypair') {
            const headersUi = this.getNodeParameter('headersUi', itemIndex, {}) as any;
            if (headersUi.parameter) {
              headersUi.parameter.forEach((p: any) => {
                if (p.name) config.headers![p.name] = p.value;
              });
            }
          } else {
            const headersJson = this.getNodeParameter('headersJson', itemIndex, '{}') as string;
            const parsedHeaders = JSON.parse(headersJson);
            Object.keys(parsedHeaders).forEach(key => {
              config.headers![key] = parsedHeaders[key];
            });
          }
        }

        // Body
        const sendBody = this.getNodeParameter('sendBody', itemIndex, false) as boolean;
        if (sendBody && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          const contentType = this.getNodeParameter('contentType', itemIndex, 'json') as string;

          if (contentType === 'json') {
            config.headers!['Content-Type'] = 'application/json';
            const specifyBody = this.getNodeParameter('specifyBody', itemIndex, 'keypair') as string;

            if (specifyBody === 'keypair') {
              const bodyUi = this.getNodeParameter('bodyParametersUi', itemIndex, {}) as any;
              const bodyObj: any = {};
              if (bodyUi.parameter) {
                bodyUi.parameter.forEach((p: any) => {
                  if (p.name) bodyObj[p.name] = p.value;
                });
              }
              config.data = bodyObj;
            } else {
              const bodyJson = this.getNodeParameter('bodyJson', itemIndex, '{}') as string;
              config.data = JSON.parse(bodyJson);
            }
          } else if (contentType === 'form-urlencoded') {
            config.headers!['Content-Type'] = 'application/x-www-form-urlencoded';
            const specifyBody = this.getNodeParameter('specifyBody', itemIndex, 'keypair') as string;

            if (specifyBody === 'keypair') {
              const bodyUi = this.getNodeParameter('bodyParametersUi', itemIndex, {}) as any;
              const formData = new URLSearchParams();
              if (bodyUi.parameter) {
                bodyUi.parameter.forEach((p: any) => {
                  if (p.name) formData.append(p.name, p.value);
                });
              }
              config.data = formData.toString();
            } else {
              const bodyJson = this.getNodeParameter('bodyJson', itemIndex, '{}') as string;
              const bodyObj = JSON.parse(bodyJson);
              const formData = new URLSearchParams();
              Object.keys(bodyObj).forEach(k => formData.append(k, bodyObj[k]));
              config.data = formData.toString();
            }
          } else if (contentType === 'raw') {
            const bodyRaw = this.getNodeParameter('bodyRaw', itemIndex, '') as string;
            config.data = bodyRaw;
          }
        }

        // Execute
        const response: AxiosResponse = await axios(config);

        let responseData: any;
        if (options.fullResponse) {
          responseData = {
            statusCode: response.status,
            statusMessage: response.statusText,
            headers: response.headers,
            body: responseFormat === 'json' ? response.data : String(response.data),
          };
        } else {
          responseData = responseFormat === 'json' ? response.data : String(response.data);
        }

        returnData.push({
          json: responseData,
          pairedItem: { item: itemIndex },
        });
      } catch (error: any) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error.message,
              statusCode: error.response?.status,
              statusMessage: error.response?.statusText,
              body: error.response?.data,
            },
            pairedItem: { item: itemIndex },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
