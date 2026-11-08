# Sample Hello Extension

This is a sample extension that demonstrates how to build extensions for AutomationMarketplace.

## Structure

```
sample-hello-extension/
├── extension.json    # Extension manifest
├── backend.js        # Backend entry point
├── frontend.js       # Frontend entry point
└── README.md         # This file
```

## Installation

To install this extension:

1. Copy this directory to `extensions/installed/sample-hello-extension/`
2. Restart the AutomationMarketplace server
3. The extension will be automatically loaded

Or use the API:

```bash
curl -X POST http://localhost:3000/api/extensions/install \
  -F "package=@sample-hello-extension.zip"
```

## Features

- **Backend**: Logs initialization message
- **Frontend**: Can register custom components and routes
- **Events**: Listens to workflow and node events
- **Extends**: Can add custom UI to workflow views

## API Endpoints

### Get Extension Info
```bash
curl http://localhost:3000/api/extensions/sample-hello-extension
```

### Enable/Disable Extension
```bash
curl -X POST http://localhost:3000/api/extensions/sample-hello-extension/enable
curl -X POST http://localhost:3000/api/extensions/sample-hello-extension/disable
```

### Uninstall Extension
```bash
curl -X DELETE http://localhost:3000/api/extensions/sample-hello-extension
```

## Development

To develop your own extension:

1. Create a new directory in `extensions/examples/`
2. Create `extension.json` with your manifest
3. Create `backend.js` and/or `frontend.js` with your logic
4. Test by copying to `extensions/installed/`

## Permissions

This extension requests:
- **Frontend**: router, components
- **Backend**: api, events

## Events

This extension listens to:
- `workflow.executed` - When a workflow finishes execution
- `node.created` - When a new node is created

## Manifest Schema

See `packages/@n8n/extension-sdk/schema.json` for the full manifest schema.
