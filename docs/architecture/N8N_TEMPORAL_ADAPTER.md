# n8n → AutomationMarketplace Adaptation Guide

## Strategy: Fork n8n, Replace Execution Only

### What We Keep (99% of n8n)
✅ **UI** - Entire Vue 3 editor  
✅ **API** - All REST endpoints  
✅ **Database** - TypeORM + PostgreSQL  
✅ **400+ Nodes** - All integrations  
✅ **Credentials** - OAuth2, encryption  
✅ **Webhooks** - Trigger system  
✅ **Users** - Authentication, teams  
✅ **Expressions** - `{{ $json }}` syntax  
✅ **Workflow Management** - CRUD operations  

### What We Replace (1% - Execution Layer)
❌ `WorkflowRunner` → `TemporalWorkflowRunner`  
❌ `WorkflowExecute` → Temporal workflow  
❌ Bull Queue → Temporal queue  
❌ JavaScript workers → Go/Ruby/Python workers  

---

## Implementation Plan

### Phase 1: Setup n8n Base

```bash
# Clone your AutomationMarketplace
cd AutomationMarketplace

# Add n8n as dependency (from local n8n repo)
pnpm add n8n@file:../n8n/packages/cli
pnpm add n8n-workflow@file:../n8n/packages/workflow
pnpm add n8n-core@file:../n8n/packages/core
pnpm add n8n-nodes-base@file:../n8n/packages/nodes-base
```

### Phase 2: Create Temporal Adapter

Create `api/src/adapters/temporal-workflow-runner.ts`:

```typescript
import { WorkflowRunner } from 'n8n';
import { Client as TemporalClient } from '@temporalio/client';
import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';

/**
 * Temporal Workflow Runner
 * Replaces n8n's in-process execution with Temporal orchestration
 */
export class TemporalWorkflowRunner extends WorkflowRunner {
  private temporalClient: TemporalClient;

  async initialize() {
    // Connect to Temporal server
    this.temporalClient = await TemporalClient.connect({
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
      namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    });
    console.log('✅ Temporal client connected');
  }

  /**
   * Override n8n's run method
   * Instead of running in-process, send to Temporal
   */
  async run(
    data: IWorkflowExecutionDataProcess,
    loadStaticData?: boolean,
    realtime?: boolean,
    restartExecutionId?: string,
  ): Promise<string> {
    console.log(`🔄 Starting workflow via Temporal: ${data.workflowData.name}`);

    // Create execution ID
    const executionId = await this.activeExecutions.add(data, restartExecutionId);

    try {
      // Start Temporal workflow
      const handle = await this.temporalClient.workflow.start('executeWorkflow', {
        workflowId: executionId,
        taskQueue: 'automation-platform',
        args: [{
          executionId,
          workflowData: data.workflowData,
          executionMode: data.executionMode,
          userId: data.userId,
        }],
      });

      console.log(`✅ Temporal workflow started: ${executionId}`);
      return executionId;

    } catch (error) {
      console.error(`❌ Failed to start Temporal workflow:`, error);
      throw error;
    }
  }
}
```

### Phase 3: Override n8n Server Startup

Create `api/src/server.ts`:

```typescript
import 'reflect-metadata';
import { Container } from '@n8n/di';
import { Server } from 'n8n';
import { TemporalWorkflowRunner } from './adapters/temporal-workflow-runner';

async function bootstrap() {
  console.log('🚀 Starting AutomationMarketplace Server');
  console.log('📦 Based on n8n with Temporal execution');

  // Initialize Temporal runner
  const temporalRunner = new TemporalWorkflowRunner(
    Container.get(Logger),
    Container.get(ErrorReporter),
    Container.get(ActiveExecutions),
    // ... other dependencies
  );
  await temporalRunner.initialize();

  // Replace n8n's WorkflowRunner with Temporal version
  Container.set(WorkflowRunner, temporalRunner);

  console.log('✅ Temporal WorkflowRunner registered');

  // Start n8n server (everything else unchanged)
  const server = Container.get(Server);
  await server.start();

  console.log('✅ AutomationMarketplace API ready!');
}

bootstrap().catch(error => {
  console.error('❌ Server startup failed:', error);
  process.exit(1);
});
```

### Phase 4: Temporal Workflow Definition

Create `orchestrator-go/workflows/execute_workflow.go`:

