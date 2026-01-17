# =============================================================================
# Setup Script for Windows (PowerShell)
# Sets up everything needed: Backend (Laravel), Frontend (Next.js), Migrations
#
# Prerequisites (must be installed manually):
#   - Node.js 18+
#   - npm
#   - Docker Desktop (running)
#
# NOT required (handled via Docker):
#   - PHP (runs in Docker container)
#   - Composer (runs in Docker container)
# =============================================================================

$ErrorActionPreference = "Stop"

# =============================================================================
# Write File with UTF-8 (no BOM) and LF line endings
# =============================================================================
function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )
    # Convert CRLF to LF
    $Content = $Content -replace "`r`n", "`n"
    # Write UTF-8 without BOM
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

# =============================================================================
# Helper functions
# =============================================================================
function Write-Error-Message {
    param([string]$Message)
    Write-Host "ERROR: $Message" -ForegroundColor Red
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warning-Message {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

# =============================================================================
# Validate dev name (alphanumeric only, for domain compatibility)
# =============================================================================
function Test-DevName {
    param([string]$Name)
    return $Name -match '^[a-zA-Z0-9]+$'
}

# =============================================================================
# Get system username (clean, alphanumeric only)
# =============================================================================
function Get-SystemUsername {
    $username = $env:USERNAME.ToLower() -replace '[^a-z0-9]', ''
    if ([string]::IsNullOrWhiteSpace($username)) {
        $username = "developer"
    }
    return $username
}

# =============================================================================
# STEP 1: Get developer name FIRST (before anything else)
# =============================================================================
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Omnify Laravel Project Setup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$CONFIG_FILE = ".omnify-dev"
$DEV_NAME = $null

# Check if already configured
if (Test-Path $CONFIG_FILE) {
    $SAVED_NAME = (Get-Content $CONFIG_FILE -Raw -ErrorAction SilentlyContinue)
    if ($SAVED_NAME) {
        $SAVED_NAME = $SAVED_NAME.Trim()
        if ((Test-DevName $SAVED_NAME)) {
            $DEV_NAME = $SAVED_NAME
            Write-Host "  Developer: $DEV_NAME"
        }
    }
}

# If not configured, use system username
if (-not $DEV_NAME) {
    $DEV_NAME = Get-SystemUsername
    $DEV_NAME | Set-Content $CONFIG_FILE -NoNewline
    Write-Host "  Developer: $DEV_NAME (auto-detected)"
}

Write-Host "  URLs will be: https://PROJECT.$DEV_NAME.dev.omnify.jp"
Write-Host ""

# =============================================================================
# STEP 2: Check all prerequisites
# =============================================================================
Write-Host "=================================================="
Write-Host " Checking Prerequisites"
Write-Host "=================================================="
Write-Host ""

$MISSING_PREREQS = $false

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error-Message "Node.js is not installed"
    Write-Host "         Please install Node.js 18+: https://nodejs.org/"
    $MISSING_PREREQS = $true
} else {
    $nodeVersion = (node -v) -replace 'v', '' -split '\.' | Select-Object -First 1
    if ([int]$nodeVersion -lt 18) {
        Write-Error-Message "Node.js version must be 18 or higher (current: $(node -v))"
        Write-Host "         Please upgrade Node.js: https://nodejs.org/"
        $MISSING_PREREQS = $true
    } else {
        Write-Success "Node.js $(node -v)"
    }
}

# Check npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error-Message "npm is not installed"
    Write-Host "         npm should come with Node.js installation"
    $MISSING_PREREQS = $true
} else {
    Write-Success "npm $(npm -v)"
}

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error-Message "Docker is not installed"
    Write-Host "         Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    $MISSING_PREREQS = $true
} else {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Message "Docker is not running"
        Write-Host "         Please start Docker Desktop and try again"
        $MISSING_PREREQS = $true
    } else {
        $dockerVersion = docker -v | Select-String -Pattern '\d+\.\d+\.\d+' | ForEach-Object { $_.Matches.Value }
        Write-Success "Docker $dockerVersion"
    }
}

