# Automation Marketplace Backend - Architecture Guide

Based on n8n's backend architecture, reimplemented for Automation Marketplace.

## 🏗️ Architecture Overview

### Core Layers

1. **Controllers** - HTTP endpoints (Express routes)
2. **Services** - Business logic layer
3. **Repositories** - Database access layer  
4. **Models** - TypeORM entities
5. **Middleware** - Authentication, validation, error handling
6. **Execution Engine** - Workflow execution

### Tech Stack

- **Framework**: Express.js + TypeScript
- **ORM**: TypeORM (PostgreSQL, MySQL, SQLite support)
- **DI**: TSyringe (dependency injection)
- **Validation**: Zod
- **Authentication**: JWT + bcrypt
- **Real-time**: WebSocket (ws)
- **Queue**: Bull (Redis-backed)

## 📁 Project Structure

```
packages/cli/src/
├── abstract-server.ts          # Base server class
├── server.ts                   # Main server implementation
├── index.ts                    # Entry point
├── controllers/                # REST API endpoints
│   ├── workflows.controller.ts
│   ├── nodes.controller.ts
│   ├── executions.controller.ts
│   ├── auth.controller.ts
│   ├── users.controller.ts
│   └── webhooks.controller.ts
├── services/                   # Business logic
│   ├── workflows.service.ts
│   ├── executions.service.ts
│   ├── nodes.service.ts
│   ├── auth.service.ts
│   └── push.service.ts        # WebSocket
├── repositories/               # Database access
│   ├── workflow.repository.ts
│   ├── execution.repository.ts
│   ├── user.repository.ts
│   └── credentials.repository.ts
├── entities/                   # TypeORM models
│   ├── WorkflowEntity.ts
│   ├── ExecutionEntity.ts
│   ├── UserEntity.ts
│   └── CredentialsEntity.ts
├── middleware/                 # Express middleware
│   ├── auth.middleware.ts
│   ├── validation.middleware.ts
│   └── error.middleware.ts
├── execution/                  # Workflow execution
│   ├── workflow-runner.ts
│   ├── workflow-executor.ts
│   └── active-executions.ts
├── types/                      # TypeScript types
│   └── index.ts
└── config/                     # Configuration
    └── database.config.ts
```

## 🔑 Key Components

### 1. Server Setup (Express + TypeORM)

```typescript
// server.ts
import express from 'express';
import { DataSource } from 'typeorm';
import { Container } from 'tsyringe';

export class Server {
  private app: express.Application;
  private dataSource: DataSource;

  async init() {
    // Initialize database
    this.dataSource = await this.initDatabase();
    
    // Setup Express
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    
    return this;
  }

  async start(port: number) {
    this.app.listen(port);
  }
}
```

### 2. Database Entities

```typescript
// entities/WorkflowEntity.ts
@Entity('workflow_entity')
export class WorkflowEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ type: 'boolean', default: false })
  active: boolean;

  @Column({ type: 'json' })
  nodes: INode[];

  @Column({ type: 'json' })
  connections: IConnections;

  @Column({ type: 'json', nullable: true })
  settings: IWorkflowSettings;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
}
```

### 3. Controllers (REST API)

```typescript
// controllers/workflows.controller.ts
@Controller('/workflows')
export class WorkflowsController {
  constructor(
    private workflowsService: WorkflowsService
  ) {}

  @Get('/')
  async getAll(req, res) {
    const workflows = await this.workflowsService.getAll(req.user.id);
    return res.json(workflows);
  }

  @Post('/')
  async create(req, res) {
    const workflow = await this.workflowsService.create(req.body, req.user.id);
    return res.json(workflow);
  }

  @Get('/:id')
  async getOne(req, res) {
    const workflow = await this.workflowsService.getById(req.params.id);
    return res.json(workflow);
  }

  @Patch('/:id')
  async update(req, res) {
    const workflow = await this.workflowsService.update(req.params.id, req.body);
    return res.json(workflow);
  }

  @Delete('/:id')
  async delete(req, res) {
    await this.workflowsService.delete(req.params.id);
    return res.status(204).send();
  }
}
```

### 4. Services (Business Logic)

```typescript
// services/workflows.service.ts
@Injectable()
export class WorkflowsService {
  constructor(
    private workflowRepo: WorkflowRepository,
    private activeWorkflowsService: ActiveWorkflowsService
  ) {}

  async getAll(userId: string) {
    return this.workflowRepo.find({ where: { userId } });
  }

  async create(data: CreateWorkflowDto, userId: string) {
    const workflow = this.workflowRepo.create({
      ...data,
      userId,
      id: uuid(),
    });
    return this.workflowRepo.save(workflow);
  }

  async activate(id: string) {
    const workflow = await this.workflowRepo.findOne({ where: { id } });
    workflow.active = true;
    await this.workflowRepo.save(workflow);
    await this.activeWorkflowsService.activate(workflow);
  }
}
```

### 5. Repositories (Database Access)

```typescript
// repositories/workflow.repository.ts
@Injectable()
export class WorkflowRepository extends Repository<WorkflowEntity> {
  constructor(dataSource: DataSource) {
    super(WorkflowEntity, dataSource.manager);
  }

  async findWithExecutions(workflowId: string) {
    return this.findOne({
      where: { id: workflowId },
      relations: ['executions'],
    });
  }

  async findActive() {
    return this.find({ where: { active: true } });
  }
}
```

### 6. Execution Engine

