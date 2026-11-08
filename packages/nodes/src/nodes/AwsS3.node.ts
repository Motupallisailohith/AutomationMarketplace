import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { AwsCredentials } from '../credentials';

export class AwsS3 implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'AWS S3',
    name: 'awsS3',
    icon: 'fa:aws',
    group: ['storage'],
    version: 1,
    description: 'Upload and manage files in AWS S3',
    defaults: {
      name: 'AWS S3',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'aws',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'Upload', value: 'upload', description: 'Upload a file' },
          { name: 'Download', value: 'download', description: 'Download a file' },
          { name: 'Delete', value: 'delete', description: 'Delete a file' },
          { name: 'List', value: 'list', description: 'List files in bucket' },
        ],
        default: 'upload',
        description: 'The operation to perform',
      },
      {
        displayName: 'Bucket Name',
        name: 'bucketName',
        type: 'string',
        default: '',
        required: true,
        description: 'Name of the S3 bucket',
      },
      {
        displayName: 'File Key',
        name: 'fileKey',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['upload', 'download', 'delete'],
          },
        },
        placeholder: 'folder/filename.txt',
        description: 'The file path/key in S3',
      },
      {
        displayName: 'File Content',
        name: 'fileContent',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: ['upload'],
          },
        },
        description: 'The file content to upload',
      },
      {
        displayName: 'Content Type',
        name: 'contentType',
        type: 'string',
        default: 'application/octet-stream',
        displayOptions: {
          show: {
            operation: ['upload'],
          },
        },
        description: 'MIME type of the file',
      },
      {
        displayName: 'ACL',
        name: 'acl',
        type: 'options',
        options: [
          { name: 'Private', value: 'private' },
          { name: 'Public Read', value: 'public-read' },
          { name: 'Public Read Write', value: 'public-read-write' },
        ],
        default: 'private',
        displayOptions: {
          show: {
            operation: ['upload'],
          },
        },
        description: 'Access control list',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // Get credentials
    const credentials = await this.getCredentials('aws') as AwsCredentials;
    
    // Create S3 client
    const s3Client = new S3Client({
      region: credentials.region as string,
      credentials: {
        accessKeyId: credentials.accessKeyId as string,
        secretAccessKey: credentials.secretAccessKey as string,
      },
    });

    const operation = this.getNodeParameter('operation', 0) as string;
    const bucketName = this.getNodeParameter('bucketName', 0) as string;

    for (let inputIndex = 0; inputIndex < items.length; inputIndex++) {
      const inputData = items[inputIndex];
      
      for (let i = 0; i < inputData.length; i++) {
        try {
          if (operation === 'upload') {
            const fileKey = this.getNodeParameter('fileKey', i) as string;
            const fileContent = this.getNodeParameter('fileContent', i) as string;
            const contentType = this.getNodeParameter('contentType', i) as string;
            const acl = this.getNodeParameter('acl', i) as string;
            
            const command = new PutObjectCommand({
              Bucket: bucketName,
              Key: fileKey,
              Body: fileContent,
              ContentType: contentType,
              ACL: acl as any,
            });
            
            const response = await s3Client.send(command);
            
            returnData.push({
              json: {
                operation: 'upload',
                bucket: bucketName,
                key: fileKey,
                etag: response.ETag,
                success: true,
              },
            });
          } else if (operation === 'download') {
            const fileKey = this.getNodeParameter('fileKey', i) as string;
            
            const command = new GetObjectCommand({
              Bucket: bucketName,
              Key: fileKey,
            });
            
            const response = await s3Client.send(command);
            const bodyContents = await response.Body?.transformToString();
            
            returnData.push({
              json: {
                operation: 'download',
                bucket: bucketName,
                key: fileKey,
                content: bodyContents,
                contentType: response.ContentType,
              },
            });
          } else if (operation === 'delete') {
            const fileKey = this.getNodeParameter('fileKey', i) as string;
            
            const command = new DeleteObjectCommand({
              Bucket: bucketName,
              Key: fileKey,
            });
            
            await s3Client.send(command);
            
            returnData.push({
              json: {
                operation: 'delete',
                bucket: bucketName,
                key: fileKey,
                success: true,
              },
            });
          } else if (operation === 'list') {
            const command = new ListObjectsV2Command({
              Bucket: bucketName,
            });
            
            const response = await s3Client.send(command);
            
            (response.Contents || []).forEach((item) => {
              returnData.push({
                json: {
                  key: item.Key,
                  size: item.Size,
                  lastModified: item.LastModified,
                  etag: item.ETag,
                },
              });
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
