# OAuth2 Integration Testing Guide

## Setup

### 1. Create a Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name it "AutomationMarketplace Test"
4. Choose a workspace
5. Go to "OAuth & Permissions"
6. Add Redirect URL: `http://localhost:3001/api/oauth2/callback`
7. Add Bot Token Scopes:
   - `chat:write`
   - `channels:read`
   - `users:read`
8. Copy **Client ID** and **Client Secret** from "Basic Information"

### 2. Set Environment Variables

```bash
# PowerShell
$env:SLACK_CLIENT_ID="your_client_id_here"
$env:SLACK_CLIENT_SECRET="your_client_secret_here"
$env:API_URL="http://localhost:3001"
$env:FRONTEND_URL="http://localhost:5173"
```

### 3. Start Services

```bash
# Terminal 1: API
cd c:\Users\sailo\AutomationMarketplace\api
npm start

# Terminal 2: Frontend (if available)
cd c:\Users\sailo\AutomationMarketplace\frontend
npm run dev
```

### 4. Run OAuth2 Test

```bash
cd c:\Users\sailo\AutomationMarketplace\api
node test-oauth2.js
```

## Manual Testing Steps

### Step 1: Create User (if needed)

```bash
curl -X POST http://localhost:3001/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    \"email\": \"test@example.com\",
    \"password\": \"TestPass123\",
    \"name\": \"Test User\"
  }'
```

### Step 2: Login

```bash
curl -X POST http://localhost:3001/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{
    \"email\": \"test@example.com\",
    \"password\": \"TestPass123\"
  }'
```

Save the token from response.

### Step 3: Create OAuth2 Credential

```bash
$TOKEN="your_jwt_token_here"

curl -X POST http://localhost:3001/api/credentials `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $TOKEN" `
  -d '{
    \"name\": \"Slack OAuth2\",
    \"type\": \"oauth2\",
    \"data\": {
      \"clientId\": \"your_slack_client_id\",
      \"clientSecret\": \"your_slack_client_secret\",
      \"provider\": \"slack\"
    }
  }'
```

Save the credential ID from response.

### Step 4: Get Authorization URL

```bash
$CRED_ID="credential_id_from_step3"

curl -X GET "http://localhost:3001/api/oauth2/auth?credentialId=$CRED_ID&provider=slack" `
  -H "Authorization: Bearer $TOKEN"
```

### Step 5: Authorize in Browser

1. Copy the `authUrl` from response
2. Open in browser
3. Click "Allow" to authorize
4. You'll be redirected to callback
5. Tokens are automatically stored

### Step 6: Verify Tokens Stored

```bash
curl -X GET "http://localhost:3001/api/credentials/$CRED_ID" `
  -H "Authorization: Bearer $TOKEN"
```

Check that `dataKeys` includes `accessToken` and `refreshToken`.

### Step 7: Test Token Refresh

```bash
curl -X POST http://localhost:3001/api/oauth2/refresh `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $TOKEN" `
  -d '{
    \"credentialId\": \"$CRED_ID\"
  }'
```

## Expected Flow

1. **User creates credential** with clientId and clientSecret
2. **System generates auth URL** with state token
3. **User authorizes** in OAuth provider (Slack)
4. **Provider redirects** to callback with code
5. **System exchanges code** for access/refresh tokens
6. **Tokens stored** in encrypted credential
7. **Nodes can use tokens** for API calls

## Testing with Workflow

Create a workflow using Slack node:

```json
{
  "name": "Test Slack OAuth",
  "definition": {
    "steps": [
      {
        "id": "slack1",
        "name": "Send Message",
        "type": "node",
        "configuration": {
          "nodeType": "n8n-nodes-base.slack",
          "parameters": {
            "resource": "message",
            "operation": "post",
            "channel": "#general",
            "text": "Hello from AutomationMarketplace!"
          },
          "credentials": {
            "slackOAuth2Api": "your_credential_id"
          }
        }
      }
    ]
  }
}
```

## Troubleshooting

### "Invalid redirect_uri"
- Make sure redirect URL in Slack app matches exactly: `http://localhost:3001/api/oauth2/callback`
- No trailing slash

### "Invalid state"
- State expires after 15 minutes
- Generate new auth URL if expired

### "Token refresh failed"
- Some providers don't return new refresh token
- Check if provider supports refresh tokens

### "Access denied"
- User cancelled authorization
- Check OAuth scopes are correct

## Supported Providers

Currently configured:
- Slack
- Google
- GitHub  
- Microsoft
- Dropbox

To add more providers, update `oauth2Service` in `api/src/services/oauth2.service.ts`.
