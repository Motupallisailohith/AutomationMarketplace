@echo off
REM Start AutomationMarketplace in Production Mode

echo ========================================
echo Starting AutomationMarketplace (Production)
echo ========================================

echo.
echo Starting all services with Docker Compose...
docker-compose up -d

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to start services
    exit /b 1
)

echo.
echo ========================================
echo  Services Started
echo ========================================
echo  Frontend: http://localhost:80
echo  API: http://localhost:5678
echo  Postgres: localhost:5432
echo  Redis: localhost:6379
echo  Temporal: http://localhost:7233
echo  Temporal UI: http://localhost:8080
echo ========================================
echo.
echo View logs: docker-compose logs -f
echo Stop services: docker-compose down
echo.

pause
