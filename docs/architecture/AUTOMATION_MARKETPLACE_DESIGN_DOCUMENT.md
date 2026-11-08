# System Design: Automation Marketplace

## Abstract
The Automation Marketplace is a multi-tenant, enterprise-grade platform for designing, executing, and sharing workflow automations through a visual interface. It combines a marketplace for reusable workflow templates and custom integration nodes with a fault-tolerant execution platform built around event-driven services and durable orchestration. Users can create workflows, publish and install reusable automations, and trigger executions manually, through webhooks, or on a schedule.

The platform separates control-plane responsibilities from workflow execution. A Node.js and Express API manages authentication, workspaces, workflows, credentials, and marketplace operations, while Temporal coordinates durable workflow execution and recovery. Stateless polyglot workers written in Node.js, Python, and Rust execute individual workflow steps and can scale horizontally. PostgreSQL provides durable data storage, Redis supports caching and rate limiting, and object storage handles large payloads. Together, these components provide tenant isolation, role-based access control, observability, resilience, and reliable execution at scale.

## Email-Ready Abstract
The Automation Marketplace is an enterprise workflow and AI-agent platform that enables teams to visually design, automate, and share reliable business processes. Its technology stack includes Vue 3, TypeScript, and Vite for the frontend; Node.js and Express for APIs and marketplace services; PostgreSQL for durable multi-tenant data; Redis for caching, rate limiting, and coordination; Temporal for fault-tolerant workflow orchestration; and Node.js, Python, and Rust workers for extensible task execution. AI agents can be deployed as governed workflow workers with scoped tools, tenant-aware permissions, encrypted credentials, human approval checkpoints, audit logs, and configurable budgets. Containerized services running on Kubernetes can scale agents horizontally by queue depth and workload type, while Temporal provides retries, timeouts, durable state, and recovery for long-running agent tasks. This architecture enables secure, observable, and cost-controlled AI automation across enterprise teams and systems.

## 1. Problem Statement / Overview
The Automation Marketplace is an enterprise-grade workflow automation platform that enables users to visually create, execute, and share workflows. Inspired by platforms like n8n and Zapier, it extends the core automation capability with a **Marketplace** where users can discover, install, and share workflow templates and custom integration nodes.

### 1.1 Why We Are Building This Instead of Using n8n Directly
n8n is a strong reference point for visual workflow automation, especially for its node-based editor, broad integration library, self-hosting support, and expression-based data mapping. We are not rebuilding it because n8n is incapable of automation. We are building a platform with a different primary focus: a secure, multi-tenant automation marketplace and durable execution platform for enterprise workloads.

The main differences are:

- **Enterprise multi-tenancy by design**: Workspaces, tenant isolation, RBAC, credential ownership, quotas, and audit records are core data-model requirements rather than features added around an individual n8n installation.
- **Marketplace as a first-class product**: Users can publish, discover, review, install, version, and govern workflow templates and integration nodes. The goal is a controlled internal and external ecosystem, not only a workflow editor with community packages.
- **Durable orchestration**: Temporal owns workflow state, retries, timeouts, recovery, and task handoff. This separates API traffic from execution and gives long-running workflows a durable history when workers or infrastructure fail.
- **Polyglot workers**: Node.js, Python, and Rust workers can execute different classes of tasks. This allows the platform to choose the best runtime for a workload while keeping the control plane consistent.
- **Large-scale execution**: Stateless workers, queue-based scaling, Redis coordination, and object-storage claim checks are designed for thousands of concurrent executions and large payloads.
- **Governed AI agents**: AI workflows can use scoped tools, approval checkpoints, budgets, tenant permissions, and audit logs instead of being treated as unrestricted script steps.
- **Platform-level observability and governance**: Execution history, traceability, rate limits, credential access, and policy enforcement are designed across every workflow and tenant.

### 1.2 Problems This Platform Is Intended to Solve

The design targets the following problems that become important when workflow automation moves from personal or team productivity into a shared enterprise platform:

