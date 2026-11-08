import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';

export class If implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'IF',
    name: 'if',
    icon: 'fa:split',
    group: ['transform'],
    version: 1,
    description: 'Split data stream based on conditions',
    defaults: {
      name: 'IF',
    },
    inputs: ['main'],
    outputs: ['main', 'main'],
    properties: [
      {
        displayName: 'Conditions',
        name: 'conditions',
        placeholder: 'Add Condition',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        description: 'The conditions to check',
        default: {},
        options: [
          {
            name: 'boolean',
            values: [
              {
                displayName: 'Field Name',
                name: 'fieldName',
                type: 'string',
                default: '',
                description: 'Name of the field to check',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'boolean',
                default: true,
                description: 'The value to compare against',
              },
            ],
          },
          {
            name: 'number',
            values: [
              {
                displayName: 'Field Name',
                name: 'fieldName',
                type: 'string',
                default: '',
                description: 'Name of the field to check',
              },
              {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                options: [
                  { name: 'Equal', value: 'equal' },
                  { name: 'Not Equal', value: 'notEqual' },
                  { name: 'Larger', value: 'larger' },
                  { name: 'Larger Equal', value: 'largerEqual' },
                  { name: 'Smaller', value: 'smaller' },
                  { name: 'Smaller Equal', value: 'smallerEqual' },
                ],
                default: 'equal',
                description: 'The comparison operation',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'number',
                default: 0,
                description: 'The value to compare against',
              },
            ],
          },
          {
            name: 'string',
            values: [
              {
                displayName: 'Field Name',
                name: 'fieldName',
                type: 'string',
                default: '',
                description: 'Name of the field to check',
              },
              {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                options: [
                  { name: 'Contains', value: 'contains' },
                  { name: 'Ends With', value: 'endsWith' },
                  { name: 'Equal', value: 'equal' },
                  { name: 'Not Equal', value: 'notEqual' },
                  { name: 'Regex', value: 'regex' },
                  { name: 'Starts With', value: 'startsWith' },
                ],
                default: 'equal',
                description: 'The comparison operation',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                description: 'The value to compare against',
              },
            ],
          },
        ],
      },
      {
        displayName: 'Combine',
        name: 'combineOperation',
        type: 'options',
        options: [
          { name: 'ALL', value: 'all', description: 'All conditions must be met' },
          { name: 'ANY', value: 'any', description: 'At least one condition must be met' },
        ],
        default: 'all',
        description: 'How to combine multiple conditions',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnDataTrue: INodeExecutionData[] = [];
    const returnDataFalse: INodeExecutionData[] = [];

    for (let inputIndex = 0; inputIndex < items.length; inputIndex++) {
      const inputData = items[inputIndex];
      
      for (let i = 0; i < inputData.length; i++) {
        const conditions = this.getNodeParameter('conditions', i) as any;
        const combineOperation = this.getNodeParameter('combineOperation', i) as string;

        let conditionMet = combineOperation === 'all' ? true : false;

        // Evaluate conditions (simplified logic)
        // In actual implementation, this would properly evaluate each condition type
        const hasConditions = 
          (conditions.boolean && conditions.boolean.length > 0) ||
          (conditions.number && conditions.number.length > 0) ||
          (conditions.string && conditions.string.length > 0);

        if (!hasConditions) {
          conditionMet = true; // No conditions means always true
        }

        if (conditionMet) {
          returnDataTrue.push(inputData[i]);
        } else {
          returnDataFalse.push(inputData[i]);
        }
      }
    }

    return [returnDataTrue, returnDataFalse];
  }
}
