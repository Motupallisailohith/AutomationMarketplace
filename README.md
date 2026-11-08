# AutomationMarketplace

Enterprise workflow automation platform with marketplace for workflow templates and nodes.

## 🚀 Quick Start - ONE COMMAND

### Prerequisites
- Docker Desktop (running)
- Node.js 20+
- That's it!

### Start Everything

```bash
cd c:\Users\sailo\AutomationMarketplace

# Start all services (API, Frontend, Database, Everything!)
scripts\dev.bat start
```

**Wait 30 seconds**, then open:
- 🌐 **Frontend**: http://localhost:5173
- 🔌 **API**: http://localhost:3000
- 📊 **Temporal UI**: http://localhost:8081

### All Commands

```bash
scripts\dev.bat start      # Start everything
scripts\dev.bat stop       # Stop everything
scripts\dev.bat restart    # Restart all services
scripts\dev.bat test       # Run automated tests
scripts\dev.bat build      # Build for production
scripts\dev.bat clean      # Deep clean and restart
```

That's it! One script for everything.

## 📦 Project Structure

```
AutomationMarketplace/
├── packages/
│   ├── @n8n/           # Core n8n packages
│   ├── cli/            # API Server (Express)
│   ├── core/           # Workflow utilities
│   ├── frontend/       # Vue 3 Frontend
│   ├── nodes-base/     # 1000+ integration nodes
│   ├── workflow/       # Workflow engine types
│   └── ...
├── orchestrator-go/    # Go + Temporal workflow orchestrator
├── frontend/           # Main dashboard frontend
├── api/                # Additional API services
├── scripts/            # Build & deployment scripts
└── docker-compose.yml  # Infrastructure setup
```

## 🏗️ Architecture

- **Frontend**: Vue 3 + TypeScript + Vite
- **API**: Node.js + Express + TypeORM
- **Orchestrator**: Go + Temporal
- **Database**: PostgreSQL
- **Cache**: Redis
- **Workflow Engine**: Temporal

## 🛠️ Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm typecheck
```

## 📚 Key Features

- **Workflow Automation**: Visual workflow editor with 1000+ integrations
- **Marketplace**: Browse and install workflow templates
- **Multi-tenancy**: Isolated workspaces for organizations
- **Real-time Execution**: Temporal-based workflow orchestration
- **Extensible**: Custom nodes and integrations
- **Enterprise Ready**: RBAC, audit logs, SSO support

## 🐳 Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```
- **Observability**: Prometheus, Grafana, Jaeger

## Quick Start

1. Start the development environment:
```bash
docker-compose up -d
```

2. Install dependencies:
```bash
# Frontend
cd frontend && npm install

# API
cd api && npm install

# Node.js Workers
cd workers/nodejs && npm install

# Python Workers
cd workers/python && pip install -r requirements.txt

# Rust Workers
cd workers/rust && cargo build
```

3. Run database migrations:
```bash
cd db && npm run migrate
```

4. Start development servers:
```bash
# Start all services
npm run dev
```

## Development Guidelines

- Map all code modules to architectural layers
- Use explicit interfaces for workflow orchestration
- Write stateless, idempotent worker code
- Stream binary files instead of loading in memory
- Ensure all operations are observable (logged, traced, monitored)
- Use Temporal for state management and exactly-once execution
- Write production-safe, failure-resistant, traceable code

## Contributing

See individual component README files for specific development instructions.