1. **Isolation and data leakage risk**: Multiple organizations must share infrastructure without being able to read each other's workflows, credentials, executions, or marketplace assets.
2. **Fragile long-running executions**: A process restart, worker crash, deployment, or network failure should not lose the position of a workflow or require a user to restart it manually.
3. **Duplicate side effects**: Retries can accidentally send duplicate messages, create duplicate records, or charge a customer twice. Workers therefore need idempotency keys, retry policies, and durable execution state.
4. **Scaling bottlenecks**: The API and webhook layer should accept work quickly while execution workers scale independently according to queue depth and workload type.
5. **Large payload handling**: Files and large responses should not be copied through every orchestration event or stored directly in workflow history. The claim-check pattern stores the payload in object storage and passes only a reference.
6. **Uncontrolled third-party access**: Credentials must be encrypted, scoped to a workspace, exposed only at execution time, and recorded in audit logs without storing secret values in workflow definitions.
7. **Difficult reuse and governance**: Teams need a trusted way to share templates and nodes with versioning, ownership, approval, compatibility checks, and installation controls.
8. **AI reliability and cost control**: AI agents need bounded tools, human approval points, usage budgets, policy checks, and observable decisions before they can safely run in enterprise processes.

These requirements are tradeoffs. Compared with adopting n8n as a complete product, this platform requires more engineering, more operational infrastructure, and stricter contracts around node execution. The benefit is control over tenancy, governance, marketplace behavior, execution semantics, and worker runtimes for the specific enterprise use case described here.

## 2. Requirements

### Functional Requirements
- **Workflow Editor**: Visual UI to create, edit, and connect nodes into workflows.
- **Workflow Execution**: Ability to run workflows manually, via webhooks, or on a schedule.
- **Marketplace**: 
  - Browse, search, and install workflow templates.
  - Publish custom workflows/templates to the marketplace.
  - Install custom integration nodes.
- **Multi-tenancy**: Isolated workspaces for different organizations and RBAC (Role-Based Access Control).

### Non-Functional Requirements
- **High Availability**: The system must be highly available and resilient. Failures in one workflow should not impact others.
- **Scalability**: Capable of executing thousands of workflows concurrently.
- **Durable, effectively-once Execution**: Workflow state must not be lost or reordered during infrastructure failures, and retried activities must use idempotency controls to avoid duplicate business side effects.
- **Observability**: Comprehensive logging, tracing, and monitoring for executed workflows.
- **Low Latency**: Lightweight webhook endpoints and fast execution spin-up times.

## 3. High-Level Architecture & Tech Stack

Our architecture leverages an event-driven, distributed approach decoupled by a robust workflow orchestration engine.

- **Frontend**: Vue 3 + TypeScript + Vite (Visual Node Editor, Dashboard, Marketplace UI)
- **API Gateway / Backend Server**: Node.js + Express (Handles REST API, UI requests, Marketplace logic)
- **Database**: PostgreSQL (Stores user data, workflow definitions, marketplace metadata)
- **Cache**: Redis (Session management, caching marketplace assets, rate limiting)
- **Orchestration Engine**: Temporal (Go/Temporal) - Handles resilient execution, state management, retries, and task delivery for workflow steps. Idempotent workers provide effectively-once business outcomes for external side effects.
- **Workers**: Polyglot execution workers (Node.js, Python, Rust) that actually process node logic.

## 4. System Components

### 4.1. Core API (Node.js / Express)
Acts as the central control plane. 
- **Authentication & Authorization**: Validates user sessions and enforces RBAC (Admin, Builder, Viewer).
- **CRUD Operations**: Manages Workspace, Credentials, and Workflow definitions.
- **Marketplace Service**: Interfaces with the database to serve up templates.

### 4.2. Temporal Orchestrator (Go)
Replaces standard message queues (like RabbitMQ) with a stateful orchestrator.
- When an execution is triggered (e.g., via Webhook), the Core API starts a Temporal Workflow Execution.
- Temporal tracks the state of each node in the automation workflow.
- If a worker crashes while processing a node, Temporal automatically reassigns or retries the task based on defined policies.

