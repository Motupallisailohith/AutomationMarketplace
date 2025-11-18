use anyhow::Result;
use ndarray::{Array2, Array1, Axis};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use tracing::{info, error};
use chrono::Utc;

#[derive(Deserialize)]
pub struct MatrixMultiplyParams {
    pub matrix_a: Vec<Vec<f64>>,
    pub matrix_b: Vec<Vec<f64>>,
}

#[derive(Serialize)]
pub struct MatrixMultiplyResult {
    pub success: bool,
    pub result: Option<Vec<Vec<f64>>>,
    pub error: Option<String>,
    pub dimensions: Option<(usize, usize)>,
    pub computation_time_ms: u128,
    pub computed_at: String,
}

#[derive(Deserialize)]
pub struct DataProcessingParams {
    pub data: Vec<Value>,
    pub operation: String,
    pub parameters: HashMap<String, Value>,
}

#[derive(Serialize)]
pub struct DataProcessingResult {
    pub success: bool,
    pub result: Option<Vec<Value>>,
    pub error: Option<String>,
    pub items_processed: usize,
    pub computation_time_ms: u128,
    pub processed_at: String,
}

#[derive(Deserialize)]
pub struct BatchProcessingParams {
    pub batches: Vec<Vec<Value>>,
    pub operation: String,
    pub parameters: HashMap<String, Value>,
}

#[derive(Serialize)]
pub struct BatchProcessingResult {
    pub success: bool,
    pub results: Option<Vec<Vec<Value>>>,
    pub error: Option<String>,
    pub batches_processed: usize,
    pub total_items: usize,
    pub computation_time_ms: u128,
    pub processed_at: String,
}

pub async fn matrix_multiply(params: MatrixMultiplyParams) -> Result<MatrixMultiplyResult> {
    let start_time = std::time::Instant::now();
    info!("Starting parallel matrix multiplication");

    let result = tokio::task::spawn_blocking(move || -> Result<MatrixMultiplyResult> {
        // Convert to ndarray for efficient computation
        let rows_a = params.matrix_a.len();
        let cols_a = params.matrix_a.get(0).map_or(0, |row| row.len());
        let rows_b = params.matrix_b.len();
        let cols_b = params.matrix_b.get(0).map_or(0, |row| row.len());

        // Validate matrix dimensions
        if cols_a != rows_b {
            return Ok(MatrixMultiplyResult {
                success: false,
                result: None,
                error: Some(format!("Matrix dimensions incompatible: {}x{} * {}x{}", rows_a, cols_a, rows_b, cols_b)),
                dimensions: None,
                computation_time_ms: start_time.elapsed().as_millis(),
                computed_at: Utc::now().to_rfc3339(),
            });
        }

        // Convert to ndarray
        let mut matrix_a_data = Vec::with_capacity(rows_a * cols_a);
        for row in &params.matrix_a {
            matrix_a_data.extend(row);
        }
        let matrix_a = Array2::from_shape_vec((rows_a, cols_a), matrix_a_data)?;

        let mut matrix_b_data = Vec::with_capacity(rows_b * cols_b);
        for row in &params.matrix_b {
            matrix_b_data.extend(row);
        }
        let matrix_b = Array2::from_shape_vec((rows_b, cols_b), matrix_b_data)?;

        // Parallel matrix multiplication using rayon
        let result_matrix = matrix_a.dot(&matrix_b);

        // Convert back to Vec<Vec<f64>>
        let result_vec: Vec<Vec<f64>> = result_matrix
            .axis_iter(Axis(0))
            .map(|row| row.to_vec())
            .collect();

        Ok(MatrixMultiplyResult {
            success: true,
            result: Some(result_vec),
            error: None,
            dimensions: Some((rows_a, cols_b)),
            computation_time_ms: start_time.elapsed().as_millis(),
            computed_at: Utc::now().to_rfc3339(),
        })
    }).await?;

    match result {
        Ok(res) => {
            if res.success {
                info!("Matrix multiplication completed successfully in {}ms", res.computation_time_ms);
            } else {
                error!("Matrix multiplication failed: {:?}", res.error);
            }
            Ok(res)
        }
        Err(e) => {
            error!("Matrix multiplication error: {}", e);
            Ok(MatrixMultiplyResult {
                success: false,
                result: None,
                error: Some(e.to_string()),
                dimensions: None,
                computation_time_ms: start_time.elapsed().as_millis(),
                computed_at: Utc::now().to_rfc3339(),
            })
        }
    }
}

