import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';
import Redis from 'ioredis';
import { RedisCredentials } from '../credentials';

export class RedisNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Redis',
    name: 'redis',
    icon: 'fa:hdd',
    group: ['database'],
    version: 1,
    description: 'Execute Redis commands',
    defaults: {
      name: 'Redis',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'redis',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'Get', value: 'get', description: 'Get value by key' },
          { name: 'Set', value: 'set', description: 'Set key-value pair' },
          { name: 'Delete', value: 'delete', description: 'Delete key' },
          { name: 'Increment', value: 'incr', description: 'Increment value' },
          { name: 'List Push', value: 'lpush', description: 'Push to list' },
          { name: 'List Pop', value: 'lpop', description: 'Pop from list' },
          { name: 'Hash Set', value: 'hset', description: 'Set hash field' },
          { name: 'Hash Get', value: 'hget', description: 'Get hash field' },
        ],
        default: 'get',
        description: 'The operation to perform',
      },
      {
        displayName: 'Key',
        name: 'key',
        type: 'string',
        default: '',
        required: true,
        description: 'The Redis key',
      },
      {
        displayName: 'Value',
        name: 'value',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: ['set', 'lpush'],
          },
        },
        description: 'The value to set/push',
      },
      {
        displayName: 'Field',
        name: 'field',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            operation: ['hset', 'hget'],
          },
        },
        description: 'The hash field name',
      },
      {
        displayName: 'TTL (seconds)',
        name: 'ttl',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            operation: ['set'],
          },
        },
        description: 'Time to live in seconds (0 = no expiration)',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // Get credentials
    const credentials = await this.getCredentials('redis') as RedisCredentials;
    
    // Create Redis client
    const redis = new Redis({
      host: credentials.host as string,
      port: credentials.port as number,
      password: (credentials.password as string) || undefined,
      db: (credentials.database as number) || undefined,
    });

    const operation = this.getNodeParameter('operation', 0) as string;

    try {
      for (let inputIndex = 0; inputIndex < items.length; inputIndex++) {
        const inputData = items[inputIndex];
        
        for (let i = 0; i < inputData.length; i++) {
          try {
            const key = this.getNodeParameter('key', i) as string;

            if (operation === 'get') {
              const value = await redis.get(key);
              
              returnData.push({
                json: {
                  key,
                  value,
                },
              });
            } else if (operation === 'set') {
              const value = this.getNodeParameter('value', i) as string;
              const ttl = this.getNodeParameter('ttl', i, 0) as number;
              
              if (ttl > 0) {
                await redis.setex(key, ttl, value);
              } else {
                await redis.set(key, value);
              }
              
              returnData.push({
                json: {
                  operation: 'set',
                  key,
                  success: true,
                },
              });
            } else if (operation === 'delete') {
              const result = await redis.del(key);
              
              returnData.push({
                json: {
                  operation: 'delete',
                  key,
                  deleted: result === 1,
                },
              });
            } else if (operation === 'incr') {
              const result = await redis.incr(key);
              
              returnData.push({
                json: {
                  key,
                  value: result,
                },
              });
            } else if (operation === 'lpush') {
              const value = this.getNodeParameter('value', i) as string;
              const result = await redis.lpush(key, value);
              
              returnData.push({
                json: {
                  key,
                  listLength: result,
                },
              });
            } else if (operation === 'lpop') {
              const value = await redis.lpop(key);
              
              returnData.push({
                json: {
                  key,
                  value,
                },
              });
            } else if (operation === 'hset') {
              const field = this.getNodeParameter('field', i) as string;
              const value = this.getNodeParameter('value', i) as string;
              
              await redis.hset(key, field, value);
              
              returnData.push({
                json: {
                  key,
                  field,
                  success: true,
                },
              });
            } else if (operation === 'hget') {
              const field = this.getNodeParameter('field', i) as string;
              const value = await redis.hget(key, field);
              
              returnData.push({
                json: {
                  key,
                  field,
                  value,
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
    } finally {
      await redis.quit();
    }

    return [returnData];
  }
}
