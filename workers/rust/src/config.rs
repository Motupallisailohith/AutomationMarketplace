use serde::{Deserialize, Serialize};
use anyhow::{Result, Context};
use std::env;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkerConfig {
    pub temporal_address: String,
    pub temporal_namespace: String,
    pub task_queue: String,
    pub kafka_brokers: Vec<String>,
    pub max_concurrent_tasks: usize,
    pub metrics_port: u16,
}

impl Default for WorkerConfig {
    fn default() -> Self {
        Self {
            temporal_address: "localhost:7233".to_string(),
            temporal_namespace: "default".to_string(),
            task_queue: "rust-worker-queue".to_string(),
            kafka_brokers: vec!["localhost:9092".to_string()],
            max_concurrent_tasks: 10,
            metrics_port: 9090,
        }
    }
}

impl WorkerConfig {
    pub fn from_env() -> Result<Self> {
        let mut config = Self::default();

        if let Ok(addr) = env::var("TEMPORAL_ADDRESS") {
            config.temporal_address = addr;
        }

        if let Ok(namespace) = env::var("TEMPORAL_NAMESPACE") {
            config.temporal_namespace = namespace;
        }

        if let Ok(queue) = env::var("TASK_QUEUE") {
            config.task_queue = queue;
        }

        if let Ok(brokers) = env::var("KAFKA_BROKERS") {
            config.kafka_brokers = brokers
                .split(',')
                .map(|s| s.trim().to_string())
                .collect();
        }

        if let Ok(max_tasks) = env::var("MAX_CONCURRENT_TASKS") {
            config.max_concurrent_tasks = max_tasks
                .parse()
                .context("Invalid MAX_CONCURRENT_TASKS value")?;
        }

        if let Ok(port) = env::var("METRICS_PORT") {
            config.metrics_port = port
                .parse()
                .context("Invalid METRICS_PORT value")?;
        }

        Ok(config)
    }
}