import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';

export class Sort implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Sort',
    name: 'sort',
    icon: 'fa:sort-amount-down',
    group: ['transform'],
    version: 1,
    description: 'Sort items by field values',
    defaults: {
      name: 'Sort',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Sort Rules',
        name: 'sortRules',
        placeholder: 'Add Sort Rule',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        description: 'Rules to sort by',
        default: {},
        options: [
          {
            name: 'rule',
            values: [
              {
                displayName: 'Field Name',
                name: 'fieldName',
                type: 'string',
                default: '',
                description: 'Name of the field to sort by',
              },
              {
                displayName: 'Order',
                name: 'order',
                type: 'options',
                options: [
                  { name: 'Ascending', value: 'asc' },
                  { name: 'Descending', value: 'desc' },
                ],
                default: 'asc',
                description: 'Sort order',
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

    // Collect all items from all inputs
    for (let inputIndex = 0; inputIndex < items.length; inputIndex++) {
      returnData.push(...items[inputIndex]);
    }

    const sortRules = this.getNodeParameter('sortRules', 0) as any;

    if (sortRules.rule && sortRules.rule.length > 0) {
      returnData.sort((a, b) => {
        for (const rule of sortRules.rule) {
          const fieldName = rule.fieldName;
          const order = rule.order;

          const aValue = a.json[fieldName];
          const bValue = b.json[fieldName];

          let comparison = 0;

          // Handle different types
          if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
          } else if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.localeCompare(bValue);
          } else if (aValue instanceof Date && bValue instanceof Date) {
            comparison = aValue.getTime() - bValue.getTime();
          } else {
            comparison = String(aValue).localeCompare(String(bValue));
          }

          if (comparison !== 0) {
            return order === 'desc' ? -comparison : comparison;
          }
        }
        return 0;
      });
    }

    return [returnData];
  }
}
