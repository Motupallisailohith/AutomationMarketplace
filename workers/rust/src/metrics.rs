use metrics::{counter, gauge, histogram};
use metrics_prometheus::PrometheusBuilder;
use anyhow::Result;

pub fn init_metrics() -> Result<()> {
    // Initialize Prometheus metrics exporter
    PrometheusBuilder::new()
        .build()?;
    
    // Initialize default metrics
    gauge!("rust_worker_status").set(1.0);
    counter!("rust_worker_started_total").increment(1);
    
    Ok(())
}

pub fn record_task_duration(duration_ms: f64) {
    histogram!("task_duration_milliseconds").record(duration_ms);
}

pub fn increment_task_counter(task_type: &str, status: &str) {
    counter!("tasks_total")
        .add(1, [("task_type", task_type), ("status", status)]);
}

pub fn set_active_tasks(count: f64) {
    gauge!("active_tasks").set(count);
}

pub fn record_memory_usage(bytes: f64) {
    gauge!("memory_usage_bytes").set(bytes);
}

pub fn record_cpu_usage(percentage: f64) {
    gauge!("cpu_usage_percentage").set(percentage);
}