pub async fn data_processing(params: DataProcessingParams) -> Result<DataProcessingResult> {
    let start_time = std::time::Instant::now();
    info!("Starting parallel data processing: {}", params.operation);

    let result = tokio::task::spawn_blocking(move || -> Result<DataProcessingResult> {
        let processed_data: Vec<Value> = match params.operation.as_str() {
            "filter" => {
                // Parallel filtering
                let filter_key = params.parameters.get("key").and_then(|v| v.as_str()).unwrap_or("value");
                let filter_value = params.parameters.get("value").cloned().unwrap_or(Value::Null);
                
                params.data
                    .into_par_iter()
                    .filter(|item| {
                        if let Value::Object(obj) = item {
                            obj.get(filter_key) == Some(&filter_value)
                        } else {
                            item == &filter_value
                        }
                    })
                    .collect()
            }
            "map" => {
                // Parallel mapping transformation
                let transform_type = params.parameters.get("transform").and_then(|v| v.as_str()).unwrap_or("identity");
                
                params.data
                    .into_par_iter()
                    .map(|mut item| {
                        match transform_type {
                            "uppercase" => {
                                if let Value::String(s) = &item {
                                    item = Value::String(s.to_uppercase());
                                }
                            }
                            "lowercase" => {
                                if let Value::String(s) = &item {
                                    item = Value::String(s.to_lowercase());
                                }
                            }
                            "square" => {
                                if let Value::Number(n) = &item {
                                    if let Some(f) = n.as_f64() {
                                        item = serde_json::Number::from_f64(f * f)
                                            .map(Value::Number)
                                            .unwrap_or(item);
                                    }
                                }
                            }
                            _ => {} // identity transformation
                        }
                        item
                    })
                    .collect()
            }
            "reduce" => {
                // Parallel reduction
                let operation = params.parameters.get("operation").and_then(|v| v.as_str()).unwrap_or("sum");
                
                let result = match operation {
                    "sum" => {
                        let sum: f64 = params.data
                            .par_iter()
                            .filter_map(|v| v.as_f64())
                            .sum();
                        vec![Value::Number(serde_json::Number::from_f64(sum).unwrap())]
                    }
                    "count" => {
                        vec![Value::Number(serde_json::Number::from(params.data.len()))]
                    }
                    "max" => {
                        let max = params.data
                            .par_iter()
                            .filter_map(|v| v.as_f64())
                            .reduce(|| f64::NEG_INFINITY, |a, b| a.max(b));
                        vec![Value::Number(serde_json::Number::from_f64(max).unwrap())]
                    }
                    "min" => {
                        let min = params.data
                            .par_iter()
                            .filter_map(|v| v.as_f64())
                            .reduce(|| f64::INFINITY, |a, b| a.min(b));
                        vec![Value::Number(serde_json::Number::from_f64(min).unwrap())]
                    }
                    _ => params.data, // return original data if unknown operation
                };
                result
            }
            "sort" => {
                // Parallel sort
                let mut data = params.data;
                data.par_sort_by(|a, b| {
                    match (a.as_f64(), b.as_f64()) {
                        (Some(a_num), Some(b_num)) => a_num.partial_cmp(&b_num).unwrap_or(std::cmp::Ordering::Equal),
                        _ => {
                            let a_str = a.as_str().unwrap_or("");
                            let b_str = b.as_str().unwrap_or("");
                            a_str.cmp(b_str)
                        }
                    }
                });
                data
            }
            _ => {
                return Ok(DataProcessingResult {
                    success: false,
                    result: None,
                    error: Some(format!("Unknown operation: {}", params.operation)),
                    items_processed: 0,
                    computation_time_ms: start_time.elapsed().as_millis(),
                    processed_at: Utc::now().to_rfc3339(),
                });
            }
        };

        Ok(DataProcessingResult {
            success: true,
            result: Some(processed_data.clone()),
            error: None,
            items_processed: processed_data.len(),
            computation_time_ms: start_time.elapsed().as_millis(),
            processed_at: Utc::now().to_rfc3339(),
        })
    }).await?;

    match result {
        Ok(res) => {
            if res.success {
                info!("Data processing completed: {} items in {}ms", res.items_processed, res.computation_time_ms);
            } else {
                error!("Data processing failed: {:?}", res.error);
            }
            Ok(res)
        }
        Err(e) => {
            error!("Data processing error: {}", e);
            Ok(DataProcessingResult {
                success: false,
                result: None,
                error: Some(e.to_string()),
                items_processed: 0,
                computation_time_ms: start_time.elapsed().as_millis(),
                processed_at: Utc::now().to_rfc3339(),
            })
        }
    }
}

