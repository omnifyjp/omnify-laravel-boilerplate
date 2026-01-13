# =============================================================================
# Setup Script for Windows (PowerShell)
# Installs everything needed: Docker, SSL, Backend, Frontend, Migrations
# Run as Administrator for hosts file modification
# =============================================================================

$ErrorActionPreference = "Stop"

# =============================================================================
# Check required tools
# =============================================================================
Write-Host "🔍 Checking required tools..." -ForegroundColor Yellow

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker is not installed!" -ForegroundColor Red
    Write-Host "   Please install Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running!" -ForegroundColor Red
    Write-Host "   Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}
Write-Host "   ✅ Docker" -ForegroundColor Green

# Check Composer (only needed if backend doesn't exist)
if (-not (Test-Path ".\backend")) {
    if (-not (Get-Command composer -ErrorAction SilentlyContinue)) {
        Write-Host "   📦 Installing Composer..." -ForegroundColor Yellow
        if (Get-Command choco -ErrorAction SilentlyContinue) {
            choco install composer -y
        } else {
            Write-Host "❌ Composer is not installed!" -ForegroundColor Red
            Write-Host "   Please install Composer: https://getcomposer.org/download/" -ForegroundColor Yellow
            Write-Host "   Or install Chocolatey first: https://chocolatey.org/" -ForegroundColor Yellow
            exit 1
        }
    }
    Write-Host "   ✅ Composer" -ForegroundColor Green
}

# Install/update packages
Write-Host "📦 Installing packages..." -ForegroundColor Yellow
npm install
Write-Host "   ✅ Packages installed" -ForegroundColor Green

# Run Omnify postinstall (generate .claude docs)
Write-Host "📝 Generating Omnify docs..." -ForegroundColor Yellow
node node_modules/@famgia/omnify/scripts/postinstall.js 2>$null
Write-Host "   ✅ Omnify docs generated" -ForegroundColor Green

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

# Set domains (based on folder name)
$DOMAIN = "$PROJECT_NAME.app"
$API_DOMAIN = "api.$PROJECT_NAME.app"
$CERTS_DIR = ".\docker\nginx\certs"

Write-Host "🚀 Setting up development environment for: $PROJECT_NAME" -ForegroundColor Cyan
Write-Host ""

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
# Step 2: Setup backend (create Laravel if not exists)
# =============================================================================
if (-not (Test-Path ".\backend")) {
    Write-Host ""
    Write-Host "🚀 Creating Laravel API project..." -ForegroundColor Yellow
    
    composer create-project laravel/laravel backend --prefer-dist --no-interaction
    
    Push-Location .\backend

    # Install API with Sanctum (Laravel 11+)
    php artisan install:api --no-interaction 2>$null
    Write-Host "   ✅ Sanctum installed" -ForegroundColor Green

    # Install Pest for testing
    Write-Host "   📦 Installing Pest..." -ForegroundColor Yellow
    composer require pestphp/pest pestphp/pest-plugin-laravel --dev --with-all-dependencies --no-interaction
    Write-Host "   ✅ Pest installed" -ForegroundColor Green

    # Remove frontend stuff
    Remove-Item -Path "resources\js", "resources\css", "public\build" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "vite.config.js", "package.json", "package-lock.json", "postcss.config.js", "tailwind.config.js" -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue

    # Remove default Laravel migrations
    Remove-Item -Path "database\migrations\*.php" -Force -ErrorAction SilentlyContinue

    Pop-Location
    
    # Generate Omnify migrations
    Write-Host "📦 Generating Omnify migrations..." -ForegroundColor Yellow
    npx omnify reset -y
    npx omnify generate
    Write-Host "   ✅ Omnify migrations generated" -ForegroundColor Green
    
    # Register OmnifyServiceProvider
    Write-Host "📝 Registering OmnifyServiceProvider..." -ForegroundColor Yellow
    @"
<?php

return [
    App\Providers\AppServiceProvider::class,
    App\Providers\OmnifyServiceProvider::class,
];
"@ | Out-File -FilePath ".\backend\bootstrap\providers.php" -Encoding UTF8
    Write-Host "   ✅ OmnifyServiceProvider registered" -ForegroundColor Green
    
    Write-Host "   ✅ Laravel API project created" -ForegroundColor Green
    $GENERATE_KEY = $true
}

