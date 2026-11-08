import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';

export class Filter implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Filter',
    name: 'filter',
    icon: 'fa:filter',
    group: ['transform'],
    version: 1,
    description: 'Filter items based on conditions',
    defaults: {
      name: 'Filter',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Conditions',
        name: 'conditions',
        placeholder: 'Add Condition',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        description: 'Conditions to filter by',
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
                  { name: 'Not Contains', value: 'notContains' },
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
          { name: 'ALL', value: 'all', description: 'All conditions must match' },
          { name: 'ANY', value: 'any', description: 'At least one condition must match' },
        ],
        default: 'all',
        description: 'How to combine multiple conditions',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let inputIndex = 0; inputIndex < items.length; inputIndex++) {
      const inputData = items[inputIndex];

      for (let i = 0; i < inputData.length; i++) {
        const conditions = this.getNodeParameter('conditions', i) as any;
        const combineOperation = this.getNodeParameter('combineOperation', i) as string;

        let passesFilter = combineOperation === 'all' ? true : false;

        // Evaluate conditions (simplified implementation)
        const hasConditions =
          (conditions.boolean && conditions.boolean.length > 0) ||
          (conditions.number && conditions.number.length > 0) ||
          (conditions.string && conditions.string.length > 0);

        if (!hasConditions) {
          passesFilter = true; // No conditions means pass all items
        } else {
          // In actual implementation, evaluate each condition type
          // For now, simplified logic
          if (conditions.string && conditions.string.length > 0) {
            const condition = conditions.string[0];
            const fieldValue = inputData[i].json[condition.fieldName];
            const compareValue = condition.value;

            switch (condition.operation) {
              case 'equal':
                passesFilter = fieldValue === compareValue;
                break;
              case 'notEqual':
                passesFilter = fieldValue !== compareValue;
                break;
              case 'contains':
                passesFilter = String(fieldValue).includes(String(compareValue));
                break;
              case 'notContains':
                passesFilter = !String(fieldValue).includes(String(compareValue));
                break;
              case 'startsWith':
                passesFilter = String(fieldValue).startsWith(String(compareValue));
                break;
              case 'endsWith':
                passesFilter = String(fieldValue).endsWith(String(compareValue));
                break;
            }
          }
        }

        if (passesFilter) {
          returnData.push(inputData[i]);
        }
      }
    }

    return [returnData];
  }
}
