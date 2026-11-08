@echo off
echo ========================================
echo ⏳ Setting up Temporal CLI
echo ========================================
echo.

if not exist bin mkdir bin

cd bin

if exist temporal.exe (
    echo ✅ Temporal CLI already exists.
    exit /b 0
)

echo [1/3] Downloading Temporal CLI...
powershell -Command "Invoke-WebRequest -Uri 'https://temporal.download/cli/archive/latest?platform=windows&arch=amd64' -OutFile 'temporal.tar.gz'"

echo [2/3] Extracting...
tar -xzf temporal.tar.gz

echo [3/3] Cleanup...
del temporal.tar.gz

if exist temporal.exe (
    echo ✅ Temporal CLI installed successfully!
    temporal.exe --version
) else (
    echo ❌ Installation failed. Please install manually from https://docs.temporal.io/cli/
)

cd ..