# =============================================================================
# Step 4: Generate backend/.env (if not exists)
# =============================================================================
if (-not (Test-Path ".\backend\.env")) {
    Write-Host "📝 Generating backend/.env..." -ForegroundColor Yellow
    @"
APP_NAME=$PROJECT_NAME
APP_KEY=
APP_ENV=local
APP_DEBUG=true
APP_TIMEZONE=UTC
APP_URL=https://$API_DOMAIN
FRONTEND_URL=https://$DOMAIN

LOG_CHANNEL=stack
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=omnify
DB_USERNAME=omnify
DB_PASSWORD=secret

SESSION_DRIVER=cookie
SESSION_DOMAIN=.$DOMAIN
CACHE_DRIVER=file
QUEUE_CONNECTION=sync

SANCTUM_STATEFUL_DOMAINS=$DOMAIN,$API_DOMAIN
CORS_ALLOWED_ORIGINS=https://$DOMAIN

MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="`${APP_NAME}"

FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=local
AWS_ENDPOINT=http://minio:9000
AWS_USE_PATH_STYLE_ENDPOINT=true
"@ | Out-File -FilePath ".\backend\.env" -Encoding UTF8
    Write-Host "   ✅ backend/.env created" -ForegroundColor Green
    $GENERATE_KEY = $true
}

# =============================================================================
# Step 4b: Generate backend/.env.testing (if not exists)
# =============================================================================
if (-not (Test-Path ".\backend\.env.testing")) {
    Write-Host "📝 Generating backend/.env.testing..." -ForegroundColor Yellow
    Copy-Item ".\docker\stubs\env.testing.stub" ".\backend\.env.testing"
    Write-Host "   ✅ backend/.env.testing created" -ForegroundColor Green
}

# =============================================================================
# Step 5: Start Docker services
# =============================================================================
Write-Host ""
Write-Host "⚙️  Generating nginx.conf..." -ForegroundColor Yellow
$FRONTEND_PORT = 3000

# Generate docker-compose.yml
$dcTemplate = Get-Content ".\docker\stubs\docker-compose.yml.stub" -Raw
$dcTemplate = $dcTemplate -replace '\$\{PROJECT_IP\}', $PROJECT_IP
$dcTemplate | Out-File -FilePath ".\docker-compose.yml" -Encoding UTF8
Write-Host "   ✅ docker-compose.yml generated (IP: $PROJECT_IP)" -ForegroundColor Green

# Generate nginx.conf
$template = Get-Content ".\docker\stubs\nginx.conf.stub" -Raw
$template = $template -replace '\$\{DOMAIN\}', $DOMAIN
$template = $template -replace '\$\{API_DOMAIN\}', $API_DOMAIN
$template = $template -replace '\$\{FRONTEND_PORT\}', $FRONTEND_PORT
$template | Out-File -FilePath ".\docker\nginx\nginx.conf" -Encoding UTF8
Write-Host "   ✅ nginx.conf generated" -ForegroundColor Green

Write-Host ""
Write-Host "🐳 Starting Docker services..." -ForegroundColor Yellow
docker compose up -d mysql phpmyadmin mailpit minio backend nginx

Write-Host ""
Write-Host "⏳ Waiting for services..." -ForegroundColor Yellow

# Wait for backend to be healthy (MySQL healthcheck can take up to 50s, then backend needs time to start)
Write-Host "   Waiting for backend to be ready..." -ForegroundColor Gray
$MAX_RETRIES = 60
$RETRY_COUNT = 0

while ($RETRY_COUNT -lt $MAX_RETRIES) {
    $BACKEND_STATUS = docker compose ps backend --format "{{.Health}}" 2>$null
    $BACKEND_STATE = docker compose ps backend --format "{{.State}}" 2>$null
    
    if ($BACKEND_STATUS -eq "healthy") {
        Write-Host "   ✅ Backend is healthy" -ForegroundColor Green
        break
    }
    elseif ($BACKEND_STATE -eq "running") {
        # Container is running but not yet healthy - check if PHP server is responding
        $curlResult = docker compose exec -T backend curl -sf http://localhost:8000 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Backend is ready" -ForegroundColor Green
            break
        }
    }
    
    $RETRY_COUNT++
    if ($RETRY_COUNT % 5 -eq 0) {
        $stateDisplay = if ($BACKEND_STATE) { $BACKEND_STATE } else { "pending" }
        $healthDisplay = if ($BACKEND_STATUS) { $BACKEND_STATUS } else { "unknown" }
        Write-Host "   ... still waiting ($RETRY_COUNT/$MAX_RETRIES) - state: $stateDisplay, health: $healthDisplay" -ForegroundColor Gray
    }
    Start-Sleep -Seconds 2
}

