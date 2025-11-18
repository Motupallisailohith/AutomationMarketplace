# Automation Marketplace Workers

This directory contains the multi-language worker implementation for the Automation Marketplace platform. Each worker specializes in different types of activities and computational tasks.

## Architecture

The worker architecture follows the **Multi-Language Worker Pattern** with specialized workers for different domains:

### Node.js Worker (`nodejs-worker/`)
**Specialization**: HTTP/API calls, data parsing, and notifications
- **Activities**:
  - HTTP requests (GET, POST, PUT, DELETE) with authentication
  - REST API integration with various auth methods
  - Webhook execution with HMAC signatures
  - Data parsing (JSON, XML, HTML, YAML)
  - Data transformation and mapping
  - Email, SMS, Slack, Discord notifications

### Python Worker (`python-worker/`)
**Specialization**: Machine Learning and Data Science
- **Activities**:
  - Model training (Random Forest, SVM, Linear/Logistic Regression)
  - Predictions and model evaluation
  - Data preprocessing and feature engineering
  - Statistical analysis and correlation studies
  - Time series analysis
  - Clustering (K-means, DBSCAN)
  - Matrix operations and numerical computation

### Rust Worker (`rust-worker/`)
**Specialization**: High-performance computational tasks
- **Activities**:
  - Parallel matrix operations
  - High-performance data processing
  - Batch processing with parallelization
  - Image processing and analysis
  - Text processing and analysis
  - Cryptographic operations
  - Prime generation and Monte Carlo simulations
  - Fast Fourier Transform (FFT)

## Communication

Workers communicate with the orchestrator through:
- **Temporal Workflows**: Async task execution and state management
- **Kafka Events**: Real-time event streaming and messaging
- **HTTP APIs**: Direct communication for immediate responses

## Deployment

All workers are containerized with Docker and can be deployed together using docker-compose:

```bash
docker-compose up -d nodejs-worker python-worker rust-worker
```

Each worker automatically registers with the Temporal server and begins processing tasks from their respective queues.

## Scaling

Workers can be scaled horizontally by running multiple instances. The Temporal server handles load balancing and task distribution automatically.

## Monitoring

Each worker includes:
- Structured logging with correlation IDs
- Health check endpoints
- Performance metrics
- Distributed tracing support

## Development

Each worker can be developed and tested independently:

```bash
# Node.js Worker
cd workers/nodejs-worker
npm install
npm run dev

# Python Worker
cd workers/python-worker
pip install -r requirements.txt
python main.py

# Rust Worker
cd workers/rust-worker
cargo build
cargo run
```

## Task Queues

Workers listen on specialized task queues:
- `nodejs-worker` - HTTP and API activities
- `python-worker` - ML and data science activities
- `rust-worker` - High-performance computational tasks

## Error Handling

All workers implement comprehensive error handling:
- Graceful degradation for failed activities
- Retry mechanisms for transient failures
- Dead letter queues for permanent failures
- Structured error reporting with context