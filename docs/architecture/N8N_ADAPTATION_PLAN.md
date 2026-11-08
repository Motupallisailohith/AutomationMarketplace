# n8n Architecture Adaptation Plan

## Overview
We're adapting n8n's proven workflow automation architecture to our platform, replacing ONLY the execution layer with our Temporal-based orchestration.

## What We Keep from n8n

### 1. Workflow Management Layer
**Location:** `api/src/services/workflow.service.ts`
- ✅ Workflow CRUD operations
- ✅ Workflow versioning and history
- ✅ Workflow sharing and permissions
- ✅ Workflow tags and folders

**n8n Reference:** `n8n/packages/cli/src/workflows/workflow.service.ts`

### 2. Credentials Management
**Location:** `api/src/services/credential.service.ts`
- ✅ Encrypted credential storage
- ✅ OAuth2 flow handling
- ✅ Credential testing and validation
- ✅ Per-user credential ownership

**n8n Reference:** `n8n/packages/cli/src/credentials/`

### 3. Authentication & User Management
**Location:** `api/src/server-simple.ts` (already implemented)
- ✅ JWT authentication
- ✅ Password reset flow with email
- ✅ User registration with validation
- ✅ Role-based access control

**n8n Reference:** `n8n/packages/cli/src/auth/`

### 4. Controller Pattern
**Location:** `api/src/controllers/`
- ✅ RESTful API endpoints
- ✅ Request validation
- ✅ Error handling
- ✅ Response formatting

**n8n Reference:** `n8n/packages/cli/src/controllers/`

### 5. Database Layer
**Location:** `api/src/config/database.ts`
- ✅ TypeORM with PostgreSQL
- ✅ Entity definitions
- ✅ Migration system
- ✅ Repository pattern

**n8n Reference:** `n8n/packages/@n8n/db/`

## What We Replace

### 1. Workflow Execution Engine ❌ → Temporal
**n8n has:** `WorkflowRunner`, `ActiveExecutions`, `WorkflowExecute`
**We use:** Temporal workflows for orchestration

```typescript
// n8n approach (DON'T USE)
const runner = new WorkflowRunner();
await runner.run(workflowData);

// Our approach (USE THIS)
const client = new TemporalClient();
await client.startWorkflow({
  workflowId: workflow.id,
  taskQueue: 'automation-platform',
  args: [workflowData]
});
```

### 2. Node Execution ❌ → Multi-Language Workers
**n8n has:** JavaScript-based node execution in-process
**We use:** 
- **Go workers** for high-performance tasks
- **Ruby workers** for complex business logic
- **Python workers** for ML/data science
- **Node.js workers** for HTTP/API tasks

### 3. Webhook Handling ❌ → Kong API Gateway
**n8n has:** Built-in webhook server
**We use:** Kong for webhook routing + Temporal for processing

## Architecture Mapping

### n8n's Layers → Our Layers

```
┌─────────────────────────────────────────────────────┐
│                   n8n CLI Server                    │
├─────────────────────────────────────────────────────┤
│ Controllers (REST API)          [✅ KEEP AS-IS]    │
│ - workflows.controller.ts                           │
│ - credentials.controller.ts                         │
│ - auth.controller.ts                                │
├─────────────────────────────────────────────────────┤
│ Services (Business Logic)       [✅ KEEP AS-IS]    │
│ - workflow.service.ts                               │
│ - credential.service.ts                             │
│ - user.service.ts                                   │
├─────────────────────────────────────────────────────┤
│ WorkflowRunner                  [❌ REPLACE]        │
│ ActiveExecutions                [❌ REPLACE]        │
│ WorkflowExecute                 [❌ REPLACE]        │
│                                     ↓               │
│                          Our Temporal Client        │
├─────────────────────────────────────────────────────┤
│ Node Execution (JavaScript)     [❌ REPLACE]        │
│                                     ↓               │
│              Our Multi-Language Workers             │
│              (Go, Ruby, Python, Node.js)            │
└─────────────────────────────────────────────────────┘
```

## Files to Clean Up

### Delete (Unused n8n Packages)
```bash
# These were copied but we don't need to build them
/packages/workflow/
/packages/nodes-base/
/packages/cli/        # We only reference n8n/packages/cli
/packages/core/
/packages/nodes/
```

### Delete (Duplicate/Test Files)
```bash
/api/test-credentials.js
/api/test-oauth2.js
/api/test-response.json
/api/server.js           # Duplicate simple server
```

### Delete (Unused Workers)
```bash
/workers/rust-worker/    # Missing Cargo.lock, not implemented
/workers/go-worker/      # Not implemented yet
```

### Keep (Essential Files)
```bash
✅ /api/src/server-simple.ts        # Main server with auth
✅ /api/src/services/               # Business logic
✅ /api/src/controllers/            # REST API endpoints
✅ /api/src/config/                 # Configuration
✅ /workers/nodejs-worker/          # Temporal worker
✅ /workers/python-worker/          # ML tasks
✅ /frontend/                       # UI application
✅ /db/                             # Database schemas
```

## Implementation Strategy

### Phase 1: Stabilize Core (Current)
1. ✅ Database schema with `created_by` field
2. ✅ Authentication (JWT, password reset)
3. ✅ Workflow CRUD with user association
4. 🔄 Start server-simple.ts successfully

### Phase 2: Adapt n8n Services
1. Import n8n's workflow service patterns
2. Import n8n's credential service patterns
3. Adapt controllers for our API structure
4. Keep n8n's permission/sharing model

### Phase 3: Replace Execution Layer
1. Create Temporal workflow definitions
2. Implement worker connectors (Go, Ruby, Python, Node.js)
3. Replace n8n's WorkflowRunner with Temporal client
4. Map n8n node types to our worker tasks

### Phase 4: Testing & Migration
1. Test workflow creation with user association
2. Test credential storage and retrieval
3. Test workflow execution via Temporal
4. Performance testing with multi-language workers

## Key Differences from n8n

| Feature | n8n | Our Platform |
|---------|-----|--------------|
| Execution | In-process JavaScript | Temporal + Multi-language workers |
| Orchestration | Custom queue | Temporal workflows |
| Workers | Single JavaScript runtime | Go, Ruby, Python, Node.js |
| Webhooks | Built-in server | Kong API Gateway |
| Scaling | Bull queue + Redis | Temporal + Kubernetes |
| Database | SQLite/PostgreSQL/MySQL | PostgreSQL only |
| Frontend | Vue 3 (n8n UI) | Custom Vue 3 UI |

## Next Steps

1. **Immediate:** Fix module resolution for @n8n/db imports
2. **Short-term:** Start server-simple.ts and test auth
3. **Medium-term:** Clean up unused packages and files
4. **Long-term:** Implement Temporal workflow execution adapter

## Reference Files

- **n8n workflow service:** `n8n/packages/cli/src/workflows/workflow.service.ts`
- **n8n credentials:** `n8n/packages/cli/src/credentials/credentials.service.ee.ts`
- **n8n execution:** `n8n/packages/cli/src/workflow-runner.ts`
- **Our server:** `api/src/server-simple.ts`
- **Our services:** `api/src/services/`
