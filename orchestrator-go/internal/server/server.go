package server

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"time"

	"automation-platform/orchestrator-go/internal/database"
	"automation-platform/orchestrator-go/internal/kafka"
	"automation-platform/orchestrator-go/internal/models"
	"automation-platform/orchestrator-go/internal/types"
	"automation-platform/orchestrator-go/internal/workflows"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.temporal.io/sdk/client"
	"go.uber.org/zap"
)

type Server struct {
	router         *gin.Engine
	db            *database.Database
	temporalClient client.Client
	kafkaProducer *kafka.Producer
	logger        *zap.Logger
	port          string
}

func NewServer(db *database.Database, temporalClient client.Client, kafkaProducer *kafka.Producer, logger *zap.Logger) *Server {
	// Set Gin to production mode
	gin.SetMode(gin.ReleaseMode)
	
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(corsMiddleware())
	router.Use(loggerMiddleware(logger))

	port := "8080"
	if envPort := getEnvOrDefault("PORT", ""); envPort != "" {
		port = envPort
	}

	server := &Server{
		router:         router,
		db:            db,
		temporalClient: temporalClient,
		kafkaProducer: kafkaProducer,
		logger:        logger,
		port:          port,
	}

	server.setupRoutes()
	return server
}

func (s *Server) setupRoutes() {
	api := s.router.Group("/api/v1")
	
	// Health check
	api.GET("/health", s.healthCheck)
	
	// Workflow routes
	workflows := api.Group("/workflows")
	{
		workflows.GET("", s.getWorkflows)
		workflows.POST("", s.createWorkflow)
		workflows.GET("/:id", s.getWorkflow)
		workflows.PUT("/:id", s.updateWorkflow)
		workflows.DELETE("/:id", s.deleteWorkflow)
		workflows.POST("/:id/execute", s.executeWorkflow)
	}
	
	// Execution routes
	executions := api.Group("/executions")
	{
		executions.GET("", s.getExecutions)
		executions.GET("/:id", s.getExecution)
		executions.POST("/:id/cancel", s.cancelExecution)
		executions.POST("/:id/terminate", s.terminateExecution)
		executions.GET("/:id/status", s.getExecutionStatus)
	}
	
	// Workflow management routes
	workflows.GET("/:id/executions", s.getWorkflowExecutions)
}

func (s *Server) Start() error {
	s.logger.Info("Starting HTTP server", zap.String("port", s.port))
	return s.router.Run(":" + s.port)
}

// Health check endpoint
func (s *Server) healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "orchestrator-go",
		"timestamp": time.Now().Format(time.RFC3339),
		"version":   "1.0.0",
	})
}

// Workflow handlers

func (s *Server) getWorkflows(c *gin.Context) {
	// For now, get all workflows - in production, filter by user
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		// Use a fixed UUID for system user in development
		userID = "00000000-0000-0000-0000-000000000000"
	}

	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 50
	}

	workflows, err := s.db.GetWorkflows(userID, limit)
	if err != nil {
		s.logger.Error("Failed to get workflows", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get workflows"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    workflows,
	})
}

func (s *Server) createWorkflow(c *gin.Context) {
	var req models.CreateWorkflowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		userID = "00000000-0000-0000-0000-000000000000" // Default system user UUID
	}

	workflow := &models.Workflow{
		ID:             uuid.New().String(),
		OrganizationID: "00000000-0000-0000-0000-000000000001", // Default org for development
		Name:           req.Name,
		Description:    req.Description,
		Definition:     req.Definition,
		IsActive:       true,
		CreatedBy:      userID,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	err := s.db.CreateWorkflow(workflow)
	if err != nil {
		s.logger.Error("Failed to create workflow", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create workflow"})
		return
	}

	// Send Kafka event for workflow creation
	if s.kafkaProducer != nil {
		eventData := map[string]interface{}{
			"workflow_id":   workflow.ID,
			"name":         workflow.Name,
			"description":  workflow.Description,
			"created_by":   workflow.CreatedBy,
			"created_at":   workflow.CreatedAt,
		}
		if err := s.kafkaProducer.SendWorkflowEvent(kafka.EventTypeWorkflowStarted, workflow.ID, "", eventData); err != nil {
			s.logger.Warn("Failed to send workflow creation event", zap.Error(err))
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    workflow,
	})
}

func (s *Server) getWorkflow(c *gin.Context) {
	id := c.Param("id")
	
	workflow, err := s.db.GetWorkflow(id)
	if err != nil {
		s.logger.Error("Failed to get workflow", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get workflow"})
		return
	}

	if workflow == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workflow not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    workflow,
	})
}

