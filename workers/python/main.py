#!/usr/bin/env python3
"""
Python Worker for ML/AI and Data Science Tasks
Handles machine learning inference, data analysis, and AI model execution
"""

import asyncio
import logging
import os
import sys
import signal
import json
import time
from typing import Dict, Any, Optional, List
from datetime import datetime
from dataclasses import dataclass, asdict
from pathlib import Path

# Third-party imports
import numpy as np
import pandas as pd
from temporalio import activity, workflow
from temporalio.worker import Worker
from temporalio.client import Client
import redis
from kafka import KafkaProducer
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

@dataclass
class MLTaskInput:
    task_id: str
    task_name: str
    task_type: str  # 'text_classification', 'sentiment_analysis', 'image_processing', etc.
    input_data: Any
    model_config: Dict[str, Any]
    parameters: Optional[Dict[str, Any]] = None

@dataclass
class MLTaskOutput:
    task_id: str
    success: bool
    predictions: Optional[Any] = None
    confidence_scores: Optional[List[float]] = None
    error_message: Optional[str] = None
    execution_time_ms: Optional[int] = None
    model_version: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class MLWorker:
    """Python worker for ML/AI tasks"""
    
    def __init__(self):
        self.worker_id = f"python-worker-{os.getenv('HOSTNAME', 'local')}-{os.getpid()}"
        self.redis_client = None
        self.kafka_producer = None
        self.temporal_client = None
        self.models_cache = {}
        
    async def initialize(self):
        """Initialize connections and dependencies"""
        try:
            # Initialize Redis connection
            self.redis_client = redis.Redis(
                host=os.getenv('REDIS_HOST', 'localhost'),
                port=int(os.getenv('REDIS_PORT', 6379)),
                decode_responses=True
            )
            
            # Initialize Kafka producer
            self.kafka_producer = KafkaProducer(
                bootstrap_servers=os.getenv('KAFKA_BROKERS', 'localhost:9092').split(','),
                value_serializer=lambda x: json.dumps(x).encode('utf-8')
            )
            
            # Initialize Temporal client
            self.temporal_client = await Client.connect(
                os.getenv('TEMPORAL_ADDRESS', 'localhost:7233')
            )
            
            logger.info("ML Worker initialized successfully", worker_id=self.worker_id)
            
        except Exception as e:
            logger.error("Failed to initialize ML Worker", error=str(e), worker_id=self.worker_id)
            raise

    async def run(self):
        """Start the worker"""
        try:
            await self.initialize()
            
            # Create Temporal worker
            worker = Worker(
                self.temporal_client,
                task_queue="python-ml-worker-queue",
                activities=[
                    self.execute_text_classification,
                    self.execute_sentiment_analysis,
                    self.execute_image_processing,
                    self.execute_data_analysis,
                    self.execute_model_training,
                ]
            )
            
            logger.info("Starting Python ML Worker", worker_id=self.worker_id)
            await worker.run()
            
        except Exception as e:
            logger.error("Worker execution failed", error=str(e), worker_id=self.worker_id)
            sys.exit(1)

    @activity.defn
    async def execute_text_classification(self, task_input: MLTaskInput) -> MLTaskOutput:
        """Execute text classification task"""
        start_time = time.time()
        logger.info("Executing text classification", task_id=task_input.task_id)
        
        try:
            # Load or get cached model
            model = await self._get_model("text_classification", task_input.model_config)
            
            # Prepare input data
            texts = task_input.input_data
            if isinstance(texts, str):
                texts = [texts]
            elif isinstance(texts, dict) and 'texts' in texts:
                texts = texts['texts']
            
            # Simulate text classification (replace with actual model)
            predictions = []
            confidence_scores = []
            
            for text in texts:
                # Mock classification logic
                prediction = "positive" if len(text.split()) > 5 else "negative"
                confidence = np.random.uniform(0.7, 0.95)
                predictions.append(prediction)
                confidence_scores.append(confidence)
            
            execution_time = int((time.time() - start_time) * 1000)
            
            result = MLTaskOutput(
                task_id=task_input.task_id,
                success=True,
                predictions=predictions,
                confidence_scores=confidence_scores,
                execution_time_ms=execution_time,
                model_version="mock-1.0",
                metadata={
                    "input_count": len(texts),
                    "worker_id": self.worker_id
                }
            )
            
            # Publish event
            await self._publish_event("ml_task_completed", asdict(result))
            
            logger.info("Text classification completed", 
                       task_id=task_input.task_id, 
                       execution_time=execution_time)
            
            return result
            
        except Exception as e:
            logger.error("Text classification failed", 
                        task_id=task_input.task_id, 
                        error=str(e))
            
            return MLTaskOutput(
                task_id=task_input.task_id,
                success=False,
                error_message=str(e),
                execution_time_ms=int((time.time() - start_time) * 1000)
            )

    @activity.defn
    async def execute_sentiment_analysis(self, task_input: MLTaskInput) -> MLTaskOutput:
        """Execute sentiment analysis task"""
        start_time = time.time()
        logger.info("Executing sentiment analysis", task_id=task_input.task_id)
        
        try:
            # Simulate sentiment analysis
            texts = task_input.input_data
            if isinstance(texts, str):
                texts = [texts]
            
            results = []
            for text in texts:
                # Mock sentiment analysis
                sentiment_score = np.random.uniform(-1, 1)
                sentiment = "positive" if sentiment_score > 0 else "negative"
                results.append({
                    "text": text[:50] + "..." if len(text) > 50 else text,
                    "sentiment": sentiment,
                    "score": sentiment_score,
                    "confidence": abs(sentiment_score)
                })
            
            execution_time = int((time.time() - start_time) * 1000)
            
            result = MLTaskOutput(
                task_id=task_input.task_id,
                success=True,
                predictions=results,
                execution_time_ms=execution_time,
                model_version="sentiment-1.0",
                metadata={
                    "input_count": len(texts),
                    "worker_id": self.worker_id
                }
            )
            
            logger.info("Sentiment analysis completed", 
                       task_id=task_input.task_id, 
                       execution_time=execution_time)
            
            return result
            
        except Exception as e:
            logger.error("Sentiment analysis failed", 
                        task_id=task_input.task_id, 
                        error=str(e))
            
            return MLTaskOutput(
                task_id=task_input.task_id,
                success=False,
                error_message=str(e),
                execution_time_ms=int((time.time() - start_time) * 1000)
            )

    @activity.defn
    async def execute_data_analysis(self, task_input: MLTaskInput) -> MLTaskOutput:
        """Execute data analysis task"""
        start_time = time.time()
        logger.info("Executing data analysis", task_id=task_input.task_id)
        
        try:
            data = task_input.input_data
            
            # Convert to DataFrame if needed
            if isinstance(data, list):
                df = pd.DataFrame(data)
            elif isinstance(data, dict):
                df = pd.DataFrame(data)
            else:
                df = pd.read_json(data) if isinstance(data, str) else pd.DataFrame()
            
            # Perform analysis
            analysis_results = {
                "shape": df.shape,
                "columns": df.columns.tolist() if not df.empty else [],
                "summary_stats": df.describe().to_dict() if not df.empty else {},
                "null_counts": df.isnull().sum().to_dict() if not df.empty else {},
                "data_types": df.dtypes.astype(str).to_dict() if not df.empty else {}
            }
            
            execution_time = int((time.time() - start_time) * 1000)
            
            result = MLTaskOutput(
                task_id=task_input.task_id,
                success=True,
                predictions=analysis_results,
                execution_time_ms=execution_time,
                metadata={
                    "worker_id": self.worker_id,
                    "analysis_type": "descriptive"
                }
            )
            
            logger.info("Data analysis completed", 
                       task_id=task_input.task_id, 
                       execution_time=execution_time)
            
            return result
            
        except Exception as e:
            logger.error("Data analysis failed", 
                        task_id=task_input.task_id, 
                        error=str(e))
            
            return MLTaskOutput(
                task_id=task_input.task_id,
                success=False,
                error_message=str(e),
                execution_time_ms=int((time.time() - start_time) * 1000)
            )

    @activity.defn
    async def execute_image_processing(self, task_input: MLTaskInput) -> MLTaskOutput:
        """Execute image processing task"""
        start_time = time.time()
        logger.info("Executing image processing", task_id=task_input.task_id)
        
        try:
            # Mock image processing
            image_data = task_input.input_data
            operation = task_input.parameters.get('operation', 'analyze') if task_input.parameters else 'analyze'
            
            result_data = {
                "operation": operation,
                "processed": True,
                "dimensions": [224, 224, 3],  # Mock dimensions
                "format": "RGB",
                "detected_objects": [
                    {"class": "person", "confidence": 0.89, "bbox": [10, 10, 100, 150]},
                    {"class": "car", "confidence": 0.76, "bbox": [150, 50, 300, 200]}
                ] if operation == "object_detection" else None
            }
            
            execution_time = int((time.time() - start_time) * 1000)
            
            result = MLTaskOutput(
                task_id=task_input.task_id,
                success=True,
                predictions=result_data,
                execution_time_ms=execution_time,
                model_version="vision-1.0",
                metadata={
                    "worker_id": self.worker_id,
                    "operation": operation
                }
            )
            
            logger.info("Image processing completed", 
                       task_id=task_input.task_id, 
                       execution_time=execution_time)
            
            return result
            
        except Exception as e:
            logger.error("Image processing failed", 
                        task_id=task_input.task_id, 
                        error=str(e))
            
            return MLTaskOutput(
                task_id=task_input.task_id,
                success=False,
                error_message=str(e),
                execution_time_ms=int((time.time() - start_time) * 1000)
            )

    @activity.defn
    async def execute_model_training(self, task_input: MLTaskInput) -> MLTaskOutput:
        """Execute model training task"""
        start_time = time.time()
        logger.info("Executing model training", task_id=task_input.task_id)
        
        try:
            # Mock model training
            training_config = task_input.model_config
            epochs = training_config.get('epochs', 10)
            
            # Simulate training progress
            training_metrics = []
            for epoch in range(epochs):
                accuracy = 0.5 + (epoch / epochs) * 0.4 + np.random.uniform(-0.05, 0.05)
                loss = 2.0 - (epoch / epochs) * 1.5 + np.random.uniform(-0.1, 0.1)
                training_metrics.append({
                    "epoch": epoch + 1,
                    "accuracy": float(accuracy),
                    "loss": float(loss)
                })
                
                # Small delay to simulate training time
                await asyncio.sleep(0.1)
            
            execution_time = int((time.time() - start_time) * 1000)
            
            result = MLTaskOutput(
                task_id=task_input.task_id,
                success=True,
                predictions={
                    "final_accuracy": training_metrics[-1]["accuracy"],
                    "final_loss": training_metrics[-1]["loss"],
                    "training_history": training_metrics,
                    "model_path": f"/models/{task_input.task_id}_trained_model.pkl"
                },
                execution_time_ms=execution_time,
                model_version=f"trained-{task_input.task_id}",
                metadata={
                    "worker_id": self.worker_id,
                    "epochs_completed": epochs
                }
            )
            
            logger.info("Model training completed", 
                       task_id=task_input.task_id, 
                       execution_time=execution_time,
                       final_accuracy=training_metrics[-1]["accuracy"])
            
            return result
            
        except Exception as e:
            logger.error("Model training failed", 
                        task_id=task_input.task_id, 
                        error=str(e))
            
            return MLTaskOutput(
                task_id=task_input.task_id,
                success=False,
                error_message=str(e),
                execution_time_ms=int((time.time() - start_time) * 1000)
            )

    async def _get_model(self, model_type: str, config: Dict[str, Any]):
        """Get or load model from cache"""
        model_key = f"{model_type}_{config.get('version', 'default')}"
        
        if model_key not in self.models_cache:
            logger.info("Loading model", model_type=model_type, model_key=model_key)
            # In a real implementation, load the actual model here
            self.models_cache[model_key] = {"type": model_type, "loaded": True}
        
        return self.models_cache[model_key]

    async def _publish_event(self, event_type: str, data: Dict[str, Any]):
        """Publish event to Kafka"""
        try:
            if self.kafka_producer:
                event = {
                    "event_type": event_type,
                    "timestamp": datetime.utcnow().isoformat(),
                    "worker_id": self.worker_id,
                    "data": data
                }
                
                self.kafka_producer.send('ml-worker-events', event)
                logger.debug("Event published", event_type=event_type)
        except Exception as e:
            logger.error("Failed to publish event", error=str(e), event_type=event_type)

def handle_signal(signum, frame):
    """Handle shutdown signals"""
    logger.info("Received signal, shutting down gracefully", signal=signum)
    sys.exit(0)

async def main():
    """Main entry point"""
    # Set up signal handlers
    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)
    
    # Create and run worker
    worker = MLWorker()
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main())