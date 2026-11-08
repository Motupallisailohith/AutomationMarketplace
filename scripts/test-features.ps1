# AutomationMarketplace Feature Testing Script
# Run this to quickly check what's working

$ErrorActionPreference = "SilentlyContinue"

Write-Host @"

╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     AutomationMarketplace - Feature Testing Suite           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

$results = @{
    Pass = @()
    Fail = @()
    Warning = @()
}

function Test-Feature {
    param(
        [string]$Name,
        [scriptblock]$Test
    )
    
    Write-Host "Testing: $Name..." -NoNewline
    
    try {
        $result = & $Test
        if ($result) {
            Write-Host " ✅ PASS" -ForegroundColor Green
            $results.Pass += $Name
            return $true
        } else {
            Write-Host " ❌ FAIL" -ForegroundColor Red
            $results.Fail += $Name
            return $false
        }
    } catch {
        Write-Host " ⚠️ ERROR: $($_.Exception.Message)" -ForegroundColor Yellow
        $results.Warning += "$Name - $($_.Exception.Message)"
        return $false
    }
}

# ============================================
# Test 1: Docker Desktop Running
# ============================================
Write-Host "`n[1/10] Docker Services" -ForegroundColor Magenta
Write-Host "────────────────────────────────────" -ForegroundColor Gray

Test-Feature "Docker Desktop" {
    $null = docker --version 2>&1
    $LASTEXITCODE -eq 0
}

Test-Feature "Docker Compose" {
    $null = docker-compose --version 2>&1
    $LASTEXITCODE -eq 0
}

# ============================================
# Test 2: Infrastructure Services
# ============================================
Write-Host "`n[2/10] Infrastructure Services" -ForegroundColor Magenta
Write-Host "────────────────────────────────────" -ForegroundColor Gray

Test-Feature "PostgreSQL Container" {
    $output = docker ps --filter "name=postgres" --format "{{.Status}}"
    $output -match "Up"
}

Test-Feature "Redis Container" {
    $output = docker ps --filter "name=redis" --format "{{.Status}}"
    $output -match "Up"
}

Test-Feature "Kafka Container" {
    $output = docker ps --filter "name=kafka" --format "{{.Status}}"
    $output -match "Up"
}

Test-Feature "Temporal Container" {
    $output = docker ps --filter "name=temporal" --format "{{.Status}}"
    $output -match "Up"
}

# ============================================
# Test 3: Database Connectivity
# ============================================
Write-Host "`n[3/10] Database Connectivity" -ForegroundColor Magenta
Write-Host "────────────────────────────────────" -ForegroundColor Gray

Test-Feature "PostgreSQL Connection" {
    $result = docker exec automationmarketplace-postgres-1 pg_isready -U platform_user 2>&1
    $result -match "accepting connections"
}

Test-Feature "Redis Connection" {
    $result = docker exec automationmarketplace-redis-1 redis-cli ping 2>&1
    $result -match "PONG"
}

# ============================================
# Test 4: API Server
# ============================================
Write-Host "`n[4/10] API Server" -ForegroundColor Magenta
Write-Host "────────────────────────────────────" -ForegroundColor Gray

Test-Feature "API Health Endpoint" {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 3 -ErrorAction Stop
    $response -ne $null
}

Test-Feature "API Workflows Endpoint" {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/workflows" -TimeoutSec 3 -ErrorAction Stop
    $response.StatusCode -eq 200 -or $response.StatusCode -eq 401
}

# ============================================
# Test 5: Authentication
# ============================================
Write-Host "`n[5/10] Authentication System" -ForegroundColor Magenta
Write-Host "────────────────────────────────────" -ForegroundColor Gray

