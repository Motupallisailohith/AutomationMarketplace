import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';
import { WebClient } from '@slack/web-api';
import { SlackApiCredentials } from '../credentials';

export class Slack implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Slack',
    name: 'slack',
    icon: 'fa:slack',
    group: ['communication'],
    version: 1,
    description: 'Send messages and manage channels in Slack',
    defaults: {
      name: 'Slack',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'slackApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'Send Message', value: 'sendMessage', description: 'Send a message to a channel or user' },
          { name: 'Update Message', value: 'updateMessage', description: 'Update an existing message' },
          { name: 'Delete Message', value: 'deleteMessage', description: 'Delete a message' },
          { name: 'Get Channel', value: 'getChannel', description: 'Get information about a channel' },
        ],
        default: 'sendMessage',
        description: 'The operation to perform',
      },
      {
        displayName: 'Channel',
        name: 'channel',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['sendMessage', 'updateMessage'],
          },
        },
        description: 'Channel name or ID (e.g., #general or C1234567890)',
      },
      {
        displayName: 'Text',
        name: 'text',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['sendMessage', 'updateMessage'],
          },
        },
        description: 'The message text',
      },
      {
        displayName: 'Message Timestamp',
        name: 'messageTimestamp',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['updateMessage', 'deleteMessage'],
          },
        },
        description: 'Timestamp of the message to update/delete',
      },
      {
        displayName: 'Attachments',
        name: 'attachments',
        type: 'json',
        default: '[]',
        displayOptions: {
          show: {
            operation: ['sendMessage'],
          },
        },
        description: 'Slack message attachments (JSON array)',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // Get credentials
    const credentials = await this.getCredentials('slackApi') as SlackApiCredentials;
    const client = new WebClient(credentials.accessToken as string);

    const operation = this.getNodeParameter('operation', 0) as string;

    for (let inputIndex = 0; inputIndex < items.length; inputIndex++) {
      const inputData = items[inputIndex];
      
      for (let i = 0; i < inputData.length; i++) {
        try {
          if (operation === 'sendMessage') {
            const channel = this.getNodeParameter('channel', i) as string;
            const text = this.getNodeParameter('text', i) as string;
            const attachments = this.getNodeParameter('attachments', i, '[]') as string;

            const result = await client.chat.postMessage({
              channel,
              text,
              attachments: attachments ? JSON.parse(attachments) : undefined,
            });

            returnData.push({
              json: {
                ok: result.ok,
                channel: result.channel,
                ts: result.ts,
                message: result.message,
              },
            });
          } else if (operation === 'updateMessage') {
            const channel = this.getNodeParameter('channel', i) as string;
            const text = this.getNodeParameter('text', i) as string;
            const ts = this.getNodeParameter('messageTimestamp', i) as string;

            const result = await client.chat.update({
              channel,
              text,
              ts,
            });

            returnData.push({
              json: {
                ok: result.ok,
                channel: result.channel,
                ts: result.ts,
              },
            });
          } else if (operation === 'deleteMessage') {
            const channel = this.getNodeParameter('channel', i) as string;
            const ts = this.getNodeParameter('messageTimestamp', i) as string;

            const result = await client.chat.delete({
              channel,
              ts,
            });

            returnData.push({
              json: {
                ok: result.ok,
                channel: result.channel,
                ts: result.ts,
              },
            });
          }
        } catch (error: any) {
          returnData.push({
            json: {
              error: error.message,
              operation,
            },
          });
        }
      }
    }

    return [returnData];
  }
}
