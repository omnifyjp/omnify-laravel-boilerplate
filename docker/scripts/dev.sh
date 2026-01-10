#!/bin/bash

# =============================================================================
# Development Script
# Sets up Docker nginx with SSL for local development
# =============================================================================

set -e

# Project name = folder name
PROJECT_NAME=$(basename "$(pwd)")

# Function to find available port
find_available_port() {
    local port=$1
    while lsof -i:$port >/dev/null 2>&1; do
        port=$((port + 1))
    done
    echo $port
}

# Find available port for frontend
FRONTEND_PORT=$(find_available_port 3000)

# Set domains (based on folder name)
DOMAIN="${PROJECT_NAME}.app"
API_DOMAIN="api.${PROJECT_NAME}.app"
CERTS_DIR="./docker/nginx/certs"

echo "🚀 Starting development environment for: ${PROJECT_NAME}"
echo ""

# =============================================================================
# Setup backend (create Laravel if not exists)
# =============================================================================
if [ ! -d "./backend" ]; then
    echo ""
    echo "🚀 Creating Laravel API project..."
    
    # Create Laravel project
    composer create-project laravel/laravel backend --prefer-dist --no-interaction
    
    cd backend
    
    # Install API (Laravel 11+)
    php artisan install:api --no-interaction 2>/dev/null || true
    
    # Remove frontend stuff
    rm -rf resources/js resources/css public/build
    rm -f vite.config.js package.json package-lock.json postcss.config.js tailwind.config.js
    rm -rf node_modules
    
    # Remove default Laravel migrations (Omnify will generate them)
    rm -f database/migrations/*.php
    
    cd ..
    
    # Generate Omnify migrations
    echo "📦 Generating Omnify migrations..."
    npx omnify reset -y && npx omnify generate
    echo "   ✅ Omnify migrations generated"
    
    # Register OmnifyServiceProvider
    echo "📝 Registering OmnifyServiceProvider..."
    cat > ./backend/bootstrap/providers.php << 'EOF'
<?php

return [
    App\Providers\AppServiceProvider::class,
    App\Providers\OmnifyServiceProvider::class,
];
EOF
    echo "   ✅ OmnifyServiceProvider registered"
    
    echo "   ✅ Laravel API project created"
    GENERATE_KEY=true
fi

# =============================================================================
# Generate backend/.env (if not exists)
# =============================================================================
if [ ! -f "./backend/.env" ]; then
    echo "📝 Generating backend/.env..."
    cat > ./backend/.env << EOF
APP_NAME=${PROJECT_NAME}
APP_KEY=
APP_ENV=local
APP_DEBUG=true
APP_URL=https://${API_DOMAIN}

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
EOF
    echo "   ✅ backend/.env created"
    GENERATE_KEY=true
fi

# =============================================================================
# Step 1: Setup mkcert
# =============================================================================
echo "📦 Checking mkcert..."

if ! command -v mkcert &> /dev/null; then
    echo "   Installing mkcert..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS (Intel or Apple Silicon - brew handles both)
        brew install mkcert nss
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux - detect architecture
        ARCH=$(uname -m)
        case $ARCH in
            x86_64)  MKCERT_ARCH="amd64" ;;
            aarch64) MKCERT_ARCH="arm64" ;;
            arm64)   MKCERT_ARCH="arm64" ;;
            *)       echo "❌ Unsupported architecture: $ARCH"; exit 1 ;;
        esac
        
        sudo apt update && sudo apt install -y libnss3-tools
        curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/${MKCERT_ARCH}"
        chmod +x mkcert-v*-linux-${MKCERT_ARCH}
        sudo mv mkcert-v*-linux-${MKCERT_ARCH} /usr/local/bin/mkcert
    elif [[ "$OSTYPE" == "msys"* ]] || [[ "$OSTYPE" == "cygwin"* ]]; then
        # Windows (Git Bash / WSL)
        echo "   Please install mkcert manually: https://github.com/FiloSottile/mkcert#installation"
        exit 1
    fi
fi

echo "   ✅ mkcert ready"

# Install local CA (always ensure it's installed)
echo "🔐 Installing local CA..."
mkcert -install 2>/dev/null || true
echo "   ✅ Local CA ready"

# Generate SSL certificates (if not exists)
if [ ! -f "${CERTS_DIR}/${DOMAIN}.pem" ]; then
    echo ""
    echo "📜 Generating SSL certificates..."
    mkdir -p "${CERTS_DIR}"

    mkcert -key-file "${CERTS_DIR}/${DOMAIN}-key.pem" \
           -cert-file "${CERTS_DIR}/${DOMAIN}.pem" \
           "${DOMAIN}" "*.${DOMAIN}" localhost 127.0.0.1 ::1

    echo "   ✅ Certificates generated"
fi

# =============================================================================
# Step 2: Setup DNS via /etc/hosts → 127.0.0.2
# =============================================================================
echo ""
echo "🌐 Setting up /etc/hosts..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS: Create loopback alias for 127.0.0.2 (needed for Docker to bind)
    if ! ifconfig lo0 | grep -q "127.0.0.2"; then
        echo "   Creating loopback alias 127.0.0.2..."
        sudo ifconfig lo0 alias 127.0.0.2
    fi
fi

# Add to /etc/hosts if not exists
HOSTS_ENTRY="127.0.0.2 ${DOMAIN} ${API_DOMAIN}"
if ! grep -q "${DOMAIN}" /etc/hosts 2>/dev/null; then
    echo "${HOSTS_ENTRY}" | sudo tee -a /etc/hosts > /dev/null
    echo "   ✅ Added to /etc/hosts: ${HOSTS_ENTRY}"
else
    echo "   ✅ /etc/hosts already configured"
fi

# =============================================================================
# Step 3: Generate nginx.conf from template
# =============================================================================
echo ""
echo "⚙️  Generating nginx.conf..."
export DOMAIN API_DOMAIN FRONTEND_PORT
envsubst '${DOMAIN} ${API_DOMAIN} ${FRONTEND_PORT}' \
    < ./docker/stubs/nginx.conf.stub \
    > ./docker/nginx/nginx.conf
echo "   ✅ nginx.conf generated"

# =============================================================================
# Step 4: Start Docker services
# =============================================================================
echo ""
echo "🐳 Starting Docker services..."
docker compose up -d mysql phpmyadmin mailpit minio backend nginx

echo ""
echo "⏳ Waiting for services..."
sleep 3

# Generate APP_KEY if needed
if [ "$GENERATE_KEY" = true ]; then
    echo "🔑 Generating APP_KEY..."
    docker compose exec -T backend php artisan key:generate
    echo "   ✅ APP_KEY generated"
    
    # Run migrations
    echo "🗄️  Running migrations..."
    docker compose exec -T backend php artisan migrate:fresh --force
    echo "   ✅ Migrations completed"
fi

# Create MinIO bucket if not exists
echo "📦 Creating MinIO bucket..."
docker compose exec -T minio mc alias set local http://localhost:9000 minioadmin minioadmin 2>/dev/null || true
docker compose exec -T minio mc mb local/local --ignore-existing 2>/dev/null || true
docker compose exec -T minio mc anonymous set public local/local 2>/dev/null || true
echo "   ✅ MinIO bucket 'local' ready"

# =============================================================================
# Setup frontend (create Next.js if not exists)
# =============================================================================
if [ ! -f "./frontend/package.json" ]; then
    rm -rf ./frontend 2>/dev/null
    echo ""
    echo "🚀 Creating Next.js project..."
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
    echo "⚙️  Configuring Next.js..."
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

    # Create frontend .env.local
    cat > ./frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=https://${API_DOMAIN}
EOF
    echo "   ✅ Next.js project created"
else
    # Frontend exists - ensure .env.local is up to date
    cat > ./frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=https://${API_DOMAIN}
EOF
    
    if [ ! -d "./frontend/node_modules" ]; then
        echo ""
        echo "📦 Installing frontend dependencies..."
        cd frontend && npm install && cd ..
    fi
fi

# =============================================================================
# Ready!
# =============================================================================
echo ""
echo "============================================="
echo "✅ Development environment ready!"
echo "============================================="
echo ""
echo "  🌐 Frontend:    https://${DOMAIN}"
echo "  🔌 API:         https://${API_DOMAIN}"
echo "  🗄️  phpMyAdmin:  https://${DOMAIN}:8080"
echo "  📧 Mailpit:     https://${DOMAIN}:8025"
echo "  📦 MinIO:       https://${DOMAIN}:9001 (console)"
echo ""
echo "  Database: omnify / omnify / secret"
echo "  SMTP: mailpit:1025 (no auth)"
echo "  S3: minio:9000 (minioadmin/minioadmin)"
echo ""
echo "---------------------------------------------"
echo "🖥️  Starting frontend dev server..."
echo "---------------------------------------------"
echo ""

# Start frontend dev server (foreground)
cd frontend && npm run dev -- -p ${FRONTEND_PORT}
