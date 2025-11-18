package workflows

import (
	"encoding/json"
	"fmt"
	"time"

	"automation-platform/orchestrator-go/internal/models"
	"automation-platform/orchestrator-go/internal/types"
	"go.temporal.io/sdk/temporal"
	"go.temporal.io/sdk/workflow"
)

// WorkflowOrchestrator is the main workflow that orchestrates step execution
func WorkflowOrchestrator(ctx workflow.Context, input types.WorkflowInput) (*types.WorkflowResult, error) {
	logger := workflow.GetLogger(ctx)
	logger.Info("Starting workflow execution", "workflowId", input.WorkflowID, "executionId", input.ExecutionID)

	// Parse workflow definition
	var definition models.WorkflowDefinition
	if err := json.Unmarshal(input.Definition, &definition); err != nil {
		logger.Error("Failed to parse workflow definition", "error", err)
		return nil, fmt.Errorf("failed to parse workflow definition: %w", err)
	}

	steps := definition.Steps
	totalSteps := len(steps)
	results := make(map[string]interface{})
	
	// Add trigger data to results
	results["trigger"] = map[string]interface{}{
		"type": input.TriggerType,
		"data": input.TriggerData,
		"triggerId": input.TriggerID,
	}

	// Update execution status to running
	updateCtx := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
		StartToCloseTimeout: time.Minute,
		RetryPolicy: &temporal.RetryPolicy{
			InitialInterval:    time.Second,
			BackoffCoefficient: 2.0,
			MaximumInterval:    time.Minute,
			MaximumAttempts:    3,
		},
	})

	err := workflow.ExecuteActivity(updateCtx, "UpdateExecutionActivity", types.UpdateExecutionInput{
		ExecutionID: input.ExecutionID,
		Status:      "running",
		CurrentStep: 0,
		TotalSteps:  totalSteps,
	}).Get(ctx, nil)
	if err != nil {
		logger.Warn("Failed to update execution status", "error", err)
	}

	// Execute each step
	for i, step := range steps {
		currentStep := i + 1
		
		logger.Info("Executing workflow step",
			"stepIndex", i,
			"stepId", step.ID,
			"stepName", step.Name,
			"stepType", step.Type)

		// Update execution progress
		err := workflow.ExecuteActivity(updateCtx, "UpdateExecutionActivity", types.UpdateExecutionInput{
			ExecutionID:     input.ExecutionID,
			Status:          "running",
			CurrentStep:     currentStep,
			TotalSteps:      totalSteps,
			CurrentStepName: step.Name,
		}).Get(ctx, nil)
		if err != nil {
			logger.Warn("Failed to update execution progress", "error", err)
		}

		// Resolve input data for this step
		stepInput := resolveStepInput(step, results)

		// Execute the step based on its type
		activityCtx := workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
			StartToCloseTimeout: time.Minute * 10,
			HeartbeatTimeout:    time.Minute * 2,
			RetryPolicy: &temporal.RetryPolicy{
				InitialInterval:    time.Second * 2,
				BackoffCoefficient: 2.0,
				MaximumInterval:    time.Minute * 5,
				MaximumAttempts:    3,
			},
		})

		var stepResult interface{}
		var activityErr error

		switch step.Type {
		case "http_request", "api_call":
			activityErr = workflow.ExecuteActivity(activityCtx, "ExecuteHTTPActivity", types.ActivityInput{
				StepID:        step.ID,
				StepType:      step.Type,
				Configuration: step.Configuration,
				InputData:     stepInput,
				ExecutionID:   input.ExecutionID,
			}).Get(ctx, &stepResult)

		case "data_processing", "transformation":
			activityErr = workflow.ExecuteActivity(activityCtx, "ExecuteDataProcessingActivity", types.ActivityInput{
				StepID:        step.ID,
				StepType:      step.Type,
				Configuration: step.Configuration,
				InputData:     stepInput,
				ExecutionID:   input.ExecutionID,
			}).Get(ctx, &stepResult)

		case "ml_inference":
			activityErr = workflow.ExecuteActivity(activityCtx, "ExecuteMLActivity", types.ActivityInput{
				StepID:        step.ID,
				StepType:      step.Type,
				Configuration: step.Configuration,
				InputData:     stepInput,
				ExecutionID:   input.ExecutionID,
			}).Get(ctx, &stepResult)

		case "conditional":
			activityErr = workflow.ExecuteActivity(activityCtx, "ExecuteConditionalActivity", types.ActivityInput{
				StepID:        step.ID,
				StepType:      step.Type,
				Configuration: step.Configuration,
				InputData:     stepInput,
				ExecutionID:   input.ExecutionID,
			}).Get(ctx, &stepResult)

		case "notification":
			activityErr = workflow.ExecuteActivity(activityCtx, "ExecuteNotificationActivity", types.ActivityInput{
				StepID:        step.ID,
				StepType:      step.Type,
				Configuration: step.Configuration,
				InputData:     stepInput,
				ExecutionID:   input.ExecutionID,
			}).Get(ctx, &stepResult)

		default:
			logger.Warn("Unknown step type, skipping", "stepType", step.Type)
			stepResult = map[string]interface{}{
				"status":    "skipped",
				"message":   fmt.Sprintf("Unknown step type: %s", step.Type),
				"timestamp": time.Now().Format(time.RFC3339),
			}
		}

		if activityErr != nil {
			logger.Error("Step execution failed",
				"stepId", step.ID,
				"stepType", step.Type,
				"error", activityErr)

			// Update execution as failed
			workflow.ExecuteActivity(updateCtx, "UpdateExecutionActivity", types.UpdateExecutionInput{
				ExecutionID:  input.ExecutionID,
				Status:       "failed",
				CurrentStep:  currentStep,
				TotalSteps:   totalSteps,
				ErrorMessage: activityErr.Error(),
			}).Get(ctx, nil)

			return &types.WorkflowResult{
				Status:      "failed",
				Error:       activityErr.Error(),
				Results:     results,
				ExecutionID: input.ExecutionID,
				WorkflowID:  input.WorkflowID,
				CompletedAt: time.Now().Format(time.RFC3339),
				TotalSteps:  totalSteps,
				ExecutedSteps: currentStep,
			}, activityErr
		}

		// Store result for future steps
		results[step.ID] = stepResult

		logger.Info("Workflow step completed",
			"stepId", step.ID,
			"stepType", step.Type)
	}

	// Update execution as completed
	err = workflow.ExecuteActivity(updateCtx, "UpdateExecutionActivity", types.UpdateExecutionInput{
		ExecutionID: input.ExecutionID,
		Status:      "completed",
		CurrentStep: totalSteps,
		TotalSteps:  totalSteps,
		OutputData:  results,
	}).Get(ctx, nil)
	if err != nil {
		logger.Warn("Failed to update execution as completed", "error", err)
	}

	logger.Info("Workflow execution completed",
		"workflowId", input.WorkflowID,
		"executionId", input.ExecutionID,
		"totalSteps", totalSteps)

	return &types.WorkflowResult{
		Status:        "completed",
		Results:       results,
		ExecutionID:   input.ExecutionID,
		WorkflowID:    input.WorkflowID,
		CompletedAt:   time.Now().Format(time.RFC3339),
		TotalSteps:    totalSteps,
		ExecutedSteps: totalSteps,
	}, nil
}

