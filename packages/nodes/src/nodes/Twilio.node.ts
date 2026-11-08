import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';
import twilio from 'twilio';
import { TwilioApiCredentials } from '../credentials';

export class Twilio implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Twilio',
    name: 'twilio',
    icon: 'fa:comment',
    group: ['communication'],
    version: 1,
    description: 'Send SMS and make calls with Twilio',
    defaults: {
      name: 'Twilio',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'twilioApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        options: [
          { name: 'SMS', value: 'sms', description: 'Send SMS messages' },
          { name: 'Call', value: 'call', description: 'Make phone calls' },
        ],
        default: 'sms',
        description: 'The resource to use',
      },
      {
        displayName: 'From',
        name: 'from',
        type: 'string',
        default: '',
        required: true,
        placeholder: '+1234567890',
        description: 'Twilio phone number to send from',
      },
      {
        displayName: 'To',
        name: 'to',
        type: 'string',
        default: '',
        required: true,
        placeholder: '+1234567890',
        description: 'Phone number to send to',
      },
      {
        displayName: 'Message',
        name: 'message',
        type: 'string',
        typeOptions: {
          rows: 3,
        },
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['sms'],
          },
        },
        description: 'The SMS message to send',
      },
      {
        displayName: 'TwiML URL',
        name: 'twimlUrl',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['call'],
          },
        },
        description: 'URL of TwiML instructions for the call',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // Get credentials
    const credentials = await this.getCredentials('twilioApi') as TwilioApiCredentials;
    const client = twilio(
      credentials.accountSid as string,
      credentials.authToken as string
    );

    const resource = this.getNodeParameter('resource', 0) as string;

    for (let inputIndex = 0; inputIndex < items.length; inputIndex++) {
      const inputData = items[inputIndex];
      
      for (let i = 0; i < inputData.length; i++) {
        try {
          const from = this.getNodeParameter('from', i) as string;
          const to = this.getNodeParameter('to', i) as string;

          if (resource === 'sms') {
            const message = this.getNodeParameter('message', i) as string;

            const result = await client.messages.create({
              body: message,
              from,
              to,
            });

            returnData.push({
              json: {
                sid: result.sid,
                status: result.status,
                from: result.from,
                to: result.to,
                body: result.body,
                dateCreated: result.dateCreated,
              },
            });
          } else if (resource === 'call') {
            const twimlUrl = this.getNodeParameter('twimlUrl', i) as string;

            const result = await client.calls.create({
              url: twimlUrl,
              from,
              to,
            });

            returnData.push({
              json: {
                sid: result.sid,
                status: result.status,
                from: result.from,
                to: result.to,
                dateCreated: result.dateCreated,
              },
            });
          }
        } catch (error: any) {
          returnData.push({
            json: {
              error: error.message,
              resource,
            },
          });
        }
      }
    }

    return [returnData];
  }
}
