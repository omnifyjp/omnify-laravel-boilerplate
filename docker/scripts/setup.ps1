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

# Docker image configuration
$DOCKER_PHP_IMAGE = "php:8.4-cli"
$DOCKER_COMPOSER_IMAGE = "composer:latest"

# =============================================================================
# Check required tools
# =============================================================================
Write-Host " Checking required tools..." -ForegroundColor Yellow

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host " Node.js is not installed!" -ForegroundColor Red
    Write-Host "   Please install Node.js 18+: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
$nodeVersion = (node -v) -replace 'v', '' -split '\.' | Select-Object -First 1
if ([int]$nodeVersion -lt 18) {
    Write-Host " Node.js version must be 18 or higher (current: $(node -v))" -ForegroundColor Red
    Write-Host "   Please upgrade Node.js: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host "    Node.js $(node -v)" -ForegroundColor Green

# Check npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host " npm is not installed!" -ForegroundColor Red
    Write-Host "   npm should come with Node.js installation" -ForegroundColor Yellow
    exit 1
}
Write-Host "    npm $(npm -v)" -ForegroundColor Green

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host " Docker is not installed!" -ForegroundColor Red
    Write-Host "   Please install Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host " Docker is not running!" -ForegroundColor Red
    Write-Host "   Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}
Write-Host "    Docker $(docker -v | Select-String -Pattern '\d+\.\d+\.\d+' | ForEach-Object { $_.Matches.Value })" -ForegroundColor Green

# Install/update packages (skip if already installed by pnpm or npm)
if (-not (Test-Path "node_modules")) {
    Write-Host " Installing packages..." -ForegroundColor Yellow
    npm install
    Write-Host "    Packages installed" -ForegroundColor Green
} else {
    Write-Host " Packages already installed, skipping..." -ForegroundColor Green
}

# Run Omnify postinstall (generate .claude docs)
Write-Host " Generating Omnify docs..." -ForegroundColor Yellow
node node_modules/@famgia/omnify/scripts/postinstall.js 2>$null
Write-Host "    Omnify docs generated" -ForegroundColor Green

# Project name = folder name
$PROJECT_NAME = Split-Path -Leaf (Get-Location)

# Set domains (used for .env files, actual URLs come from tunnel)
$DOMAIN = "$PROJECT_NAME.app"
$API_DOMAIN = "api.$PROJECT_NAME.app"

