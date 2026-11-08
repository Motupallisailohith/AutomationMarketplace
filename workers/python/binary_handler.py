"""
Binary Data Manager for Python Workers
Handles file storage using MinIO (S3-compatible)
"""

import base64
import os
from dataclasses import dataclass
from typing import Optional
import uuid
import mimetypes

import boto3
from botocore.client import Config


@dataclass
class BinaryData:
    """Represents binary file data"""
    id: str
    mime_type: str
    file_name: Optional[str] = None
    file_extension: Optional[str] = None
    file_size: Optional[int] = None
    data: Optional[str] = None  # Base64 encoded for small files
    s3_key: Optional[str] = None  # S3 key for large files


class BinaryDataManager:
    """Manages binary data storage with MinIO/S3"""

    def __init__(
        self,
        mode: str = "s3",
        s3_endpoint: Optional[str] = None,
        s3_access_key: Optional[str] = None,
        s3_secret_key: Optional[str] = None,
        s3_bucket: Optional[str] = None,
        s3_region: str = "us-east-1",
        max_in_memory_size: int = 1024 * 1024  # 1MB default
    ):
        self.mode = mode
        self.s3_endpoint = s3_endpoint or os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
        self.s3_access_key = s3_access_key or os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        self.s3_secret_key = s3_secret_key or os.getenv("MINIO_SECRET_KEY", "minioadmin")
        self.s3_bucket = s3_bucket or os.getenv("MINIO_BUCKET", "n8n-binary-data")
        self.s3_region = s3_region
        self.max_in_memory_size = max_in_memory_size
        self.s3_client = None

        if mode == "s3":
            self._initialize_s3_client()

    def _initialize_s3_client(self):
        """Initialize S3/MinIO client"""
        self.s3_client = boto3.client(
            's3',
            endpoint_url=self.s3_endpoint,
            aws_access_key_id=self.s3_access_key,
            aws_secret_access_key=self.s3_secret_key,
            region_name=self.s3_region,
            config=Config(signature_version='s3v4')
        )

    def store(self, data: bytes, file_name: Optional[str] = None, mime_type: Optional[str] = None) -> BinaryData:
        """Store binary data - uses base64 for small files, S3 for large files"""
        binary_id = str(uuid.uuid4())
        file_size = len(data)

        # Detect mime type
        detected_mime_type = mime_type
        if not detected_mime_type and file_name:
            detected_mime_type, _ = mimetypes.guess_type(file_name)
        if not detected_mime_type:
            detected_mime_type = "application/octet-stream"

        # Extract file extension
        file_extension = None
        if file_name and '.' in file_name:
            file_extension = file_name.rsplit('.', 1)[1]

        binary_data = BinaryData(
            id=binary_id,
            mime_type=detected_mime_type,
            file_name=file_name,
            file_extension=file_extension,
            file_size=file_size
        )

        # Small files: store as base64
        if file_size <= self.max_in_memory_size:
            binary_data.data = base64.b64encode(data).decode('utf-8')
            return binary_data

        # Large files: store in S3/MinIO
        if self.mode == "s3" and self.s3_client:
            s3_key = f"binary-data/{binary_id}"
            if file_extension:
                s3_key = f"{s3_key}.{file_extension}"

            self.s3_client.put_object(
                Bucket=self.s3_bucket,
                Key=s3_key,
                Body=data,
                ContentType=detected_mime_type,
                Metadata={
                    'originalFileName': file_name or '',
                    'fileSize': str(file_size)
                }
            )

            binary_data.s3_key = s3_key
            return binary_data

        # Fallback: base64 even for large files
        binary_data.data = base64.b64encode(data).decode('utf-8')
        return binary_data

    def retrieve(self, binary_data: BinaryData) -> bytes:
        """Retrieve binary data from storage"""
        # If data is embedded as base64
        if binary_data.data:
            return base64.b64decode(binary_data.data)

        # If data is in S3
        if binary_data.s3_key and self.s3_client:
            response = self.s3_client.get_object(
                Bucket=self.s3_bucket,
                Key=binary_data.s3_key
            )
            return response['Body'].read()

        raise ValueError(f"Cannot retrieve binary data: {binary_data.id}")

    def delete(self, binary_data: BinaryData) -> None:
        """Delete binary data from storage"""
        if binary_data.s3_key and self.s3_client:
            self.s3_client.delete_object(
                Bucket=self.s3_bucket,
                Key=binary_data.s3_key
            )
        # If data is embedded, no cleanup needed

    def to_base64(self, binary_data: BinaryData) -> str:
        """Get binary data as base64 string"""
        if binary_data.data:
            return binary_data.data

        data = self.retrieve(binary_data)
        return base64.b64encode(data).decode('utf-8')

    def from_base64(self, base64_str: str, file_name: Optional[str] = None, mime_type: Optional[str] = None) -> BinaryData:
        """Create binary data from base64 string"""
        data = base64.b64decode(base64_str)
        return self.store(data, file_name, mime_type)
