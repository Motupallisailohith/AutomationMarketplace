package nodes

import (
	"context"
	"encoding/json"
	"fmt"
)

// NodeExecutionRequest represents a request to execute a node
type NodeExecutionRequest struct {
	NodeName       string                 `json:"nodeName"`
	NodeParameters map[string]interface{} `json:"nodeParameters"`
	InputData      [][]NodeExecutionData  `json:"inputData"`
	Credentials    map[string]interface{} `json:"credentials,omitempty"`
}

// NodeExecutionData represents input/output data for a node
type NodeExecutionData struct {
	JSON     map[string]interface{} `json:"json"`
	Binary   interface{}            `json:"binary,omitempty"`
	Metadata interface{}            `json:"metadata,omitempty"`
}

// NodeExecutionResult represents the result of a node execution
type NodeExecutionResult struct {
	Success       bool                  `json:"success"`
	Data          [][]NodeExecutionData `json:"data,omitempty"`
	Error         string                `json:"error,omitempty"`
	ExecutionTime int64                 `json:"executionTime"` // in milliseconds
}

// WorkerType determines which worker pool should execute the node
type WorkerType string

const (
	WorkerTypeNodeJS WorkerType = "nodejs"
	WorkerTypePython WorkerType = "python"
	WorkerTypeGo     WorkerType = "go"
	WorkerTypeRust   WorkerType = "rust"
)

// NodeRouter determines which worker should execute a given node
type NodeRouter struct{}

// RouteNode determines the appropriate worker for a given node type
func (r *NodeRouter) RouteNode(ctx context.Context, nodeName string) (WorkerType, error) {
	// Routing logic based on node type
	switch {
	// Communication nodes → Node.js
	case contains(nodeName, []string{"slack", "discord", "teams", "email", "http"}):
		return WorkerTypeNodeJS, nil

	// Database nodes → Go
	case contains(nodeName, []string{"postgres", "mysql", "mongodb", "redis"}):
		return WorkerTypeGo, nil

	// AI/ML nodes → Python
	case contains(nodeName, []string{"openai", "anthropic", "huggingface", "langchain"}):
		return WorkerTypePython, nil

	// Binary/Performance → Rust
	case contains(nodeName, []string{"image", "video", "binary", "crypto"}):
		return WorkerTypeRust, nil

	// Default to Node.js
	default:
		return WorkerTypeNodeJS, nil
	}
}

// NodeExecutor handles node execution through different workers
type NodeExecutor struct {
	router *NodeRouter
}

// NewNodeExecutor creates a new node executor
func NewNodeExecutor() *NodeExecutor {
	return &NodeExecutor{
		router: &NodeRouter{},
	}
}

// Execute performs the node execution
// This is called from Temporal workflows/activities
func (e *NodeExecutor) Execute(ctx context.Context, req NodeExecutionRequest) (*NodeExecutionResult, error) {
	// 1. Determine which worker should handle this
	workerType, err := e.router.RouteNode(ctx, req.NodeName)
	if err != nil {
		return nil, fmt.Errorf("failed to route node: %w", err)
	}

	fmt.Printf("▶️  Routing node '%s' to %s worker\n", req.NodeName, workerType)

	// 2. This is where we'll integrate with Temporal activities
	// For now, return a placeholder
	// TODO: Call appropriate worker via Temporal activity

	result := &NodeExecutionResult{
		Success:       true,
		ExecutionTime: 0,
	}

	return result, nil
}

// GetNodeMetadata retrieves metadata about a node
func (e *NodeExecutor) GetNodeMetadata(ctx context.Context, nodeName string) (map[string]interface{}, error) {
	// TODO: Call Node.js worker to get metadata from registry
	return map[string]interface{}{
		"name":   nodeName,
		"status": "available",
	}, nil
}

// RouteNode determines which worker should handle a given node
func (e *NodeExecutor) RouteNode(ctx context.Context, nodeName string) (WorkerType, error) {
	return e.router.RouteNode(ctx, nodeName)
}

// Helper functions

func contains(str string, substrs []string) bool {
	for _, substr := range substrs {
		if len(str) >= len(substr) {
			// Case-insensitive contains check
			if containsIgnoreCase(str, substr) {
				return true
			}
		}
	}
	return false
}

func containsIgnoreCase(s, substr string) bool {
	sLower := toLower(s)
	substrLower := toLower(substr)
	for i := 0; i <= len(sLower)-len(substrLower); i++ {
		if sLower[i:i+len(substrLower)] == substrLower {
			return true
		}
	}
	return false
}

func toLower(s string) string {
	result := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if 'A' <= c && c <= 'Z' {
			c += 'a' - 'A'
		}
		result[i] = c
	}
	return string(result)
}

// JSON helpers

func toJSON(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func fromJSON(data string, v interface{}) error {
	return json.Unmarshal([]byte(data), v)
}
