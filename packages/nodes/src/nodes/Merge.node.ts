import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';

export class Merge implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Merge',
    name: 'merge',
    icon: 'fa:code-branch',
    group: ['transform'],
    version: 1,
    description: 'Merge data from two branches',
    defaults: {
      name: 'Merge',
    },
    inputs: ['main', 'main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Mode',
        name: 'mode',
        type: 'options',
        options: [
          {
            name: 'Append',
            value: 'append',
            description: 'Append data from input 2 to input 1',
          },
          {
            name: 'Merge By Index',
            value: 'mergeByIndex',
            description: 'Merge items by their index',
          },
          {
            name: 'Merge By Key',
            value: 'mergeByKey',
            description: 'Merge items by matching key field',
          },
          {
            name: 'Multiplex',
            value: 'multiplex',
            description: 'Create all possible combinations',
          },
        ],
        default: 'append',
        description: 'How to merge the data',
      },
      {
        displayName: 'Property Input 1',
        name: 'propertyInput1',
        type: 'string',
        default: 'id',
        required: true,
        displayOptions: {
          show: {
            mode: ['mergeByKey'],
          },
        },
        description: 'Name of property in input 1 to match on',
      },
      {
        displayName: 'Property Input 2',
        name: 'propertyInput2',
        type: 'string',
        default: 'id',
        required: true,
        displayOptions: {
          show: {
            mode: ['mergeByKey'],
          },
        },
        description: 'Name of property in input 2 to match on',
      },
      {
        displayName: 'Output Data',
        name: 'outputData',
        type: 'options',
        displayOptions: {
          show: {
            mode: ['mergeByIndex', 'mergeByKey'],
          },
        },
        options: [
          {
            name: 'Both',
            value: 'both',
            description: 'Output both input 1 and input 2 data',
          },
          {
            name: 'Input 1',
            value: 'input1',
            description: 'Only output input 1 data',
          },
          {
            name: 'Input 2',
            value: 'input2',
            description: 'Only output input 2 data',
          },
        ],
        default: 'both',
        description: 'What data should be returned',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const mode = this.getNodeParameter('mode', 0) as string;
    const returnData: INodeExecutionData[] = [];

    if (mode === 'append') {
      // Simply append all items from both inputs
      for (const inputData of items) {
        returnData.push(...inputData);
      }
    } else if (mode === 'mergeByIndex') {
      // Merge items with same index
      const outputData = this.getNodeParameter('outputData', 0) as string;
      const input1 = items[0] || [];
      const input2 = items[1] || [];
      const maxLength = Math.max(input1.length, input2.length);

      for (let i = 0; i < maxLength; i++) {
        let newItem: any = {};

        if (outputData === 'both' || outputData === 'input1') {
          if (input1[i]) {
            newItem = { ...newItem, ...input1[i].json };
          }
        }

        if (outputData === 'both' || outputData === 'input2') {
          if (input2[i]) {
            newItem = { ...newItem, ...input2[i].json };
          }
        }

        returnData.push({ json: newItem });
      }
    } else if (mode === 'mergeByKey') {
      // Merge items with matching key values
      const propertyInput1 = this.getNodeParameter('propertyInput1', 0) as string;
      const propertyInput2 = this.getNodeParameter('propertyInput2', 0) as string;
      const outputData = this.getNodeParameter('outputData', 0) as string;

      const input1 = items[0] || [];
      const input2 = items[1] || [];

      for (const item1 of input1) {
        const key1 = item1.json[propertyInput1];
        const matchingItem2 = input2.find(
          (item2: INodeExecutionData) => item2.json[propertyInput2] === key1
        );

        let newItem: any = {};

        if (outputData === 'both' || outputData === 'input1') {
          newItem = { ...newItem, ...item1.json };
        }

        if (matchingItem2 && (outputData === 'both' || outputData === 'input2')) {
          newItem = { ...newItem, ...matchingItem2.json };
        }

        returnData.push({ json: newItem });
      }
    } else if (mode === 'multiplex') {
      // Create all combinations
      const input1 = items[0] || [];
      const input2 = items[1] || [];

      for (const item1 of input1) {
        for (const item2 of input2) {
          returnData.push({
            json: { ...item1.json, ...item2.json },
          });
        }
      }
    }

    return [returnData];
  }
}
