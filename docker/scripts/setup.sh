#!/bin/bash

# =============================================================================
# Setup Script
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

set -e

# =============================================================================
# Colors for output
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =============================================================================
# Helper functions
# =============================================================================
print_error() {
    echo -e "${RED}ERROR: $1${NC}"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# =============================================================================
# Validate dev name (alphanumeric only, for domain compatibility)
# =============================================================================
validate_dev_name() {
    local name=$1
    if [[ ! "$name" =~ ^[a-zA-Z0-9]+$ ]]; then
        return 1
    fi
    return 0
}

# =============================================================================
# Get or prompt for dev name
# =============================================================================
get_dev_name() {
    local config_file=".omnify-dev"
    
    # Try to read from file
    if [ -f "$config_file" ]; then
        local saved_name=$(cat "$config_file" 2>/dev/null | tr -d '\n')
        if [ -n "$saved_name" ] && validate_dev_name "$saved_name"; then
            echo "$saved_name"
            return 0
        fi
    fi
    
    # Check if we're in an interactive terminal
    if [ ! -t 0 ]; then
        # Non-interactive mode (e.g., running from npx omnify create-laravel-project)
        # Skip prompting, will be asked during 'npm run dev'
        # Return empty string (no exit code error)
        return 0
    fi
    
    # Prompt user for input (interactive mode)
    echo ""
    echo "=================================================="
    echo " Developer Name Required"
    echo "=================================================="
    echo ""
    echo "  This name will be used in your development URLs:"
    echo "  https://project.YOUR_NAME.dev.omnify.jp"
    echo ""
    echo "  Rules:"
    echo "    - Only letters and numbers (a-z, A-Z, 0-9)"
    echo "    - No spaces, hyphens, or special characters"
    echo "    - Example: satoshi, tanaka, john123"
    echo ""
    
    while true; do
        echo -n "  Enter your dev name: "
        read dev_name
        
        # Check if empty
        if [ -z "$dev_name" ]; then
            print_error "Dev name cannot be empty"
            continue
        fi
        
        # Convert to lowercase
        dev_name=$(echo "$dev_name" | tr '[:upper:]' '[:lower:]')
        
        # Validate
        if ! validate_dev_name "$dev_name"; then
            print_error "Invalid dev name: '$dev_name'"
            echo "         Only letters and numbers are allowed (no spaces, hyphens, or special characters)"
            continue
        fi
        
        # Save to file
        echo "$dev_name" > "$config_file"
        print_success "Saved to .omnify-dev"
        echo ""
        
        echo "$dev_name"
        return 0
    done
}

# =============================================================================
# Check all prerequisites
# =============================================================================
echo ""
echo "=================================================="
echo " Checking Prerequisites"
echo "=================================================="
echo ""

MISSING_PREREQS=0

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo "         Please install Node.js 18+: https://nodejs.org/"
    MISSING_PREREQS=1
else
    NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version must be 18 or higher (current: $(node -v))"
        echo "         Please upgrade Node.js: https://nodejs.org/"
        MISSING_PREREQS=1
    else
        print_success "Node.js $(node -v)"
    fi
fi

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    echo "         npm should come with Node.js installation"
    MISSING_PREREQS=1
else
    print_success "npm $(npm -v)"
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    echo "         Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    MISSING_PREREQS=1
else
    if ! docker info &> /dev/null 2>&1; then
        print_error "Docker is not running"
        echo "         Please start Docker Desktop and try again"
        MISSING_PREREQS=1
    else
        print_success "Docker $(docker -v | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')"
    fi
fi

# Exit if any prerequisites are missing
if [ $MISSING_PREREQS -eq 1 ]; then
    echo ""
    print_error "Prerequisites check failed. Please install missing dependencies and try again."
    echo ""
    exit 1
fi

echo ""
print_success "All prerequisites satisfied"
echo ""

# =============================================================================
# Docker helper functions (PHP/Composer run inside containers)
# =============================================================================
echo " Configuring Docker images for PHP/Composer..."
DOCKER_PHP_IMAGE="php:8.4-cli"
DOCKER_COMPOSER_IMAGE="composer:latest"
echo "   PHP:      $DOCKER_PHP_IMAGE"
echo "   Composer: $DOCKER_COMPOSER_IMAGE"
echo ""

# Run composer command via Docker
docker_composer() {
    docker run --rm -v "$(pwd):/app" -w /app \
        --user "$(id -u):$(id -g)" \
        "$DOCKER_COMPOSER_IMAGE" "$@"
}

# Run PHP command via Docker (with extensions for Laravel)
docker_php() {
    docker run --rm -v "$(pwd):/app" -w /app \
        --user "$(id -u):$(id -g)" \
        "$DOCKER_PHP_IMAGE" php "$@"
}

# =============================================================================
# Get developer name (for tunnel URLs) - skip in non-interactive mode
# =============================================================================
echo " Checking developer name configuration..."
DEV_NAME=""
if [ -t 0 ] && [ -t 1 ]; then
    # Interactive mode - can prompt for input
    DEV_NAME=$(get_dev_name) || true
else
    # Non-interactive mode - try to read from file only
    if [ -f ".omnify-dev" ]; then
        DEV_NAME=$(cat ".omnify-dev" 2>/dev/null | tr -d '\n')
    fi
fi

if [ -n "$DEV_NAME" ]; then
    echo " Developer: ${DEV_NAME}"
    echo ""
else
    echo ""
    print_warning "Developer name not configured yet"
    echo "         You will be prompted when running 'npm run dev'"
    echo ""
fi

# =============================================================================
# Install/update packages
# =============================================================================
if [ ! -d "node_modules" ]; then
    echo " Installing packages..."
    npm install
    print_success "Packages installed"
else
    echo " Packages already installed, skipping..."
fi

# Run Omnify postinstall (generate .claude docs)
echo " Generating Omnify docs..."
node node_modules/@famgia/omnify/scripts/postinstall.js 2>/dev/null || true
echo "    Omnify docs generated"

# Project name = folder name
PROJECT_NAME=$(basename "$(pwd)")

# Set domains (used for .env files, actual URLs come from tunnel)
DOMAIN="${PROJECT_NAME}.app"
API_DOMAIN="api.${PROJECT_NAME}.app"

echo " Setting up development environment for: ${PROJECT_NAME}"
echo ""

# =============================================================================
# Step 1: Setup backend (create Laravel if not exists)
# =============================================================================
if [ ! -d "./backend" ]; then
    echo ""
    echo " Creating Laravel API project via Docker..."
    echo "   (No local PHP/Composer required - using Docker containers)"
    echo ""
    
    # Pull Docker images first (for better UX)
    echo "   Pulling Docker images..."
    docker pull "$DOCKER_COMPOSER_IMAGE" > /dev/null 2>&1 || true
    docker pull "$DOCKER_PHP_IMAGE" > /dev/null 2>&1 || true
    
    # Create Laravel project via Docker Composer
    echo "   Running composer create-project..."
    docker run --rm -v "$(pwd):/app" -w /app \
        "$DOCKER_COMPOSER_IMAGE" \
        create-project laravel/laravel backend --prefer-dist --no-interaction

    # Fix permissions (Docker may create files as root)
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo chown -R "$(id -u):$(id -g)" ./backend 2>/dev/null || true
    fi

    # Install API with Sanctum (Laravel 11+) via Docker
    echo "   Installing Sanctum..."
    docker run --rm -v "$(pwd)/backend:/app" -w /app \
        "$DOCKER_PHP_IMAGE" php artisan install:api --no-interaction 2>/dev/null || true
    echo "    Sanctum installed"

    # Install Pest for testing via Docker (optional - may fail with newer PHP/Laravel)
    echo "   Installing Pest..."
    if docker run --rm -v "$(pwd)/backend:/app" -w /app \
        "$DOCKER_COMPOSER_IMAGE" \
        require pestphp/pest pestphp/pest-plugin-laravel --dev --with-all-dependencies --no-interaction 2>/dev/null; then
        print_success "Pest installed"
    else
        print_warning "Pest installation failed (PHP/Laravel version compatibility)"
        echo "         You can install Pest manually later if needed"
    fi

    # Install SSO Client package + dependencies via Docker
    echo "   Installing SSO Client..."
    docker run --rm -v "$(pwd)/backend:/app" -w /app \
        "$DOCKER_COMPOSER_IMAGE" \
        config --no-plugins allow-plugins.omnifyjp/omnify-client-laravel-sso true
    docker run --rm -v "$(pwd)/backend:/app" -w /app \
        "$DOCKER_COMPOSER_IMAGE" \
        require omnifyjp/omnify-client-laravel-sso lcobucci/jwt --no-interaction
    echo "    SSO Client installed"

    # Fix permissions again after composer operations
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo chown -R "$(id -u):$(id -g)" ./backend 2>/dev/null || true
    fi

    # Remove frontend stuff
    rm -rf ./backend/resources/js ./backend/resources/css ./backend/public/build
    rm -f ./backend/vite.config.js ./backend/package.json ./backend/package-lock.json ./backend/postcss.config.js ./backend/tailwind.config.js
    rm -rf ./backend/node_modules

    # Remove default Laravel migrations (Omnify will generate them)
    rm -f ./backend/database/migrations/*.php
    
    # Copy custom CORS config (supports *.dev.omnify.jp)
    echo "   Configuring CORS..."
    cp ./docker/stubs/cors.php.stub ./backend/config/cors.php
    echo "    CORS configured"
    
    # Configure bootstrap/app.php for CSRF exclusion and statefulApi
    echo "   Configuring middleware..."
    cp ./docker/stubs/bootstrap-app.php.stub ./backend/bootstrap/app.php
    echo "    Middleware configured"
    
    # Generate Omnify migrations
    echo " Generating Omnify migrations..."
    npx omnify reset -y && npx omnify generate
    echo "    Omnify migrations generated"
    
    # Copy User model with SSO trait (after Omnify generates base)
    echo "   Configuring User model with SSO..."
    cp ./docker/stubs/User.php.stub ./backend/app/Models/User.php
    echo "    User model configured"
    
    # Register OmnifyServiceProvider
    echo " Registering OmnifyServiceProvider..."
    cat > ./backend/bootstrap/providers.php << 'EOF'
<?php

return [
    App\Providers\AppServiceProvider::class,
    App\Providers\OmnifyServiceProvider::class,
];
EOF
    echo "    OmnifyServiceProvider registered"
    
    echo "    Laravel API project created"
    GENERATE_KEY=true
fi

# =============================================================================
# Step 2: Generate backend/.env (overwrite default Laravel .env)
# =============================================================================
if [ "$GENERATE_KEY" = true ] || [ ! -f "./backend/.env" ]; then
    echo " Generating backend/.env..."
    # Generate APP_KEY via Docker (no local PHP required)
    APP_KEY=$(docker run --rm -v "$(pwd)/backend:/app" -w /app \
        "$DOCKER_PHP_IMAGE" php artisan key:generate --show 2>/dev/null || \
        openssl rand -base64 32 | tr -d '\n' | sed 's/^/base64:/')
    cat > ./backend/.env << EOF
APP_NAME=${PROJECT_NAME}
APP_KEY=${APP_KEY}
APP_ENV=local
APP_DEBUG=true
APP_TIMEZONE=UTC
APP_URL=https://${API_DOMAIN}
FRONTEND_URL=https://${DOMAIN}

LOG_CHANNEL=stack
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=omnify
DB_USERNAME=omnify
DB_PASSWORD=secret

SESSION_DRIVER=cookie
SESSION_DOMAIN=.${DOMAIN}
SESSION_SAME_SITE=none
SESSION_SECURE_COOKIE=true
CACHE_DRIVER=file
QUEUE_CONNECTION=sync

SANCTUM_STATEFUL_DOMAINS=${DOMAIN},${API_DOMAIN}
CORS_ALLOWED_ORIGINS=https://${DOMAIN}

MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="\${APP_NAME}"

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
EOF
    echo "    backend/.env created"
    GENERATE_KEY=true
fi

# =============================================================================
# Step 2b: Generate backend/.env.testing (if not exists)
# =============================================================================
if [ ! -f "./backend/.env.testing" ]; then
    echo " Generating backend/.env.testing..."
    cp ./docker/stubs/env.testing.stub ./backend/.env.testing
    echo "    backend/.env.testing created"
fi

# =============================================================================
# Step 3: Start Docker services
# =============================================================================
echo ""
echo "  Generating docker-compose.yml..."

# Copy docker-compose.yml (no variable substitution needed for tunnel setup)
cp ./docker/stubs/docker-compose.yml.stub ./docker-compose.yml
echo "    docker-compose.yml generated"

echo ""
echo " Starting Docker services..."
docker compose up -d mysql redis phpmyadmin mailpit minio backend

echo ""
echo " Waiting for services..."

# Wait for backend to be healthy (MySQL + composer install can take 3-5 minutes on first run)
echo "   Waiting for backend to be ready (this may take a few minutes on first run)..."
MAX_RETRIES=300
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    BACKEND_STATUS=$(docker compose ps backend --format "{{.Health}}" 2>/dev/null)
    BACKEND_STATE=$(docker compose ps backend --format "{{.State}}" 2>/dev/null)
    
    if [ "$BACKEND_STATUS" = "healthy" ]; then
        echo "    Backend is healthy"
        break
    elif [ "$BACKEND_STATE" = "running" ]; then
        # Container is running but not yet healthy - check if PHP server is responding
        if docker compose exec -T backend curl -sf http://localhost:8000 >/dev/null 2>&1; then
            echo "    Backend is ready"
            break
        fi
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $((RETRY_COUNT % 5)) -eq 0 ]; then
        echo "   ... still waiting ($RETRY_COUNT/$MAX_RETRIES) - state: ${BACKEND_STATE:-pending}, health: ${BACKEND_STATUS:-unknown}"
    fi
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo " Backend failed to start in time. Checking logs..."
    docker compose logs mysql --tail 20
    echo ""
    docker compose logs backend --tail 30
    exit 1
fi

# Run setup tasks if needed
if [ "$GENERATE_KEY" = true ]; then
    # Publish SSO config only (migrations are generated by Omnify schema)
    echo " Publishing SSO config..."
    docker compose exec -T backend php artisan vendor:publish --tag=sso-client-config --force
    echo "    SSO config published"
    
    # Run migrations
    echo "  Running migrations..."
    docker compose exec -T backend php artisan migrate:fresh --force
    echo "    Migrations completed"
fi

# Create MinIO bucket if not exists
echo " Creating MinIO bucket..."
docker compose exec -T minio mc alias set local http://localhost:9000 minioadmin minioadmin 2>/dev/null || true
docker compose exec -T minio mc mb local/local --ignore-existing 2>/dev/null || true
docker compose exec -T minio mc anonymous set public local/local 2>/dev/null || true
echo "    MinIO bucket 'local' ready"

# =============================================================================
# Step 4: Setup frontend (create Next.js if not exists)
# =============================================================================
if [ ! -f "./frontend/package.json" ]; then
    rm -rf ./frontend 2>/dev/null
    echo ""
    echo " Creating Next.js project..."
    npx --yes create-next-app@latest frontend \
        --typescript \
        --tailwind \
        --eslint \
        --app \
        --src-dir \
        --import-alias "@/*" \
        --use-npm \
        --turbopack \
        --no-react-compiler
    
    # Configure Next.js
    echo ""
    echo "  Configuring Next.js..."
    cat > ./frontend/next.config.ts << 'EOF'
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
EOF

    # Install Ant Design
    echo "    Installing Ant Design..."
    cd frontend && npm install antd @ant-design/nextjs-registry @ant-design/icons && cd ..
    echo "    Ant Design installed"

    # Create frontend .env.local
    cat > ./frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=https://${API_DOMAIN}
EOF
    echo "    Next.js project created"
else
    # Frontend exists - ensure .env.local is up to date
    cat > ./frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=https://${API_DOMAIN}
EOF
    
    if [ ! -d "./frontend/node_modules" ]; then
        echo ""
        echo " Installing frontend dependencies..."
        cd frontend && npm install && cd ..
    fi
fi

# =============================================================================
# Done!
# =============================================================================
echo ""
echo "============================================="
echo " Setup complete!"
echo "============================================="
echo ""
echo " Requirements met:"
echo "   - Node.js + npm (for Omnify & frontend)"
echo "   - Docker (PHP/Composer run inside containers)"
echo ""
echo " Services:"
echo "   Database: omnify / omnify / secret"
echo "   Testing DB: omnify_testing"
echo "   SMTP: mailpit:1025 (no auth)"
echo "   S3: minio:9000 (minioadmin/minioadmin)"
echo ""
echo " Run 'npm run dev' to start with tunnel!"
echo "   URLs will be displayed after startup."
echo ""
