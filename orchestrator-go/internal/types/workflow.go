package types

import (
	"encoding/json"
)

// Workflow input and output types
type WorkflowInput struct {
	WorkflowID   string          `json:"workflow_id"`
	ExecutionID  string          `json:"execution_id"`
	TriggerData  json.RawMessage `json:"trigger_data"`
	Definition   json.RawMessage `json:"definition"`
	TriggerID    *string         `json:"trigger_id,omitempty"`
	TriggerType  string          `json:"trigger_type"`
}

type WorkflowResult struct {
	Status        string                 `json:"status"`
	Results       map[string]interface{} `json:"results"`
	ExecutionID   string                 `json:"execution_id"`
	WorkflowID    string                 `json:"workflow_id"`
	CompletedAt   string                 `json:"completed_at"`
	TotalSteps    int                    `json:"total_steps"`
	ExecutedSteps int                    `json:"executed_steps"`
	Error         string                 `json:"error,omitempty"`
}

// Activity input types
type ActivityInput struct {
	StepID        string                 `json:"step_id"`
	StepType      string                 `json:"step_type"`
	Configuration map[string]interface{} `json:"configuration"`
	InputData     map[string]interface{} `json:"input_data"`
	ExecutionID   string                 `json:"execution_id"`
}

type UpdateExecutionInput struct {
	ExecutionID     string      `json:"execution_id"`
	Status          string      `json:"status"`
	CurrentStep     int         `json:"current_step"`
	TotalSteps      int         `json:"total_steps"`
	CurrentStepName string      `json:"current_step_name"`
	OutputData      interface{} `json:"output_data,omitempty"`
	ErrorMessage    string      `json:"error_message,omitempty"`
}

// ExecuteNode activity input (for Node.js worker)
type ExecuteNodeInput struct {
	NodeType    string                 `json:"nodeType"`
	NodeVersion int                    `json:"nodeVersion"`
	Parameters  map[string]interface{} `json:"parameters"`
	InputData   [][]map[string]interface{} `json:"inputData"`
	Credentials map[string]string      `json:"credentials,omitempty"`
	ExecutionID string                 `json:"executionId"`
	WorkflowID  string                 `json:"workflowId"`
	NodeID      string                 `json:"nodeId"`
}

// ExecuteNode activity output
type ExecuteNodeOutput struct {
	Success       bool                       `json:"success"`
	Data          [][]map[string]interface{} `json:"data"`
	Error         string                     `json:"error,omitempty"`
	ExecutionTime int                        `json:"executionTime,omitempty"`
}
