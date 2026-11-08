# 🧪 Feature Testing Guide - AutomationMarketplace

## Prerequisites Checklist

```bash
# Run these commands first:
docker --version          # Should show Docker version
docker ps                 # Should not error
node --version           # Should be 20+
pnpm --version           # Should be 9+
```

---

## 🚀 TESTING PROCEDURE

### Step 1: Start Infrastructure (5 min)

```powershell
# Terminal 1: Start Docker services
cd c:\Users\sailo\AutomationMarketplace
docker-compose up -d

# Wait 30 seconds for services to initialize
Start-Sleep -Seconds 30

# Verify all services are healthy
docker-compose ps
```

**Expected Output:**
```
NAME                STATUS              PORTS
postgres            Up (healthy)        0.0.0.0:5433->5432
redis               Up (healthy)        0.0.0.0:6379->6379
kafka               Up (healthy)        0.0.0.0:9092->9092
temporal            Up                  0.0.0.0:7233->7233
temporal-web        Up                  0.0.0.0:8081->8080
orchestrator-go     Up                  0.0.0.0:8080->8080
```

✅ **PASS**: All services show "Up" or "Up (healthy)"  
❌ **FAIL**: Any service shows "Exit" or "Restarting" → Check logs: `docker-compose logs <service-name>`

---

### Step 2: Start API Server (2 min)

```powershell
# Terminal 2: Start API
cd c:\Users\sailo\AutomationMarketplace\api
pnpm dev
```

**Expected Output:**
```
✅ Database connection established
✅ Server running on http://localhost:3000
✅ Swagger docs: http://localhost:3000/api-docs
```

**Test API Health:**
```powershell
# Terminal 3: Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/workflows
```

✅ **PASS**: Returns JSON responses  
❌ **FAIL**: Connection refused → Check Terminal 2 for errors

---

### Step 3: Start Frontend (2 min)

```powershell
# Terminal 4: Start Frontend
cd c:\Users\sailo\AutomationMarketplace\frontend
pnpm dev
```

**Expected Output:**
```
VITE v6.0.7  ready in 432 ms
➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

**Open Browser:**
- Navigate to http://localhost:5173
- Open DevTools (F12)
- Check Console tab for errors

---

## 📋 FEATURE TESTING CHECKLIST

### ✅ Feature 1: Infrastructure
**Test:** Can all services communicate?

| Test | Command | Expected | Status |
|------|---------|----------|--------|
| Postgres | `docker exec -it automationmarketplace-postgres-1 psql -U platform_user -d automation_platform -c "\dt"` | Shows tables | ⬜ |
| Redis | `docker exec -it automationmarketplace-redis-1 redis-cli ping` | Returns "PONG" | ⬜ |
| Temporal UI | Open http://localhost:8081 | Temporal dashboard loads | ⬜ |
| Go Orchestrator | `curl http://localhost:8080/health` | Returns JSON | ⬜ |

---

### ✅ Feature 2: API Authentication
**Test:** Can users register and login?

```powershell
# Register new user
curl -X POST http://localhost:3000/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"Test123!"}'
```

**Expected:** Returns JWT token like:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {"id":"1","email":"test@example.com"}
}
```

| Test | Action | Expected Result | Status |
|------|--------|----------------|--------|
| Register | POST /auth/register | Returns 201 + token | ⬜ |
| Login | POST /auth/login | Returns 200 + token | ⬜ |
| Invalid creds | Wrong password | Returns 401 error | ⬜ |
| Duplicate email | Register twice | Returns 400 error | ⬜ |

---

### ✅ Feature 3: Workflow Management
**Test:** Can workflows be created and listed?

```powershell
# Get workflows (replace TOKEN with actual token from login)
$TOKEN = "your-jwt-token-here"
curl http://localhost:3000/api/v1/workflows `
  -H "Authorization: Bearer $TOKEN"

# Create workflow
curl -X POST http://localhost:3000/api/v1/workflows `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"name":"Test Workflow","nodes":[],"connections":{}}'
```

| Test | Action | Expected Result | Status |
|------|--------|----------------|--------|
| List workflows | GET /workflows | Returns array | ⬜ |
| Create workflow | POST /workflows | Returns 201 | ⬜ |
| Get single | GET /workflows/:id | Returns workflow | ⬜ |
| Update | PUT /workflows/:id | Returns 200 | ⬜ |
| Delete | DELETE /workflows/:id | Returns 204 | ⬜ |
| Unauthorized | No token | Returns 401 | ⬜ |

---

### ✅ Feature 4: Frontend UI
**Test:** Does the React app work?

Open http://localhost:5173 in browser:

| Test | Action | Expected Result | Status |
|------|--------|----------------|--------|
| Homepage | Open / | Page loads without errors | ⬜ |
| Login page | Navigate to /login | Form displays | ⬜ |
| Register page | Navigate to /register | Form displays | ⬜ |
| Workflows page | Navigate to /workflows | List displays | ⬜ |
| Workflow editor | Click "Create Workflow" | ReactFlow canvas loads | ⬜ |
| Console errors | Open F12 DevTools | No red errors | ⬜ |
| Network requests | Check Network tab | API calls succeed | ⬜ |
| Redux store | Use Redux DevTools | Store has data | ⬜ |

---

### ✅ Feature 5: ReactFlow Workflow Editor
**Test:** Can you build workflows visually?

In browser at /workflows/new:

| Test | Action | Expected Result | Status |
|------|--------|----------------|--------|
| Canvas loads | Open editor | ReactFlow canvas visible | ⬜ |
| Add node | Drag from sidebar | Node appears on canvas | ⬜ |
| Connect nodes | Drag from output to input | Connection line created | ⬜ |
| Move nodes | Click and drag node | Node moves smoothly | ⬜ |
| Delete node | Select + Delete key | Node removed | ⬜ |
| Save workflow | Click Save | Workflow saved to DB | ⬜ |
| Load workflow | Refresh page | Workflow still there | ⬜ |

---

### ✅ Feature 6: Database Persistence
**Test:** Is data actually saved?

```powershell
# Check database
docker exec -it automationmarketplace-postgres-1 psql -U platform_user -d automation_platform

