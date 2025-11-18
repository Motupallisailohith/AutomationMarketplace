# Automation Marketplace - Workflow Orchestration Platform

A modern, scalable workflow automation platform built with event-driven architecture, designed for reliability, maintainability, and performance.

## Architecture Overview

This platform implements a distributed, event-driven orchestration system with the following components:

- **Frontend UI**: React-based visual workflow editor
- **API Gateway**: Kong/Envoy for HTTP ingress and load balancing
- **Service Layer**: REST/gRPC API backend
- **Workflow Orchestration**: Temporal for exactly-once execution
- **Worker Pool**: Multi-language workers (Node.js, Rust, Python)
- **Event Streaming**: Apache Kafka with Redis caching
- **Data Layer**: PostgreSQL, DuckDB, S3 storage
- **Observability**: Prometheus, Grafana, Jaeger

## Project Structure

```
├── frontend/           # React TypeScript UI
├── api/               # API Gateway & Service Layer
├── orchestrator/      # Temporal Workflows & Activities
├── workers/           # Heterogeneous Worker Pool
│   ├── nodejs/       # HTTP/API integration workers
│   ├── rust/         # Compute/binary data workers
│   └── python/       # ML/data science workers
├── messaging/         # Kafka/Redis event handling
├── db/               # Database schemas & migrations
├── observability/    # Monitoring & tracing configs
└── infrastructure/   # Docker, K8s, Helm charts
```

## Key Design Principles

- **Event Sourcing**: All workflow events stored as ordered log in Kafka
- **Idempotent Execution**: Workers produce consistent results for retries
- **Exactly-Once Guarantee**: Temporal ensures reliable execution
- **Resource Isolation**: Kubernetes enforces per-worker limits
- **Binary Streaming**: Large files never loaded in memory
- **Data Retention**: OLTP in PostgreSQL, analytics in DuckDB, archive in S3

## Technology Stack

- **Frontend**: React, TypeScript
- **Backend**: Node.js/Express, Go (Temporal), Rust (compute)
- **Orchestration**: Temporal
- **Messaging**: Apache Kafka, Redis
- **Databases**: PostgreSQL, DuckDB, S3
- **Infrastructure**: Docker, Kubernetes, Helm
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