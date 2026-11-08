import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';
import { google } from 'googleapis';
import { GoogleSheetsOAuth2ApiCredentials } from '../credentials';

export class GoogleSheets implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Google Sheets',
    name: 'googleSheets',
    icon: 'fa:table',
    group: ['transform'],
    version: 1,
    description: 'Read and write data to Google Sheets',
    defaults: {
      name: 'Google Sheets',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'googleSheetsOAuth2Api',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'Append', value: 'append', description: 'Append data to a sheet' },
          { name: 'Read', value: 'read', description: 'Read data from a sheet' },
          { name: 'Update', value: 'update', description: 'Update rows in a sheet' },
          { name: 'Clear', value: 'clear', description: 'Clear data from a sheet' },
        ],
        default: 'append',
        description: 'The operation to perform',
      },
      {
        displayName: 'Spreadsheet ID',
        name: 'spreadsheetId',
        type: 'string',
        default: '',
        required: true,
        description: 'The ID of the Google Sheets spreadsheet',
      },
      {
        displayName: 'Sheet Name',
        name: 'sheetName',
        type: 'string',
        default: 'Sheet1',
        required: true,
        description: 'Name of the sheet to use',
      },
      {
        displayName: 'Range',
        name: 'range',
        type: 'string',
        default: 'A1:Z999',
        displayOptions: {
          show: {
            operation: ['read', 'clear'],
          },
        },
        description: 'The range to read/clear (e.g., A1:Z999)',
      },
      {
        displayName: 'Data Mode',
        name: 'dataMode',
        type: 'options',
        displayOptions: {
          show: {
            operation: ['append'],
          },
        },
        options: [
          { name: 'Auto-Map', value: 'autoMap', description: 'Map input fields to columns' },
          { name: 'Manual', value: 'manual', description: 'Specify columns manually' },
        ],
        default: 'autoMap',
        description: 'How to map data to sheet columns',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // Get credentials
    const credentials = await this.getCredentials('googleSheetsOAuth2Api') as GoogleSheetsOAuth2ApiCredentials;
    
    // Initialize Google Sheets API
    const auth = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret
    );
    auth.setCredentials({
      access_token: credentials.accessToken as string,
      refresh_token: credentials.refreshToken as string,
    });
    
    const sheets = google.sheets({ version: 'v4', auth });

    const operation = this.getNodeParameter('operation', 0) as string;
    const spreadsheetId = this.getNodeParameter('spreadsheetId', 0) as string;
    const sheetName = this.getNodeParameter('sheetName', 0) as string;

    for (let inputIndex = 0; inputIndex < items.length; inputIndex++) {
      const inputData = items[inputIndex];
      
      for (let i = 0; i < inputData.length; i++) {
        try {
          if (operation === 'append') {
            // Auto-map input data to columns
            const values = [Object.values(inputData[i].json)];
            
            const result = await sheets.spreadsheets.values.append({
              spreadsheetId,
              range: `${sheetName}!A1`,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values },
            });
            
            returnData.push({
              json: {
                operation,
                spreadsheetId,
                sheetName,
                updatedCells: result.data.updates?.updatedCells || 0,
                updatedRange: result.data.updates?.updatedRange || '',
              },
            });
          } else if (operation === 'read') {
            const range = this.getNodeParameter('range', i) as string;
            
            const result = await sheets.spreadsheets.values.get({
              spreadsheetId,
              range: `${sheetName}!${range}`,
            });
            
            const rows = result.data.values || [];
            rows.forEach((row: any[]) => {
              const rowData: any = {};
              row.forEach((cell, index) => {
                rowData[`column${index}`] = cell;
              });
              returnData.push({ json: rowData });
            });
          }
        } catch (error: any) {
          returnData.push({
            json: {
              error: error.message,
              operation,
              spreadsheetId,
            },
          });
        }
      }
    }

    return [returnData];
  }
}