# Inside psql:
\dt                          # List tables
SELECT * FROM workflow;      # See workflows
SELECT * FROM user;          # See users (if migrated)
\q                           # Exit
```

| Test | Action | Expected Result | Status |
|------|--------|----------------|--------|
| Tables exist | `\dt` | Shows workflow tables | ⬜ |
| Workflows saved | SELECT * FROM workflow | Shows created workflows | ⬜ |
| Data persists | Restart API server | Data still there | ⬜ |

---

### ✅ Feature 7: Multi-Language Workers
**Test:** Can workers execute code?

```powershell
# Check if workers are built
cd c:\Users\sailo\AutomationMarketplace\workers

# Python worker
cd python-worker
python --version   # Should work

# Node.js worker
cd ..\nodejs-worker
node --version     # Should work

# Go worker
cd ..\go-worker
go version        # Should work

# Rust worker
cd ..\rust-worker
cargo --version   # Should work
```

| Test | Action | Expected Result | Status |
|------|--------|----------------|--------|
| Python available | python --version | Shows 3.10+ | ⬜ |
| Node.js available | node --version | Shows 20+ | ⬜ |
| Go available | go version | Shows 1.21+ | ⬜ |
| Rust available | cargo --version | Shows 1.70+ | ⬜ |
| Worker starts | Run worker script | No errors | ⬜ |

---

### ✅ Feature 8: Temporal Workflows
**Test:** Can workflows be orchestrated?

1. Open Temporal UI: http://localhost:8081
2. Check for namespaces
3. Try creating a workflow from Go orchestrator

```powershell
# Test orchestrator
curl http://localhost:8080/api/v1/workflows/execute `
  -X POST `
  -H "Content-Type: application/json" `
  -d '{"workflowId":"test-123","nodes":[]}'
```

| Test | Action | Expected Result | Status |
|------|--------|----------------|--------|
| Temporal UI loads | Open :8081 | Dashboard visible | ⬜ |
| Namespace exists | Check UI | Default namespace shown | ⬜ |
| Execute workflow | POST to orchestrator | Returns execution ID | ⬜ |
| Workflow appears | Check Temporal UI | Shows running workflow | ⬜ |
| Workflow completes | Wait 10s | Shows completed status | ⬜ |

---

## 🐛 COMMON ISSUES & FIXES

### Issue: Docker containers won't start
```powershell
# Check Docker Desktop is running
docker ps

# If not working, restart Docker Desktop
# Then retry: docker-compose up -d
```

### Issue: Port already in use
```powershell
# Find process using port (e.g., 3000)
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
taskkill /PID <process-id> /F

# Or change port in .env file
```

### Issue: Database connection failed
```powershell
# Check Postgres is healthy
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
```

### Issue: API returns 500 errors
```powershell
# Check API logs in Terminal 2
# Look for stack traces

# Check TypeScript compilation
cd api
pnpm build

# Run type checking
pnpm typecheck
```

### Issue: Frontend shows blank page
```powershell
# Open browser DevTools (F12)
# Check Console tab for errors
# Check Network tab - are API calls failing?

# Rebuild frontend
cd frontend
rm -rf node_modules .vite
pnpm install
pnpm dev
```

---

## 📝 REPORTING RESULTS

After testing, fill in the checkboxes above with:
- ✅ = Working perfectly
- ⚠️ = Partially working (explain what's broken)
- ❌ = Completely broken
- ⏭️ = Skipped/Not tested

Then provide:

1. **Which features work?**
   - Example: "Auth works, workflows CRUD works, frontend loads"

2. **Which features are broken?**
   - Example: "ReactFlow editor shows blank canvas, workers not starting"

3. **Console errors** (if any)
   - Copy/paste from browser DevTools console
   - Copy/paste from API terminal

4. **Unexpected behavior**
   - Example: "Login works but token expires immediately"

5. **Missing features noticed**
   - Example: "No search bar, no payment integration"

---

## 🚦 Quick Status Check Script

```powershell
# Save this as test-status.ps1
Write-Host "=== AutomationMarketplace Status ===" -ForegroundColor Cyan

# Check Docker
Write-Host "`nDocker Services:" -ForegroundColor Yellow
docker-compose ps 2>&1 | Select-String "Up"

# Check API
Write-Host "`nAPI Health:" -ForegroundColor Yellow
try {
    $api = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 2
    Write-Host "✅ API is running" -ForegroundColor Green
} catch {
    Write-Host "❌ API is down" -ForegroundColor Red
}

# Check Frontend
Write-Host "`nFrontend:" -ForegroundColor Yellow
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 2
    Write-Host "✅ Frontend is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend is down" -ForegroundColor Red
}

# Check Temporal
Write-Host "`nTemporal UI:" -ForegroundColor Yellow
try {
    $temporal = Invoke-WebRequest -Uri "http://localhost:8081" -TimeoutSec 2
    Write-Host "✅ Temporal UI is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Temporal UI is down" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
```

Run with: `.\test-status.ps1`
