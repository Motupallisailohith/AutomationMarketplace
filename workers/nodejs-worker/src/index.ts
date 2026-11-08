/**
 * Node.js Worker - Executes workflow nodes via Temporal
 * 
 * TODO: Implement proper n8n-core integration for workflow execution
 * This is a stub that connects to Temporal but needs full n8n WorkflowExecute integration
 */

import { Worker } from '@temporalio/worker';

// Node execution activity - STUB
// TODO: Replace with actual n8n-core WorkflowExecute integration
export async function executeNodeActivity(params: any) {
    console.log('🔄 Executing node activity:', params.nodeName);

    try {
        // STUB: This needs to use n8n's WorkflowExecute class
        // For now, just log the execution request
        console.log('⚠️  Node execution not yet implemented');
        console.log('   Params:', JSON.stringify(params, null, 2));

        return {
            success: true,
            data: { message: 'Node execution stub - implementation pending' },
            executionTime: Date.now(),
        };
    } catch (error) {
        console.error('❌ Node execution error:', error);
        throw error;
    }
}

// Main worker setup
async function main() {
    console.log('🚀 Starting Node.js Worker...');
    console.log('⚠️  Note: n8n-core execution not yet implemented (stub only)');
    console.log();

    // 2. Create Temporal worker
    console.log('⚙️  Creating Temporal worker...');

    const worker = await Worker.create({
        workflowsPath: require.resolve('./workflows'),
        activities: {
            executeNodeActivity,
        },
        taskQueue: 'nodejs-worker-queue',
    });

    console.log('✅ Worker created, starting...');

    // 3. Start worker
    await worker.run();
}

// Run main function
if (require.main === module) {
    main().catch((err) => {
        console.error('❌ Worker error:', err);
        process.exit(1);
    });
}

export { main };
