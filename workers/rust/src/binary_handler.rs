use base64::{Engine as _, engine::general_purpose};
use s3::bucket::Bucket;
use s3::creds::Credentials;
use s3::region::Region;
use serde::{Deserialize, Serialize};
use std::error::Error;
use uuid::Uuid;

/// Represents binary file data in the system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BinaryData {
    pub id: String,
    pub mime_type: String,
    pub file_name: Option<String>,
    pub file_extension: Option<String>,
    pub file_size: Option<usize>,
    pub data: Option<String>,   // Base64 encoded for small files
    pub s3_key: Option<String>, // S3 key for large files
}

/// Configuration for binary data storage
pub struct BinaryDataConfig {
    pub mode: String,             // "filesystem" or "s3"
    pub s3_endpoint: String,
    pub s3_access_key: String,
    pub s3_secret_key: String,
    pub s3_bucket: String,
    pub s3_region: String,
    pub max_in_memory_size: usize, // Max size in bytes before using S3
}

impl Default for BinaryDataConfig {
    fn default() -> Self {
        Self {
            mode: std::env::var("BINARY_DATA_MODE").unwrap_or_else(|_| "s3".to_string()),
            s3_endpoint: std::env::var("MINIO_ENDPOINT")
                .unwrap_or_else(|_| "http://localhost:9000".to_string()),
            s3_access_key: std::env::var("MINIO_ACCESS_KEY")
                .unwrap_or_else(|_| "minioadmin".to_string()),
            s3_secret_key: std::env::var("MINIO_SECRET_KEY")
                .unwrap_or_else(|_| "minioadmin".to_string()),
            s3_bucket: std::env::var("MINIO_BUCKET")
                .unwrap_or_else(|_| "n8n-binary-data".to_string()),
            s3_region: std::env::var("MINIO_REGION")
                .unwrap_or_else(|_| "us-east-1".to_string()),
            max_in_memory_size: 1024 * 1024, // 1MB default
        }
    }
}

/// Manages binary data storage with MinIO/S3
pub struct BinaryDataManager {
    config: BinaryDataConfig,
    s3_bucket: Option<Bucket>,
}

impl BinaryDataManager {
    /// Create a new binary data manager
    pub fn new(config: BinaryDataConfig) -> Result<Self, Box<dyn Error>> {
        let mut manager = Self {
            config,
            s3_bucket: None,
        };

        if manager.config.mode == "s3" {
            manager.initialize_s3_client()?;
        }

        Ok(manager)
    }

    fn initialize_s3_client(&mut self) -> Result<(), Box<dyn Error>> {
        let region = Region::Custom {
            region: self.config.s3_region.clone(),
            endpoint: self.config.s3_endpoint.clone(),
        };

        let credentials = Credentials::new(
            Some(&self.config.s3_access_key),
            Some(&self.config.s3_secret_key),
            None,
            None,
            None,
        )?;

        let bucket = Bucket::new(&self.config.s3_bucket, region, credentials)?
            .with_path_style();

        self.s3_bucket = Some(bucket);
        Ok(())
    }

    /// Store binary data - uses base64 for small files, S3 for large files
    pub async fn store(
        &self,
        data: &[u8],
        file_name: Option<&str>,
        mime_type: Option<&str>,
    ) -> Result<BinaryData, Box<dyn Error>> {
        let id = Uuid::new_v4().to_string();
        let file_size = data.len();

        let detected_mime_type = mime_type
            .map(String::from)
            .or_else(|| file_name.and_then(detect_mime_type))
            .unwrap_or_else(|| "application/octet-stream".to_string());

        let file_extension = file_name.and_then(|name| {
            name.rsplit('.')
                .next()
                .filter(|ext| !ext.is_empty())
                .map(String::from)
        });

        let mut binary_data = BinaryData {
            id: id.clone(),
            mime_type: detected_mime_type.clone(),
            file_name: file_name.map(String::from),
            file_extension: file_extension.clone(),
            file_size: Some(file_size),
            data: None,
            s3_key: None,
        };

        // Small files: store as base64
        if file_size <= self.config.max_in_memory_size {
            binary_data.data = Some(general_purpose::STANDARD.encode(data));
            return Ok(binary_data);
        }

        // Large files: store in S3/MinIO
        if self.config.mode == "s3" {
            if let Some(bucket) = &self.s3_bucket {
                let s3_key = if let Some(ext) = &file_extension {
                    format!("binary-data/{}.{}", id, ext)
                } else {
                    format!("binary-data/{}", id)
                };

                bucket.put_object(&s3_key, data).await?;

                binary_data.s3_key = Some(s3_key);
                return Ok(binary_data);
            }
        }

        // Fallback: base64 even for large files
        binary_data.data = Some(general_purpose::STANDARD.encode(data));
        Ok(binary_data)
    }

    /// Retrieve binary data from storage
    pub async fn retrieve(&self, binary_data: &BinaryData) -> Result<Vec<u8>, Box<dyn Error>> {
        // If data is embedded as base64
        if let Some(data) = &binary_data.data {
            return Ok(general_purpose::STANDARD.decode(data)?);
        }

        // If data is in S3
        if let Some(s3_key) = &binary_data.s3_key {
            if let Some(bucket) = &self.s3_bucket {
                let response = bucket.get_object(s3_key).await?;
                return Ok(response.bytes().to_vec());
            }
        }

        Err(format!("Cannot retrieve binary data: {}", binary_data.id).into())
    }

    /// Delete binary data from storage
    pub async fn delete(&self, binary_data: &BinaryData) -> Result<(), Box<dyn Error>> {
        if let Some(s3_key) = &binary_data.s3_key {
            if let Some(bucket) = &self.s3_bucket {
                bucket.delete_object(s3_key).await?;
            }
        }
        // If data is embedded, no cleanup needed
        Ok(())
    }

    /// Get binary data as base64 string
    pub async fn to_base64(&self, binary_data: &BinaryData) -> Result<String, Box<dyn Error>> {
        if let Some(data) = &binary_data.data {
            return Ok(data.clone());
        }

        let data = self.retrieve(binary_data).await?;
        Ok(general_purpose::STANDARD.encode(&data))
    }

    /// Create binary data from base64 string
    pub async fn from_base64(
        &self,
        base64_str: &str,
        file_name: Option<&str>,
        mime_type: Option<&str>,
    ) -> Result<BinaryData, Box<dyn Error>> {
        let data = general_purpose::STANDARD.decode(base64_str)?;
        self.store(&data, file_name, mime_type).await
    }
}

fn detect_mime_type(file_name: &str) -> Option<String> {
    let ext = file_name.rsplit('.').next()?;
    let mime_type = match ext.to_lowercase().as_str() {
        "json" => "application/json",
        "xml" => "application/xml",
        "pdf" => "application/pdf",
        "zip" => "application/zip",
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "txt" => "text/plain",
        "html" => "text/html",
        "csv" => "text/csv",
        _ => return None,
    };
    Some(mime_type.to_string())
}
