@echo off
REM Build AutomationMarketplace - Full Production Build

echo ========================================
echo Building AutomationMarketplace
echo ========================================

echo.
echo [1/5] Installing dependencies...
call pnpm install

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: pnpm install failed
    exit /b 1
)

echo.
echo [2/5] Running typecheck...
call pnpm typecheck

if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Typecheck has errors, continuing anyway...
)

echo.
echo [3/5] Building all packages...
call pnpm build

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed
    exit /b 1
)

echo.
echo [4/5] Building frontend...
cd frontend
call pnpm build
cd ..

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Frontend build failed
    exit /b 1
)

echo.
echo [5/5] Build complete!
echo.
echo ========================================
echo  Build Summary
echo ========================================
echo  Packages: Built successfully
echo  Frontend: Built successfully
echo  Output: frontend/dist/
echo ========================================
echo.
echo Ready to run: docker-compose up -d
echo.

pause
