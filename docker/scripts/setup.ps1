# =============================================================================
# Setup Script for Windows (PowerShell)
# Installs everything needed: Docker, SSL, Backend, Frontend, Migrations
# Run as Administrator for hosts file modification
# =============================================================================

$ErrorActionPreference = "Stop"

# =============================================================================
# Check required tools
# =============================================================================
Write-Host " Checking required tools..." -ForegroundColor Yellow

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
Write-Host "    Docker" -ForegroundColor Green

# Check Composer (only needed if backend doesn't exist)
if (-not (Test-Path ".\backend")) {
    if (-not (Get-Command composer -ErrorAction SilentlyContinue)) {
        Write-Host "    Installing Composer..." -ForegroundColor Yellow
        if (Get-Command choco -ErrorAction SilentlyContinue) {
            choco install composer -y
        } else {
            Write-Host " Composer is not installed!" -ForegroundColor Red
            Write-Host "   Please install Composer: https://getcomposer.org/download/" -ForegroundColor Yellow
            Write-Host "   Or install Chocolatey first: https://chocolatey.org/" -ForegroundColor Yellow
            exit 1
        }
    }
    Write-Host "    Composer" -ForegroundColor Green
}

# Install/update packages
Write-Host " Installing packages..." -ForegroundColor Yellow
npm install
Write-Host "    Packages installed" -ForegroundColor Green

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
    Write-Host " Creating Laravel API project..." -ForegroundColor Yellow
    
    composer create-project laravel/laravel backend --prefer-dist --no-interaction
    
    Push-Location .\backend

    # Install API with Sanctum (Laravel 11+)
    php artisan install:api --no-interaction 2>$null
    Write-Host "    Sanctum installed" -ForegroundColor Green

    # Install Pest for testing
    Write-Host "    Installing Pest..." -ForegroundColor Yellow
    composer require pestphp/pest pestphp/pest-plugin-laravel --dev --with-all-dependencies --no-interaction
    Write-Host "    Pest installed" -ForegroundColor Green

    # Remove frontend stuff
    Remove-Item -Path "resources\js", "resources\css", "public\build" -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "vite.config.js", "package.json", "package-lock.json", "postcss.config.js", "tailwind.config.js" -Force -ErrorAction SilentlyContinue
    Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue

    # Remove default Laravel migrations
    Remove-Item -Path "database\migrations\*.php" -Force -ErrorAction SilentlyContinue

    Pop-Location
    
    # Generate Omnify migrations
    Write-Host " Generating Omnify migrations..." -ForegroundColor Yellow
    npx omnify reset -y
    npx omnify generate
    Write-Host "    Omnify migrations generated" -ForegroundColor Green
    
    # Register OmnifyServiceProvider
    Write-Host " Registering OmnifyServiceProvider..." -ForegroundColor Yellow
    Copy-Item ".\docker\stubs\providers.php.stub" ".\backend\bootstrap\providers.php" -Force
    Write-Host "    OmnifyServiceProvider registered" -ForegroundColor Green
    
    Write-Host "    Laravel API project created" -ForegroundColor Green
    $GENERATE_KEY = $true
}

# =============================================================================
# Step 2: Generate backend/.env (if not exists)
# =============================================================================
if (-not (Test-Path ".\backend\.env")) {
    Write-Host " Generating backend/.env..." -ForegroundColor Yellow
    # Copy stub and replace placeholders
    $envContent = Get-Content ".\docker\stubs\backend.env.stub" -Raw
    $envContent = $envContent -replace "__PROJECT_NAME__", $PROJECT_NAME
    $envContent = $envContent -replace "__DOMAIN__", $DOMAIN
    $envContent = $envContent -replace "__API_DOMAIN__", $API_DOMAIN
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
$MAX_RETRIES = 150
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

# Generate APP_KEY if needed
if ($GENERATE_KEY) {
    Write-Host " Generating APP_KEY..." -ForegroundColor Yellow
    docker compose exec -T backend php artisan key:generate
    Write-Host "    APP_KEY generated" -ForegroundColor Green
    
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
Write-Host "  Database: omnify / omnify / secret" -ForegroundColor Gray
Write-Host "  Testing DB: omnify_testing" -ForegroundColor Gray
Write-Host "  SMTP: mailpit:1025 (no auth)" -ForegroundColor Gray
Write-Host "  S3: minio:9000 (minioadmin/minioadmin)" -ForegroundColor Gray
Write-Host ""
Write-Host "" -ForegroundColor DarkGray
Write-Host " Run 'npm run dev' to start with tunnel!" -ForegroundColor Yellow
Write-Host "   URLs will be displayed after startup." -ForegroundColor Gray
Write-Host "" -ForegroundColor DarkGray
