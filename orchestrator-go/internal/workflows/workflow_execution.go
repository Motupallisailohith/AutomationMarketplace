package workflows

import (
	"time"

	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"

	"automation-marketplace/orchestrator-go/internal/nodes"
)

// WorkflowDefinition represents a complete workflow definition
type WorkflowDefinition struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Nodes       []NodeDefinition       `json:"nodes"`
	Connections []ConnectionDefinition `json:"connections"`
	Settings    map[string]interface{} `json:"settings"`
}

// NodeDefinition represents a single node in the workflow
type NodeDefinition struct {
	ID         string                 `json:"id"`
	Type       string                 `json:"type"`
	Parameters map[string]interface{} `json:"parameters"`
	Position   map[string]interface{} `json:"position"`
}

// ConnectionDefinition represents a connection between nodes
type ConnectionDefinition struct {
	SourceNode   string `json:"sourceNode"`
	TargetNode   string `json:"targetNode"`
	SourceOutput string `json:"sourceOutput"`
	TargetInput  string `json:"targetInput"`
}

// WorkflowExecutionResult represents the result of a workflow execution
type WorkflowExecutionResult struct {
	Success       bool                                  `json:"success"`
	NodeResults   map[string]*nodes.NodeExecutionResult `json:"nodeResults"`
	Error         string                                `json:"error,omitempty"`
	ExecutionTime int64                                 `json:"executionTime"` // milliseconds
	StartedAt     time.Time                             `json:"startedAt"`
	CompletedAt   time.Time                             `json:"completedAt"`
}

// SimpleWorkflowExecution executes a simple linear workflow
// This is a basic implementation for testing
func SimpleWorkflowExecution(ctx workflow.Context, def WorkflowDefinition) (*WorkflowExecutionResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting workflow execution", "workflowID", def.ID)

	startTime := time.Now()

	// 1. Build the Graph (Ported n8n logic)
	// Note: engine package needs to be imported, assuming it's available
	// For this snippet, I will implement a simplified version of the graph use directly

	// Create adjacency maps for execution
	connectionsByTarget := make(map[string][]string)
	for _, conn := range def.Connections {
		connectionsByTarget[conn.TargetNode] = append(connectionsByTarget[conn.TargetNode], conn.SourceNode)
	}

	// Calculate topological order (Simplified representation of n8n's logic)
	var executionOrder []string
	visited := make(map[string]bool)
	var sort func(string)
	sort = func(id string) {
		if visited[id] {
			return
		}
		for _, source := range connectionsByTarget[id] {
			sort(source)
		}
		visited[id] = true
		executionOrder = append(executionOrder, id)
	}

	for _, node := range def.Nodes {
		sort(node.ID)
	}

	// 2. Setup Activity Options for Node Execution (Node.js Worker)
	nodeActivityOptions := workflow.ActivityOptions{
		TaskQueue:           "nodejs-worker-queue",
		StartToCloseTimeout: time.Minute * 10,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumAttempts:    5,
		},
	}
	// Create a context specifically for Node activities
	nodeCtx := workflow.WithActivityOptions(ctx, nodeActivityOptions)

	result := &WorkflowExecutionResult{
		Success:     true,
		NodeResults: make(map[string]*nodes.NodeExecutionResult),
		StartedAt:   startTime,
	}

	// 3. Track Node Data (n8n Data Flow logic)
	nodeOutputs := make(map[string][][]nodes.NodeExecutionData)

	// Build map for quick access
	nodeMap := make(map[string]NodeDefinition)
	for _, n := range def.Nodes {
		nodeMap[n.ID] = n
	}

	// 4. Run through the calculated execution order
	for _, nodeID := range executionOrder {
		node, ok := nodeMap[nodeID]
		if !ok {
			continue
		}

		logger.Info("Executing node in dependency order", "nodeID", node.ID, "type", node.Type)

		// Prepare Input Data (Ported from n8n input mapping)
		inputData := make([][]nodes.NodeExecutionData, 0)
		for _, sourceID := range connectionsByTarget[nodeID] {
			if out, exists := nodeOutputs[sourceID]; exists {
				inputData = append(inputData, out...)
			}
		}

		if len(inputData) == 0 {
			inputData = [][]nodes.NodeExecutionData{{}} // Default empty item
		}

		// Execute Node
		req := nodes.NodeExecutionRequest{
			NodeName:       node.Type,
			NodeParameters: node.Parameters,
			InputData:      inputData,
		}

		var nodeResult *nodes.NodeExecutionResult
		// Use nodeCtx which targets the Node.js worker
		err := workflow.ExecuteActivity(nodeCtx, "executeNodeActivity", req).Get(nodeCtx, &nodeResult)

		if err != nil {
			logger.Error("Step failed", "nodeID", node.ID, "error", err)
			result.Success = false
			result.Error = err.Error()
			result.CompletedAt = time.Now()
			return result, err
		}

		result.NodeResults[node.ID] = nodeResult
		if nodeResult.Success {
			nodeOutputs[node.ID] = nodeResult.Data
		} else {
			result.Success = false
			result.Error = nodeResult.Error
			break
		}
	}

	result.CompletedAt = time.Now()
	result.ExecutionTime = time.Since(startTime).Milliseconds()
	return result, nil
}
