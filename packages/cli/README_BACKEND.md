# Automation Marketplace CLI - Backend Implementation

Complete backend implementation based on n8n's architecture, rebuilt from scratch for Automation Marketplace.

## 🎯 What's Implemented

### ✅ Core Infrastructure
- **Database Layer**: TypeORM with PostgreSQL/MySQL/SQLite support
- **Dependency Injection**: TSyringe for IoC container
- **Authentication**: JWT-based auth with bcrypt password hashing
- **WebSocket**: Real-time push notifications via WebSocket
- **API Layer**: Express.js with middleware stack

### ✅ Database Entities
- `WorkflowEntity` - Workflow definitions with nodes and connections
- `ExecutionEntity` - Execution records and results
- `UserEntity` - User accounts and authentication
- `CredentialsEntity` - Encrypted credentials storage
- `WebhookEntity` - Webhook registrations

### ✅ Repositories (Database Access)
- `WorkflowRepository` - Workflow CRUD operations
- `ExecutionRepository` - Execution management
- `UserRepository` - User management
- `CredentialsRepository` - Credentials management
- `WebhookRepository` - Webhook management

### ✅ Services (Business Logic)
- `WorkflowsService` - Workflow lifecycle management
- `ExecutionsService` - Execution tracking and management
- `AuthService` - Authentication and authorization
- `PushService` - WebSocket push notifications

### ✅ Controllers (REST API)
- `workflows.controller.ts` - Workflow endpoints
- `executions.controller.ts` - Execution endpoints
- Auth endpoints integrated in workflows controller

### ✅ Middleware
- `authMiddleware` - JWT token verification
- `validateBody/Params/Query` - Zod schema validation
- `errorMiddleware` - Global error handling
- `asyncHandler` - Async error wrapper

## 📁 Project Structure

```
packages/cli/
├── src/
│   ├── automation-marketplace-server.ts   # Main server class
│   ├── start-automation-marketplace.ts    # Entry point
│   ├── types/
│   │   └── index.ts                       # TypeScript interfaces
│   ├── entities/                          # TypeORM entities
│   │   ├── WorkflowEntity.ts
│   │   ├── ExecutionEntity.ts
│   │   ├── UserEntity.ts
│   │   ├── CredentialsEntity.ts
│   │   └── WebhookEntity.ts
│   ├── repositories/                      # Data access layer
│   │   ├── workflow.repository.ts
│   │   ├── execution.repository.ts
│   │   ├── user.repository.ts
│   │   ├── credentials.repository.ts
│   │   └── webhook.repository.ts
│   ├── services/                          # Business logic
│   │   ├── workflows.service.ts
│   │   ├── executions.service.ts
│   │   ├── auth.service.ts
│   │   └── push.service.ts
│   ├── controllers/                       # REST API endpoints
│   │   ├── workflows.controller.ts
│   │   └── executions.controller.ts
│   ├── middleware/                        # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── error.middleware.ts
│   └── config/
│       └── database.config.ts             # Database configuration
├── .env.example                           # Environment variables template
├── package.json
├── tsconfig.json
├── BACKEND_ARCHITECTURE.md                # Detailed architecture guide
└── README.md                              # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd packages/cli
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Server
PORT=5678
HOST=localhost
NODE_ENV=development

# Database (PostgreSQL example)
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=automation_marketplace
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# Redis (for Bull queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS
CORS_ORIGIN=http://localhost:5173

# WebSocket
WS_ENABLED=true
WS_PATH=/ws
```

### 3. Setup Database

**PostgreSQL:**
```bash
# Create database
createdb automation_marketplace

# Or using psql
psql -U postgres
CREATE DATABASE automation_marketplace;
```

**SQLite (for development):**
```env
DB_TYPE=sqlite
DB_PATH=./database.sqlite
```

### 4. Start the Server

**Development mode (with hot reload):**
```bash
pnpm dev
```

**Production mode:**
```bash
pnpm build
pnpm start
```

**Direct execution:**
```bash
tsx src/start-automation-marketplace.ts
```

### 5. Verify Server is Running

```bash
# Health check
curl http://localhost:5678/health

# Should return:
# {"status":"ok","timestamp":"2024-...","uptime":...}
```

## 🔌 API Endpoints

### Authentication

```http
POST   /api/auth/register         # Register new user
POST   /api/auth/login            # Login
GET    /api/auth/me               # Get current user
POST   /api/auth/change-password  # Change password
PATCH  /api/auth/profile          # Update profile
```

### Workflows

```http
GET    /api/workflows             # List all workflows
POST   /api/workflows             # Create workflow
GET    /api/workflows/:id         # Get workflow
PATCH  /api/workflows/:id         # Update workflow
DELETE /api/workflows/:id         # Delete workflow
POST   /api/workflows/:id/activate    # Activate workflow
POST   /api/workflows/:id/deactivate  # Deactivate workflow
POST   /api/workflows/:id/duplicate   # Duplicate workflow
GET    /api/workflows/:id/executions  # Get workflow executions
GET    /api/workflows/stats/overview  # Get statistics
```

