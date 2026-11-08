import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';
import * as mysql from 'mysql2/promise';
import { MySqlCredentials } from '../credentials';

export class MySQL implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'MySQL',
    name: 'mysql',
    icon: 'fa:database',
    group: ['database'],
    version: 1,
    description: 'Execute MySQL queries',
    defaults: {
      name: 'MySQL',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'mysql',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'Execute Query', value: 'executeQuery', description: 'Execute a SQL query' },
          { name: 'Insert', value: 'insert', description: 'Insert rows' },
          { name: 'Update', value: 'update', description: 'Update rows' },
          { name: 'Delete', value: 'delete', description: 'Delete rows' },
        ],
        default: 'executeQuery',
        description: 'The operation to perform',
      },
      {
        displayName: 'Query',
        name: 'query',
        type: 'string',
        typeOptions: {
          rows: 5,
        },
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['executeQuery'],
          },
        },
        placeholder: 'SELECT * FROM users WHERE status = ?',
        description: 'The SQL query to execute',
      },
      {
        displayName: 'Table',
        name: 'table',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['insert', 'update', 'delete'],
          },
        },
        description: 'Name of the table',
      },
      {
        displayName: 'Columns',
        name: 'columns',
        type: 'string',
        default: '',
        placeholder: 'name,email,status',
        displayOptions: {
          show: {
            operation: ['insert', 'update'],
          },
        },
        description: 'Comma-separated column names',
      },
      {
        displayName: 'Where Condition',
        name: 'whereCondition',
        type: 'string',
        default: '',
        placeholder: 'id = 123',
        displayOptions: {
          show: {
            operation: ['update', 'delete'],
          },
        },
        description: 'WHERE clause (without WHERE keyword)',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // Get credentials
    const credentials = await this.getCredentials('mysql') as MySqlCredentials;
    
    // Create connection
    const connection = await mysql.createConnection({
      host: credentials.host as string,
      port: credentials.port as number,
      database: credentials.database as string,
      user: credentials.user as string,
      password: credentials.password as string,
    });

    const operation = this.getNodeParameter('operation', 0) as string;

    try {
      for (let inputIndex = 0; inputIndex < items.length; inputIndex++) {
        const inputData = items[inputIndex];
        
        for (let i = 0; i < inputData.length; i++) {
          try {
            if (operation === 'executeQuery') {
              const query = this.getNodeParameter('query', i) as string;
              
              const [rows] = await connection.execute(query);
              
              if (Array.isArray(rows)) {
                rows.forEach((row: any) => {
                  returnData.push({ json: row });
                });
              } else {
                returnData.push({ json: { result: rows } });
              }
            } else if (operation === 'insert') {
              const table = this.getNodeParameter('table', i) as string;
              const columns = this.getNodeParameter('columns', i) as string;
              const columnArray = columns.split(',').map(c => c.trim());
              
              // Use input data for values
              const values = columnArray.map(col => inputData[i].json[col]);
              const placeholders = columnArray.map(() => '?').join(',');
              
              const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
              const [result] = await connection.execute(query, values);
              
              returnData.push({
                json: {
                  operation: 'insert',
                  affectedRows: (result as any).affectedRows,
                  insertId: (result as any).insertId,
                },
              });
            } else if (operation === 'update') {
              const table = this.getNodeParameter('table', i) as string;
              const columns = this.getNodeParameter('columns', i) as string;
              const whereCondition = this.getNodeParameter('whereCondition', i) as string;
              
              const columnArray = columns.split(',').map(c => c.trim());
              const setClause = columnArray.map(col => `${col} = ?`).join(', ');
              const values = columnArray.map(col => inputData[i].json[col]);
              
              const query = `UPDATE ${table} SET ${setClause} WHERE ${whereCondition}`;
              const [result] = await connection.execute(query, values);
              
              returnData.push({
                json: {
                  operation: 'update',
                  affectedRows: (result as any).affectedRows,
                },
              });
            } else if (operation === 'delete') {
              const table = this.getNodeParameter('table', i) as string;
              const whereCondition = this.getNodeParameter('whereCondition', i) as string;
              
              const query = `DELETE FROM ${table} WHERE ${whereCondition}`;
              const [result] = await connection.execute(query);
              
              returnData.push({
                json: {
                  operation: 'delete',
                  affectedRows: (result as any).affectedRows,
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
      await connection.end();
    }

    return [returnData];
  }
}
