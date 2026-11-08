package worker

import (
	"fmt"
	"os"

	"automation-marketplace/orchestrator-go/internal/activities"
	"automation-marketplace/orchestrator-go/internal/database"
	"automation-marketplace/orchestrator-go/internal/workflows"
	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
	"go.uber.org/zap"
)

type Worker struct {
	client       client.Client
	worker       worker.Worker
	db          *database.Database
	logger      *zap.Logger
}

func NewWorker() (*Worker, error) {
	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		return nil, fmt.Errorf("failed to create logger: %w", err)
	}

	// Connect to database
	db, err := database.NewDatabase(logger)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Connect to Temporal server
	temporalAddress := getEnvOrDefault("TEMPORAL_ADDRESS", "localhost:7233")
	temporalNamespace := getEnvOrDefault("TEMPORAL_NAMESPACE", "default")
	
	c, err := client.Dial(client.Options{
		HostPort:  temporalAddress,
		Namespace: temporalNamespace,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Temporal client: %w", err)
	}

	// Create worker
	taskQueue := getEnvOrDefault("TEMPORAL_TASK_QUEUE", "automation-platform")
	w := worker.New(c, taskQueue, worker.Options{
		MaxConcurrentActivityExecutionSize:     10,
		MaxConcurrentLocalActivityExecutionSize: 10,
		MaxConcurrentWorkflowTaskExecutionSize:  10,
	})

	// Register workflows
	w.RegisterWorkflow(workflows.WorkflowOrchestrator)

	// Register activities
	activities := activities.NewActivities(db, logger)
	w.RegisterActivity(activities.ExecuteHTTPActivity)
	w.RegisterActivity(activities.ExecuteDataProcessingActivity)
	w.RegisterActivity(activities.ExecuteMLActivity)
	w.RegisterActivity(activities.ExecuteConditionalActivity)
	w.RegisterActivity(activities.ExecuteNotificationActivity)
	w.RegisterActivity(activities.UpdateExecutionActivity)

	logger.Info("Temporal worker configured",
		zap.String("address", temporalAddress),
		zap.String("namespace", temporalNamespace),
		zap.String("taskQueue", taskQueue))

	return &Worker{
		client: c,
		worker: w,
		db:     db,
		logger: logger,
	}, nil
}

func (w *Worker) Start() error {
	w.logger.Info("Starting Temporal worker...")
	
	// Start worker in a goroutine
	go func() {
		err := w.worker.Run(worker.InterruptCh())
		if err != nil {
			w.logger.Fatal("Worker failed", zap.Error(err))
		}
	}()

	w.logger.Info("Temporal worker started successfully")
	return nil
}

func (w *Worker) Stop() {
	w.logger.Info("Stopping Temporal worker...")
	
	if w.worker != nil {
		w.worker.Stop()
	}
	
	if w.client != nil {
		w.client.Close()
	}
	
	if w.db != nil {
		w.db.Close()
	}

	w.logger.Info("Temporal worker stopped")
}

func (w *Worker) GetClient() client.Client {
	return w.client
}

func (w *Worker) GetDatabase() *database.Database {
	return w.db
}

func (w *Worker) GetLogger() *zap.Logger {
	return w.logger
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
