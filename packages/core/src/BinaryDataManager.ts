/**
 * Binary Data Manager for AutomationMarketplace
 * Handles file storage using MinIO (S3-compatible)
 * Integrates with Go orchestrator and multi-language workers
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { lookup as mimeLookup } from 'mime-types';
import { Readable } from 'stream';

export interface IBinaryData {
  id: string;
  mimeType: string;
  fileName?: string;
  fileExtension?: string;
  fileSize?: number;
  data?: string; // Base64 encoded data for small files
  s3Key?: string; // S3 object key for large files
}

export interface IBinaryDataConfig {
  mode: 'filesystem' | 's3';
  s3Endpoint?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Bucket?: string;
  s3Region?: string;
  maxInMemorySize?: number; // Max size in bytes before using S3 (default: 1MB)
}

export class BinaryDataManager {
  private static instance: BinaryDataManager;
  private s3Client?: S3Client;
  private config: IBinaryDataConfig;

  private constructor(config: IBinaryDataConfig) {
    this.config = {
      maxInMemorySize: 1024 * 1024, // 1MB default
      ...config,
    };

    if (config.mode === 's3') {
      this.initializeS3Client();
    }
  }

  public static getInstance(config?: IBinaryDataConfig): BinaryDataManager {
    if (!BinaryDataManager.instance) {
      if (!config) {
        // Default configuration from environment
        config = {
          mode: process.env.BINARY_DATA_MODE as 'filesystem' | 's3' || 's3',
          s3Endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
          s3AccessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
          s3SecretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
          s3Bucket: process.env.MINIO_BUCKET || 'n8n-binary-data',
          s3Region: process.env.MINIO_REGION || 'us-east-1',
        };
      }
      BinaryDataManager.instance = new BinaryDataManager(config);
    }
    return BinaryDataManager.instance;
  }

  private initializeS3Client(): void {
    this.s3Client = new S3Client({
      endpoint: this.config.s3Endpoint,
      region: this.config.s3Region,
      credentials: {
        accessKeyId: this.config.s3AccessKey!,
        secretAccessKey: this.config.s3SecretKey!,
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  /**
   * Store binary data - uses base64 for small files, S3 for large files
   */
  async store(data: Buffer, fileName?: string, mimeType?: string): Promise<IBinaryData> {
    const id = uuidv4();
    const fileSize = data.length;
    const detectedMimeType = mimeType || (fileName ? mimeLookup(fileName) || 'application/octet-stream' : 'application/octet-stream');
    const fileExtension = fileName ? fileName.split('.').pop() : undefined;

    const binaryData: IBinaryData = {
      id,
      mimeType: detectedMimeType,
      fileName,
      fileExtension,
      fileSize,
    };

    // Small files: store as base64 in metadata
    if (fileSize <= this.config.maxInMemorySize!) {
      binaryData.data = data.toString('base64');
      return binaryData;
    }

    // Large files: store in S3/MinIO
    if (this.config.mode === 's3' && this.s3Client) {
      const s3Key = `binary-data/${id}${fileExtension ? `.${fileExtension}` : ''}`;
      
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: s3Key,
        Body: data,
        ContentType: detectedMimeType,
        Metadata: {
          originalFileName: fileName || '',
          fileSize: fileSize.toString(),
        },
      }));

      binaryData.s3Key = s3Key;
      return binaryData;
    }

    // Fallback: base64 even for large files
    binaryData.data = data.toString('base64');
    return binaryData;
  }

  /**
   * Retrieve binary data from storage
   */
  async retrieve(binaryData: IBinaryData): Promise<Buffer> {
    // If data is embedded as base64
    if (binaryData.data) {
      return Buffer.from(binaryData.data, 'base64');
    }

    // If data is in S3
    if (binaryData.s3Key && this.s3Client) {
      const response = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: binaryData.s3Key,
      }));

      if (response.Body instanceof Readable) {
        return await this.streamToBuffer(response.Body);
      }
    }

    throw new Error(`Cannot retrieve binary data: ${binaryData.id}`);
  }

  /**
   * Delete binary data from storage
   */
  async delete(binaryData: IBinaryData): Promise<void> {
    if (binaryData.s3Key && this.s3Client) {
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: binaryData.s3Key,
      }));
    }
    // If data is embedded, no cleanup needed
  }

  /**
   * Get binary data as base64 string (for API responses)
   */
  async toBase64(binaryData: IBinaryData): Promise<string> {
    if (binaryData.data) {
      return binaryData.data;
    }

    const buffer = await this.retrieve(binaryData);
    return buffer.toString('base64');
  }

  /**
   * Create binary data from base64 string
   */
  async fromBase64(base64: string, fileName?: string, mimeType?: string): Promise<IBinaryData> {
    const buffer = Buffer.from(base64, 'base64');
    return this.store(buffer, fileName, mimeType);
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