if ($RETRY_COUNT -eq $MAX_RETRIES) {
    Write-Host "❌ Backend failed to start in time. Checking logs..." -ForegroundColor Red
    docker compose logs mysql --tail 20
    Write-Host ""
    docker compose logs backend --tail 30
    exit 1
}

# Generate APP_KEY if needed
if ($GENERATE_KEY) {
    Write-Host "🔑 Generating APP_KEY..." -ForegroundColor Yellow
    docker compose exec -T backend php artisan key:generate
    Write-Host "   ✅ APP_KEY generated" -ForegroundColor Green
    
    # Run migrations
    Write-Host "🗄️  Running migrations..." -ForegroundColor Yellow
    docker compose exec -T backend php artisan migrate:fresh --force
    Write-Host "   ✅ Migrations completed" -ForegroundColor Green
}

# Create MinIO bucket
Write-Host "📦 Creating MinIO bucket..." -ForegroundColor Yellow
docker compose exec -T minio mc alias set local http://localhost:9000 minioadmin minioadmin 2>$null
docker compose exec -T minio mc mb local/local --ignore-existing 2>$null
docker compose exec -T minio mc anonymous set public local/local 2>$null
Write-Host "   ✅ MinIO bucket 'local' ready" -ForegroundColor Green

# =============================================================================
# Step 6: Setup frontend (create Next.js if not exists)
# =============================================================================
if (-not (Test-Path ".\frontend\package.json")) {
    Remove-Item -Path ".\frontend" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host ""
    Write-Host "🚀 Creating Next.js project..." -ForegroundColor Yellow
    npx --yes create-next-app@latest frontend `
        --typescript `
        --tailwind `
        --eslint `
        --app `
        --src-dir `
        --import-alias "@/*" `
        --use-npm `
        --turbopack `
        --no-react-compiler
    
    Write-Host ""
    Write-Host "⚙️  Configuring Next.js..." -ForegroundColor Yellow
    @"
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.app"],
  turbopack: {
    root: process.cwd(),
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.app",
      },
    ],
  },
};

export default nextConfig;
"@ | Out-File -FilePath ".\frontend\next.config.ts" -Encoding UTF8

    # Install Ant Design
    Write-Host "   📦 Installing Ant Design..." -ForegroundColor Yellow
    Push-Location .\frontend
    npm install antd @ant-design/nextjs-registry @ant-design/icons
    Pop-Location
    Write-Host "   ✅ Ant Design installed" -ForegroundColor Green

    @"
NEXT_PUBLIC_API_URL=https://$API_DOMAIN
"@ | Out-File -FilePath ".\frontend\.env.local" -Encoding UTF8
    Write-Host "   ✅ Next.js project created" -ForegroundColor Green
} else {
    @"
NEXT_PUBLIC_API_URL=https://$API_DOMAIN
"@ | Out-File -FilePath ".\frontend\.env.local" -Encoding UTF8
    
    if (-not (Test-Path ".\frontend\node_modules")) {
        Write-Host ""
        Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
        Push-Location .\frontend
        npm install
        Pop-Location
    }
}

# =============================================================================
# Done!
# =============================================================================
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐 Frontend:    https://$DOMAIN" -ForegroundColor Cyan
Write-Host "  🔌 API:         https://$API_DOMAIN" -ForegroundColor Cyan
Write-Host "  🗄️  phpMyAdmin:  https://${DOMAIN}:8080" -ForegroundColor Cyan
Write-Host "  📧 Mailpit:     https://${DOMAIN}:8025" -ForegroundColor Cyan
Write-Host "  📦 MinIO:       https://${DOMAIN}:9001 (console)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Database: omnify / omnify / secret" -ForegroundColor Gray
Write-Host "  SMTP: mailpit:1025 (no auth)" -ForegroundColor Gray
Write-Host "  S3: minio:9000 (minioadmin/minioadmin)" -ForegroundColor Gray
Write-Host ""
Write-Host "---------------------------------------------" -ForegroundColor DarkGray
Write-Host "Run 'npm run dev' to start frontend server" -ForegroundColor Yellow
Write-Host "---------------------------------------------" -ForegroundColor DarkGray
