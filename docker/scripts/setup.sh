#!/bin/bash

# =============================================================================
# Setup Script
# Installs everything needed: Docker, SSL, Backend, Frontend, Migrations
# =============================================================================

set -e

# =============================================================================
# Check required tools
# =============================================================================
echo "🔍 Checking required tools..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo " Docker is not installed!"
    echo "   Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo " Docker is not running!"
    echo "   Please start Docker Desktop and try again."
    exit 1
fi
echo "    Docker"

# Check Composer (only needed if backend doesn't exist)
if [ ! -d "./backend" ]; then
    if ! command -v composer &> /dev/null; then
        echo "    Installing Composer..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install composer
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt update && sudo apt install -y composer
        else
            echo " Composer is not installed!"
            echo "   Please install Composer: https://getcomposer.org/download/"
            exit 1
        fi
    fi
    echo "    Composer"
fi

# Install/update packages
echo " Installing packages..."
npm install
echo "    Packages installed"

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
    echo " Creating Laravel API project..."
    
    # Create Laravel project
    composer create-project laravel/laravel backend --prefer-dist --no-interaction
    
    cd backend

    # Install API with Sanctum (Laravel 11+)
    php artisan install:api --no-interaction 2>/dev/null || true
    echo "    Sanctum installed"

    # Install Pest for testing
    echo "    Installing Pest..."
    composer require pestphp/pest pestphp/pest-plugin-laravel --dev --with-all-dependencies --no-interaction
    echo "    Pest installed"

    # Remove frontend stuff
    rm -rf resources/js resources/css public/build
    rm -f vite.config.js package.json package-lock.json postcss.config.js tailwind.config.js
    rm -rf node_modules

    # Remove default Laravel migrations (Omnify will generate them)
    rm -f database/migrations/*.php

    cd ..
    
    # Generate Omnify migrations
    echo " Generating Omnify migrations..."
    npx omnify reset -y && npx omnify generate
    echo "    Omnify migrations generated"
    
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
# Step 2: Generate backend/.env (if not exists)
# =============================================================================
if [ ! -f "./backend/.env" ]; then
    echo " Generating backend/.env..."
    cat > ./backend/.env << EOF
APP_NAME=${PROJECT_NAME}
APP_KEY=
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
MAX_RETRIES=150
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

# Generate APP_KEY if needed
if [ "$GENERATE_KEY" = true ]; then
    echo " Generating APP_KEY..."
    docker compose exec -T backend php artisan key:generate
    echo "    APP_KEY generated"
    
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
echo "  Database: omnify / omnify / secret"
echo "  Testing DB: omnify_testing"
echo "  SMTP: mailpit:1025 (no auth)"
echo "  S3: minio:9000 (minioadmin/minioadmin)"
echo ""
echo ""
echo " Run 'npm run dev' to start with tunnel!"
echo "   URLs will be displayed after startup."
echo ""
