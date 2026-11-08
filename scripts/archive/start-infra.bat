@echo off
echo ========================================
echo 🐳 Starting Infrastructure (Docker)
echo ========================================

echo Checking for Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed or not in PATH.
    echo    Please allow Postgres/Redis to be started manually or install Docker.
    exit /b 1
)

echo.
echo [1/2] Starting Postgres & Redis...
docker-compose up -d postgres redis

echo.
echo [2/2] Waiting for Database to be ready...
timeout /t 5 /nobreak >nul

echo ✅ Infrastructure Running!
echo    - Postgres: localhost:5433
echo    - Redis: localhost:6379
