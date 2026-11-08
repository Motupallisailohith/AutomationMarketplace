import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';

export class Webhook implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Webhook',
    name: 'webhook',
    icon: 'fa:satellite-dish',
    group: ['trigger'],
    version: 1,
    description: 'Receive data via HTTP webhook',
    defaults: {
      name: 'Webhook',
    },
    inputs: [],
    outputs: ['main'],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'webhook',
      },
    ],
    properties: [
      {
        displayName: 'HTTP Method',
        name: 'httpMethod',
        type: 'options',
        options: [
          { name: 'DELETE', value: 'DELETE' },
          { name: 'GET', value: 'GET' },
          { name: 'HEAD', value: 'HEAD' },
          { name: 'PATCH', value: 'PATCH' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
        ],
        default: 'POST',
        description: 'The HTTP method to listen for',
      },
      {
        displayName: 'Path',
        name: 'path',
        type: 'string',
        default: 'webhook',
        required: true,
        description: 'The path to listen on',
      },
      {
        displayName: 'Response Mode',
        name: 'responseMode',
        type: 'options',
        options: [
          {
            name: 'On Received',
            value: 'onReceived',
            description: 'Respond immediately',
          },
          {
            name: 'Last Node',
            value: 'lastNode',
            description: 'Respond with output of last node',
          },
        ],
        default: 'onReceived',
        description: 'When to respond to the webhook call',
      },
      {
        displayName: 'Response Code',
        name: 'responseCode',
        type: 'number',
        typeOptions: {
          minValue: 100,
          maxValue: 599,
        },
        default: 200,
        description: 'The HTTP response code to return',
      },
      {
        displayName: 'Response Data',
        name: 'responseData',
        type: 'string',
        displayOptions: {
          show: {
            responseMode: ['onReceived'],
          },
        },
        default: 'success',
        description: 'The data to return in the response',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();

    // Webhook receives data from HTTP request
    // In actual implementation, this would parse req.body, req.query, req.headers
    return items;
  }
}