```go
package workflows

import (
    "go.temporal.io/sdk/workflow"
)

// ExecuteWorkflow orchestrates n8n workflow execution
func ExecuteWorkflow(ctx workflow.Context, params WorkflowParams) error {
    logger := workflow.GetLogger(ctx)
    logger.Info("Starting workflow execution", "workflowId", params.ExecutionId)

    // Parse n8n workflow definition
    workflowDef := params.WorkflowData

    // Execute each node in sequence
    for _, node := range workflowDef.Nodes {
        // Determine worker based on node type
        taskQueue := getWorkerForNode(node.Type)
        
        // Execute node activity
        var result NodeResult
        err := workflow.ExecuteActivity(ctx, 
            workflow.ActivityOptions{
                TaskQueue: taskQueue,
                StartToCloseTimeout: time.Minute * 5,
            },
            "ExecuteNode",
            NodeParams{
                NodeId: node.Id,
                NodeType: node.Type,
                Parameters: node.Parameters,
                Credentials: params.Credentials,
            },
        ).Get(ctx, &result)
        
        if err != nil {
            return err
        }
        
        logger.Info("Node completed", "nodeId", node.Id, "status", result.Status)
    }

    return nil
}

func getWorkerForNode(nodeType string) string {
    switch {
    case isHTTPNode(nodeType):
        return "nodejs-worker"  // HTTP, Slack, Gmail
    case isMLNode(nodeType):
        return "python-worker"  // OpenAI, data processing
    case isHighPerf(nodeType):
        return "go-worker"      // Heavy computation
    default:
        return "nodejs-worker"
    }
}
```

### Phase 5: Worker Implementation

**Node.js Worker** (for HTTP, API nodes):
```typescript
// workers/nodejs-worker/src/activities.ts
import { executeNode } from 'n8n-core';

export async function ExecuteNode(params: NodeParams) {
  // Use n8n's node execution directly!
  const nodeType = await getNodeType(params.NodeType);
  const result = await executeNode(nodeType, params);
  
  return {
    status: 'success',
    data: result,
  };
}
```

**Python Worker** (for ML, data science):
```python
# workers/python-worker/activities.py
from temporalio import activity
import n8n_nodes  # Import n8n node definitions

@activity.defn
async def execute_node(params: dict):
    # Load n8n node definition
    node_class = n8n_nodes.get_node(params['node_type'])
    
    # Execute using n8n's logic
    result = await node_class.execute(params['parameters'])
    
    return {'status': 'success', 'data': result}
```

**Go Worker** (for high-performance tasks):
```go
// workers/go-worker/activities.go
func ExecuteNode(ctx context.Context, params NodeParams) (*NodeResult, error) {
    // Load n8n node configuration
    nodeConfig := loadN8NNode(params.NodeType)
    
    // Execute with Go's performance
    result := executeHighPerf(nodeConfig, params.Parameters)
    
    return &NodeResult{Status: "success", Data: result}, nil
}
```

---

## Rebranding n8n → AutomationMarketplace

### 1. Update package.json
```json
{
  "name": "automation-marketplace",
  "description": "Multi-language workflow automation with Temporal",
  "version": "1.0.0"
}
```

### 2. Update UI Branding
```typescript
// packages/frontend/editor-ui/src/config/index.ts
export const APP_NAME = 'AutomationMarketplace';
export const APP_DESCRIPTION = 'Workflow automation powered by Temporal';
```

### 3. Update Database Tables (Optional)
Keep n8n's schema or add `namespace` column:
```sql
ALTER TABLE workflows ADD COLUMN namespace VARCHAR(50) DEFAULT 'automation-marketplace';
```

---

## File Structure

```
AutomationMarketplace/
├── api/
│   └── src/
│       ├── server.ts                    ← Override n8n server
│       └── adapters/
│           └── temporal-workflow-runner.ts  ← Execution adapter
│
├── orchestrator-go/
│   └── workflows/
│       └── execute_workflow.go          ← Temporal workflow
│
├── workers/
│   ├── nodejs-worker/                   ← HTTP, API nodes
│   ├── python-worker/                   ← ML, data nodes
│   └── go-worker/                       ← High-perf nodes
│
├── node_modules/
│   └── n8n/                             ← Full n8n as dependency
│
└── package.json                         ← Depends on n8n packages
```

---

## Benefits

✅ **Get 400+ nodes for free** - Don't reimplement  
✅ **Get UI for free** - Don't build editor  
✅ **Get API for free** - Don't write endpoints  
✅ **Innovation where it matters** - Execution layer  
✅ **Easy updates** - Pull n8n changes when needed  
✅ **Multi-language workers** - Go/Ruby/Python  
✅ **Temporal scaling** - Better than Bull queue  

---

## Migration Path

### Week 1: Setup
- ✅ Add n8n as dependency
- ✅ Create Temporal adapter
- ✅ Test with simple workflow

### Week 2: Workers
- ✅ Implement Node.js worker (reuse n8n nodes)
- ✅ Implement Python worker
- ✅ Implement Go worker

### Week 3: Integration
- ✅ Connect orchestrator → workers
- ✅ Test end-to-end execution
- ✅ Rebrand UI

### Week 4: Production
- ✅ Deploy to Kubernetes
- ✅ Scale workers independently
- ✅ Monitor with Temporal UI

---

## Next Steps

1. **Delete** `packages/` (no need to copy n8n)
2. **Add** n8n as npm dependency
3. **Create** `TemporalWorkflowRunner` adapter
4. **Implement** Go orchestrator workflow
5. **Connect** workers to read n8n nodes
6. **Rebrand** UI as AutomationMarketplace

**This gives you 99% of n8n's features with 1% of the work!**
