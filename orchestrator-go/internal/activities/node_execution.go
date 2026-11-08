package activities

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"go.temporal.io/sdk/activity"

	"automation-marketplace/orchestrator-go/internal/nodes"
)

// NodeExecutionActivity handles node execution through workers
type NodeExecutionActivity struct {
	executor *nodes.NodeExecutor
}

// NewNodeExecutionActivity creates a new node execution activity
func NewNodeExecutionActivity() *NodeExecutionActivity {
	return &NodeExecutionActivity{
		executor: nodes.NewNodeExecutor(),
	}
}

// ExecuteNode executes a single workflow node
// This is called from Temporal workflows
func (a *NodeExecutionActivity) ExecuteNode(ctx context.Context, req nodes.NodeExecutionRequest) (*nodes.NodeExecutionResult, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Executing node", "nodeName", req.NodeName)

	startTime := time.Now()

	// 1. Route to appropriate worker
	workerType, err := a.executor.RouteNode(ctx, req.NodeName)
	if err != nil {
		return nil, fmt.Errorf("failed to route node: %w", err)
	}

	logger.Info("Routed node to worker", "nodeName", req.NodeName, "worker", workerType)

	// 2. Execute based on worker type
	var result *nodes.NodeExecutionResult

	switch workerType {
	case nodes.WorkerTypeNodeJS:
		result, err = a.executeOnNodeJSWorker(ctx, req)
	case nodes.WorkerTypePython:
		result, err = a.executeOnPythonWorker(ctx, req)
	case nodes.WorkerTypeGo:
		result, err = a.executeOnGoWorker(ctx, req)
	case nodes.WorkerTypeRust:
		result, err = a.executeOnRustWorker(ctx, req)
	default:
		return nil, fmt.Errorf("unsupported worker type: %s", workerType)
	}

	if err != nil {
		logger.Error("Node execution failed", "error", err, "nodeName", req.NodeName)
		return &nodes.NodeExecutionResult{
			Success:       false,
			Error:         err.Error(),
			ExecutionTime: time.Since(startTime).Milliseconds(),
		}, nil
	}

	result.ExecutionTime = time.Since(startTime).Milliseconds()

	logger.Info("Node executed successfully",
		"nodeName", req.NodeName,
		"executionTime", result.ExecutionTime,
		"success", result.Success)

	return result, nil
}

// executeOnNodeJSWorker executes node on Node.js worker
func (a *NodeExecutionActivity) executeOnNodeJSWorker(ctx context.Context, req nodes.NodeExecutionRequest) (*nodes.NodeExecutionResult, error) {
	// This will call the Node.js worker via Temporal activity
	// For now, we'll use a direct call to the worker
	// TODO: Replace with actual Temporal worker-to-worker communication

	logger := activity.GetLogger(ctx)
	logger.Info("Executing on Node.js worker", "nodeName", req.NodeName)

	// Marshal request to JSON
	requestJSON, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// This is a placeholder - in production, this would call the actual Node.js worker
	// via Temporal's ExecuteActivity to the nodejs-worker queue
	logger.Info("Node.js worker request", "request", string(requestJSON))

	// For now, return a mock successful response
	// TODO: Replace with actual Temporal activity call to Node.js worker
	return &nodes.NodeExecutionResult{
		Success: true,
		Data: [][]nodes.NodeExecutionData{
			{
				{
					JSON: map[string]interface{}{
						"status":  "success",
						"message": fmt.Sprintf("Node %s executed successfully (mock)", req.NodeName),
					},
				},
			},
		},
	}, nil
}

// executeOnPythonWorker executes node on Python worker
func (a *NodeExecutionActivity) executeOnPythonWorker(ctx context.Context, req nodes.NodeExecutionRequest) (*nodes.NodeExecutionResult, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Executing on Python worker", "nodeName", req.NodeName)

	// TODO: Implement Python worker communication
	return &nodes.NodeExecutionResult{
		Success: true,
		Data: [][]nodes.NodeExecutionData{
			{
				{
					JSON: map[string]interface{}{
						"status":  "success",
						"message": fmt.Sprintf("Node %s executed on Python worker (mock)", req.NodeName),
					},
				},
			},
		},
	}, nil
}

// executeOnGoWorker executes node on Go worker
func (a *NodeExecutionActivity) executeOnGoWorker(ctx context.Context, req nodes.NodeExecutionRequest) (*nodes.NodeExecutionResult, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Executing on Go worker", "nodeName", req.NodeName)

	// TODO: Implement Go worker communication
	return &nodes.NodeExecutionResult{
		Success: true,
		Data: [][]nodes.NodeExecutionData{
			{
				{
					JSON: map[string]interface{}{
						"status":  "success",
						"message": fmt.Sprintf("Node %s executed on Go worker (mock)", req.NodeName),
					},
				},
			},
		},
	}, nil
}

// executeOnRustWorker executes node on Rust worker
func (a *NodeExecutionActivity) executeOnRustWorker(ctx context.Context, req nodes.NodeExecutionRequest) (*nodes.NodeExecutionResult, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Executing on Rust worker", "nodeName", req.NodeName)

	// TODO: Implement Rust worker communication
	return &nodes.NodeExecutionResult{
		Success: true,
		Data: [][]nodes.NodeExecutionData{
			{
				{
					JSON: map[string]interface{}{
						"status":  "success",
						"message": fmt.Sprintf("Node %s executed on Rust worker (mock)", req.NodeName),
					},
				},
			},
		},
	}, nil
}

// GetNodeMetadata retrieves node metadata
func (a *NodeExecutionActivity) GetNodeMetadata(ctx context.Context, nodeName string) (map[string]interface{}, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Getting node metadata", "nodeName", nodeName)

	return a.executor.GetNodeMetadata(ctx, nodeName)
}
