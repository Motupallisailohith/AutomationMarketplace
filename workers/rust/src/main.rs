use tokio;
use tracing::{info, error, warn, debug};
use std::env;
use anyhow::{Result, Context};

mod activities;
mod kafka;
mod metrics;
mod config;

use activities::*;
use config::WorkerConfig;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            env::var("RUST_LOG").unwrap_or_else(|_| "info".to_string())
        )
        .init();

    info!("Starting Rust Worker for compute-intensive tasks");

    // Load configuration
    let config = WorkerConfig::from_env()?;
    info!("Loaded configuration: {:#?}", config);

    // Initialize metrics
    metrics::init_metrics().context("Failed to initialize metrics")?;

    // Initialize Kafka producer
    let kafka_producer = kafka::create_producer(&config.kafka_brokers)
        .await
        .context("Failed to create Kafka producer")?;

    // Initialize Temporal worker (placeholder)
    // In a full implementation, this would connect to Temporal server
    // and register activity handlers for compute-intensive tasks
    
    info!("Rust worker initialized, waiting for tasks...");

    // Main worker loop
    loop {
        // In a real implementation, this would:
        // 1. Poll for tasks from Temporal
        // 2. Execute compute-intensive activities
        // 3. Report results back to Temporal
        // 4. Publish metrics and events to Kafka

        // For now, just simulate worker activity
        tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
        debug!("Rust worker heartbeat");

        // Simulate processing a task
        if let Err(e) = simulate_data_processing_task().await {
            error!("Task processing failed: {}", e);
        }
    }
}

async fn simulate_data_processing_task() -> Result<()> {
    info!("Processing data processing task...");
    
    // Simulate some compute-intensive work
    let start = std::time::Instant::now();
    
    // Example: Process large dataset
    let data: Vec<i32> = (0..1_000_000).collect();
    let sum: i64 = data.iter().map(|&x| x as i64).sum();
    let avg = sum as f64 / data.len() as f64;
    
    let duration = start.elapsed();
    
    info!("Processed {} elements, average: {:.2}, duration: {:?}", 
          data.len(), avg, duration);
    
    // Report metrics
    metrics::record_task_duration(duration.as_millis() as f64);
    metrics::increment_task_counter("data_processing", "success");
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_worker_initialization() {
        // Test worker can be initialized with default config
        let config = WorkerConfig::default();
        assert!(!config.kafka_brokers.is_empty());
    }

    #[tokio::test]
    async fn test_data_processing() {
        // Test the data processing simulation
        let result = simulate_data_processing_task().await;
        assert!(result.is_ok());
    }
}