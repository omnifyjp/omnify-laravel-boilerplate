# =============================================================================
# Dev Script for Windows (PowerShell)
# Starts Docker services and frontend dev server
# =============================================================================

$ErrorActionPreference = "Stop"

# Project name = folder name
$PROJECT_NAME = Split-Path -Leaf (Get-Location)

# Generate unique IP based on project name (127.0.0.2 - 127.0.0.254)
function Get-ProjectIP {
    param([string]$Name)
    $hash = [System.BitConverter]::ToString([System.Security.Cryptography.MD5]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Name))).Replace("-","").Substring(0,4)
    $num = [Convert]::ToInt32($hash, 16) % 253 + 2
    return "127.0.0.$num"
}
$PROJECT_IP = Get-ProjectIP -Name $PROJECT_NAME

# Function to find available port
function Find-AvailablePort {
    param([int]$StartPort)
    $port = $StartPort
    while (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue) {
        $port++
    }
    return $port
}

# Find available port for frontend
$FRONTEND_PORT = Find-AvailablePort -StartPort 3000

# Set domains (based on folder name)
$DOMAIN = "$PROJECT_NAME.app"
$API_DOMAIN = "api.$PROJECT_NAME.app"

# Check if setup is needed
if (-not (Test-Path ".\backend") -or -not (Test-Path ".\frontend\package.json")) {
    Write-Host "❌ Setup required. Run 'npm run setup' first." -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Starting development environment for: $PROJECT_NAME" -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# Step 1: Generate nginx.conf with current port
# =============================================================================
Write-Host "⚙️  Generating config files..." -ForegroundColor Yellow

# Generate docker-compose.yml
$dcTemplate = Get-Content ".\docker\stubs\docker-compose.yml.stub" -Raw
$dcTemplate = $dcTemplate -replace '\$\{PROJECT_IP\}', $PROJECT_IP
$dcTemplate | Out-File -FilePath ".\docker-compose.yml" -Encoding UTF8
Write-Host "   ✅ docker-compose.yml (IP: $PROJECT_IP)" -ForegroundColor Green

# Generate nginx.conf
$template = Get-Content ".\docker\stubs\nginx.conf.stub" -Raw
$template = $template -replace '\$\{DOMAIN\}', $DOMAIN
$template = $template -replace '\$\{API_DOMAIN\}', $API_DOMAIN
$template = $template -replace '\$\{FRONTEND_PORT\}', $FRONTEND_PORT
$template | Out-File -FilePath ".\docker\nginx\nginx.conf" -Encoding UTF8
Write-Host "   ✅ nginx.conf (port: $FRONTEND_PORT)" -ForegroundColor Green

# =============================================================================
# Step 2: Start Docker services
# =============================================================================
Write-Host ""
Write-Host "🐳 Starting Docker services..." -ForegroundColor Yellow
docker compose up -d mysql phpmyadmin mailpit minio backend nginx

# Restart nginx to pick up new config (port may have changed)
docker compose restart nginx 2>$null

# =============================================================================
# Step 3: Update frontend .env.local
# =============================================================================
@"
NEXT_PUBLIC_API_URL=https://$API_DOMAIN
"@ | Out-File -FilePath ".\frontend\.env.local" -Encoding UTF8

# =============================================================================
# Ready!
# =============================================================================
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "✅ Development environment ready!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐 Frontend:    https://$DOMAIN" -ForegroundColor Cyan
Write-Host "  🔌 API:         https://$API_DOMAIN" -ForegroundColor Cyan
Write-Host "  🗄️  phpMyAdmin:  https://${DOMAIN}:8080" -ForegroundColor Cyan
Write-Host "  📧 Mailpit:     https://${DOMAIN}:8025" -ForegroundColor Cyan
Write-Host "  📦 MinIO:       https://${DOMAIN}:9001 (console)" -ForegroundColor Cyan
Write-Host ""
Write-Host "---------------------------------------------" -ForegroundColor DarkGray
Write-Host "🖥️  Starting frontend dev server..." -ForegroundColor Yellow
Write-Host "---------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# Cleanup: Remove lock file (Next.js will handle process cleanup)
Write-Host "🧹 Cleaning up..." -ForegroundColor Yellow
Remove-Item -Path ".\frontend\.next\dev\lock" -Force -ErrorAction SilentlyContinue

# Start frontend dev server
Write-Host "🖥️  Starting frontend dev server..." -ForegroundColor Cyan
Push-Location .\frontend
npm run dev -- -p $FRONTEND_PORT
Pop-Location
