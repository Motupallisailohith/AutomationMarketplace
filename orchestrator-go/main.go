package main

import (
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"automation-platform/orchestrator-go/internal/database"
	"automation-platform/orchestrator-go/internal/kafka"
	"automation-platform/orchestrator-go/internal/server"
	"github.com/joho/godotenv"
	"go.temporal.io/sdk/client"
	"go.uber.org/zap"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(".env"); err != nil {
		log.Printf("Warning: .env file not found: %v", err)
	}

	// Initialize logger
	logger, err := zap.NewProduction()
	if err != nil {
		log.Fatalf("Failed to create logger: %v", err)
	}
	defer logger.Sync()

	// Connect to database
	db, err := database.NewDatabase(logger)
	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	// Initialize Temporal client
	temporalAddress := getEnvOrDefault("TEMPORAL_ADDRESS", "localhost:7233")
	temporalClient, err := client.Dial(client.Options{
		HostPort:  temporalAddress,
		Namespace: getEnvOrDefault("TEMPORAL_NAMESPACE", "default"),
	})
	if err != nil {
		logger.Error("Failed to create Temporal client", zap.Error(err))
		// Continue without Temporal if it's not available
		temporalClient = nil
	} else {
		logger.Info("Temporal client initialized", zap.String("address", temporalAddress))
		defer temporalClient.Close()
	}

	// Initialize Kafka producer
	kafkaBrokers := strings.Split(getEnvOrDefault("KAFKA_BROKERS", "localhost:9092"), ",")
	kafkaProducer, err := kafka.NewProducer(kafkaBrokers)
	if err != nil {
		logger.Error("Failed to create Kafka producer", zap.Error(err))
		// Continue without Kafka if it's not available
		kafkaProducer = nil
	} else {
		logger.Info("Kafka producer initialized", zap.Strings("brokers", kafkaBrokers))
		defer kafkaProducer.Close()
		
		// Create required topics
		topics := []string{
			kafka.TopicWorkflowEvents,
			kafka.TopicActivityEvents,
			kafka.TopicNotifications,
			kafka.TopicSystemEvents,
			kafka.TopicWorkerCommunication,
		}
		if err := kafka.CreateTopics(kafkaBrokers, topics); err != nil {
			logger.Warn("Failed to create Kafka topics", zap.Error(err))
		}
	}

	// Create HTTP server with Temporal integration
	s := server.NewServer(db, temporalClient, kafkaProducer, logger)

	// Start HTTP server
	log.Println("Starting HTTP server...")
	logger.Info("Orchestrator HTTP server starting", zap.String("mode", "standalone"))
	
	// Start server in a goroutine
	go func() {
		if err := s.Start(); err != nil {
			log.Fatalf("Failed to start HTTP server: %v", err)
		}
	}()

	// Wait for interrupt signal
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	log.Println("Shutting down...")
	logger.Info("Orchestrator shutting down")
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
