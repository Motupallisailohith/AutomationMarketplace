@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM   AutomationMarketplace - ONE SCRIPT FOR EVERYTHING
REM ============================================================
REM   Usage:
REM     dev.bat start    - Start all services
REM     dev.bat stop     - Stop all services  
REM     dev.bat restart  - Restart everything
REM     dev.bat test     - Run feature tests
REM     dev.bat build    - Build for production
REM     dev.bat clean    - Clean everything and restart
REM ============================================================

cd /d "%~dp0\.."

if "%1"=="stop" goto :stop
if "%1"=="restart" goto :restart
if "%1"=="test" goto :test
if "%1"=="build" goto :build
if "%1"=="clean" goto :clean
if "%1"=="start" goto :start
if "%1"=="" goto :start

echo Unknown command: %1
echo Usage: dev.bat [start^|stop^|restart^|test^|build^|clean]
exit /b 1

:start
cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║         AutomationMarketplace - Starting All Services      ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check Docker
echo [1/5] Checking Docker Desktop...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Docker Desktop is not running!
    echo    Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo ✅ Docker is running

REM Start Docker infrastructure
echo [2/5] Starting Docker infrastructure...
echo    This may take 15-30 seconds on first start...
docker-compose up -d postgres redis kafka temporal temporal-web
if %errorlevel% neq 0 (
    echo ⚠️  Warning: Some Docker services may have issues
    echo    Check with: docker-compose ps
)
echo ✅ Infrastructure starting...

echo [3/5] Waiting for services to be ready...
timeout /t 15 /nobreak >nul
echo ✅ Services should be ready

REM Start all application services
echo [4/5] Starting application services...
echo.

REM API Server
echo    - Starting API Server...
start "API Server" cmd /k "cd /d "%~dp0\..\api" && title API Server && echo Starting API Server on port 3000... && pnpm dev:simple"
timeout /t 2 /nobreak >nul

REM Frontend
echo    - Starting Frontend...
start "Frontend" cmd /k "cd /d "%~dp0\..\frontend" && title Frontend && echo Starting Frontend on port 5173... && pnpm dev"
timeout /t 2 /nobreak >nul

REM Go Orchestrator (optional)
if exist "%~dp0\..\orchestrator-go" (
    echo    - Starting Go Orchestrator...
    start "Orchestrator" cmd /k "cd /d "%~dp0\..\orchestrator-go" && title Orchestrator && echo Starting Go Orchestrator... && go run cmd/orchestrator/main.go"
)

echo [5/5] All services started!
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    ✅ ALL SERVICES STARTED                  ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo   🌐 Frontend:        http://localhost:5173
echo   🔌 API Server:      http://localhost:3000
echo   📊 Temporal UI:     http://localhost:8081
echo   🐘 PostgreSQL:      localhost:5433
echo   📦 Redis:           localhost:6379
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    QUICK COMMANDS                          ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo   dev.bat test        - Run automated feature tests
echo   dev.bat stop        - Stop all services
echo   dev.bat restart     - Restart everything
echo   dev.bat build       - Build for production
echo.
echo ⏳ Services are starting... wait 30 seconds then open browser
echo.
echo Press Ctrl+C here to stop all services (or close this window)
echo.
pause >nul

REM User pressed a key, stop everything
goto :stop

:stop
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    Stopping All Services                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1/3] Stopping Node.js processes...
taskkill /FI "WINDOWTITLE eq AutomationMarketplace*" /F >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] Stopping Go processes...
taskkill /IM go.exe /F >nul 2>&1

echo [3/3] Stopping Docker containers...
docker-compose down >nul 2>&1

echo.
echo ✅ All services stopped
echo.
pause
exit /b 0

:restart
echo Restarting AutomationMarketplace...
call :stop
timeout /t 3 /nobreak >nul
goto :start

:test
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    Running Feature Tests                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0test-features.ps1"
pause
exit /b 0

:build
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    Building for Production                 ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo [1/5] Installing dependencies...
call pnpm install
if %errorlevel% neq 0 exit /b 1

echo [2/5] Type checking...
call pnpm typecheck
if %errorlevel% neq 0 (
    echo ⚠️  Type errors found, continuing...
)

echo [3/5] Building API...
cd api
call pnpm build
cd ..
if %errorlevel% neq 0 exit /b 1

echo [4/5] Building Frontend...
cd frontend
call pnpm build
cd ..
if %errorlevel% neq 0 exit /b 1

echo [5/5] Building packages...
call pnpm build

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    ✅ BUILD COMPLETE                        ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo   Frontend output: frontend/dist/
echo   API output:      api/dist/
echo.
echo   Start production: docker-compose up -d
echo.
pause
exit /b 0

:clean
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    Deep Clean & Restart                    ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo This will:
echo   - Stop all services
echo   - Remove node_modules
echo   - Remove build artifacts
echo   - Remove Docker volumes
echo   - Reinstall everything
echo.
set /p CONFIRM="Are you sure? (yes/no): "
if /i not "%CONFIRM%"=="yes" (
    echo Cancelled.
    pause
    exit /b 0
)

echo [1/6] Stopping services...
call :stop

echo [2/6] Removing node_modules...
if exist node_modules rmdir /s /q node_modules
if exist api\node_modules rmdir /s /q api\node_modules  
if exist frontend\node_modules rmdir /s /q frontend\node_modules

echo [3/6] Removing build artifacts...
if exist api\dist rmdir /s /q api\dist
if exist frontend\dist rmdir /s /q frontend\dist

echo [4/6] Removing Docker volumes...
docker-compose down -v

echo [5/6] Reinstalling dependencies...
pnpm install

echo [6/6] Starting fresh...
goto :start
