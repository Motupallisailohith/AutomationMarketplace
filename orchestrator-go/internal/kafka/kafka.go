package kafka

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/IBM/sarama"
)

// Producer handles Kafka message production
type Producer struct {
	producer sarama.SyncProducer
}

// Consumer handles Kafka message consumption
type Consumer struct {
	consumer sarama.Consumer
}

// EventMessage represents a message sent through Kafka
type EventMessage struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"`
	Source      string                 `json:"source"`
	Timestamp   time.Time             `json:"timestamp"`
	WorkflowID  string                `json:"workflow_id,omitempty"`
	ExecutionID string                `json:"execution_id,omitempty"`
	Data        map[string]interface{} `json:"data"`
}

// Topics defines the Kafka topics used by the platform
const (
	TopicWorkflowEvents    = "workflow-events"
	TopicActivityEvents    = "activity-events"
	TopicNotifications     = "notifications"
	TopicSystemEvents      = "system-events"
	TopicWorkerCommunication = "worker-communication"
)

// Event types
const (
	EventTypeWorkflowStarted   = "workflow.started"
	EventTypeWorkflowCompleted = "workflow.completed"
	EventTypeWorkflowFailed    = "workflow.failed"
	EventTypeActivityStarted   = "activity.started"
	EventTypeActivityCompleted = "activity.completed"
	EventTypeActivityFailed    = "activity.failed"
	EventTypeWorkerRequest     = "worker.request"
	EventTypeWorkerResponse    = "worker.response"
	EventTypeSystemHealthCheck = "system.health_check"
)

// NewProducer creates a new Kafka producer
func NewProducer(brokers []string) (*Producer, error) {
	config := sarama.NewConfig()
	config.Producer.RequiredAcks = sarama.WaitForAll
	config.Producer.Retry.Max = 5
	config.Producer.Return.Successes = true

	producer, err := sarama.NewSyncProducer(brokers, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create Kafka producer: %w", err)
	}

	return &Producer{producer: producer}, nil
}

// NewConsumer creates a new Kafka consumer
func NewConsumer(brokers []string) (*Consumer, error) {
	config := sarama.NewConfig()
	config.Consumer.Group.Rebalance.Strategy = sarama.BalanceStrategyRoundRobin
	config.Consumer.Offsets.Initial = sarama.OffsetNewest

	consumer, err := sarama.NewConsumer(brokers, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create Kafka consumer: %w", err)
	}

	return &Consumer{consumer: consumer}, nil
}

// SendMessage sends a message to the specified topic
func (p *Producer) SendMessage(topic string, message *EventMessage) error {
	messageBytes, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	msg := &sarama.ProducerMessage{
		Topic: topic,
		Key:   sarama.StringEncoder(message.ID),
		Value: sarama.ByteEncoder(messageBytes),
		Headers: []sarama.RecordHeader{
			{
				Key:   []byte("event_type"),
				Value: []byte(message.Type),
			},
			{
				Key:   []byte("source"),
				Value: []byte(message.Source),
			},
		},
	}

	partition, offset, err := p.producer.SendMessage(msg)
	if err != nil {
		return fmt.Errorf("failed to send message: %w", err)
	}

	log.Printf("Message sent to topic %s [partition %d] at offset %d", topic, partition, offset)
	return nil
}

// SendWorkflowEvent sends a workflow-related event
func (p *Producer) SendWorkflowEvent(eventType, workflowID, executionID string, data map[string]interface{}) error {
	message := &EventMessage{
		ID:          fmt.Sprintf("workflow-%s-%d", workflowID, time.Now().UnixNano()),
		Type:        eventType,
		Source:      "orchestrator",
		Timestamp:   time.Now(),
		WorkflowID:  workflowID,
		ExecutionID: executionID,
		Data:        data,
	}

	return p.SendMessage(TopicWorkflowEvents, message)
}

// SendActivityEvent sends an activity-related event
func (p *Producer) SendActivityEvent(eventType, workflowID, executionID, activityType string, data map[string]interface{}) error {
	message := &EventMessage{
		ID:          fmt.Sprintf("activity-%s-%s-%d", workflowID, activityType, time.Now().UnixNano()),
		Type:        eventType,
		Source:      "orchestrator",
		Timestamp:   time.Now(),
		WorkflowID:  workflowID,
		ExecutionID: executionID,
		Data: map[string]interface{}{
			"activity_type": activityType,
			"details":       data,
		},
	}

	return p.SendMessage(TopicActivityEvents, message)
}

// SendWorkerRequest sends a request to workers
func (p *Producer) SendWorkerRequest(workerType string, request map[string]interface{}) error {
	message := &EventMessage{
		ID:        fmt.Sprintf("worker-req-%s-%d", workerType, time.Now().UnixNano()),
		Type:      EventTypeWorkerRequest,
		Source:    "orchestrator",
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"worker_type": workerType,
			"request":     request,
		},
	}

	return p.SendMessage(TopicWorkerCommunication, message)
}

// SendNotification sends a notification event
func (p *Producer) SendNotification(notificationType string, recipient string, data map[string]interface{}) error {
	message := &EventMessage{
		ID:        fmt.Sprintf("notification-%s-%d", notificationType, time.Now().UnixNano()),
		Type:      notificationType,
		Source:    "orchestrator",
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"recipient": recipient,
			"details":   data,
		},
	}

	return p.SendMessage(TopicNotifications, message)
}

// ConsumeMessages consumes messages from a topic
func (c *Consumer) ConsumeMessages(ctx context.Context, topic string, handler func(*EventMessage) error) error {
	partitionConsumer, err := c.consumer.ConsumePartition(topic, 0, sarama.OffsetNewest)
	if err != nil {
		return fmt.Errorf("failed to start consumer for partition: %w", err)
	}

	defer func() {
		if err := partitionConsumer.Close(); err != nil {
			log.Printf("Error closing partition consumer: %v", err)
		}
	}()

	for {
		select {
		case message := <-partitionConsumer.Messages():
			var eventMessage EventMessage
			if err := json.Unmarshal(message.Value, &eventMessage); err != nil {
				log.Printf("Error unmarshaling message: %v", err)
				continue
			}

			if err := handler(&eventMessage); err != nil {
				log.Printf("Error handling message: %v", err)
				continue
			}

			log.Printf("Successfully processed message: %s", eventMessage.ID)

		case err := <-partitionConsumer.Errors():
			log.Printf("Error consuming message: %v", err)

		case <-ctx.Done():
			log.Println("Context cancelled, stopping consumer")
			return nil
		}
	}
}

// Close closes the producer
func (p *Producer) Close() error {
	return p.producer.Close()
}

// Close closes the consumer
func (c *Consumer) Close() error {
	return c.consumer.Close()
}

// CreateTopics creates the required Kafka topics
func CreateTopics(brokers []string, topics []string) error {
	config := sarama.NewConfig()
	config.Version = sarama.V2_6_0_0

	admin, err := sarama.NewClusterAdmin(brokers, config)
	if err != nil {
		return fmt.Errorf("failed to create cluster admin: %w", err)
	}
	defer admin.Close()

	topicDetails := make(map[string]*sarama.TopicDetail)
	for _, topic := range topics {
		topicDetails[topic] = &sarama.TopicDetail{
			NumPartitions:     3,
			ReplicationFactor: 1,
		}
	}

	for topicName, detail := range topicDetails {
		err = admin.CreateTopic(topicName, detail, false)
		if err != nil && err != sarama.ErrTopicAlreadyExists {
			log.Printf("Failed to create topic %s: %v", topicName, err)
		}
	}

	log.Printf("Created Kafka topics: %v", topics)
	return nil
}