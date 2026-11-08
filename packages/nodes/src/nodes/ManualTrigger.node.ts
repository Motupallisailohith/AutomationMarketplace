import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';

export class ManualTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Manual Trigger',
    name: 'manualTrigger',
    icon: 'fa:mouse-pointer',
    group: ['trigger'],
    version: 1,
    description: 'Manually trigger workflow execution',
    defaults: {
      name: 'Manual Trigger',
    },
    inputs: [],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Info',
        name: 'info',
        type: 'string',
        default: '',
        description: 'This node will execute when you click the "Execute Workflow" button',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();

    // Manual trigger returns empty item to start workflow
    if (items.length === 0 || items[0].length === 0) {
      return [[{ json: {} }]];
    }

    return items;
  }
}