#### What Is Temporal?

Temporal is a durable workflow orchestration platform. It runs application workflows while recording their state and history in a durable event log. A workflow can coordinate multiple tasks, wait for timers, call external services, pause for human approval, and resume after failures without the application having to rebuild its state manually.

Temporal separates two concepts:

- **Workflow**: The durable business process that defines the order, branching, waiting, retry, and compensation behavior.
- **Activity**: A task performed by a worker, such as calling an API, writing to a database, sending an email, or transforming data.

In this platform, the Temporal workflow represents the automation graph, while activities are executed by Node.js, Python, or Rust workers. The API starts and observes executions, but it does not need to hold the workflow state in memory.

#### Why We Use Temporal

Temporal is used because the platform must execute workflows reliably across failures and over long periods of time:

1. **Durable state**: The workflow position, completed steps, timers, and failures are persisted. A process restart does not automatically erase execution progress.
2. **Retries and timeouts**: Activities can retry with configurable backoff, timeout, and error policies. This is useful for temporary network failures and third-party rate limits.
3. **Worker failure recovery**: If a worker crashes, the activity can time out and be delivered to another available worker.
4. **Long-running workflows**: Workflows can wait for hours or days for schedules, callbacks, external events, or human approval without keeping an API process open.
5. **Clear separation of responsibilities**: The API handles authentication and control-plane operations, Temporal handles orchestration, and workers handle integrations and computation.
6. **Horizontal scaling**: Multiple workers can poll the same task queue. Worker capacity can be increased independently of API capacity.
7. **Observable execution history**: Each execution has a history that helps operators understand which steps ran, failed, retried, or are waiting.
8. **Versioned orchestration**: Workflow definitions can evolve while existing executions continue using the version with which they started.

#### Why Not Use Only a Message Queue?

A message queue is useful for delivering a task, but it does not by itself provide the complete state machine for a multi-step workflow. The application would need to build its own persistence, retry handling, timeout tracking, scheduling, recovery, compensation, and execution history around the queue.

Temporal provides these orchestration capabilities as one consistent execution model. Redis remains useful in this architecture for caching, distributed rate limiting, and short-lived coordination, but it is not the source of truth for workflow progress.

Temporal does not make external APIs exactly-once. An activity may be retried after a network failure, so integrations must use idempotency keys, deduplication, and compensation logic where duplicate side effects are possible. Temporal provides durable orchestration; the workers provide safe business behavior.

### 4.3. Execution Workers (Node.js / Python / Rust)
Stateless workers that parse the workflow definition and execute specific node operations (e.g., HTTP Request, Data Transformation, external API calls). 
- **Polyglot Nature**: Allows us to write specific high-performance nodes in Rust, scripts in Python, and standard API calls in Node.js.

## 5. Data Model (PostgreSQL)

Key tables supporting the marketplace and execution engine:

- **`users`** & **`workspaces`**: For multi-tenant isolation.
- **`workflows`**: Stores the JSON-based DAG (Directed Acyclic Graph) of the user's workflow.
- **`credentials`**: Encrypted secrets for third-party integrations (OAuth tokens, API keys).
- **`marketplace_templates`**: 
  - `id`, `name`, `description`, `category`, `workflow_json`, `downloads`, `author_id`
- **`marketplace_nodes`**: Registry of installable third-party node packages.
- **`executions`**: Audit log of workflow runs, statuses (SUCCESS, FAILED, RUNNING), and Temporal Run IDs.

## 6. API Design (Marketplace & Execution)

### Marketplace Endpoints
- `GET /api/v1/marketplace/templates` - Search and filter available workflow templates.
- `POST /api/v1/marketplace/templates` - Publish a workflow as a template (requires Auth).
- `POST /api/v1/workflows/:id/import` - Import a template into a user's workspace.

