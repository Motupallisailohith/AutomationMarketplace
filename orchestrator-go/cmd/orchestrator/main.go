package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"

	"automation-marketplace/orchestrator-go/internal/activities"
	"automation-marketplace/orchestrator-go/internal/workflows"
)

func main() {
	log.Println("🚀 Starting AutomationMarketplace Orchestrator...")

	// 1. Create Temporal client
	log.Println("📡 Connecting to Temporal server...")
	temporalClient, err := client.Dial(client.Options{
		HostPort: getEnv("TEMPORAL_HOST", "localhost:7233"),
	})
	if err != nil {
		log.Fatalf("❌ Failed to create Temporal client: %v", err)
	}
	defer temporalClient.Close()

	log.Println("✅ Connected to Temporal server")

	// 2. Create worker
	log.Println("⚙️  Creating Temporal worker...")
	w := worker.New(temporalClient, "orchestrator-queue", worker.Options{})

	// 3. Register workflows
	log.Println("📝 Registering workflows...")
	w.RegisterWorkflow(workflows.SimpleWorkflowExecution)
	log.Println("✅ Workflows registered: SimpleWorkflowExecution")

	// 4. Register activities
	log.Println("📝 Registering activities...")
	nodeActivity := activities.NewNodeExecutionActivity()
	w.RegisterActivity(nodeActivity.ExecuteNode)
	w.RegisterActivity(nodeActivity.GetNodeMetadata)
	log.Println("✅ Activities registered: ExecuteNode, GetNodeMetadata")

	// 5. Start worker
	log.Println("🏃 Starting worker...")
	err = w.Start()
	if err != nil {
		log.Fatalf("❌ Failed to start worker: %v", err)
	}

	log.Println("✅ Orchestrator worker started successfully!")
	log.Println("📊 Listening on queue: orchestrator-queue")
	log.Println("🎯 Ready to execute workflows!")

	// 6. Wait for interrupt signal
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	<-sigCh

	log.Println("🛑 Shutting down orchestrator...")
	w.Stop()
	log.Println("👋 Orchestrator stopped")
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
