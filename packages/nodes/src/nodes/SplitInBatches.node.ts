import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';

export class SplitInBatches implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Split In Batches',
    name: 'splitInBatches',
    icon: 'fa:th-large',
    group: ['transform'],
    version: 1,
    description: 'Split data into batches for processing',
    defaults: {
      name: 'Split In Batches',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Batch Size',
        name: 'batchSize',
        type: 'number',
        typeOptions: {
          minValue: 1,
        },
        default: 10,
        description: 'Number of items to return in each batch',
      },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
          {
            name: 'Reset',
            value: 'reset',
            description: 'Whether to reset the batches on each execution',
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const batchSize = this.getNodeParameter('batchSize', 0) as number;
    const returnData: INodeExecutionData[] = [];

    // In actual implementation, this would use context to track batch state
    // across multiple executions in a loop
    // For now, just return first batch from first input
    if (items.length > 0 && items[0].length > 0) {
      const firstBatch = items[0].slice(0, Math.min(batchSize, items[0].length));
      returnData.push(...firstBatch);
    }

    return [returnData];
  }
}
