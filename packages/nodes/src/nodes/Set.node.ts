import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';

export class Set implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Set',
    name: 'set',
    icon: 'fa:pen',
    group: ['transform'],
    version: 1,
    description: 'Set values on items and optionally remove other values',
    defaults: {
      name: 'Set',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Keep Only Set',
        name: 'keepOnlySet',
        type: 'boolean',
        default: false,
        description: 'Whether to keep only the values set on this node, removing all others',
      },
      {
        displayName: 'Values to Set',
        name: 'values',
        placeholder: 'Add Value',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        description: 'The values to set',
        default: {},
        options: [
          {
            name: 'boolean',
            values: [
              {
                displayName: 'Name',
                name: 'name',
                type: 'string',
                default: 'propertyName',
                description: 'Name of the property to set',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'boolean',
                default: false,
                description: 'The boolean value to set',
              },
            ],
          },
          {
            name: 'number',
            values: [
              {
                displayName: 'Name',
                name: 'name',
                type: 'string',
                default: 'propertyName',
                description: 'Name of the property to set',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'number',
                default: 0,
                description: 'The number value to set',
              },
            ],
          },
          {
            name: 'string',
            values: [
              {
                displayName: 'Name',
                name: 'name',
                type: 'string',
                default: 'propertyName',
                description: 'Name of the property to set',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                description: 'The string value to set',
              },
            ],
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let inputIndex = 0; inputIndex < items.length; inputIndex++) {
      const inputData = items[inputIndex];
      
      for (let i = 0; i < inputData.length; i++) {
        const keepOnlySet = this.getNodeParameter('keepOnlySet', i) as boolean;
        const values = this.getNodeParameter('values', i) as any;

        let newItem: any = {};

        if (!keepOnlySet) {
          // Keep existing properties
          newItem = { ...inputData[i].json };
        }

        // Set new values
        if (values.boolean) {
          for (const entry of values.boolean) {
            newItem[entry.name] = entry.value;
          }
        }
        if (values.number) {
          for (const entry of values.number) {
            newItem[entry.name] = entry.value;
          }
        }
        if (values.string) {
          for (const entry of values.string) {
            newItem[entry.name] = entry.value;
          }
        }

        returnData.push({ json: newItem });
      }
    }

    return [returnData];
  }
}
