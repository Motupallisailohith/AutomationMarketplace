# Build rebranded AutomationMarketplace frontend
Write-Host "Building AutomationMarketplace UI..." -ForegroundColor Green

$env:VUE_APP_PUBLIC_PATH = "/"
$env:NODE_OPTIONS = "--max-old-space-size=8192"

Set-Location "C:\Users\sailo\AutomationMarketplace"

# Build using pnpm from root
pnpm --filter n8n-editor-ui exec vite build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Build completed successfully!" -ForegroundColor Green
    Write-Host "Output: packages/frontend/editor-ui/dist" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Build failed with exit code: $LASTEXITCODE" -ForegroundColor Red
}
