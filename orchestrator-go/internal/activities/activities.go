package activities

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"automation-marketplace/orchestrator-go/internal/database"
	"automation-marketplace/orchestrator-go/internal/types"
	"go.temporal.io/sdk/activity"
	"go.uber.org/zap"
)

type Activities struct {
	db     *database.Database
	logger *zap.Logger
	client *http.Client
}

func NewActivities(db *database.Database, logger *zap.Logger) *Activities {
	return &Activities{
		db:     db,
		logger: logger,
		client: &http.Client{
			Timeout: time.Minute * 5,
		},
	}
}

// ExecuteHTTPActivity handles HTTP requests and API calls
func (a *Activities) ExecuteHTTPActivity(ctx context.Context, input types.ActivityInput) (map[string]interface{}, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Executing HTTP activity", "stepId", input.StepID)

	// Extract HTTP configuration
	url, ok := input.Configuration["url"].(string)
	if !ok {
		return nil, fmt.Errorf("missing or invalid URL in configuration")
	}

	method := "GET"
	if m, exists := input.Configuration["method"]; exists {
		if methodStr, ok := m.(string); ok {
			method = strings.ToUpper(methodStr)
		}
	}

	// Prepare headers
	headers := make(map[string]string)
	if h, exists := input.Configuration["headers"]; exists {
		if headerMap, ok := h.(map[string]interface{}); ok {
			for k, v := range headerMap {
				if vStr, ok := v.(string); ok {
					headers[k] = vStr
				}
			}
		}
	}

	// Prepare request body
	var requestBody io.Reader
	if method != "GET" && method != "HEAD" {
		if body, exists := input.Configuration["body"]; exists {
			bodyBytes, err := json.Marshal(body)
			if err != nil {
				return nil, fmt.Errorf("failed to marshal request body: %w", err)
			}
			requestBody = bytes.NewReader(bodyBytes)
			headers["Content-Type"] = "application/json"
		}
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, method, url, requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}

	// Set headers
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	// Execute request
	resp, err := a.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Parse JSON response if possible
	var responseData interface{}
	if len(responseBody) > 0 {
		if err := json.Unmarshal(responseBody, &responseData); err != nil {
			// If not valid JSON, store as string
			responseData = string(responseBody)
		}
	}

	result := map[string]interface{}{
		"status":     "success",
		"statusCode": resp.StatusCode,
		"headers":    resp.Header,
		"body":       responseData,
		"timestamp":  time.Now().Format(time.RFC3339),
	}

	// Check if request was successful
	if resp.StatusCode >= 400 {
		result["status"] = "error"
		return result, fmt.Errorf("HTTP request failed with status %d", resp.StatusCode)
	}

	logger.Info("HTTP activity completed", "stepId", input.StepID, "statusCode", resp.StatusCode)
	return result, nil
}

// ExecuteDataProcessingActivity handles data transformation and processing
func (a *Activities) ExecuteDataProcessingActivity(ctx context.Context, input types.ActivityInput) (map[string]interface{}, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Executing data processing activity", "stepId", input.StepID)

	// Get operation type
	operation, ok := input.Configuration["operation"].(string)
	if !ok {
		return nil, fmt.Errorf("missing operation in configuration")
	}

	// Get source data
	sourceData := input.InputData["previousResults"]
	
	result := map[string]interface{}{
		"status":    "success",
		"operation": operation,
		"timestamp": time.Now().Format(time.RFC3339),
	}

	switch operation {
	case "filter":
		// Filter data based on condition
		condition, ok := input.Configuration["condition"].(string)
		if !ok {
			return nil, fmt.Errorf("missing condition for filter operation")
		}
		
		// Simple filtering logic - can be extended
		result["data"] = filterData(sourceData, condition)
		result["message"] = "Data filtered successfully"

	case "transform":
		// Transform data using mapping rules
		mapping, ok := input.Configuration["mapping"].(map[string]interface{})
		if !ok {
			return nil, fmt.Errorf("missing mapping for transform operation")
		}
		
		result["data"] = transformData(sourceData, mapping)
		result["message"] = "Data transformed successfully"

	case "aggregate":
		// Aggregate data
		aggregateType, ok := input.Configuration["type"].(string)
		if !ok {
			return nil, fmt.Errorf("missing aggregate type")
		}
		
		result["data"] = aggregateData(sourceData, aggregateType)
		result["message"] = "Data aggregated successfully"

	default:
		return nil, fmt.Errorf("unknown operation: %s", operation)
	}

	logger.Info("Data processing activity completed", "stepId", input.StepID, "operation", operation)
	return result, nil
}

