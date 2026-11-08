# n8n Dependencies Analysis for Rebranding

## Core n8n Architecture

```
n8n-cli (Backend Server)
├── n8n-core (Execution Engine) 
├── n8n-workflow (Types & Logic)
├── n8n-nodes-base (400+ Nodes)
├── n8n-editor-ui (Vue.js Frontend)
└── Internal n8n packages (@n8n/*)
```

## What to Copy for Full Rebranding

### 1. **MUST COPY** (Core functionality)

#### packages/cli/ 
- **What**: Express server, REST API, database layer
- **Dependencies**: 
  - TypeORM (@n8n/typeorm) - Database ORM
  - Bull - Queue management (YOU'LL REPLACE with Temporal)
  - Express - HTTP server
  - bcryptjs - Password hashing
  - jsonwebtoken - JWT auth
- **Size**: ~50MB source
- **Why**: Main backend server, user management, workflow storage

#### packages/core/
- **What**: Workflow execution engine, node execution logic
- **Dependencies**:
  - n8n-workflow - Type definitions
  - axios - HTTP requests
  - @langchain/core - AI nodes
- **Size**: ~20MB
- **Why**: THIS IS WHAT YOU'LL MODIFY to use Temporal instead of Bull

#### packages/workflow/
- **What**: TypeScript types, interfaces, workflow data structures
- **Dependencies**: Minimal (lodash, crypto)
- **Size**: ~5MB
- **Why**: Shared types between frontend and backend

#### packages/nodes-base/
- **What**: 400+ pre-built nodes (HTTP Request, Email, Database, etc.)
- **Dependencies**: Many! (nodemailer, pg, mysql2, mongodb, aws-sdk, etc.)
- **Size**: ~150MB
- **Why**: The actual integrations - HTTP, Email, DB, APIs

#### packages/frontend/editor-ui/
- **What**: Vue.js workflow editor UI
- **Dependencies**:
  - Vue 3, Pinia, VueFlow (canvas)
  - Element Plus (UI components)
  - Axios
- **Size**: ~80MB source
- **Why**: For rebranding text, logos, colors

### 2. **Internal @n8n/ packages** (Helper libraries)

All in `packages/@n8n/`:

- **@n8n/api-types** - API type definitions
- **@n8n/backend-common** - Shared backend utilities
- **@n8n/config** - Configuration management  
- **@n8n/db** - TypeORM database layer
- **@n8n/di** - Dependency injection
- **@n8n/errors** - Error classes
- **@n8n/utils** - Utility functions
- **@n8n/permissions** - RBAC permissions
- **@n8n/design-system** - UI components
- **@n8n/i18n** - Translations

**Size**: ~100MB total
**Why**: Required by cli, core, and editor-ui

### 3. **External Dependencies** (npm packages)

These DON'T need copying, install via pnpm:

#### Database
- `pg` (PostgreSQL) ✅ You already use this
- `redis`/`ioredis` ✅ You have Redis running
- `@n8n/typeorm` - Modified TypeORM (n8n's fork)

#### Authentication
- `bcryptjs` ✅ You already have
- `jsonwebtoken` ✅ You already have
- `passport` - OAuth flows
- `ldapts` - LDAP auth

#### Execution (YOU'LL REPLACE)
- `bull` - Queue system → **REPLACE with Temporal**
- `ioredis` - Redis client → **Keep for caching**

#### Node Integrations
- `nodemailer` - Email sending ✅ You have
- `axios` - HTTP requests ✅ You have
- `aws-sdk` - AWS services
- `pg`, `mysql2`, `mongodb` - Databases
- `@langchain/core` - AI/LLM integrations

#### UI
- `vue` - Frontend framework
- `pinia` - State management
- `@vue-flow/core` - Workflow canvas
- `element-plus` - UI library

## Rebranding Strategy

### Option A: **Minimal Copy** (Recommended)
Copy ONLY what you need to rebrand UI:

```bash
AutomationMarketplace/
├── packages/
│   ├── @n8n/
│   │   └── design-system/   # UI components for branding
│   └── frontend/
│       └── editor-ui/        # Main UI (rebrand here)
```

**How**: 
- Use n8n packages as npm dependencies for backend
- Copy ONLY frontend for UI rebranding
- Build custom Docker image with rebranded frontend
- Backend uses Temporal adapter you already built

**Pros**: ~100MB instead of 500MB, cleaner separation
**Cons**: Backend still uses n8n code (but that's Plan A!)

### Option B: **Full Fork**
Copy everything, full control:

```bash
AutomationMarketplace/
├── packages/
│   ├── cli/              # 50MB - Modify for Temporal
│   ├── core/             # 20MB - Modify execution engine
│   ├── workflow/         # 5MB
│   ├── nodes-base/       # 150MB
│   ├── frontend/
│   │   └── editor-ui/    # 80MB - Rebrand
│   └── @n8n/
│       └── (12 packages) # 100MB
```

**Total**: ~400MB
**Pros**: Complete control, full rebranding
**Cons**: Massive maintenance burden, hard to update

## RECOMMENDED PLAN FOR YOU

Based on Plan A ("use n8n, replace execution with Temporal"):

### Phase 1: Use n8n as-is (CURRENT)
- ✅ n8n Docker image
- ✅ Connected to your PostgreSQL
- ✅ Working at localhost:5173
- ⏳ Add Temporal execution integration

### Phase 2: Minimal Rebranding
If you MUST rebrand:
1. Copy `packages/frontend/editor-ui/` to AutomationMarketplace
2. Rebrand: logos, text, colors, About modal
3. Build custom Docker image
4. Deploy rebranded frontend
5. Backend still uses n8n npm packages

### Phase 3: Temporal Integration (CORE GOAL)
1. Modify n8n's workflow execution to call YOUR Temporal adapter
2. Replace Bull queue with Temporal workflows
3. Keep everything else from n8n

## Database Dependencies

n8n uses:
- **PostgreSQL** ✅ You have (port 5433)
- **Redis** ✅ You have (port 6379)  
- **TypeORM** - n8n uses modified fork `@n8n/typeorm`

Your database schema is COMPATIBLE - n8n will add its own tables:
- `workflows` ✅ Already exists
- `credentials`
- `execution_entity`
- `webhook_entity`
- `settings`
- `user`

## Final Recommendation

**For rebranding + Temporal integration:**

1. **Keep using n8n Docker** for now (working)
2. **Copy ONLY frontend** when ready to rebrand:
   ```bash
   cp -r c:\Users\sailo\n8n\packages\frontend\editor-ui c:\Users\sailo\AutomationMarketplace\packages\frontend\
   ```
3. **Install frontend dependencies**
4. **Rebrand** titles, logos, About modal
5. **Build custom Docker image** with rebranded frontend
6. **Backend**: Use n8n packages + YOUR Temporal adapter

This gives you:
- ✅ n8n's 400+ nodes
- ✅ Full UI rebranding
- ✅ Temporal execution (replacing Bull)
- ✅ Your PostgreSQL + Redis
- ✅ ~100MB instead of 500MB

Want me to proceed with this plan?
