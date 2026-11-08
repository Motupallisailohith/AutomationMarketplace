import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';
import * as nodemailer from 'nodemailer';
import { SmtpCredentials } from '../credentials';

export class Email implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Email (SMTP)',
    name: 'email',
    icon: 'fa:envelope',
    group: ['communication'],
    version: 1,
    description: 'Send emails via SMTP',
    defaults: {
      name: 'Email',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'smtp',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'From Email',
        name: 'fromEmail',
        type: 'string',
        default: '',
        required: true,
        placeholder: 'sender@example.com',
        description: 'Sender email address',
      },
      {
        displayName: 'To Email',
        name: 'toEmail',
        type: 'string',
        default: '',
        required: true,
        placeholder: 'recipient@example.com',
        description: 'Recipient email address (comma-separated for multiple)',
      },
      {
        displayName: 'CC',
        name: 'cc',
        type: 'string',
        default: '',
        placeholder: 'cc@example.com',
        description: 'CC email addresses (comma-separated)',
      },
      {
        displayName: 'BCC',
        name: 'bcc',
        type: 'string',
        default: '',
        placeholder: 'bcc@example.com',
        description: 'BCC email addresses (comma-separated)',
      },
      {
        displayName: 'Subject',
        name: 'subject',
        type: 'string',
        default: '',
        required: true,
        description: 'Email subject',
      },
      {
        displayName: 'Text',
        name: 'text',
        type: 'string',
        default: '',
        description: 'Plain text email body',
      },
      {
        displayName: 'HTML',
        name: 'html',
        type: 'string',
        typeOptions: {
          rows: 5,
        },
        default: '',
        description: 'HTML email body',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // Get credentials
    const credentials = await this.getCredentials('smtp') as SmtpCredentials;
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: credentials.host as string,
      port: credentials.port as number,
      secure: credentials.secure as boolean,
      auth: {
        user: credentials.user as string,
        pass: credentials.password as string,
      },
    });

    for (let inputIndex = 0; inputIndex < items.length; inputIndex++) {
      const inputData = items[inputIndex];
      
      for (let i = 0; i < inputData.length; i++) {
        try {
          const fromEmail = this.getNodeParameter('fromEmail', i) as string;
          const toEmail = this.getNodeParameter('toEmail', i) as string;
          const cc = this.getNodeParameter('cc', i, '') as string;
          const bcc = this.getNodeParameter('bcc', i, '') as string;
          const subject = this.getNodeParameter('subject', i) as string;
          const text = this.getNodeParameter('text', i, '') as string;
          const html = this.getNodeParameter('html', i, '') as string;

          const mailOptions: any = {
            from: fromEmail,
            to: toEmail,
            subject,
          };

          if (cc) mailOptions.cc = cc;
          if (bcc) mailOptions.bcc = bcc;
          if (text) mailOptions.text = text;
          if (html) mailOptions.html = html;

          const info = await transporter.sendMail(mailOptions);

          returnData.push({
            json: {
              sent: true,
              messageId: info.messageId,
              from: fromEmail,
              to: toEmail,
              subject,
            },
          });
        } catch (error: any) {
          returnData.push({
            json: {
              error: error.message,
              sent: false,
            },
          });
        }
      }
    }

    return [returnData];
  }
}