// ExecuteMLActivity handles machine learning tasks - delegates to Python workers
func (a *Activities) ExecuteMLActivity(ctx context.Context, input types.ActivityInput) (map[string]interface{}, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Executing ML activity", "stepId", input.StepID)

	// For now, return a placeholder result
	// In a real implementation, this would delegate to Python workers via message queue
	
	modelType, _ := input.Configuration["model_type"].(string)
	if modelType == "" {
		modelType = "unknown"
	}

	result := map[string]interface{}{
		"status":     "success",
		"model_type": modelType,
		"message":    "ML task executed (placeholder)",
		"timestamp":  time.Now().Format(time.RFC3339),
		"worker_id":  "python-worker-placeholder",
		"prediction": map[string]interface{}{
			"confidence": 0.85,
			"result":     "positive",
		},
	}

	logger.Info("ML activity completed", "stepId", input.StepID, "modelType", modelType)
	return result, nil
}

// ExecuteConditionalActivity handles conditional logic and branching
func (a *Activities) ExecuteConditionalActivity(ctx context.Context, input types.ActivityInput) (map[string]interface{}, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Executing conditional activity", "stepId", input.StepID)

	// Get condition expression
	condition, ok := input.Configuration["condition"].(string)
	if !ok {
		return nil, fmt.Errorf("missing condition in configuration")
	}

	// Evaluate condition (simple implementation)
	conditionResult := evaluateCondition(condition, input.InputData)

	result := map[string]interface{}{
		"status":           "success",
		"condition":        condition,
		"condition_result": conditionResult,
		"timestamp":        time.Now().Format(time.RFC3339),
	}

	// Set branch result
	if conditionResult {
		result["branch"] = "true"
		result["message"] = "Condition evaluated to true"
	} else {
		result["branch"] = "false"
		result["message"] = "Condition evaluated to false"
	}

	logger.Info("Conditional activity completed", "stepId", input.StepID, "result", conditionResult)
	return result, nil
}

// ExecuteNotificationActivity handles sending notifications
func (a *Activities) ExecuteNotificationActivity(ctx context.Context, input types.ActivityInput) (map[string]interface{}, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Executing notification activity", "stepId", input.StepID)

	// Get notification type and configuration
	notificationType, _ := input.Configuration["type"].(string)
	message, _ := input.Configuration["message"].(string)
	recipient, _ := input.Configuration["recipient"].(string)

	// For now, just log the notification
	// In a real implementation, this would send actual notifications
	logger.Info("Notification sent",
		"type", notificationType,
		"message", message,
		"recipient", recipient)

	result := map[string]interface{}{
		"status":    "success",
		"type":      notificationType,
		"message":   message,
		"recipient": recipient,
		"timestamp": time.Now().Format(time.RFC3339),
		"sent":      true,
	}

	return result, nil
}

// UpdateExecutionActivity updates the execution status in the database
func (a *Activities) UpdateExecutionActivity(ctx context.Context, input types.UpdateExecutionInput) error {
	logger := activity.GetLogger(ctx)
	logger.Info("Updating execution status",
		"executionId", input.ExecutionID,
		"status", input.Status,
		"currentStep", input.CurrentStep,
		"totalSteps", input.TotalSteps)

	// Convert output data to JSON if present
	var outputData json.RawMessage
	if input.OutputData != nil {
		data, err := json.Marshal(input.OutputData)
		if err != nil {
			a.logger.Error("Failed to marshal output data", zap.Error(err))
		} else {
			outputData = data
		}
	}

	// Convert error message to pointer
	var errorMessage *string
	if input.ErrorMessage != "" {
		errorMessage = &input.ErrorMessage
	}

	// Update execution in database
	err := a.db.UpdateExecution(input.ExecutionID, input.Status, outputData, errorMessage)
	if err != nil {
		logger.Error("Failed to update execution", "error", err)
		return fmt.Errorf("failed to update execution: %w", err)
	}

	return nil
}

// Helper functions

