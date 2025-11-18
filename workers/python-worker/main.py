"""
Python Worker for ML and Data Science Activities

This worker handles machine learning, data analysis, and computational activities
for the Automation Marketplace platform.
"""

import asyncio
import json
import logging
import signal
import sys
from datetime import timedelta
from typing import Dict, Any

from temporalio import activity
from temporalio.client import Client
from temporalio.worker import Worker

from activities.ml_activities import (
    train_model,
    predict,
    evaluate_model,
    preprocess_data
)
from activities.data_analysis import (
    statistical_analysis,
    data_correlation,
    time_series_analysis,
    clustering_analysis
)
from activities.computational import (
    matrix_operations,
    numerical_computation,
    optimization,
    signal_processing
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('logs/python-worker.log')
    ]
)

logger = logging.getLogger(__name__)

# Graceful shutdown handler
shutdown_event = asyncio.Event()

def signal_handler(signum, frame):
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    shutdown_event.set()

async def main():
    """Main worker entry point."""
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    logger.info("Starting Python worker for ML and data science activities...")
    
    try:
        # Connect to Temporal
        client = await Client.connect("localhost:7233", namespace="default")
        
        # Create worker
        worker = Worker(
            client,
            task_queue="python-worker",
            activities=[
                # ML Activities
                train_model,
                predict,
                evaluate_model,
                preprocess_data,
                
                # Data Analysis Activities
                statistical_analysis,
                data_correlation,
                time_series_analysis,
                clustering_analysis,
                
                # Computational Activities
                matrix_operations,
                numerical_computation,
                optimization,
                signal_processing
            ],
            activity_executor=None,  # Use default thread pool
        )
        
        logger.info("Python worker successfully connected to Temporal")
        logger.info(f"Available activities: {[act.__name__ for act in worker._activities.keys()]}")
        
        # Start worker in background
        worker_task = asyncio.create_task(worker.run())
        
        # Wait for shutdown signal
        await shutdown_event.wait()
        
        # Graceful shutdown
        logger.info("Shutting down worker...")
        await worker.shutdown()
        worker_task.cancel()
        
        logger.info("Python worker shutdown complete")
        
    except Exception as e:
        logger.error(f"Failed to start Python worker: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())