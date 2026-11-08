@echo off
echo ========================================
echo Automation Marketplace Frontend
echo ========================================
echo.
echo Starting n8n Vue 3 Frontend with
echo Automation Marketplace Custom Theme
echo.
echo Backend API: http://localhost:3001
echo Frontend URL: http://localhost:8080
echo.
echo ========================================
echo.

cd packages\frontend\editor-ui

echo Installing dependencies (if needed)...
call pnpm install

echo.
echo Starting development server...
echo.

set VUE_APP_URL_BASE_API=http://localhost:3001
set VUE_APP_TITLE=Automation Marketplace
set VUE_APP_DESCRIPTION=Enterprise Workflow Automation Platform

call pnpm vite --host 0.0.0.0 --port 8080 dev

pause