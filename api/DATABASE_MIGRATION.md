# Database Migration to @n8n/db

Successfully migrated from raw PostgreSQL Pool to n8n's TypeORM-based database layer.

## What Changed

### Before (Raw SQL)
```typescript
// Old approach - raw pg Pool
import { Pool } from 'pg';

const pool = new Pool({...});
const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
```

### After (@n8n/db)
```typescript
// New approach - TypeORM repositories
import { UserRepository, User } from '@n8n/db';

const userRepo = Container.get(UserRepository);
const user = await userRepo.findNonShellUser(email);
```

## Benefits

✅ **Type Safety** - All database operations are type-checked  
✅ **Automatic Migrations** - Schema changes managed automatically  
✅ **Repository Pattern** - Clean separation of data access logic  
✅ **Relationships** - Automatic JOIN handling (user → workflows → executions)  
✅ **Validation** - Entity decorators ensure data integrity  
✅ **Security** - Built-in XSS/URL validation, encrypted credentials  
✅ **Multi-tenant** - Project-based isolation built-in  

## New Files

### Database Initialization
**[api/src/db/index.ts](api/src/db/index.ts)**
- Initializes TypeORM DataSource with @n8n/db
- Runs migrations automatically
- Exports all repositories and entities
- Handles connection lifecycle

### Auth Service (Refactored)
**[api/src/services/auth.service.ts](api/src/services/auth.service.ts)**
- Uses `UserRepository` instead of raw SQL
- Type-safe user operations
- Automatic password hashing
- MFA support built-in
- Methods:
  - `register()` - Create new user
  - `login()` - Authenticate user
  - `verifyToken()` - Validate JWT
  - `refreshToken()` - Refresh access token
  - `changePassword()` - Update password
  - `requestPasswordReset()` - Generate reset token
  - `resetPassword()` - Reset with token

### Auth Middleware (Updated)
**[api/src/middleware/auth.ts](api/src/middleware/auth.ts)**
- Uses `authService.verifyToken()` instead of raw JWT decode
- Returns full `User` entity with relations
- Automatic role checking with `requireRole()`

### Environment Config
**[api/.env.n8n](api/.env.n8n)**
- New environment variables for TypeORM:
  ```env
  DB_TYPE=postgres
  DB_POSTGRESDB_HOST=localhost
  DB_POSTGRESDB_PORT=5432
  DB_POSTGRESDB_DATABASE=automation_platform
  DB_POSTGRESDB_USER=platform_user
  DB_POSTGRESDB_PASSWORD=platform_password
  ```

## Server Startup Changes

**[api/src/index.ts](api/src/index.ts)**
```typescript
import { initializeDatabase, closeDatabase } from './db';

// Old
await databaseService.connect();

// New
await initializeDatabase();  // Runs migrations automatically
```

## Available Repositories

All repositories from `@n8n/db` are now available:

```typescript
import { Container } from '@n8n/di';
import { 
  UserRepository,
  WorkflowRepository,
  ExecutionRepository,
  CredentialsRepository,
  ProjectRepository,
  TagRepository,
  VariablesRepository,
  WebhookRepository,
} from '@n8n/db';

// Usage
const userRepo = Container.get(UserRepository);
const workflowRepo = Container.get(WorkflowRepository);
```

## Entity Models

All entities have TypeScript types with decorators:

```typescript
import { User, Workflow, Execution } from '@n8n/db';

// User entity properties
user.id              // string (UUID)
user.email           // string
user.firstName       // string | null
user.lastName        // string | null
user.password        // string | null
user.disabled        // boolean
user.mfaEnabled      // boolean
user.lastActiveAt    // Date | null
user.role            // Role relation
user.projectRelations // ProjectRelation[]
```

## Migration Path

### Phase 1: ✅ Core Auth (Complete)
- User registration/login with repositories
- JWT token management
- Password reset flow

### Phase 2: Workflows (Next)
- Replace `api/src/services/database.ts` workflow methods
- Use `WorkflowRepository` for CRUD operations
- Automatic workflow versioning

### Phase 3: Executions
- Use `ExecutionRepository` for execution tracking
- Automatic execution metadata handling
- Performance metrics built-in

### Phase 4: Credentials
- Use `CredentialsRepository` with encryption
- Automatic credential scoping by project
- OAuth2 integration

## Running Migrations

Migrations run automatically on startup:

```bash
cd api
pnpm install  # Install new dependencies
pnpm build    # Compile TypeScript
pnpm start    # Migrations run automatically
```

### Manual Migration Control

```typescript
import { getDbConnection } from './db';

const dbConnection = getDbConnection();
await dbConnection.migrate();  // Run pending migrations
```

## Database Schema

n8n's migrations create these tables:
- **users** - User accounts with MFA
- **role** - RBAC roles (admin, member, viewer)
- **project** - Multi-tenant workspaces
- **project_relation** - User-project membership
- **workflow_entity** - Workflow definitions
- **execution_entity** - Workflow executions
- **credentials_entity** - Encrypted credentials
- **tag_entity** - Workflow tags
- **variables** - Environment variables
- **webhook_entity** - Webhook registrations
- **settings** - System settings
- And 20+ more...

## Troubleshooting

### Connection Issues
```typescript
// Check connection state
import { getDbConnection } from './db';
const dbConnection = getDbConnection();
console.log(dbConnection.connectionState);
```

### Repository Not Found
```typescript
// Ensure DI container is initialized
import { Container } from '@n8n/di';
import { UserRepository } from '@n8n/db';

const userRepo = Container.get(UserRepository);
```

### Migration Errors
```bash
# Reset database (development only!)
psql -U platform_user -d automation_platform -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
pnpm start  # Re-run migrations
```

## Next Steps

1. **Migrate Workflow Service** - Replace raw SQL in `database.ts`
2. **Migrate Credentials** - Use encrypted credential storage
3. **Add Execution Tracking** - Use execution repository with metadata
4. **Implement Projects** - Enable multi-tenant isolation
5. **Add Audit Logging** - Track all database changes

## Documentation

- [n8n Database Package](../packages/@n8n/db/README.md)
- [TypeORM Documentation](https://typeorm.io/)
- [n8n Architecture Guide](../AGENTS.md)