# Exit if any prerequisites are missing
if ($MISSING_PREREQS) {
    Write-Host ""
    Write-Error-Message "Prerequisites check failed. Please install missing dependencies and try again."
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Success "All prerequisites satisfied"
Write-Host ""

# =============================================================================
# Docker helper functions (PHP/Composer run inside containers)
# =============================================================================
Write-Host " Configuring Docker images for PHP/Composer..."
$DOCKER_PHP_IMAGE = "php:8.4-cli"
$DOCKER_COMPOSER_IMAGE = "composer:latest"
Write-Host "   PHP:      $DOCKER_PHP_IMAGE"
Write-Host "   Composer: $DOCKER_COMPOSER_IMAGE"
Write-Host ""

# =============================================================================
# Install/update packages
# =============================================================================
if (-not (Test-Path "node_modules")) {
    Write-Host " Installing packages..."
    npm install
    Write-Success "Packages installed"
} else {
    Write-Host " Packages already installed, skipping..."
}

# Run Omnify postinstall (generate .claude docs)
Write-Host " Generating Omnify docs..."
node node_modules/@famgia/omnify/scripts/postinstall.js 2>$null
Write-Host "    Omnify docs generated"

# Project name = folder name
$PROJECT_NAME = Split-Path -Leaf (Get-Location)

# Set domains (used for .env files, actual URLs come from tunnel)
$DOMAIN = "$PROJECT_NAME.app"
$API_DOMAIN = "api.$PROJECT_NAME.app"

Write-Host " Setting up development environment for: $PROJECT_NAME"
Write-Host ""

# =============================================================================
# Step 1: Setup backend (create Laravel if not exists)
# =============================================================================
$GENERATE_KEY = $false
if (-not (Test-Path ".\backend")) {
    Write-Host ""
    Write-Host " Creating Laravel API project via Docker..."
    Write-Host "   (No local PHP/Composer required - using Docker containers)"
    Write-Host ""
    
    # Pull Docker images first (for better UX)
    Write-Host "   Pulling Docker images..."
    docker pull $DOCKER_COMPOSER_IMAGE 2>$null
    docker pull $DOCKER_PHP_IMAGE 2>$null
    
    # Create Laravel project via Docker Composer
    Write-Host "   Running composer create-project..."
    $currentDir = (Get-Location).Path -replace '\\', '/'
    docker run --rm -v "${currentDir}:/app" -w /app $DOCKER_COMPOSER_IMAGE create-project laravel/laravel backend --prefer-dist --no-interaction
    
    # Install API with Sanctum (Laravel 11+) via Docker
    Write-Host "   Installing Sanctum..."
    docker run --rm -v "${currentDir}/backend:/app" -w /app $DOCKER_PHP_IMAGE php artisan install:api --no-interaction 2>$null
    Write-Success "Sanctum installed"

    # Install Pest for testing via Docker (optional - may fail with newer PHP/Laravel)
    Write-Host "   Installing Pest..."
    $pestResult = docker run --rm -v "${currentDir}/backend:/app" -w /app $DOCKER_COMPOSER_IMAGE require pestphp/pest pestphp/pest-plugin-laravel --dev --with-all-dependencies --no-interaction 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Pest installed"
    } else {
        Write-Warning-Message "Pest installation failed (PHP/Laravel version compatibility)"
        Write-Host "         You can install Pest manually later if needed"
    }

    # Install SSO Client package + dependencies via Docker
    Write-Host "   Installing SSO Client..."
    docker run --rm -v "${currentDir}/backend:/app" -w /app $DOCKER_COMPOSER_IMAGE config --no-plugins allow-plugins.omnifyjp/omnify-client-laravel-sso true
    docker run --rm -v "${currentDir}/backend:/app" -w /app $DOCKER_COMPOSER_IMAGE require omnifyjp/omnify-client-laravel-sso lcobucci/jwt --no-interaction
    Write-Success "SSO Client installed"

    # Remove frontend stuff
    Remove-Item -Path ".\backend\resources\js", ".\backend\resources\css", ".\backend\public\build" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path ".\backend\vite.config.js", ".\backend\package.json", ".\backend\package-lock.json", ".\backend\postcss.config.js", ".\backend\tailwind.config.js" -Force -ErrorAction SilentlyContinue
    Remove-Item -Path ".\backend\node_modules" -Recurse -Force -ErrorAction SilentlyContinue

    # Remove default Laravel migrations (Omnify will generate them)
    Remove-Item -Path ".\backend\database\migrations\*.php" -Force -ErrorAction SilentlyContinue
    
    # Copy custom CORS config (supports *.dev.omnify.jp)
    Write-Host "   Configuring CORS..."
    Copy-Item ".\docker\stubs\cors.php.stub" ".\backend\config\cors.php" -Force
    Write-Success "CORS configured"
    
    # Configure bootstrap/app.php for CSRF exclusion and statefulApi
    Write-Host "   Configuring middleware..."
    Copy-Item ".\docker\stubs\bootstrap-app.php.stub" ".\backend\bootstrap\app.php" -Force
    Write-Success "Middleware configured"
    
    # Generate Omnify migrations
    Write-Host " Generating Omnify migrations..."
    npx omnify reset -y
    npx omnify generate
    Write-Success "Omnify migrations generated"
    
    # Copy User model with SSO trait (after Omnify generates base)
    Write-Host "   Configuring User model with SSO..."
    Copy-Item ".\docker\stubs\User.php.stub" ".\backend\app\Models\User.php" -Force
    Write-Success "User model configured"
    
    # Register OmnifyServiceProvider
    Write-Host " Registering OmnifyServiceProvider..."
    $providersContent = @"
<?php

return [
    App\Providers\AppServiceProvider::class,
    App\Providers\OmnifyServiceProvider::class,
];
"@
    Write-Utf8NoBom -Path "$PWD\backend\bootstrap\providers.php" -Content $providersContent
    Write-Success "OmnifyServiceProvider registered"
    
    Write-Success "Laravel API project created"
    $GENERATE_KEY = $true
}

