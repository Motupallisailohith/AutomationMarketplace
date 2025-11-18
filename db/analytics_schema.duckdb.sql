-- DuckDB Analytics Schema
-- For OLAP workloads, performance metrics, and reporting

-- Execution metrics aggregated by day
CREATE TABLE execution_metrics_daily (
    date DATE NOT NULL,
    organization_id VARCHAR NOT NULL,
    workflow_id VARCHAR NOT NULL,
    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,
    cancelled_executions INTEGER DEFAULT 0,
    avg_duration_ms DOUBLE DEFAULT 0,
    p50_duration_ms DOUBLE DEFAULT 0,
    p95_duration_ms DOUBLE DEFAULT 0,
    p99_duration_ms DOUBLE DEFAULT 0,
    total_retry_count INTEGER DEFAULT 0,
    PRIMARY KEY (date, organization_id, workflow_id)
);

-- Worker performance metrics
CREATE TABLE worker_metrics_hourly (
    hour TIMESTAMP NOT NULL,
    worker_type VARCHAR NOT NULL,
    worker_id VARCHAR NOT NULL,
    tasks_completed INTEGER DEFAULT 0,
    tasks_failed INTEGER DEFAULT 0,
    avg_processing_time_ms DOUBLE DEFAULT 0,
    cpu_usage_percent DOUBLE DEFAULT 0,
    memory_usage_mb DOUBLE DEFAULT 0,
    PRIMARY KEY (hour, worker_type, worker_id)
);

-- Error patterns and frequency
CREATE TABLE error_patterns (
    date DATE NOT NULL,
    organization_id VARCHAR NOT NULL,
    error_type VARCHAR NOT NULL,
    error_pattern VARCHAR NOT NULL, -- normalized error message
    occurrence_count INTEGER DEFAULT 0,
    workflow_ids VARCHAR[] DEFAULT [],
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    PRIMARY KEY (date, organization_id, error_type, error_pattern)
);

-- Resource utilization trends
CREATE TABLE resource_utilization_daily (
    date DATE NOT NULL,
    organization_id VARCHAR NOT NULL,
    cpu_hours_used DOUBLE DEFAULT 0,
    memory_mb_hours DOUBLE DEFAULT 0,
    storage_gb_used DOUBLE DEFAULT 0,
    network_gb_transferred DOUBLE DEFAULT 0,
    api_calls_made INTEGER DEFAULT 0,
    PRIMARY KEY (date, organization_id)
);

-- Popular workflow patterns
CREATE TABLE workflow_pattern_analytics (
    pattern_hash VARCHAR NOT NULL,
    pattern_description TEXT,
    usage_count INTEGER DEFAULT 0,
    organizations_using INTEGER DEFAULT 0,
    avg_success_rate DOUBLE DEFAULT 0,
    avg_execution_time_ms DOUBLE DEFAULT 0,
    first_used TIMESTAMP,
    last_used TIMESTAMP,
    PRIMARY KEY (pattern_hash)
);

-- User engagement metrics
CREATE TABLE user_engagement_daily (
    date DATE NOT NULL,
    organization_id VARCHAR NOT NULL,
    user_id VARCHAR NOT NULL,
    workflows_created INTEGER DEFAULT 0,
    workflows_executed INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    features_used VARCHAR[] DEFAULT [],
    PRIMARY KEY (date, organization_id, user_id)
);

-- Integration usage statistics
CREATE TABLE integration_usage_daily (
    date DATE NOT NULL,
    organization_id VARCHAR NOT NULL,
    integration_type VARCHAR NOT NULL, -- http, database, ml_model, etc.
    endpoint_or_service VARCHAR,
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    avg_response_time_ms DOUBLE DEFAULT 0,
    data_transferred_mb DOUBLE DEFAULT 0,
    PRIMARY KEY (date, organization_id, integration_type, endpoint_or_service)
);

-- Cost analysis
CREATE TABLE cost_analysis_daily (
    date DATE NOT NULL,
    organization_id VARCHAR NOT NULL,
    cost_center VARCHAR NOT NULL, -- compute, storage, network, api_calls
    cost_usd DOUBLE DEFAULT 0,
    usage_units DOUBLE DEFAULT 0,
    unit_type VARCHAR, -- hours, gb, calls, etc.
    PRIMARY KEY (date, organization_id, cost_center)
);

-- Performance benchmarks
CREATE TABLE performance_benchmarks (
    benchmark_name VARCHAR NOT NULL,
    workflow_type VARCHAR NOT NULL,
    data_size_category VARCHAR NOT NULL, -- small, medium, large, xlarge
    p50_execution_time_ms DOUBLE DEFAULT 0,
    p95_execution_time_ms DOUBLE DEFAULT 0,
    p99_execution_time_ms DOUBLE DEFAULT 0,
    success_rate_percent DOUBLE DEFAULT 0,
    sample_size INTEGER DEFAULT 0,
    last_updated TIMESTAMP,
    PRIMARY KEY (benchmark_name, workflow_type, data_size_category)
);

-- Create indexes for common query patterns
CREATE INDEX idx_execution_metrics_org_date ON execution_metrics_daily(organization_id, date);
CREATE INDEX idx_worker_metrics_type_hour ON worker_metrics_hourly(worker_type, hour);
CREATE INDEX idx_error_patterns_org_date ON error_patterns(organization_id, date);
CREATE INDEX idx_resource_util_org_date ON resource_utilization_daily(organization_id, date);
CREATE INDEX idx_user_engagement_org_date ON user_engagement_daily(organization_id, date);
CREATE INDEX idx_integration_usage_org_date ON integration_usage_daily(organization_id, date);
CREATE INDEX idx_cost_analysis_org_date ON cost_analysis_daily(organization_id, date);