Write-Host " Setting up development environment for: $PROJECT_NAME" -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# Step 1: Setup backend (create Laravel if not exists)
# =============================================================================
if (-not (Test-Path ".\backend")) {
    Write-Host ""
    Write-Host " Creating Laravel API project via Docker..." -ForegroundColor Yellow
    Write-Host "   (No local PHP/Composer required - using Docker containers)" -ForegroundColor Gray
    Write-Host ""
    
    # Pull Docker images first (for better UX)
    Write-Host "   Pulling Docker images..." -ForegroundColor Gray
    docker pull $DOCKER_COMPOSER_IMAGE 2>$null
    docker pull $DOCKER_PHP_IMAGE 2>$null
    
    # Create Laravel project via Docker Composer
    Write-Host "   Running composer create-project..." -ForegroundColor Gray
    $currentDir = (Get-Location).Path -replace '\\', '/'
    docker run --rm -v "${currentDir}:/app" -w /app $DOCKER_COMPOSER_IMAGE create-project laravel/laravel backend --prefer-dist --no-interaction
    
    # Install API with Sanctum (Laravel 11+) via Docker
    Write-Host "   Installing Sanctum..." -ForegroundColor Gray
    docker run --rm -v "${currentDir}/backend:/app" -w /app $DOCKER_PHP_IMAGE php artisan install:api --no-interaction 2>$null
    Write-Host "    Sanctum installed" -ForegroundColor Green

    # Install Pest for testing via Docker
    Write-Host "   Installing Pest..." -ForegroundColor Gray
    docker run --rm -v "${currentDir}/backend:/app" -w /app $DOCKER_COMPOSER_IMAGE require pestphp/pest pestphp/pest-plugin-laravel --dev --with-all-dependencies --no-interaction
    Write-Host "    Pest installed" -ForegroundColor Green

    # Install SSO Client package + dependencies via Docker
    Write-Host "   Installing SSO Client..." -ForegroundColor Gray
    docker run --rm -v "${currentDir}/backend:/app" -w /app $DOCKER_COMPOSER_IMAGE config --no-plugins allow-plugins.omnifyjp/omnify-client-laravel-sso true
    docker run --rm -v "${currentDir}/backend:/app" -w /app $DOCKER_COMPOSER_IMAGE require omnifyjp/omnify-client-laravel-sso lcobucci/jwt --no-interaction
    Write-Host "    SSO Client installed" -ForegroundColor Green

    # Remove frontend stuff
    Remove-Item -Path ".\backend\resources\js", ".\backend\resources\css", ".\backend\public\build" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path ".\backend\vite.config.js", ".\backend\package.json", ".\backend\package-lock.json", ".\backend\postcss.config.js", ".\backend\tailwind.config.js" -Force -ErrorAction SilentlyContinue
    Remove-Item -Path ".\backend\node_modules" -Recurse -Force -ErrorAction SilentlyContinue

    # Remove default Laravel migrations
    Remove-Item -Path ".\backend\database\migrations\*.php" -Force -ErrorAction SilentlyContinue
    
    # Copy custom CORS config (supports *.dev.omnify.jp)
    Write-Host "   Configuring CORS..." -ForegroundColor Gray
    Copy-Item ".\docker\stubs\cors.php.stub" ".\backend\config\cors.php" -Force
    Write-Host "    CORS configured" -ForegroundColor Green
    
    # Configure bootstrap/app.php for CSRF exclusion and statefulApi
    Write-Host "   Configuring middleware..." -ForegroundColor Gray
    Copy-Item ".\docker\stubs\bootstrap-app.php.stub" ".\backend\bootstrap\app.php" -Force
    Write-Host "    Middleware configured" -ForegroundColor Green
    
    # Generate Omnify migrations
    Write-Host " Generating Omnify migrations..." -ForegroundColor Yellow
    npx omnify reset -y
    npx omnify generate
    Write-Host "    Omnify migrations generated" -ForegroundColor Green
    
    # Copy User model with SSO trait (after Omnify generates base)
    Write-Host "   Configuring User model with SSO..." -ForegroundColor Gray
    Copy-Item ".\docker\stubs\User.php.stub" ".\backend\app\Models\User.php" -Force
    Write-Host "    User model configured" -ForegroundColor Green
    
    # Register OmnifyServiceProvider
    Write-Host " Registering OmnifyServiceProvider..." -ForegroundColor Yellow
    Copy-Item ".\docker\stubs\providers.php.stub" ".\backend\bootstrap\providers.php" -Force
    Write-Host "    OmnifyServiceProvider registered" -ForegroundColor Green
    
    Write-Host "    Laravel API project created" -ForegroundColor Green
    $GENERATE_KEY = $true
}