# =============================================================================
# Step 2: Generate backend/.env (overwrite default Laravel .env)
# =============================================================================
if ($GENERATE_KEY -or (-not (Test-Path ".\backend\.env"))) {
    Write-Host " Generating backend/.env..."
    
    # Generate APP_KEY via Docker (no local PHP required)
    $currentDir = (Get-Location).Path -replace '\\', '/'
    $APP_KEY = docker run --rm -v "${currentDir}/backend:/app" -w /app $DOCKER_PHP_IMAGE php artisan key:generate --show 2>$null
    if (-not $APP_KEY) {
        # Fallback to random key if artisan fails
        $APP_KEY = "base64:" + [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    }
    
    # Generate .env file
    $envContent = @"
APP_NAME=$PROJECT_NAME
APP_KEY=$APP_KEY
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
SESSION_SAME_SITE=none
SESSION_SECURE_COOKIE=true
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

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# SSO Configuration (dev.console.omnify.jp)
SSO_CONSOLE_URL=https://dev.console.omnify.jp
SSO_SERVICE_SLUG=test-service
SSO_SERVICE_SECRET=test_secret_2026_dev_only_do_not_use_in_prod
"@
    Write-Utf8NoBom -Path "$PWD\backend\.env" -Content $envContent
    Write-Success "backend/.env created"
    $GENERATE_KEY = $true
}

# =============================================================================
# Step 2b: Generate backend/.env.testing (if not exists)
# =============================================================================
if (-not (Test-Path ".\backend\.env.testing")) {
    Write-Host " Generating backend/.env.testing..."
    Copy-Item ".\docker\stubs\env.testing.stub" ".\backend\.env.testing"
    Write-Success "backend/.env.testing created"
}

# =============================================================================
# Step 3: Start Docker services
# =============================================================================
Write-Host ""
Write-Host "  Generating docker-compose.yml..."

# Copy docker-compose.yml (no variable substitution needed for tunnel setup)
Copy-Item ".\docker\stubs\docker-compose.yml.stub" ".\docker-compose.yml" -Force
Write-Success "docker-compose.yml generated"

Write-Host ""
Write-Host " Starting Docker services..."
docker compose up -d mysql redis phpmyadmin mailpit minio backend

Write-Host ""
Write-Host " Waiting for services..."

# Wait for backend to be healthy (MySQL + composer install can take 3-5 minutes on first run)
Write-Host "   Waiting for backend to be ready (this may take a few minutes on first run)..."
$MAX_RETRIES = 300
$RETRY_COUNT = 0

while ($RETRY_COUNT -lt $MAX_RETRIES) {
    $BACKEND_STATUS = docker compose ps backend --format "{{.Health}}" 2>$null
    $BACKEND_STATE = docker compose ps backend --format "{{.State}}" 2>$null
    
    if ($BACKEND_STATUS -eq "healthy") {
        Write-Success "Backend is healthy"
        break
    }
    elseif ($BACKEND_STATE -eq "running") {
        # Container is running but not yet healthy - check if PHP server is responding
        $curlResult = docker compose exec -T backend curl -sf http://localhost:8000 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Backend is ready"
            break
        }
    }
    
    $RETRY_COUNT++
    if ($RETRY_COUNT % 5 -eq 0) {
        $stateDisplay = if ($BACKEND_STATE) { $BACKEND_STATE } else { "pending" }
        $healthDisplay = if ($BACKEND_STATUS) { $BACKEND_STATUS } else { "unknown" }
        Write-Host "   ... still waiting ($RETRY_COUNT/$MAX_RETRIES) - state: $stateDisplay, health: $healthDisplay"
    }
    Start-Sleep -Seconds 2
}

