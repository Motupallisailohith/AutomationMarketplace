@echo off
cd /d "%~dp0api"
echo Building API...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo Starting API Server...
node dist\index.js
pause
