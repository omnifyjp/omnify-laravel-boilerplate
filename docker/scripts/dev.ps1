# =============================================================================
# Development Script for Windows (PowerShell)
# Sets up Docker nginx with SSL for local development
# Run as Administrator for hosts file modification
# =============================================================================

$ErrorActionPreference = "Stop"

# Project name = folder name
$PROJECT_NAME = Split-Path -Leaf (Get-Location)

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
$PMA_DOMAIN = "pma.$PROJECT_NAME.app"
$CERTS_DIR = ".\docker\nginx\certs"

Write-Host "🚀 Starting development environment for: $PROJECT_NAME" -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# Generate backend/.env (if not exists)
# =============================================================================
if (-not (Test-Path ".\backend\.env")) {
    Write-Host "📝 Generating backend/.env..." -ForegroundColor Yellow
    @"
APP_NAME=$PROJECT_NAME
APP_KEY=
APP_ENV=local
APP_DEBUG=true
APP_URL=https://$API_DOMAIN

LOG_CHANNEL=stack
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=omnify
DB_USERNAME=omnify
DB_PASSWORD=secret

SESSION_DRIVER=file
CACHE_DRIVER=file
QUEUE_CONNECTION=sync
"@ | Out-File -FilePath ".\backend\.env" -Encoding UTF8
    Write-Host "   ✅ backend/.env created" -ForegroundColor Green
    $GENERATE_KEY = $true
}

# =============================================================================
# Step 1: Setup mkcert
# =============================================================================
Write-Host "📦 Checking mkcert..." -ForegroundColor Yellow

if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
    Write-Host "   Installing mkcert via Chocolatey..."
    
    if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
        Write-Host "   ❌ Chocolatey not found. Please install from https://chocolatey.org/" -ForegroundColor Red
        Write-Host "   Or install mkcert manually: https://github.com/FiloSottile/mkcert#windows" -ForegroundColor Red
        exit 1
    }
    
    choco install mkcert -y
}

Write-Host "   ✅ mkcert ready" -ForegroundColor Green

# Install local CA
Write-Host "🔐 Installing local CA..." -ForegroundColor Yellow
mkcert -install 2>$null
Write-Host "   ✅ Local CA ready" -ForegroundColor Green

# Generate SSL certificates (if not exists)
if (-not (Test-Path "$CERTS_DIR\$DOMAIN.pem")) {
    Write-Host ""
    Write-Host "📜 Generating SSL certificates..." -ForegroundColor Yellow
    
    if (-not (Test-Path $CERTS_DIR)) {
        New-Item -ItemType Directory -Path $CERTS_DIR -Force | Out-Null
    }

    mkcert -key-file "$CERTS_DIR\$DOMAIN-key.pem" `
           -cert-file "$CERTS_DIR\$DOMAIN.pem" `
           $DOMAIN "*.$DOMAIN" localhost 127.0.0.1 ::1

    Write-Host "   ✅ Certificates generated" -ForegroundColor Green
}

# =============================================================================
# Step 2: Setup hosts file
# =============================================================================
Write-Host ""
Write-Host "🌐 Setting up hosts file..." -ForegroundColor Yellow

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$hostsContent = Get-Content $hostsPath -Raw
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($hostsContent -notmatch [regex]::Escape($DOMAIN)) {
    if (-not $isAdmin) {
        Write-Host "   ⚠️  Please run as Administrator to modify hosts file" -ForegroundColor Red
        Write-Host "   Or add manually to $hostsPath :" -ForegroundColor Yellow
        Write-Host "   127.0.0.1 $DOMAIN $API_DOMAIN $PMA_DOMAIN" -ForegroundColor White
    } else {
        $hostsEntry = "`n127.0.0.1 $DOMAIN $API_DOMAIN $PMA_DOMAIN"
        Add-Content -Path $hostsPath -Value $hostsEntry
        Write-Host "   ✅ Added to hosts file" -ForegroundColor Green
    }
} else {
    Write-Host "   ✅ Hosts file already configured" -ForegroundColor Green
}

# =============================================================================
# Step 3: Generate nginx.conf from template
# =============================================================================
Write-Host ""
Write-Host "⚙️  Generating nginx.conf..." -ForegroundColor Yellow

$template = Get-Content ".\docker\nginx\nginx.conf.template" -Raw
$template = $template -replace '\$\{DOMAIN\}', $DOMAIN
$template = $template -replace '\$\{API_DOMAIN\}', $API_DOMAIN
$template = $template -replace '\$\{PMA_DOMAIN\}', $PMA_DOMAIN
$template = $template -replace '\$\{FRONTEND_PORT\}', $FRONTEND_PORT
$template | Out-File -FilePath ".\docker\nginx\nginx.conf" -Encoding UTF8

Write-Host "   ✅ nginx.conf generated" -ForegroundColor Green

# =============================================================================
# Step 4: Start Docker services
# =============================================================================
Write-Host ""
Write-Host "🐳 Starting Docker services..." -ForegroundColor Yellow
docker compose up -d mysql phpmyadmin backend nginx

Write-Host ""
Write-Host "⏳ Waiting for services..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Generate APP_KEY if needed
if ($GENERATE_KEY) {
    Write-Host "🔑 Generating APP_KEY..." -ForegroundColor Yellow
    docker compose exec -T backend php artisan key:generate
    Write-Host "   ✅ APP_KEY generated" -ForegroundColor Green
}

# =============================================================================
# Install frontend dependencies (if needed)
# =============================================================================
if (-not (Test-Path ".\frontend\node_modules")) {
    Write-Host ""
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location .\frontend
    npm install
    Pop-Location
}

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
Write-Host "  🗄️  phpMyAdmin:  https://$PMA_DOMAIN" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Database: omnify / omnify / secret" -ForegroundColor Gray
Write-Host ""
Write-Host "---------------------------------------------" -ForegroundColor DarkGray
Write-Host "🖥️  Starting frontend dev server..." -ForegroundColor Yellow
Write-Host "---------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# Start frontend dev server
Push-Location .\frontend
npm run dev -- -p $FRONTEND_PORT
Pop-Location
