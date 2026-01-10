# =============================================================================
# Development Script for Windows (PowerShell)
# Sets up local domains, SSL, and starts dev environment
# Run as Administrator for hosts file modification
# =============================================================================

$ErrorActionPreference = "Stop"

# Get folder name dynamically
$FOLDER_NAME = Split-Path -Leaf (Get-Location)
$DOMAIN = "$FOLDER_NAME.app"
$API_DOMAIN = "api.$DOMAIN"
$PMA_DOMAIN = "pma.$DOMAIN"
$CERTS_DIR = ".\docker\nginx\certs"

Write-Host "🚀 Starting development environment for: $DOMAIN" -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# Step 1: Check if running as Administrator
# =============================================================================
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# =============================================================================
# Step 2: Setup mkcert (if needed)
# =============================================================================
if (-not (Test-Path "$CERTS_DIR\$DOMAIN.pem")) {
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
    Write-Host ""
    Write-Host "🔐 Installing local CA..." -ForegroundColor Yellow
    mkcert -install
    Write-Host "   ✅ Local CA installed" -ForegroundColor Green

    # Generate SSL certificates
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
# Step 3: Update hosts file (if needed)
# =============================================================================
$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$hostsContent = Get-Content $hostsPath -Raw

if ($hostsContent -notmatch [regex]::Escape($DOMAIN)) {
    Write-Host ""
    Write-Host "🌐 Adding domains to hosts file..." -ForegroundColor Yellow
    
    if (-not $isAdmin) {
        Write-Host "   ⚠️  Please run as Administrator to modify hosts file" -ForegroundColor Red
        Write-Host "   Or add manually to $hostsPath :" -ForegroundColor Yellow
        Write-Host "   127.0.0.1 $DOMAIN $API_DOMAIN $PMA_DOMAIN" -ForegroundColor White
    } else {
        $hostsEntry = "`n127.0.0.1 $DOMAIN $API_DOMAIN $PMA_DOMAIN"
        Add-Content -Path $hostsPath -Value $hostsEntry
        Write-Host "   ✅ Hosts updated" -ForegroundColor Green
    }
}

# =============================================================================
# Step 4: Start Docker services
# =============================================================================
Write-Host ""
Write-Host "🐳 Starting Docker services..." -ForegroundColor Yellow
docker compose up -d mysql phpmyadmin backend nginx

Write-Host ""
Write-Host "⏳ Waiting for services..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# =============================================================================
# Step 5: Install frontend dependencies (if needed)
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
Write-Host "  Database: $FOLDER_NAME / $FOLDER_NAME / secret" -ForegroundColor Gray
Write-Host ""
Write-Host "---------------------------------------------" -ForegroundColor DarkGray
Write-Host "🖥️  Starting frontend dev server..." -ForegroundColor Yellow
Write-Host "---------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# Start frontend dev server
Push-Location .\frontend
npm run dev
Pop-Location
