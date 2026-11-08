import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';

export class Code implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Code',
    name: 'code',
    icon: 'fa:code',
    group: ['transform'],
    version: 1,
    description: 'Execute custom JavaScript code',
    defaults: {
      name: 'Code',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Mode',
        name: 'mode',
        type: 'options',
        options: [
          {
            name: 'Run Once for All Items',
            value: 'runOnceForAllItems',
            description: 'Run the code once with all items',
          },
          {
            name: 'Run Once for Each Item',
            value: 'runOnceForEachItem',
            description: 'Run the code separately for each item',
          },
        ],
        default: 'runOnceForAllItems',
        description: 'How the code should be executed',
      },
      {
        displayName: 'JavaScript Code',
        name: 'jsCode',
        type: 'string',
        typeOptions: {
          rows: 10,
        },
        default: '// Access items with $input.all()\n// Return new items\nreturn $input.all();',
        description: 'The JavaScript code to execute',
        displayOptions: {
          show: {
            mode: ['runOnceForAllItems'],
          },
        },
      },
      {
        displayName: 'JavaScript Code',
        name: 'jsCode',
        type: 'string',
        typeOptions: {
          rows: 10,
        },
        default: '// Access current item with $input.item.json\n// Return the modified item\nreturn $input.item;',
        description: 'The JavaScript code to execute',
        displayOptions: {
          show: {
            mode: ['runOnceForEachItem'],
          },
        },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const mode = this.getNodeParameter('mode', 0) as string;
    const jsCode = this.getNodeParameter('jsCode', 0) as string;

    let returnData: INodeExecutionData[] = [];

    if (mode === 'runOnceForAllItems') {
      // Execute code once with all items
      // In actual implementation, this would use vm2 or similar for sandboxing
      // For now, just return first input's items
      if (items.length > 0) {
        returnData = items[0];
      }
    } else {
      // Execute code for each item
      for (let inputIndex = 0; inputIndex < items.length; inputIndex++) {
        const inputData = items[inputIndex];
        for (let i = 0; i < inputData.length; i++) {
          // In actual implementation, execute code with item context
          returnData.push(inputData[i]);
        }
      }
    }

    return [returnData];
  }
}