func (s *Server) updateWorkflow(c *gin.Context) {
	id := c.Param("id")
	
	var req models.UpdateWorkflowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := s.db.UpdateWorkflow(id, &req)
	if err != nil {
		s.logger.Error("Failed to update workflow", zap.Error(err))
		if err.Error() == "workflow not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Workflow not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update workflow"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Workflow updated successfully",
	})
}

func (s *Server) deleteWorkflow(c *gin.Context) {
	id := c.Param("id")
	
	err := s.db.DeleteWorkflow(id)
	if err != nil {
		s.logger.Error("Failed to delete workflow", zap.Error(err))
		if err.Error() == "workflow not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Workflow not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete workflow"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Workflow deleted successfully",
	})
}

func (s *Server) executeWorkflow(c *gin.Context) {
	id := c.Param("id")
	
	var req models.ExecuteWorkflowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get workflow definition
	workflow, err := s.db.GetWorkflow(id)
	if err != nil {
		s.logger.Error("Failed to get workflow", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get workflow"})
		return
	}

	if workflow == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Workflow not found"})
		return
	}

	if !workflow.IsActive {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Workflow is not active"})
		return
	}

	// Create execution record
	executionID := uuid.New().String()
	temporalRunID := fmt.Sprintf("workflow-%s-%d", id, time.Now().UnixNano())
	
	execution := &models.WorkflowExecution{
		ID:            executionID,
		WorkflowID:    id,
		TriggerID:     req.TriggerID,
		TemporalRunID: temporalRunID,
		Status:        "running",
		InputData:     req.TriggerData,
		StartedAt:     time.Now(),
	}

	err = s.db.CreateExecution(execution)
	if err != nil {
		s.logger.Error("Failed to create execution", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create execution"})
		return
	}

	// Start Temporal workflow
	workflowOptions := client.StartWorkflowOptions{
		ID:        temporalRunID,
		TaskQueue: "automation-platform",
	}

	workflowInput := types.WorkflowInput{
		WorkflowID:   id,
		ExecutionID:  executionID,
		TriggerData:  req.TriggerData,
		Definition:   workflow.Definition,
		TriggerID:    req.TriggerID,
		TriggerType:  "manual", // Default trigger type
	}

	workflowRun, err := s.temporalClient.ExecuteWorkflow(context.Background(), workflowOptions, workflows.WorkflowOrchestrator, workflowInput)
	if err != nil {
		s.logger.Error("Failed to start Temporal workflow", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start workflow execution"})
		return
	}

	s.logger.Info("Workflow execution started",
		zap.String("workflowId", id),
		zap.String("executionId", executionID),
		zap.String("temporalRunId", workflowRun.GetID()))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"execution_id":    executionID,
			"temporal_run_id": workflowRun.GetID(),
			"status":          "running",
		},
	})
}

// Execution handlers

func (s *Server) getExecutions(c *gin.Context) {
	workflowID := c.Query("workflow_id")
	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 50
	}

	var workflowIDPtr *string
	if workflowID != "" {
		workflowIDPtr = &workflowID
	}

	executions, err := s.db.GetExecutions(workflowIDPtr, limit)
	if err != nil {
		s.logger.Error("Failed to get executions", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get executions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    executions,
	})
}

func (s *Server) getExecution(c *gin.Context) {
	id := c.Param("id")
	
	execution, err := s.db.GetExecution(id)
	if err != nil {
		s.logger.Error("Failed to get execution", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get execution"})
		return
	}

	if execution == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Execution not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    execution,
	})
}

func (s *Server) getWorkflowExecutions(c *gin.Context) {
	workflowID := c.Param("id")
	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 50
	}

	executions, err := s.db.GetExecutions(&workflowID, limit)
	if err != nil {
		s.logger.Error("Failed to get workflow executions", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get executions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    executions,
	})
}

func (s *Server) cancelExecution(c *gin.Context) {
	// Implementation for cancelling workflow execution
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (s *Server) terminateExecution(c *gin.Context) {
	// Implementation for terminating workflow execution
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

func (s *Server) getExecutionStatus(c *gin.Context) {
	// Implementation for getting real-time execution status
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Not implemented yet"})
}

// Middleware

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-User-ID")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		
		c.Next()
	}
}

func loggerMiddleware(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		
		latency := time.Since(start)
		status := c.Writer.Status()
		
		logger.Info("HTTP Request",
			zap.String("method", c.Request.Method),
			zap.String("path", c.Request.URL.Path),
			zap.Int("status", status),
			zap.Duration("latency", latency),
			zap.String("ip", c.ClientIP()),
		)
	}
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}