# =============================================================================
# Step 2: Generate backend/.env (if not exists or GENERATE_KEY is true)
# =============================================================================
if ($GENERATE_KEY -or (-not (Test-Path ".\backend\.env"))) {
    Write-Host " Generating backend/.env..." -ForegroundColor Yellow
    
    # Generate APP_KEY via Docker (no local PHP required)
    $currentDir = (Get-Location).Path -replace '\\', '/'
    $APP_KEY = docker run --rm -v "${currentDir}/backend:/app" -w /app $DOCKER_PHP_IMAGE php artisan key:generate --show 2>$null
    if (-not $APP_KEY) {
        # Fallback to openssl if artisan fails
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
    $envContent | Out-File -FilePath ".\backend\.env" -Encoding UTF8 -NoNewline
    Write-Host "    backend/.env created" -ForegroundColor Green
    $GENERATE_KEY = $true
}

# =============================================================================
# Step 2b: Generate backend/.env.testing (if not exists)
# =============================================================================
if (-not (Test-Path ".\backend\.env.testing")) {
    Write-Host " Generating backend/.env.testing..." -ForegroundColor Yellow
    Copy-Item ".\docker\stubs\env.testing.stub" ".\backend\.env.testing"
    Write-Host "    backend/.env.testing created" -ForegroundColor Green
}

# =============================================================================
# Step 3: Start Docker services
# =============================================================================
Write-Host ""
Write-Host "  Generating docker-compose.yml..." -ForegroundColor Yellow

# Copy docker-compose.yml (no variable substitution needed for tunnel setup)
Copy-Item ".\docker\stubs\docker-compose.yml.stub" ".\docker-compose.yml" -Force
Write-Host "    docker-compose.yml generated" -ForegroundColor Green

Write-Host ""
Write-Host " Starting Docker services..." -ForegroundColor Yellow
docker compose up -d mysql redis phpmyadmin mailpit minio backend

Write-Host ""
Write-Host " Waiting for services..." -ForegroundColor Yellow

# Wait for backend to be healthy (MySQL + composer install can take 3-5 minutes on first run)
Write-Host "   Waiting for backend to be ready (this may take a few minutes on first run)..." -ForegroundColor Gray
$MAX_RETRIES = 300
$RETRY_COUNT = 0

while ($RETRY_COUNT -lt $MAX_RETRIES) {
    $BACKEND_STATUS = docker compose ps backend --format "{{.Health}}" 2>$null
    $BACKEND_STATE = docker compose ps backend --format "{{.State}}" 2>$null
    
    if ($BACKEND_STATUS -eq "healthy") {
        Write-Host "    Backend is healthy" -ForegroundColor Green
        break
    }
    elseif ($BACKEND_STATE -eq "running") {
        # Container is running but not yet healthy - check if PHP server is responding
        $curlResult = docker compose exec -T backend curl -sf http://localhost:8000 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    Backend is ready" -ForegroundColor Green
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
    Write-Host " Backend failed to start in time. Checking logs..." -ForegroundColor Red
    docker compose logs mysql --tail 20
    Write-Host ""
    docker compose logs backend --tail 30
    exit 1
}

# Run setup tasks if needed
if ($GENERATE_KEY) {
    # Publish SSO config only (migrations are generated by Omnify schema)
    Write-Host " Publishing SSO config..." -ForegroundColor Yellow
    docker compose exec -T backend php artisan vendor:publish --tag=sso-client-config --force
    Write-Host "    SSO config published" -ForegroundColor Green
    
    # Run migrations
    Write-Host "  Running migrations..." -ForegroundColor Yellow
    docker compose exec -T backend php artisan migrate:fresh --force
    Write-Host "    Migrations completed" -ForegroundColor Green
}

# Create MinIO bucket
Write-Host " Creating MinIO bucket..." -ForegroundColor Yellow
docker compose exec -T minio mc alias set local http://localhost:9000 minioadmin minioadmin 2>$null
docker compose exec -T minio mc mb local/local --ignore-existing 2>$null
docker compose exec -T minio mc anonymous set public local/local 2>$null
Write-Host "    MinIO bucket 'local' ready" -ForegroundColor Green

# =============================================================================
# Step 4: Setup frontend (create Next.js if not exists)
# =============================================================================
if (-not (Test-Path ".\frontend\package.json")) {
    Remove-Item -Path ".\frontend" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host ""
    Write-Host " Creating Next.js project..." -ForegroundColor Yellow
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
    Write-Host "  Configuring Next.js..." -ForegroundColor Yellow
    Copy-Item ".\docker\stubs\next.config.ts.stub" ".\frontend\next.config.ts" -Force

    # Install Ant Design
    Write-Host "    Installing Ant Design..." -ForegroundColor Yellow
    Push-Location .\frontend
    npm install antd @ant-design/nextjs-registry @ant-design/icons
    Pop-Location
    Write-Host "    Ant Design installed" -ForegroundColor Green

    # Create frontend .env.local
    "NEXT_PUBLIC_API_URL=https://$API_DOMAIN" | Out-File -FilePath ".\frontend\.env.local" -Encoding UTF8
    Write-Host "    Next.js project created" -ForegroundColor Green
} else {
    # Update frontend .env.local
    "NEXT_PUBLIC_API_URL=https://$API_DOMAIN" | Out-File -FilePath ".\frontend\.env.local" -Encoding UTF8
    
    if (-not (Test-Path ".\frontend\node_modules")) {
        Write-Host ""
        Write-Host " Installing frontend dependencies..." -ForegroundColor Yellow
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
Write-Host " Setup complete!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host " Requirements met:" -ForegroundColor Gray
Write-Host "   - Node.js + npm (for Omnify & frontend)" -ForegroundColor Gray
Write-Host "   - Docker (PHP/Composer run inside containers)" -ForegroundColor Gray
Write-Host ""
Write-Host " Services:" -ForegroundColor Gray
Write-Host "   Database: omnify / omnify / secret" -ForegroundColor Gray
Write-Host "   Testing DB: omnify_testing" -ForegroundColor Gray
Write-Host "   SMTP: mailpit:1025 (no auth)" -ForegroundColor Gray
Write-Host "   S3: minio:9000 (minioadmin/minioadmin)" -ForegroundColor Gray
Write-Host ""
Write-Host " Run 'npm run dev' to start with tunnel!" -ForegroundColor Yellow
Write-Host "   URLs will be displayed after startup." -ForegroundColor Gray
Write-Host ""
