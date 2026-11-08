@echo off
REM Automation Marketplace - Vue 3 Editor Quick Start Script

echo.
echo 🚀 Starting Automation Marketplace Vue 3 Editor Setup...
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo 📦 Installing dependencies...
    call pnpm install
) else (
    echo ✅ Dependencies already installed
)

echo.
echo 🎨 Setup complete!
echo.
echo Available commands:
echo   pnpm dev          - Start development server
echo   pnpm build        - Build for production
echo   pnpm typecheck    - Run TypeScript checks
echo.
echo 📚 Documentation:
echo   - SETUP_GUIDE.md             - Complete setup guide
echo   - IMPLEMENTATION_COMPLETE.md - Implementation summary
echo.
echo 🌐 Development server will run at: http://localhost:5678
echo.

set /p answer="Start development server now? (y/n): "
if /i "%answer%"=="y" (
    echo.
    echo 🚀 Starting development server...
    call pnpm dev
)