// resolveStepInput resolves input data for a step using previous results and input mapping
func resolveStepInput(step models.WorkflowStep, previousResults map[string]interface{}) map[string]interface{} {
	input := make(map[string]interface{})

	// Start with step configuration as base input
	for k, v := range step.Configuration {
		input[k] = v
	}

	// Apply input mapping if defined
	if step.InputMapping != nil {
		for outputKey, inputExpr := range step.InputMapping {
			if expr, ok := inputExpr.(string); ok {
				value := evaluateExpression(expr, previousResults)
				input[outputKey] = value
			}
		}
	}

	// Add all previous results for backward compatibility
	input["previousResults"] = previousResults

	return input
}

// evaluateExpression evaluates simple expressions like "$.stepId.field" or "$.trigger.data.value"
func evaluateExpression(expression string, context map[string]interface{}) interface{} {
	if len(expression) < 3 || expression[0] != '$' || expression[1] != '.' {
		return expression // Return as literal if not an expression
	}

	// Remove the "$." prefix
	path := expression[2:]
	
	// Split path by "."
	parts := []string{}
	current := ""
	for _, char := range path {
		if char == '.' {
			if current != "" {
				parts = append(parts, current)
				current = ""
			}
		} else {
			current += string(char)
		}
	}
	if current != "" {
		parts = append(parts, current)
	}

	// Navigate through the context
	var result interface{} = context
	for _, part := range parts {
		if m, ok := result.(map[string]interface{}); ok {
			result = m[part]
		} else {
			return nil // Path not found
		}
	}

	return result
}