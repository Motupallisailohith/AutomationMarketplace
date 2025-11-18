# Node.js Worker

This worker handles HTTP/API activities, data parsing/transformation, and notifications for the Automation Marketplace platform.

## Features

- **HTTP Activities**: REST API calls, webhook execution, form data handling
- **Data Processing**: JSON, XML, HTML, YAML parsing and transformation
- **Notifications**: Email, SMS, Slack, Discord, and generic webhook notifications
- **Authentication**: Bearer tokens, basic auth, API keys
- **Error Handling**: Comprehensive error handling and logging
- **Observability**: Structured logging with Winston

## Activities

### HTTP Activities
- `executeHttpRequest` - Execute HTTP requests with full configuration
- `executeApiRequest` - REST API calls with authentication
- `executeWebhook` - Webhook execution with HMAC signatures

### Data Activities
- `parseJson` - Parse JSON with JSONPath extraction
- `parseXml` - Parse XML with CSS selectors
- `parseHtml` - Parse HTML and extract data
- `parseYaml` - Parse YAML documents
- `transformData` - Transform data using mapping rules

### Notification Activities
- `sendEmail` - Send email notifications
- `sendSms` - Send SMS notifications
- `sendSlackNotification` - Send Slack messages
- `sendDiscordNotification` - Send Discord messages
- `sendWebhookNotification` - Generic webhook notifications

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Production

```bash
npm start
```

## Docker Support

The worker can be containerized and deployed alongside other services.

## Configuration

Environment variables:
- `LOG_LEVEL` - Logging level (default: info)
- `TEMPORAL_ADDRESS` - Temporal server address
- `TEMPORAL_NAMESPACE` - Temporal namespace (default: default)

## Testing

```bash
npm test
```