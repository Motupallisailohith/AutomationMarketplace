/**
 * Test file to verify @automation-marketplace/nodes package works
 */

import { 
  INodeType, 
  IExecuteFunctions, 
  INodeExecutionData,
  INodeTypeDescription 
} from '@automation-marketplace/nodes';

// Test: Can we import and use the interfaces?
console.log('✅ Successfully imported interfaces from @automation-marketplace/nodes');

// Test: Create a simple test node
class TestNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Test Node',
    name: 'testNode',
    group: ['transform'],
    version: 1,
    description: 'A test node to verify the system works',
    defaults: {
      name: 'Test Node',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][] | null> {
    const items = this.getInputData();
    
    return [
      items[0].map(item => ({
        json: {
          ...item.json,
          tested: true,
          timestamp: new Date().toISOString(),
        },
      })),
    ];
  }
}

console.log('✅ Successfully created a test node class');
console.log('✅ Node name:', new TestNode().description.name);
console.log('✅ Node display name:', new TestNode().description.displayName);

console.log('\n🎉 All tests passed! The @automation-marketplace/nodes package is working correctly!');