if ($RETRY_COUNT -eq $MAX_RETRIES) {
    Write-Host " Backend failed to start in time. Checking logs..." -ForegroundColor Red
    docker compose logs mysql --tail 20
    Write-Host ""
    docker compose logs backend --tail 30
    exit 1
}

# Run setup tasks if needed
if ($GENERATE_KEY) {
    # Publish SSO config only (migrations are generated by Omnify schema)
    Write-Host " Publishing SSO config..."
    docker compose exec -T backend php artisan vendor:publish --tag=sso-client-config --force
    Write-Success "SSO config published"
    
    # Run migrations
    Write-Host "  Running migrations..."
    docker compose exec -T backend php artisan migrate:fresh --force
    Write-Success "Migrations completed"
}

# Create MinIO bucket if not exists
Write-Host " Creating MinIO bucket..."
docker compose exec -T minio mc alias set local http://localhost:9000 minioadmin minioadmin 2>$null
docker compose exec -T minio mc mb local/local --ignore-existing 2>$null
docker compose exec -T minio mc anonymous set public local/local 2>$null
Write-Success "MinIO bucket 'local' ready"

# =============================================================================
# Step 4: Setup frontend (create Next.js if not exists)
# =============================================================================
if (-not (Test-Path ".\frontend\package.json")) {
    Remove-Item -Path ".\frontend" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host ""
    Write-Host " Creating Next.js project..."
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
    
    # Configure Next.js
    Write-Host ""
    Write-Host "  Configuring Next.js..."
    $nextConfigContent = @"
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin requests from *.app domains
  allowedDevOrigins: ["*.app"],

  // Turbopack config
  turbopack: {
    root: process.cwd(),
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // Image optimization
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
"@
    Write-Utf8NoBom -Path "$PWD\frontend\next.config.ts" -Content $nextConfigContent

    # Install Ant Design
    Write-Host "    Installing Ant Design..."
    Push-Location .\frontend
    npm install antd @ant-design/nextjs-registry @ant-design/icons
    Pop-Location
    Write-Success "Ant Design installed"

    # Create frontend .env.local
    Write-Utf8NoBom -Path "$PWD\frontend\.env.local" -Content "NEXT_PUBLIC_API_URL=https://$API_DOMAIN"
    Write-Success "Next.js project created"
} else {
    # Frontend exists - ensure .env.local is up to date
    Write-Utf8NoBom -Path "$PWD\frontend\.env.local" -Content "NEXT_PUBLIC_API_URL=https://$API_DOMAIN"
    
    if (-not (Test-Path ".\frontend\node_modules")) {
        Write-Host ""
        Write-Host " Installing frontend dependencies..."
        Push-Location .\frontend
        npm install
        Pop-Location
    }
}

# =============================================================================
# Done!
# =============================================================================
Write-Host ""
Write-Host "============================================="
Write-Host " Setup complete!"
Write-Host "============================================="
Write-Host ""
Write-Host " Requirements met:"
Write-Host "   - Node.js + npm (for Omnify & frontend)"
Write-Host "   - Docker (PHP/Composer run inside containers)"
Write-Host ""
Write-Host " Services:"
Write-Host "   Database: omnify / omnify / secret"
Write-Host "   Testing DB: omnify_testing"
Write-Host "   SMTP: mailpit:1025 (no auth)"
Write-Host "   S3: minio:9000 (minioadmin/minioadmin)"
Write-Host ""
Write-Host " Run 'npm run dev' to start with tunnel!" -ForegroundColor Yellow
Write-Host "   URLs will be displayed after startup."
Write-Host ""
