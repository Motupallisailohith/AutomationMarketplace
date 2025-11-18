use anyhow::Result;
use std::time::Duration;
use tracing::{info, error, warn};
use tracing_subscriber;

mod activities;

use activities::{
    parallel_processing,
    image_processing,
    text_processing,
    cryptographic,
    numerical_intensive
};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_target(false)
        .init();

    info!("Starting Rust worker for high-performance computational activities...");

    // Create Temporal client
    let client = temporal_sdk::Client::builder()
        .target_url("http://localhost:7233")
        .namespace("default")
        .build()
        .await?;

    // Register activities
    let mut worker = temporal_sdk::Worker::builder()
        .client(client)
        .task_queue("rust-worker")
        .activity("parallel_matrix_multiply", parallel_processing::matrix_multiply)
        .activity("parallel_data_processing", parallel_processing::data_processing)
        .activity("parallel_batch_processing", parallel_processing::batch_processing)
        .activity("image_resize", image_processing::resize_image)
        .activity("image_filter", image_processing::apply_filter)
        .activity("image_analysis", image_processing::analyze_image)
        .activity("text_search", text_processing::search_text)
        .activity("text_processing", text_processing::process_text)
        .activity("text_analysis", text_processing::analyze_text)
        .activity("hash_computation", cryptographic::compute_hash)
        .activity("encrypt_data", cryptographic::encrypt_data)
        .activity("decrypt_data", cryptographic::decrypt_data)
        .activity("prime_generation", numerical_intensive::generate_primes)
        .activity("monte_carlo_simulation", numerical_intensive::monte_carlo_simulation)
        .activity("fast_fourier_transform", numerical_intensive::fast_fourier_transform)
        .build()
        .await?;

    info!("Rust worker successfully connected to Temporal");
    info!("Available activities: parallel_matrix_multiply, parallel_data_processing, parallel_batch_processing, image_resize, image_filter, image_analysis, text_search, text_processing, text_analysis, hash_computation, encrypt_data, decrypt_data, prime_generation, monte_carlo_simulation, fast_fourier_transform");

    // Setup graceful shutdown
    let (shutdown_tx, mut shutdown_rx) = tokio::sync::mpsc::channel(1);
    
    // Handle shutdown signals
    tokio::spawn(async move {
        tokio::signal::ctrl_c().await.expect("Failed to listen for ctrl+c");
        warn!("Received shutdown signal, initiating graceful shutdown...");
        let _ = shutdown_tx.send(()).await;
    });

    // Run worker
    tokio::select! {
        result = worker.run() => {
            match result {
                Ok(_) => info!("Worker completed successfully"),
                Err(e) => error!("Worker error: {}", e),
            }
        }
        _ = shutdown_rx.recv() => {
            info!("Shutting down worker...");
        }
    }

    info!("Rust worker shutdown complete");
    Ok(())
}