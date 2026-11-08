# Automation Marketplace Frontend Setup

## Overview

This directory contains n8n's Vue 3 frontend adapted for the **Automation Marketplace** platform with custom branding and theme.

## Custom Theme

The Automation Marketplace uses a modern color scheme:

- **Primary**: Indigo `#6366F1` (replacing n8n's orange)
- **Secondary**: Pink `#EC4899` (replacing purple)  
- **Success**: Emerald Green `#10B981`
- **Warning**: Amber `#F59E0B`
- **Danger**: Red `#EF4444`
- **Info**: Blue `#3B82F6`

## Files Modified

### Custom Theme Files:
- `@n8n/design-system/src/css/_primitives.automation-marketplace.scss` - Custom color primitives
- `@n8n/design-system/src/css/_tokens.automation-marketplace.scss` - Custom design tokens
- `@n8n/design-system/src/css/index.automation-marketplace.scss` - Theme entry point
- `editor-ui/src/main.automation-marketplace.ts` - Custom entry point
- `editor-ui/.env.automation-marketplace` - Environment configuration

## Running the Frontend

### Option 1: Using pnpm (recommended)

```bash
cd packages/frontend/editor-ui

# Install dependencies (if not done)
pnpm install

# Start dev server with Automation Marketplace theme
pnpm dev:automation-marketplace
```

### Option 2: Using npm scripts

```bash
cd packages/frontend/editor-ui

# Merge automation marketplace scripts into package.json
npm pkg set scripts.dev:am="cross-env VUE_APP_URL_BASE_API=http://localhost:3001 vite --host 0.0.0.0 --port 8080 dev --mode automation-marketplace"

# Run it
npm run dev:am
```

### Option 3: Direct vite command

```bash
cd packages/frontend/editor-ui

cross-env VUE_APP_URL_BASE_API=http://localhost:3001 vite --host 0.0.0.0 --port 8080 dev
```

## Backend Configuration

The frontend expects the Automation Marketplace backend API running at:

```
http://localhost:3001
```

### Required API Endpoints

The frontend will call these endpoints (compatible with n8n's API structure):

- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow  
- `GET /api/workflows/:id` - Get workflow
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow
- `POST /api/workflows/:id/execute` - Execute workflow
- `GET /api/executions` - List executions
- `GET /api/executions/:id` - Get execution details
- `GET /api/credentials` - List credentials
- `POST /api/credentials` - Create credential
- And more...

## Building for Production

```bash
cd packages/frontend/editor-ui

# Build with Automation Marketplace theme
pnpm build:automation-marketplace
```

Output will be in `dist/` directory.

## Customizing Further

### Change Colors

Edit `@n8n/design-system/src/css/_primitives.automation-marketplace.scss`:

```scss
// Example: Change primary from Indigo to Blue
--color--orange-300: hsl(217, 91%, 60%); // #3B82F6
```

### Change Branding

Edit `editor-ui/.env.automation-marketplace`:

```env
VUE_APP_TITLE=Your Company Name
VUE_APP_DESCRIPTION=Your Description
```

### Change API URL

Edit `editor-ui/.env.automation-marketplace`:

```env
VUE_APP_URL_BASE_API=http://your-api-server:port
```

## Development Tips

1. **Hot Module Replacement**: Changes to Vue components and SCSS will hot-reload
2. **TypeScript**: Ensure your IDE has TypeScript support for best experience
3. **Vue DevTools**: Install Vue DevTools browser extension for debugging
4. **API Proxy**: Vite is configured to proxy `/api` requests to the backend

## Troubleshooting

### Port Already in Use

If port 8080 is busy, change it:

```bash
vite --port 3000 dev
```

### API Connection Errors

Check that:
1. Backend is running on `http://localhost:3001`
2. CORS is properly configured on backend
3. Network tab in browser DevTools shows correct API calls

### Theme Not Loading

Ensure:
1. You're using `main.automation-marketplace.ts` as entry point
2. SCSS files are being imported correctly
3. Clear browser cache and restart dev server

## Next Steps

1. ✅ Frontend is running with custom Automation Marketplace theme
2. 🔄 Connect backend API endpoints (in progress)
3. 🔄 Adapt Temporal workflow execution
4. 🔄 Add multi-language worker support
5. 🔄 Integrate Kafka event streaming

## Support

For issues or questions:
- Check n8n documentation for Vue component usage
- Review `packages/frontend/@n8n/design-system` for available components
- Consult Automation Marketplace backend team for API contracts