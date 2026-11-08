package binary

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"path/filepath"
	"strings"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/google/uuid"
)

// BinaryData represents binary file data in the system
type BinaryData struct {
	ID            string  `json:"id"`
	MimeType      string  `json:"mimeType"`
	FileName      *string `json:"fileName,omitempty"`
	FileExtension *string `json:"fileExtension,omitempty"`
	FileSize      *int64  `json:"fileSize,omitempty"`
	Data          *string `json:"data,omitempty"`          // Base64 encoded for small files
	S3Key         *string `json:"s3Key,omitempty"`         // S3 key for large files
}

// BinaryDataConfig holds configuration for binary data storage
type BinaryDataConfig struct {
	Mode            string // "filesystem" or "s3"
	S3Endpoint      string
	S3AccessKey     string
	S3SecretKey     string
	S3Bucket        string
	S3Region        string
	MaxInMemorySize int64 // Max size in bytes before using S3 (default: 1MB)
}

// BinaryDataManager manages binary data storage
type BinaryDataManager struct {
	config   BinaryDataConfig
	s3Client *s3.S3
}

// NewBinaryDataManager creates a new binary data manager
func NewBinaryDataManager(config BinaryDataConfig) (*BinaryDataManager, error) {
	if config.MaxInMemorySize == 0 {
		config.MaxInMemorySize = 1024 * 1024 // 1MB default
	}

	manager := &BinaryDataManager{
		config: config,
	}

	if config.Mode == "s3" {
		if err := manager.initializeS3Client(); err != nil {
			return nil, fmt.Errorf("failed to initialize S3 client: %w", err)
		}
	}

	return manager, nil
}

func (m *BinaryDataManager) initializeS3Client() error {
	sess, err := session.NewSession(&aws.Config{
		Endpoint:         aws.String(m.config.S3Endpoint),
		Region:           aws.String(m.config.S3Region),
		Credentials:      credentials.NewStaticCredentials(m.config.S3AccessKey, m.config.S3SecretKey, ""),
		S3ForcePathStyle: aws.Bool(true), // Required for MinIO
	})
	if err != nil {
		return err
	}

	m.s3Client = s3.New(sess)
	return nil
}

// Store saves binary data - uses base64 for small files, S3 for large files
func (m *BinaryDataManager) Store(ctx context.Context, data []byte, fileName, mimeType string) (*BinaryData, error) {
	id := uuid.New().String()
	fileSize := int64(len(data))

	detectedMimeType := mimeType
	if detectedMimeType == "" {
		detectedMimeType = detectMimeType(fileName)
	}

	var fileExtension *string
	if fileName != "" {
		ext := filepath.Ext(fileName)
		if ext != "" {
			extValue := strings.TrimPrefix(ext, ".")
			fileExtension = &extValue
		}
	}

	binaryData := &BinaryData{
		ID:            id,
		MimeType:      detectedMimeType,
		FileSize:      &fileSize,
	}

	if fileName != "" {
		binaryData.FileName = &fileName
	}
	if fileExtension != nil {
		binaryData.FileExtension = fileExtension
	}

	// Small files: store as base64 in metadata
	if fileSize <= m.config.MaxInMemorySize {
		encoded := base64.StdEncoding.EncodeToString(data)
		binaryData.Data = &encoded
		return binaryData, nil
	}

	// Large files: store in S3/MinIO
	if m.config.Mode == "s3" && m.s3Client != nil {
		s3Key := fmt.Sprintf("binary-data/%s", id)
		if fileExtension != nil {
			s3Key = fmt.Sprintf("%s.%s", s3Key, *fileExtension)
		}

		_, err := m.s3Client.PutObjectWithContext(ctx, &s3.PutObjectInput{
			Bucket:      aws.String(m.config.S3Bucket),
			Key:         aws.String(s3Key),
			Body:        bytes.NewReader(data),
			ContentType: aws.String(detectedMimeType),
			Metadata: map[string]*string{
				"originalFileName": aws.String(fileName),
				"fileSize":         aws.String(fmt.Sprintf("%d", fileSize)),
			},
		})
		if err != nil {
			return nil, fmt.Errorf("failed to store in S3: %w", err)
		}

		binaryData.S3Key = &s3Key
		return binaryData, nil
	}

	// Fallback: base64 even for large files
	encoded := base64.StdEncoding.EncodeToString(data)
	binaryData.Data = &encoded
	return binaryData, nil
}

// Retrieve gets binary data from storage
func (m *BinaryDataManager) Retrieve(ctx context.Context, binaryData *BinaryData) ([]byte, error) {
	// If data is embedded as base64
	if binaryData.Data != nil {
		return base64.StdEncoding.DecodeString(*binaryData.Data)
	}

	// If data is in S3
	if binaryData.S3Key != nil && m.s3Client != nil {
		result, err := m.s3Client.GetObjectWithContext(ctx, &s3.GetObjectInput{
			Bucket: aws.String(m.config.S3Bucket),
			Key:    binaryData.S3Key,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to retrieve from S3: %w", err)
		}
		defer result.Body.Close()

		return io.ReadAll(result.Body)
	}

	return nil, fmt.Errorf("cannot retrieve binary data: %s", binaryData.ID)
}

// Delete removes binary data from storage
func (m *BinaryDataManager) Delete(ctx context.Context, binaryData *BinaryData) error {
	if binaryData.S3Key != nil && m.s3Client != nil {
		_, err := m.s3Client.DeleteObjectWithContext(ctx, &s3.DeleteObjectInput{
			Bucket: aws.String(m.config.S3Bucket),
			Key:    binaryData.S3Key,
		})
		if err != nil {
			return fmt.Errorf("failed to delete from S3: %w", err)
		}
	}
	// If data is embedded, no cleanup needed
	return nil
}

// ToBase64 returns binary data as base64 string
func (m *BinaryDataManager) ToBase64(ctx context.Context, binaryData *BinaryData) (string, error) {
	if binaryData.Data != nil {
		return *binaryData.Data, nil
	}

	data, err := m.Retrieve(ctx, binaryData)
	if err != nil {
		return "", err
	}

	return base64.StdEncoding.EncodeToString(data), nil
}

// FromBase64 creates binary data from base64 string
func (m *BinaryDataManager) FromBase64(ctx context.Context, base64Str, fileName, mimeType string) (*BinaryData, error) {
	data, err := base64.StdEncoding.DecodeString(base64Str)
	if err != nil {
		return nil, fmt.Errorf("invalid base64 data: %w", err)
	}

	return m.Store(ctx, data, fileName, mimeType)
}

func detectMimeType(fileName string) string {
	ext := strings.ToLower(filepath.Ext(fileName))
	mimeTypes := map[string]string{
		".json": "application/json",
		".xml":  "application/xml",
		".pdf":  "application/pdf",
		".zip":  "application/zip",
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".png":  "image/png",
		".gif":  "image/gif",
		".txt":  "text/plain",
		".html": "text/html",
		".csv":  "text/csv",
	}

	if mimeType, ok := mimeTypes[ext]; ok {
		return mimeType
	}
	return "application/octet-stream"
}