### Execution Endpoints
- `POST /webhook/:id` - Triggers a running workflow based on a webhook URL.
- `GET /api/v1/executions/:id` - Retrieve the status and logs of a specific workflow execution.

## 7. Deep Dive: Scalability and Fault Tolerance

### Handling Scale (Akin to Rate Limiter Shardings)
Just like a distributed rate limiter requires distributed caching to scale, the Automation Marketplace handles scale by decoupling the *API Server* from the *Execution Engine*.
- **Stateless API Webhooks**: The API server simply accepts a webhook, writes a message to Temporal, and responds `202 Accepted`. It doesn't wait for execution.
- **Horizontal Worker Scaling**: Execution workers can be deployed as auto-scaling groups or Kubernetes deployments acting on metrics (e.g., Temporal task queue length).
- **Data Streaming**: Binary files and large JSON payloads are streamed to object storage (S3) rather than passed through memory or the database event payload, preventing OOM (Out of Memory) crashes on heavy data workflows.

### Failure Scenarios (Durable and Idempotent Execution)
- **Worker Crash**: Temporal maintains the state. The task times out and is placed back in the queue for another worker.
- **API Rate Limits from 3rd Parties**: Workers implement exponential backoff and retry policies natively supported by Temporal without writing complex boilerplate.

## 8. Security & Multi-tenancy

- **Credential Storage**: Credentials are encrypted at rest using AES-256. They are decrypted in memory only by the Execution Worker right before the integration API call is made.
- **Workspace Isolation**: Database uses Tenant IDs. All API queries require parsing the Tenant ID from the authenticated user to prevent data leakage across organizations.

## 9. Distributed System Concepts Applied

This project leverages several core distributed systems principles to ensure high availability, fault tolerance, and scalability.

### 9.1. Durable Orchestration (Saga Pattern)
Unlike traditional choreography-based microservices, we use **Temporal** for durable orchestration. Long-running workflows can fail at any point. Temporal persists the state of each workflow step in its event history. If a component or network fails, Temporal can retry the activity or resume the workflow on a different worker. Because external activities may be delivered more than once, workers use idempotency keys, deduplication, and compensation logic where necessary to provide **effectively-once business outcomes**.

### 9.2. Decoupling and Event-Driven Asynchrony
The architecture enforces strict separation between the API ingestion layer and the execution layer. When a webhook is received, the API gateway validates the request, records an event in Temporal, and immediately returns a `202 Accepted` response. This asynchronous pattern (load leveling) prevents the API server from being blocked by long-running integrations and smooths out massive traffic spikes.

### 9.3. Stateless, Idempotent Workers
Workers (Node.js, Python, Rust) maintain no local state between executions. They operate on a pull-based model, polling the orchestration engine for tasks. This allows for massive horizontal scaling (just spin up more containers). Furthermore, worker node logic must be strictly **idempotent**—if a network partition occurs and a task is delivered twice, the integration's outcome remains effectively the same, preventing duplicated side effects (like double-charging a customer).

### 9.4. Claim Check Pattern for Large Payloads
To prevent the distributed event buses and databases from choking on large payloads (e.g., file processing or heavy JSON extracts), the system uses the **Claim Check pattern**. Large binaries and payloads are streamed directly to object storage (like AWS S3). Only a lightweight reference URI (the "claim check") is passed through the workflow state and stored in the execution logs.

### 9.5. Distributed Rate Limiting and Concurrency
To protect third-party APIs from being overwhelmed and to enforce SLA quotas per tenant, **Redis** operates as a distributed cache. Using atomic operations (e.g., Lua scripts implementing the Token Bucket algorithm), multiple worker instances distributed across different physical hardware can uniformly enforce rate limit quotas without race conditions.

### 9.6. Multi-tenant Data Partitioning
PostgreSQL partitions its data using `tenant_id`. Every query inherently scopes to a specific workspace. As the platform grows to handle millions of workflows, this design allows the database to be easily sharded horizontally across multiple physical database instances using the `tenant_id` as the shard key. This ensures data locality and prevents "noisy neighbor" performance degradation.