### Executions

```http
GET    /api/executions            # List executions
GET    /api/executions/:id        # Get execution details
DELETE /api/executions/:id        # Delete execution
POST   /api/executions/:id/stop   # Stop running execution
GET    /api/executions/stats/overview  # Get statistics
```

## 📡 WebSocket Events

Connect to `ws://localhost:5678/ws?sessionId=YOUR_SESSION_ID`

**Events sent to clients:**

```javascript
// Execution started
{
  "event": "executionStarted",
  "data": {
    "executionId": "uuid",
    "workflowId": "uuid",
    "timestamp": "2024-..."
  }
}

// Execution finished
{
  "event": "executionFinished",
  "data": {
    "executionId": "uuid",
    "workflowId": "uuid",
    "status": "success|error",
    "timestamp": "2024-..."
  }
}

// Node executed
{
  "event": "nodeExecuted",
  "data": {
    "executionId": "uuid",
    "nodeId": "uuid",
    "nodeName": "HTTP Request",
    "timestamp": "2024-..."
  }
}

// Workflow activated/deactivated
{
  "event": "workflowActivated|workflowDeactivated",
  "data": {
    "workflowId": "uuid",
    "active": true|false,
    "timestamp": "2024-..."
  }
}
```

## 🔐 Authentication Flow

### Register

```bash
curl -X POST http://localhost:5678/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }
}
```

### Login

```bash
curl -X POST http://localhost:5678/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Authenticated Requests

Use the token in the `Authorization` header:

```bash
curl http://localhost:5678/api/workflows \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📦 Database Schema

```sql
-- Users
CREATE TABLE user_entity (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflows
CREATE TABLE workflow_entity (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT FALSE,
  nodes JSON NOT NULL,
  connections JSON NOT NULL,
  settings JSON,
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_entity(id)
);

-- Executions
CREATE TABLE execution_entity (
  id VARCHAR(36) PRIMARY KEY,
  workflow_id VARCHAR(36) NOT NULL,
  mode VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  finished_at TIMESTAMP,
  data JSON,
  error TEXT,
  user_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_id) REFERENCES workflow_entity(id),
  FOREIGN KEY (user_id) REFERENCES user_entity(id)
);
```

## 🛠️ Development

### Type Checking

```bash
pnpm typecheck
```

### Linting

```bash
pnpm lint
pnpm lint:fix
```

### Database Migrations

```bash
# Generate migration from entity changes
pnpm migration:generate src/migrations/MigrationName

# Run pending migrations
pnpm migration:run

# Revert last migration
pnpm migration:revert
```

## 🔍 Next Steps

### 🎯 Immediate Priorities

1. **Execution Engine** - Implement workflow execution logic
2. **Node Type System** - Create node registry and execution
3. **Credentials Encryption** - Add encryption utilities
4. **Webhook Handler** - Implement webhook endpoints
5. **Queue System** - Add Bull for background jobs

### 📋 Additional Features

- [ ] Workflow execution engine
- [ ] Node type registry
- [ ] Credentials encryption/decryption
- [ ] Webhook handling
- [ ] Background job queue (Bull)
- [ ] Email notifications
- [ ] Audit logging
- [ ] Rate limiting per user
- [ ] Workflow sharing/permissions
- [ ] Workflow versioning
- [ ] Import/Export workflows
- [ ] Workflow templates
- [ ] API key authentication
- [ ] OAuth2 support
- [ ] Workflow scheduling (cron)
- [ ] Error recovery/retry logic

## 📚 Additional Documentation

- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) - Detailed architecture guide
- [.env.example](./.env.example) - Environment variables reference

## 🏗️ Architecture Highlights

### Dependency Injection

Uses TSyringe for clean dependency management:

```typescript
@injectable()
export class WorkflowsService {
  constructor(
    @inject('WorkflowRepository') private workflowRepo: WorkflowRepository
  ) {}
}
```

### Repository Pattern

Clean separation of database access:

```typescript
const workflows = await workflowRepo.findByUserId(userId);
const activeWorkflows = await workflowRepo.findActive();
```

### Service Layer

Business logic isolated from controllers:

```typescript
const workflow = await workflowsService.create(data, userId);
await workflowsService.activate(workflowId, userId);
```

### Async Error Handling

All routes wrapped in `asyncHandler`:

```typescript
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  // Errors automatically caught and sent to error middleware
  const data = await service.getData();
  res.json(data);
}));
```

## 🤝 Contributing

When adding new features:

1. Create entity in `entities/`
2. Create repository in `repositories/`
3. Create service in `services/`
4. Create controller in `controllers/`
5. Add routes to server
6. Update types in `types/index.ts`

## 📝 License

MIT

---

**Built with n8n-inspired architecture** ❤️
