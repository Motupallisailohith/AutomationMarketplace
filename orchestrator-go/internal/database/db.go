package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"automation-platform/orchestrator-go/internal/models"
	_ "github.com/lib/pq"
	"go.uber.org/zap"
)

type Database struct {
	db     *sql.DB
	logger *zap.Logger
}

func NewDatabase(logger *zap.Logger) (*Database, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		host := getEnvOrDefault("DB_HOST", "localhost")
		port := getEnvOrDefault("DB_PORT", "5432")
		user := getEnvOrDefault("DB_USER", "platform_user")
		password := getEnvOrDefault("DB_PASSWORD", "platform_password")
		dbname := getEnvOrDefault("DB_NAME", "automation_platform")
		sslmode := getEnvOrDefault("DB_SSL_MODE", "disable")

		dbURL = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			host, port, user, password, dbname, sslmode)
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(time.Hour)

	logger.Info("Successfully connected to database")

	return &Database{
		db:     db,
		logger: logger,
	}, nil
}

func (d *Database) Close() error {
	return d.db.Close()
}

// Workflow operations
func (d *Database) CreateWorkflow(workflow *models.Workflow) error {
	query := `
		INSERT INTO workflows (id, organization_id, name, description, definition, is_active, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	_, err := d.db.Exec(query,
		workflow.ID,
		workflow.OrganizationID,
		workflow.Name,
		workflow.Description,
		workflow.Definition,
		workflow.IsActive,
		workflow.CreatedBy,
		workflow.CreatedAt,
		workflow.UpdatedAt,
	)

	if err != nil {
		d.logger.Error("Failed to create workflow", zap.Error(err))
		return fmt.Errorf("failed to create workflow: %w", err)
	}

	d.logger.Info("Workflow created", zap.String("id", workflow.ID), zap.String("name", workflow.Name))
	return nil
}

func (d *Database) GetWorkflow(id string) (*models.Workflow, error) {
	query := `SELECT id, name, description, definition, is_active, created_by, created_at, updated_at FROM workflows WHERE id = $1`

	var workflow models.Workflow
	err := d.db.QueryRow(query, id).Scan(
		&workflow.ID,
		&workflow.Name,
		&workflow.Description,
		&workflow.Definition,
		&workflow.IsActive,
		&workflow.CreatedBy,
		&workflow.CreatedAt,
		&workflow.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Not found
		}
		d.logger.Error("Failed to get workflow", zap.Error(err))
		return nil, fmt.Errorf("failed to get workflow: %w", err)
	}

	return &workflow, nil
}

func (d *Database) GetWorkflows(userID string, limit int) ([]*models.Workflow, error) {
	query := `
		SELECT id, organization_id, name, description, definition, is_active, created_by, created_at, updated_at 
		FROM workflows 
		WHERE created_by = $1 
		ORDER BY created_at DESC 
		LIMIT $2`

	rows, err := d.db.Query(query, userID, limit)
	if err != nil {
		d.logger.Error("Failed to get workflows", zap.Error(err))
		return nil, fmt.Errorf("failed to get workflows: %w", err)
	}
	defer rows.Close()

	var workflows []*models.Workflow
	for rows.Next() {
		var workflow models.Workflow
		err := rows.Scan(
			&workflow.ID,
			&workflow.OrganizationID,
			&workflow.Name,
			&workflow.Description,
			&workflow.Definition,
			&workflow.IsActive,
			&workflow.CreatedBy,
			&workflow.CreatedAt,
			&workflow.UpdatedAt,
		)
		if err != nil {
			d.logger.Error("Failed to scan workflow", zap.Error(err))
			continue
		}
		workflows = append(workflows, &workflow)
	}

	return workflows, nil
}

func (d *Database) UpdateWorkflow(id string, updates *models.UpdateWorkflowRequest) error {
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if updates.Name != nil {
		setParts = append(setParts, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, *updates.Name)
		argIndex++
	}

	if updates.Description != nil {
		setParts = append(setParts, fmt.Sprintf("description = $%d", argIndex))
		args = append(args, updates.Description)
		argIndex++
	}

	if updates.Definition != nil {
		setParts = append(setParts, fmt.Sprintf("definition = $%d", argIndex))
		args = append(args, updates.Definition)
		argIndex++
	}

	if updates.IsActive != nil {
		setParts = append(setParts, fmt.Sprintf("is_active = $%d", argIndex))
		args = append(args, *updates.IsActive)
		argIndex++
	}

	if len(setParts) == 0 {
		return fmt.Errorf("no fields to update")
	}

	setParts = append(setParts, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())
	argIndex++

	args = append(args, id)
	query := fmt.Sprintf("UPDATE workflows SET %s WHERE id = $%d", 
		strings.Join(setParts, ", "), argIndex)

	result, err := d.db.Exec(query, args...)
	if err != nil {
		d.logger.Error("Failed to update workflow", zap.Error(err))
		return fmt.Errorf("failed to update workflow: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("workflow not found")
	}

	d.logger.Info("Workflow updated", zap.String("id", id))
	return nil
}

func (d *Database) DeleteWorkflow(id string) error {
	query := `DELETE FROM workflows WHERE id = $1`

	result, err := d.db.Exec(query, id)
	if err != nil {
		d.logger.Error("Failed to delete workflow", zap.Error(err))
		return fmt.Errorf("failed to delete workflow: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("workflow not found")
	}

	d.logger.Info("Workflow deleted", zap.String("id", id))
	return nil
}

// Execution operations
func (d *Database) CreateExecution(execution *models.WorkflowExecution) error {
	query := `
		INSERT INTO workflow_executions 
		(id, workflow_id, trigger_id, temporal_run_id, status, input_data, started_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`

	_, err := d.db.Exec(query,
		execution.ID,
		execution.WorkflowID,
		execution.TriggerID,
		execution.TemporalRunID,
		execution.Status,
		execution.InputData,
		execution.StartedAt,
	)

	if err != nil {
		d.logger.Error("Failed to create execution", zap.Error(err))
		return fmt.Errorf("failed to create execution: %w", err)
	}

	d.logger.Info("Execution created", zap.String("id", execution.ID))
	return nil
}

func (d *Database) UpdateExecution(id string, status string, outputData json.RawMessage, errorMessage *string) error {
	var query string
	var args []interface{}

	if status == "completed" || status == "failed" || status == "cancelled" {
		completedAt := time.Now()
		query = `
			UPDATE workflow_executions 
			SET status = $1, output_data = $2, error_message = $3, completed_at = $4 
			WHERE id = $5`
		args = []interface{}{status, outputData, errorMessage, completedAt, id}
	} else {
		query = `
			UPDATE workflow_executions 
			SET status = $1, output_data = $2, error_message = $3 
			WHERE id = $4`
		args = []interface{}{status, outputData, errorMessage, id}
	}

	result, err := d.db.Exec(query, args...)
	if err != nil {
		d.logger.Error("Failed to update execution", zap.Error(err))
		return fmt.Errorf("failed to update execution: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("execution not found")
	}

	d.logger.Info("Execution updated", zap.String("id", id), zap.String("status", status))
	return nil
}

func (d *Database) GetExecution(id string) (*models.WorkflowExecution, error) {
	query := `
		SELECT id, workflow_id, trigger_id, temporal_run_id, status, input_data, output_data, 
		       error_message, started_at, completed_at, duration_ms 
		FROM workflow_executions WHERE id = $1`

	var execution models.WorkflowExecution
	err := d.db.QueryRow(query, id).Scan(
		&execution.ID,
		&execution.WorkflowID,
		&execution.TriggerID,
		&execution.TemporalRunID,
		&execution.Status,
		&execution.InputData,
		&execution.OutputData,
		&execution.ErrorMessage,
		&execution.StartedAt,
		&execution.CompletedAt,
		&execution.DurationMS,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		d.logger.Error("Failed to get execution", zap.Error(err))
		return nil, fmt.Errorf("failed to get execution: %w", err)
	}

	return &execution, nil
}

func (d *Database) GetExecutions(workflowID *string, limit int) ([]*models.WorkflowExecution, error) {
	var query string
	var args []interface{}

	if workflowID != nil {
		query = `
			SELECT id, workflow_id, trigger_id, temporal_run_id, status, input_data, output_data, 
			       error_message, started_at, completed_at, duration_ms 
			FROM workflow_executions 
			WHERE workflow_id = $1 
			ORDER BY started_at DESC 
			LIMIT $2`
		args = []interface{}{*workflowID, limit}
	} else {
		query = `
			SELECT id, workflow_id, trigger_id, temporal_run_id, status, input_data, output_data, 
			       error_message, started_at, completed_at, duration_ms 
			FROM workflow_executions 
			ORDER BY started_at DESC 
			LIMIT $1`
		args = []interface{}{limit}
	}

	rows, err := d.db.Query(query, args...)
	if err != nil {
		d.logger.Error("Failed to get executions", zap.Error(err))
		return nil, fmt.Errorf("failed to get executions: %w", err)
	}
	defer rows.Close()

	var executions []*models.WorkflowExecution
	for rows.Next() {
		var execution models.WorkflowExecution
		err := rows.Scan(
			&execution.ID,
			&execution.WorkflowID,
			&execution.TriggerID,
			&execution.TemporalRunID,
			&execution.Status,
			&execution.InputData,
			&execution.OutputData,
			&execution.ErrorMessage,
			&execution.StartedAt,
			&execution.CompletedAt,
			&execution.DurationMS,
		)
		if err != nil {
			d.logger.Error("Failed to scan execution", zap.Error(err))
			continue
		}
		executions = append(executions, &execution)
	}

	return executions, nil
}

func (d *Database) UpdateExecutionStatus(id, status string, output map[string]interface{}) error {
	outputData, err := json.Marshal(output)
	if err != nil {
		return fmt.Errorf("failed to marshal output data: %w", err)
	}

	var completedAt *time.Time
	if status == "completed" || status == "failed" {
		now := time.Now()
		completedAt = &now
	}

	var query string
	var args []interface{}

	if completedAt != nil {
		query = `
			UPDATE workflow_executions 
			SET status = $1, output_data = $2, completed_at = $3 
			WHERE id = $4`
		args = []interface{}{status, outputData, completedAt, id}
	} else {
		query = `
			UPDATE workflow_executions 
			SET status = $1, output_data = $2 
			WHERE id = $3`
		args = []interface{}{status, outputData, id}
	}

	result, err := d.db.Exec(query, args...)
	if err != nil {
		d.logger.Error("Failed to update execution status", zap.Error(err))
		return fmt.Errorf("failed to update execution status: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("execution not found")
	}

	d.logger.Info("Execution status updated", zap.String("id", id), zap.String("status", status))
	return nil
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}