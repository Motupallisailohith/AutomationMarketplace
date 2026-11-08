@echo off
echo ========================================
echo Automation Marketplace Backend
echo ========================================
echo.

REM Check if .env exists
if not exist ".env" (
    echo Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo Please edit .env file with your configuration
    echo Then run this script again.
    pause
    exit /b
)

echo Starting server...
echo.

pnpm tsx src/start-automation-marketplace.ts
