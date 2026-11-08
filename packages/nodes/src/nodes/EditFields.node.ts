import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from '../interfaces';

export class EditFields implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Edit Fields',
    name: 'editFields',
    icon: 'fa:edit',
    group: ['transform'],
    version: 1,
    description: 'Add, remove, or rename fields',
    defaults: {
      name: 'Edit Fields',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Mode',
        name: 'mode',
        type: 'options',
        options: [
          { name: 'Add Fields', value: 'add' },
          { name: 'Remove Fields', value: 'remove' },
          { name: 'Rename Fields', value: 'rename' },
        ],
        default: 'add',
        description: 'The operation to perform',
      },
      {
        displayName: 'Fields to Add',
        name: 'fieldsToAdd',
        placeholder: 'Add Field',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        displayOptions: {
          show: {
            mode: ['add'],
          },
        },
        description: 'Fields to add',
        default: {},
        options: [
          {
            name: 'field',
            values: [
              {
                displayName: 'Field Name',
                name: 'fieldName',
                type: 'string',
                default: '',
                description: 'Name of the field to add',
              },
              {
                displayName: 'Field Value',
                name: 'fieldValue',
                type: 'string',
                default: '',
                description: 'Value for the field',
              },
            ],
          },
        ],
      },
      {
        displayName: 'Fields to Remove',
        name: 'fieldsToRemove',
        placeholder: 'Add Field',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        displayOptions: {
          show: {
            mode: ['remove'],
          },
        },
        description: 'Fields to remove',
        default: {},
        options: [
          {
            name: 'field',
            values: [
              {
                displayName: 'Field Name',
                name: 'fieldName',
                type: 'string',
                default: '',
                description: 'Name of the field to remove',
              },
            ],
          },
        ],
      },
      {
        displayName: 'Fields to Rename',
        name: 'fieldsToRename',
        placeholder: 'Add Field',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        displayOptions: {
          show: {
            mode: ['rename'],
          },
        },
        description: 'Fields to rename',
        default: {},
        options: [
          {
            name: 'field',
            values: [
              {
                displayName: 'Old Name',
                name: 'oldName',
                type: 'string',
                default: '',
                description: 'Current name of the field',
              },
              {
                displayName: 'New Name',
                name: 'newName',
                type: 'string',
                default: '',
                description: 'New name for the field',
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
        const mode = this.getNodeParameter('mode', i) as string;
        const item = { ...inputData[i] };
        let newJson = { ...item.json };

        if (mode === 'add') {
          const fieldsToAdd = this.getNodeParameter('fieldsToAdd', i) as any;
          if (fieldsToAdd.field && fieldsToAdd.field.length > 0) {
            for (const field of fieldsToAdd.field) {
              newJson[field.fieldName] = field.fieldValue;
            }
          }
        } else if (mode === 'remove') {
          const fieldsToRemove = this.getNodeParameter('fieldsToRemove', i) as any;
          if (fieldsToRemove.field && fieldsToRemove.field.length > 0) {
            for (const field of fieldsToRemove.field) {
              delete newJson[field.fieldName];
            }
          }
        } else if (mode === 'rename') {
          const fieldsToRename = this.getNodeParameter('fieldsToRename', i) as any;
          if (fieldsToRename.field && fieldsToRename.field.length > 0) {
            for (const field of fieldsToRename.field) {
              if (newJson.hasOwnProperty(field.oldName)) {
                newJson[field.newName] = newJson[field.oldName];
                delete newJson[field.oldName];
              }
            }
          }
        }

        returnData.push({ json: newJson });
      }
    }

    return [returnData];
  }
}
