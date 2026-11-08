@echo off
echo ========================================
echo 🔄 Restarting AutomationMarketplace...
echo ========================================

echo [1/3] Stopping existing Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] Cleaning up ports...
echo Done.

echo [3/3] Starting Services...
call scripts\start-all-services.bat
