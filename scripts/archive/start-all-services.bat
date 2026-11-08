@echo off
echo ========================================
echo Starting AutomationMarketplace Services
echo ========================================
echo.

cd /d c:\Users\sailo\AutomationMarketplace
call scripts\start-infra.bat

echo [1/5] Creating API .env file...
(
echo DB_HOST=localhost
echo DB_PORT=5433
echo DB_NAME=automation_platform
echo DB_USER=postgres
echo DB_PASSWORD=password
echo JWT_SECRET=your-super-secret-jwt-key-2025
echo ENCRYPTION_KEY=your-encryption-key-2025
echo PORT=3000
echo NODE_ENV=development
echo CORS_ORIGIN=http://localhost:5173
echo TEMPORAL_HOST=localhost:7233
) > api\.env
echo ✅ API .env created

echo.
echo [2/5] Starting API Server...
start "API Server" cmd /k "cd /d c:\Users\sailo\AutomationMarketplace\api && pnpm dev"

echo [2.5/5] Starting Temporal Server...
start "Temporal Server" cmd /k "cd /d c:\Users\sailo\AutomationMarketplace\bin && temporal.exe server start-dev"

timeout /t 5 /nobreak >nul

echo.
echo [3/5] Starting Go Orchestrator (Optional - for workflow execution)...
start "Go Orchestrator" cmd /k "cd /d c:\Users\sailo\AutomationMarketplace\orchestrator-go && go run cmd\orchestrator\main.go"

timeout /t 3 /nobreak >nul

echo.
echo [4/5] Starting Node.js Worker (Optional - for node execution)...
start "Node.js Worker" cmd /k "cd /d c:\Users\sailo\AutomationMarketplace\workers\nodejs-worker && pnpm dev"

timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo ✅ All Services Started!
echo ========================================
echo.
echo Running Services:
echo   ✅ API Server       - http://localhost:3000
echo   ✅ Frontend         - http://localhost:5173 (already running)
echo   ✅ PostgreSQL       - localhost:5432
echo   ✅ Go Orchestrator  - Temporal worker
echo   ✅ Node.js Worker   - Node executor
echo.
echo 🎯 AutomationMarketplace is READY!
echo.
echo Open your browser: http://localhost:5173
echo.
echo Press any key to view service status...
pause >nul

echo.
echo Service Status:
echo ========================================
curl -s http://localhost:3000/health 2>nul && echo ✅ API is healthy || echo ⏳ API starting...
echo.
echo To stop all services:
echo   - Close all opened terminal windows
echo   - Or press Ctrl+C in each window
echo.
pause
