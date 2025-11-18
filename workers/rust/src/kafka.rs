use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::ClientConfig;
use serde_json;
use anyhow::{Result, Context};
use tracing::{info, error};

pub async fn create_producer(brokers: &[String]) -> Result<FutureProducer> {
    let broker_list = brokers.join(",");
    
    let producer: FutureProducer = ClientConfig::new()
        .set("bootstrap.servers", &broker_list)
        .set("message.timeout.ms", "5000")
        .set("batch.size", "16384")
        .set("linger.ms", "10")
        .set("compression.type", "lz4")
        .create()
        .context("Failed to create Kafka producer")?;

    info!("Kafka producer initialized with brokers: {}", broker_list);
    Ok(producer)
}

pub async fn publish_event<T>(
    producer: &FutureProducer,
    topic: &str,
    key: Option<&str>,
    event: &T,
) -> Result<()> 
where
    T: serde::Serialize,
{
    let payload = serde_json::to_string(event)
        .context("Failed to serialize event")?;

    let record = FutureRecord::to(topic)
        .payload(&payload);

    let record = if let Some(k) = key {
        record.key(k)
    } else {
        record
    };

    match producer.send(record, std::time::Duration::from_secs(5)).await {
        Ok(_) => {
            info!("Event published to topic: {}", topic);
            Ok(())
        }
        Err((kafka_error, _)) => {
            error!("Failed to publish event: {}", kafka_error);
            Err(kafka_error.into())
        }
    }
}

#[derive(serde::Serialize)]
pub struct WorkerEvent {
    pub event_type: String,
    pub worker_id: String,
    pub task_id: Option<String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub duration_ms: Option<u64>,
    pub success: bool,
    pub error_message: Option<String>,
    pub metadata: serde_json::Value,
}

impl WorkerEvent {
    pub fn new(event_type: String, worker_id: String) -> Self {
        Self {
            event_type,
            worker_id,
            task_id: None,
            timestamp: chrono::Utc::now(),
            duration_ms: None,
            success: true,
            error_message: None,
            metadata: serde_json::Value::Null,
        }
    }

    pub fn with_task_id(mut self, task_id: String) -> Self {
        self.task_id = Some(task_id);
        self
    }

    pub fn with_duration(mut self, duration_ms: u64) -> Self {
        self.duration_ms = Some(duration_ms);
        self
    }

    pub fn with_error(mut self, error_message: String) -> Self {
        self.success = false;
        self.error_message = Some(error_message);
        self
    }

    pub fn with_metadata<T>(mut self, metadata: T) -> Self 
    where
        T: serde::Serialize,
    {
        self.metadata = serde_json::to_value(metadata).unwrap_or(serde_json::Value::Null);
        self
    }
}