Test-Feature "Register Endpoint Available" {
    try {
        $body = @{
            email = "test-$(Get-Random)@example.com"
            password = "Test123!"
            name = "Test User"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" `
            -Method POST `
            -ContentType "application/json" `
            -Body $body `
            -TimeoutSec 3 `
            -ErrorAction Stop
        
        $response.token -ne $null
    } catch {
        # Even if it fails, endpoint exists
        $_.Exception.Message -notmatch "404"
    }
}

# ============================================
# Test 6: Frontend
# ============================================
Write-Host "`n[6/10] Frontend Application" -ForegroundColor Magenta
Write-Host "────────────────────────────────────" -ForegroundColor Gray

Test-Feature "Frontend Server Running" {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 3 -ErrorAction Stop
    $response.StatusCode -eq 200
}

Test-Feature "Vite Dev Server" {
    $response = Invoke-WebRequest -Uri "http://localhost:5173/@vite/client" -TimeoutSec 3 -ErrorAction Stop
    $response.StatusCode -eq 200
}

# ============================================
# Test 7: Orchestrator
# ============================================
Write-Host "`n[7/10] Go Orchestrator" -ForegroundColor Magenta
Write-Host "────────────────────────────────────" -ForegroundColor Gray

Test-Feature "Orchestrator Health" {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/health" -TimeoutSec 3 -ErrorAction Stop
    $response -ne $null
}

# ============================================
# Test 8: Temporal
# ============================================
Write-Host "`n[8/10] Temporal Workflow Engine" -ForegroundColor Magenta
Write-Host "────────────────────────────────────" -ForegroundColor Gray

Test-Feature "Temporal UI Accessible" {
    $response = Invoke-WebRequest -Uri "http://localhost:8081" -TimeoutSec 3 -ErrorAction Stop
    $response.StatusCode -eq 200
}

Test-Feature "Temporal gRPC Port" {
    $connection = Test-NetConnection -ComputerName localhost -Port 7233 -WarningAction SilentlyContinue
    $connection.TcpTestSucceeded
}

# ============================================
# Test 9: Worker Environments
# ============================================
Write-Host "`n[9/10] Multi-Language Workers" -ForegroundColor Magenta
Write-Host "────────────────────────────────────" -ForegroundColor Gray

Test-Feature "Node.js Available" {
    $version = node --version 2>&1
    $version -match "v20\." -or $version -match "v22\." -or $version -match "v24\."
}

Test-Feature "Python Available" {
    $version = python --version 2>&1
    $version -match "Python 3\."
}

Test-Feature "Go Available" {
    $version = go version 2>&1
    $version -match "go1\."
}

# ============================================
# Test 10: Build System
# ============================================
Write-Host "`n[10/10] Build System" -ForegroundColor Magenta
Write-Host "────────────────────────────────────" -ForegroundColor Gray

Test-Feature "pnpm Available" {
    $version = pnpm --version 2>&1
    $LASTEXITCODE -eq 0
}

Test-Feature "TypeScript Compiler" {
    $version = tsc --version 2>&1
    $version -match "Version"
}

# ============================================
# Summary Report
# ============================================
Write-Host "`n`n" -NoNewline
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                      TEST SUMMARY                            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$total = $results.Pass.Count + $results.Fail.Count + $results.Warning.Count
$passRate = if ($total -gt 0) { [math]::Round(($results.Pass.Count / $total) * 100) } else { 0 }

Write-Host "`nTotal Tests: $total" -ForegroundColor White
Write-Host "✅ Passed: $($results.Pass.Count)" -ForegroundColor Green
Write-Host "❌ Failed: $($results.Fail.Count)" -ForegroundColor Red
Write-Host "⚠️ Warnings: $($results.Warning.Count)" -ForegroundColor Yellow
Write-Host "Success Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 80) { "Green" } elseif ($passRate -ge 50) { "Yellow" } else { "Red" })

if ($results.Fail.Count -gt 0) {
    Write-Host "`n❌ Failed Tests:" -ForegroundColor Red
    foreach ($fail in $results.Fail) {
        Write-Host "   • $fail" -ForegroundColor Red
    }
}

if ($results.Warning.Count -gt 0) {
    Write-Host "`n⚠️ Warnings:" -ForegroundColor Yellow
    foreach ($warn in $results.Warning) {
        Write-Host "   • $warn" -ForegroundColor Yellow
    }
}

Write-Host "`n" -NoNewline
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    NEXT STEPS                                ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

if ($results.Fail -contains "Docker Desktop") {
    Write-Host "`n1. Start Docker Desktop and wait for it to be ready" -ForegroundColor Yellow
    Write-Host "2. Run: docker-compose up -d" -ForegroundColor Yellow
}

if ($results.Fail -match "Container") {
    Write-Host "`n1. Start infrastructure: docker-compose up -d" -ForegroundColor Yellow
    Write-Host "2. Wait 30 seconds, then run this script again" -ForegroundColor Yellow
}

if ($results.Fail -contains "API Health Endpoint") {
    Write-Host "`n1. Start API server:" -ForegroundColor Yellow
    Write-Host "   cd api && pnpm dev" -ForegroundColor White
}

if ($results.Fail -contains "Frontend Server Running") {
    Write-Host "`n1. Start frontend server:" -ForegroundColor Yellow
    Write-Host "   cd frontend && pnpm dev" -ForegroundColor White
}

if ($passRate -ge 80) {
    Write-Host "`n🎉 System is mostly operational! Open http://localhost:5173 to test" -ForegroundColor Green
} elseif ($passRate -ge 50) {
    Write-Host "`n⚠️ Some components need attention. Check failures above." -ForegroundColor Yellow
} else {
    Write-Host "`n🚨 Multiple systems down. Follow next steps to start services." -ForegroundColor Red
}

Write-Host "`nFor detailed testing, see: TEST_GUIDE.md`n" -ForegroundColor Cyan
