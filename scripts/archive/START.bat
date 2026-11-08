@echo off
echo ===========================================
echo   AutomationMarketplace - Quick Start
echo ===========================================
echo.

echo [1/3] Starting Docker infrastructure...
cd /d "%~dp0"
docker-compose -f docker-compose.dev.yml up -d postgres redis minio temporal temporal-web
if %errorlevel% neq 0 (
    echo ERROR: Docker services failed to start!
    pause
    exit /b 1
)

echo.
echo [2/3] Waiting for services to be ready...
timeout /t 10 /nobreak > nul

echo.
echo [3/3] Starting API server...
cd api
start "AutomationMarketplace API" cmd /k "node dist\index.js"

echo.
echo ============================================
echo   Services Started!
echo ============================================
echo.
echo  API Server:      http://localhost:3001
echo  Temporal UI:     http://localhost:8081
echo  MinIO Console:   http://localhost:9001
echo  Database:        localhost:5433
echo.
echo Press any key to view service status...
pause > nul

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
pause
