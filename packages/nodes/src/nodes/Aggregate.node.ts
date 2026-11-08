import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';

export class Aggregate implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Aggregate',
    name: 'aggregate',
    icon: 'fa:calculator',
    group: ['transform'],
    version: 1,
    description: 'Aggregate data (sum, count, avg, min, max)',
    defaults: {
      name: 'Aggregate',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Aggregations',
        name: 'aggregations',
        placeholder: 'Add Aggregation',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        description: 'Aggregations to perform',
        default: {},
        options: [
          {
            name: 'aggregation',
            values: [
              {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                options: [
                  { name: 'Count', value: 'count' },
                  { name: 'Sum', value: 'sum' },
                  { name: 'Average', value: 'average' },
                  { name: 'Min', value: 'min' },
                  { name: 'Max', value: 'max' },
                ],
                default: 'count',
                description: 'The aggregation operation',
              },
              {
                displayName: 'Field Name',
                name: 'fieldName',
                type: 'string',
                default: '',
                description: 'Field to aggregate (not needed for count)',
                displayOptions: {
                  hide: {
                    operation: ['count'],
                  },
                },
              },
              {
                displayName: 'Output Field Name',
                name: 'outputFieldName',
                type: 'string',
                default: '',
                placeholder: 'total',
                description: 'Name for the aggregated result',
              },
            ],
          },
        ],
      },
      {
        displayName: 'Group By',
        name: 'groupBy',
        type: 'string',
        default: '',
        placeholder: 'category',
        description: 'Field to group by (optional)',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const aggregations = this.getNodeParameter('aggregations', 0) as any;
    const groupBy = this.getNodeParameter('groupBy', 0) as string;

    // Collect all items
    const allItems: INodeExecutionData[] = [];
    for (let inputIndex = 0; inputIndex < items.length; inputIndex++) {
      allItems.push(...items[inputIndex]);
    }

    if (!groupBy) {
      // Aggregate all items together
      const result: any = {};

      if (aggregations.aggregation && aggregations.aggregation.length > 0) {
        for (const agg of aggregations.aggregation) {
          const operation = agg.operation;
          const fieldName = agg.fieldName;
          const outputFieldName = agg.outputFieldName || operation;

          switch (operation) {
            case 'count':
              result[outputFieldName] = allItems.length;
              break;
            case 'sum':
              result[outputFieldName] = allItems.reduce(
                (sum, item) => sum + (Number(item.json[fieldName]) || 0),
                0
              );
              break;
            case 'average':
              const sum = allItems.reduce(
                (s, item) => s + (Number(item.json[fieldName]) || 0),
                0
              );
              result[outputFieldName] = allItems.length > 0 ? sum / allItems.length : 0;
              break;
            case 'min':
              const values = allItems.map((item) => Number(item.json[fieldName]) || 0);
              result[outputFieldName] = Math.min(...values);
              break;
            case 'max':
              const maxValues = allItems.map((item) => Number(item.json[fieldName]) || 0);
              result[outputFieldName] = Math.max(...maxValues);
              break;
          }
        }
      }

      returnData.push({ json: result });
    } else {
      // Group by field and aggregate each group
      const groups: { [key: string]: INodeExecutionData[] } = {};

      for (const item of allItems) {
        const groupValue = String(item.json[groupBy]);
        if (!groups[groupValue]) {
          groups[groupValue] = [];
        }
        groups[groupValue].push(item);
      }

      for (const [groupValue, groupItems] of Object.entries(groups)) {
        const result: any = { [groupBy]: groupValue };

        if (aggregations.aggregation && aggregations.aggregation.length > 0) {
          for (const agg of aggregations.aggregation) {
            const operation = agg.operation;
            const fieldName = agg.fieldName;
            const outputFieldName = agg.outputFieldName || operation;

            switch (operation) {
              case 'count':
                result[outputFieldName] = groupItems.length;
                break;
              case 'sum':
                result[outputFieldName] = groupItems.reduce(
                  (sum, item) => sum + (Number(item.json[fieldName]) || 0),
                  0
                );
                break;
              case 'average':
                const sum = groupItems.reduce(
                  (s, item) => s + (Number(item.json[fieldName]) || 0),
                  0
                );
                result[outputFieldName] = groupItems.length > 0 ? sum / groupItems.length : 0;
                break;
              case 'min':
                const values = groupItems.map((item) => Number(item.json[fieldName]) || 0);
                result[outputFieldName] = Math.min(...values);
                break;
              case 'max':
                const maxValues = groupItems.map((item) => Number(item.json[fieldName]) || 0);
                result[outputFieldName] = Math.max(...maxValues);
                break;
            }
          }
        }

        returnData.push({ json: result });
      }
    }

    return [returnData];
  }
}