pub async fn batch_processing(params: BatchProcessingParams) -> Result<BatchProcessingResult> {
    let start_time = std::time::Instant::now();
    info!("Starting parallel batch processing: {}", params.operation);

    let result = tokio::task::spawn_blocking(move || -> Result<BatchProcessingResult> {
        let total_items: usize = params.batches.iter().map(|batch| batch.len()).sum();
        
        let processed_batches: Vec<Vec<Value>> = params.batches
            .into_par_iter()
            .map(|batch| {
                // Process each batch in parallel
                match params.operation.as_str() {
                    "aggregate" => {
                        // Aggregate each batch
                        let sum: f64 = batch
                            .iter()
                            .filter_map(|v| v.as_f64())
                            .sum();
                        vec![Value::Number(serde_json::Number::from_f64(sum).unwrap())]
                    }
                    "transform" => {
                        // Transform each item in the batch
                        let transform_type = params.parameters.get("transform").and_then(|v| v.as_str()).unwrap_or("identity");
                        
                        batch
                            .into_iter()
                            .map(|mut item| {
                                match transform_type {
                                    "double" => {
                                        if let Value::Number(n) = &item {
                                            if let Some(f) = n.as_f64() {
                                                item = serde_json::Number::from_f64(f * 2.0)
                                                    .map(Value::Number)
                                                    .unwrap_or(item);
                                            }
                                        }
                                    }
                                    "reverse" => {
                                        if let Value::String(s) = &item {
                                            item = Value::String(s.chars().rev().collect());
                                        }
                                    }
                                    _ => {} // identity
                                }
                                item
                            })
                            .collect()
                    }
                    "filter" => {
                        // Filter each batch
                        let threshold = params.parameters.get("threshold").and_then(|v| v.as_f64()).unwrap_or(0.0);
                        
                        batch
                            .into_iter()
                            .filter(|item| {
                                if let Some(num) = item.as_f64() {
                                    num > threshold
                                } else {
                                    true // keep non-numeric items
                                }
                            })
                            .collect()
                    }
                    _ => batch, // return original batch if unknown operation
                }
            })
            .collect();

        Ok(BatchProcessingResult {
            success: true,
            results: Some(processed_batches.clone()),
            error: None,
            batches_processed: processed_batches.len(),
            total_items,
            computation_time_ms: start_time.elapsed().as_millis(),
            processed_at: Utc::now().to_rfc3339(),
        })
    }).await?;

    match result {
        Ok(res) => {
            if res.success {
                info!("Batch processing completed: {} batches ({} items) in {}ms", 
                      res.batches_processed, res.total_items, res.computation_time_ms);
            } else {
                error!("Batch processing failed: {:?}", res.error);
            }
            Ok(res)
        }
        Err(e) => {
            error!("Batch processing error: {}", e);
            Ok(BatchProcessingResult {
                success: false,
                results: None,
                error: Some(e.to_string()),
                batches_processed: 0,
                total_items: 0,
                computation_time_ms: start_time.elapsed().as_millis(),
                processed_at: Utc::now().to_rfc3339(),
            })
        }
    }
}