```typescript
// execution/workflow-runner.ts
@Injectable()
export class WorkflowRunner {
  constructor(
    private workflowRepo: WorkflowRepository,
    private executionRepo: ExecutionRepository,
    private pushService: PushService
  ) {}

  async run(workflowId: string, data?: any) {
    const workflow = await this.workflowRepo.findOne({ where: { id: workflowId } });
    
    // Create execution record
    const execution = await this.executionRepo.create({
      workflowId,
      status: 'running',
      startedAt: new Date(),
    });

    this.pushService.send('executionStarted', { executionId: execution.id });

    try {
      // Execute workflow
      const result = await this.executeWorkflow(workflow, data);
      
      // Update execution
      execution.status = 'success';
      execution.data = result;
      execution.finishedAt = new Date();
      
      await this.executionRepo.save(execution);
      this.pushService.send('executionFinished', execution);
      
      return result;
    } catch (error) {
      execution.status = 'error';
      execution.error = error.message;
      execution.finishedAt = new Date();
      
      await this.executionRepo.save(execution);
      this.pushService.send('executionError', { executionId: execution.id, error });
      
      throw error;
    }
  }

  private async executeWorkflow(workflow: WorkflowEntity, inputData: any) {
    // Topological sort of nodes
    const executionOrder = this.getExecutionOrder(workflow);
    
    const results = new Map<string, any>();
    
    for (const nodeId of executionOrder) {
      const node = workflow.nodes.find(n => n.id === nodeId);
      const nodeInputs = this.getNodeInputs(node, workflow.connections, results);
      
      // Execute node
      const nodeResult = await this.executeNode(node, nodeInputs);
      results.set(nodeId, nodeResult);
      
      // Send progress update
      this.pushService.send('nodeExecuted', {
        workflowId: workflow.id,
        nodeId,
        result: nodeResult,
      });
    }
    
    return results;
  }
}
```

### 7. WebSocket / Push Service

```typescript
// services/push.service.ts
@Injectable()
export class PushService {
  private wss: WebSocket.Server;
  private clients = new Map<string, WebSocket>();

  init(server: http.Server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws, req) => {
      const sessionId = this.getSessionId(req);
      this.clients.set(sessionId, ws);
      
      ws.on('close', () => {
        this.clients.delete(sessionId);
      });
    });
  }

  send(event: string, data: any, sessionId?: string) {
    const message = JSON.stringify({ event, data });
    
    if (sessionId) {
      const client = this.clients.get(sessionId);
      if (client?.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    } else {
      // Broadcast to all
      this.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }
}
```

### 8. Authentication Middleware

```typescript
// middleware/auth.middleware.ts
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
```

## 🚀 API Endpoints

### Workflows

```
GET    /api/workflows              # List all workflows
POST   /api/workflows              # Create workflow
GET    /api/workflows/:id          # Get workflow by ID
PATCH  /api/workflows/:id          # Update workflow
DELETE /api/workflows/:id          # Delete workflow
POST   /api/workflows/:id/activate # Activate workflow
POST   /api/workflows/:id/execute  # Execute workflow
```

### Executions

```
GET    /api/executions                  # List executions
GET    /api/executions/:id              # Get execution details
DELETE /api/executions/:id              # Delete execution
POST   /api/executions/:id/stop         # Stop running execution
POST   /api/executions/:id/retry        # Retry failed execution
```

### Nodes

```
GET    /api/node-types                  # List available node types
GET    /api/node-types/:name            # Get node type details
POST   /api/nodes/execute               # Execute single node (test)
```

### Auth

```
POST   /api/auth/login                  # Login
POST   /api/auth/register               # Register
POST   /api/auth/logout                 # Logout
GET    /api/auth/me                     # Get current user
```

### WebHooks

```
GET    /webhook/:path                   # Webhook endpoint (GET)
POST   /webhook/:path                   # Webhook endpoint (POST)
PUT    /webhook/:path                   # Webhook endpoint (PUT)
DELETE /webhook/:path                   # Webhook endpoint (DELETE)
```

## 🔐 Security

1. **JWT Authentication** - Token-based auth
2. **Password Hashing** - bcrypt
3. **Rate Limiting** - Prevent abuse
4. **CORS** - Cross-origin protection
5. **Helmet** - Security headers
6. **Input Validation** - Zod schemas

## 📊 Database Schema

```sql
-- Workflows table
CREATE TABLE workflow_entity (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT FALSE,
  nodes JSON NOT NULL,
  connections JSON NOT NULL,
  settings JSON,
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_entity(id)
);

-- Executions table
CREATE TABLE execution_entity (
  id VARCHAR(36) PRIMARY KEY,
  workflow_id VARCHAR(36) NOT NULL,
  status VARCHAR(50) NOT NULL,
  mode VARCHAR(50) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  finished_at TIMESTAMP,
  data JSON,
  error TEXT,
  FOREIGN KEY (workflow_id) REFERENCES workflow_entity(id)
);

-- Users table
CREATE TABLE user_entity (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Credentials table
CREATE TABLE credentials_entity (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  data TEXT NOT NULL, -- Encrypted
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_entity(id)
);
```

## 🎯 Next Steps

1. Implement all controllers
2. Create all services
3. Set up TypeORM entities and migrations
4. Build execution engine
5. Add WebSocket support
6. Implement node type system
7. Add credentials management
8. Build webhook handler
9. Add testing

This architecture provides a solid, scalable foundation following n8n's patterns!