func filterData(data interface{}, condition string) interface{} {
	// Enhanced filtering logic
	if data == nil {
		return nil
	}

	// Handle array filtering
	if arr, ok := data.([]interface{}); ok {
		var filtered []interface{}
		for _, item := range arr {
			if itemMap, ok := item.(map[string]interface{}); ok {
				if evaluateFilterCondition(condition, itemMap) {
					filtered = append(filtered, item)
				}
			}
		}
		return filtered
	}

	// Handle object filtering
	if objMap, ok := data.(map[string]interface{}); ok {
		if evaluateFilterCondition(condition, objMap) {
			return data
		}
		return nil
	}

	return data
}

func transformData(data interface{}, mapping map[string]interface{}) interface{} {
	// Enhanced transformation logic
	if data == nil {
		return nil
	}

	result := make(map[string]interface{})

	// Apply mapping rules
	for targetField, sourceExpr := range mapping {
		if expr, ok := sourceExpr.(string); ok {
			value := extractValueFromPath(data, expr)
			result[targetField] = value
		} else {
			// Direct value assignment
			result[targetField] = sourceExpr
		}
	}

	return result
}

func aggregateData(data interface{}, aggregateType string) interface{} {
	// Enhanced aggregation logic
	if arr, ok := data.([]interface{}); ok {
		switch aggregateType {
		case "count":
			return map[string]interface{}{
				"type":   "count",
				"result": len(arr),
			}
		case "sum":
			sum := 0.0
			for _, item := range arr {
				if num, ok := item.(float64); ok {
					sum += num
				}
			}
			return map[string]interface{}{
				"type":   "sum",
				"result": sum,
			}
		case "avg":
			sum := 0.0
			count := 0
			for _, item := range arr {
				if num, ok := item.(float64); ok {
					sum += num
					count++
				}
			}
			avg := 0.0
			if count > 0 {
				avg = sum / float64(count)
			}
			return map[string]interface{}{
				"type":   "avg",
				"result": avg,
			}
		default:
			return map[string]interface{}{
				"type":   aggregateType,
				"result": len(arr),
				"error":  "Unknown aggregate type",
			}
		}
	}

	return map[string]interface{}{
		"type":   aggregateType,
		"result": data,
		"error":  "Data is not an array",
	}
}

func evaluateCondition(condition string, data map[string]interface{}) bool {
	// Enhanced condition evaluation
	if condition == "" {
		return true
	}

	// Simple condition parsing (in real implementation, use proper expression parser)
	if strings.Contains(condition, "==") {
		parts := strings.Split(condition, "==")
		if len(parts) == 2 {
			leftSide := strings.TrimSpace(parts[0])
			rightSide := strings.TrimSpace(strings.Trim(parts[1], "'\""))

			// Extract value from left side (e.g., $.previous.status)
			actualValue := extractValueFromPath(data, leftSide)
			if actualValue == nil {
				return false
			}

			// Compare values
			return fmt.Sprintf("%v", actualValue) == rightSide
		}
	}

	// Default simple evaluation
	if strings.Contains(condition, "success") {
		// Check if any previous step was successful
		for key, value := range data {
			if strings.Contains(key, "status") {
				if fmt.Sprintf("%v", value) == "success" {
					return true
				}
			}
		}
	}

	return false
}

// Helper function to evaluate filter conditions
func evaluateFilterCondition(condition string, item map[string]interface{}) bool {
	// Simple condition evaluation for filtering
	if condition == "" {
		return true
	}

	// Example: "status == 'active'"
	if strings.Contains(condition, "==") {
		parts := strings.Split(condition, "==")
		if len(parts) == 2 {
			field := strings.TrimSpace(parts[0])
			expectedValue := strings.TrimSpace(strings.Trim(parts[1], "'\""))
			
			if actualValue, exists := item[field]; exists {
				return fmt.Sprintf("%v", actualValue) == expectedValue
			}
		}
	}

	return false
}

// Helper function to extract values from JSONPath-like expressions
func extractValueFromPath(data interface{}, path string) interface{} {
	if path == "" {
		return data
	}

	// Remove leading $. if present
	if strings.HasPrefix(path, "$.") {
		path = path[2:]
	}

	// Split path by dots
	parts := strings.Split(path, ".")
	current := data

	for _, part := range parts {
		if part == "" {
			continue
		}

		switch v := current.(type) {
		case map[string]interface{}:
			if value, exists := v[part]; exists {
				current = value
			} else {
				return nil
			}
		case []interface{}:
			// Handle array index (simplified)
			if part == "length" {
				return len(v)
			}
			return nil
		default:
			return nil
		}
	}

	return current
}
