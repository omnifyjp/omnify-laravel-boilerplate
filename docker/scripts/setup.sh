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
    echo "❌ Docker is not installed!"
    echo "   Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker is not running!"
    echo "   Please start Docker Desktop and try again."
    exit 1
fi
echo "   ✅ Docker"

# Check Composer (only needed if backend doesn't exist)
if [ ! -d "./backend" ]; then
    if ! command -v composer &> /dev/null; then
        echo "   📦 Installing Composer..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install composer
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt update && sudo apt install -y composer
        else
            echo "❌ Composer is not installed!"
            echo "   Please install Composer: https://getcomposer.org/download/"
            exit 1
        fi
    fi
    echo "   ✅ Composer"
fi

# Check envsubst (for nginx.conf generation)
if ! command -v envsubst &> /dev/null; then
    echo "   📦 Installing envsubst (gettext)..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install gettext
        brew link --force gettext
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt update && sudo apt install -y gettext
    else
        echo "❌ envsubst is not installed!"
        exit 1
    fi
fi
echo "   ✅ envsubst"

# Install/update packages
echo "📦 Installing packages..."
npm install
echo "   ✅ Packages installed"

# Run Omnify postinstall (generate .claude docs)
echo "📝 Generating Omnify docs..."
node node_modules/@famgia/omnify/scripts/postinstall.js 2>/dev/null || true
echo "   ✅ Omnify docs generated"

# Project name = folder name
PROJECT_NAME=$(basename "$(pwd)")

# Generate unique IP based on project name (127.0.0.2 - 127.0.0.254)
generate_project_ip() {
    local name=$1
    local hash=$(echo -n "$name" | md5sum | cut -c1-4)
    local num=$((16#$hash % 253 + 2))
    echo "127.0.0.$num"
}
PROJECT_IP=$(generate_project_ip "$PROJECT_NAME")

# Set domains (based on folder name)
DOMAIN="${PROJECT_NAME}.app"
API_DOMAIN="api.${PROJECT_NAME}.app"
CERTS_DIR="./docker/nginx/certs"

echo "🚀 Setting up development environment for: ${PROJECT_NAME}"
echo ""

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
# Step 2: Setup DNS via /etc/hosts → unique IP per project
# =============================================================================
echo ""
echo "🌐 Setting up /etc/hosts... (IP: ${PROJECT_IP})"

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS: Create loopback alias (needed for Docker to bind)
    if ! ifconfig lo0 | grep -q "${PROJECT_IP}"; then
        echo "   Creating loopback alias ${PROJECT_IP}..."
        sudo ifconfig lo0 alias ${PROJECT_IP}
    fi
fi

# Add to /etc/hosts if not exists
HOSTS_ENTRY="${PROJECT_IP} ${DOMAIN} ${API_DOMAIN}"
if ! grep -q "${DOMAIN}" /etc/hosts 2>/dev/null; then
    echo "${HOSTS_ENTRY}" | sudo tee -a /etc/hosts > /dev/null
    echo "   ✅ Added to /etc/hosts: ${HOSTS_ENTRY}"
else
    echo "   ✅ /etc/hosts already configured"
fi

# =============================================================================
# Step 3: Setup backend (create Laravel if not exists)
# =============================================================================
if [ ! -d "./backend" ]; then
    echo ""
    echo "🚀 Creating Laravel API project..."
    
    # Create Laravel project
    composer create-project laravel/laravel backend --prefer-dist --no-interaction
    
    cd backend

    # Install API with Sanctum (Laravel 11+)
    php artisan install:api --no-interaction 2>/dev/null || true
    echo "   ✅ Sanctum installed"

    # Install Pest for testing
    echo "   📦 Installing Pest..."
    composer require pestphp/pest pestphp/pest-plugin-laravel --dev --with-all-dependencies --no-interaction
    echo "   ✅ Pest installed"

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
# Step 4: Generate backend/.env (if not exists)
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
# Step 5: Start Docker services
# =============================================================================
echo ""
echo "⚙️  Generating config files..."
FRONTEND_PORT=3000
export DOMAIN API_DOMAIN FRONTEND_PORT PROJECT_IP

# Generate docker-compose.yml
envsubst '${PROJECT_IP}' \
    < ./docker/stubs/docker-compose.yml.stub \
    > ./docker-compose.yml
echo "   ✅ docker-compose.yml generated (IP: ${PROJECT_IP})"

# Generate nginx.conf
envsubst '${DOMAIN} ${API_DOMAIN} ${FRONTEND_PORT}' \
    < ./docker/stubs/nginx.conf.stub \
    > ./docker/nginx/nginx.conf
echo "   ✅ nginx.conf generated"

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
# Step 6: Setup frontend (create Next.js if not exists)
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
# Done!
# =============================================================================
echo ""
echo "============================================="
echo "✅ Setup complete!"
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
echo "Run 'npm run dev' to start frontend server"
echo "---------------------------------------------"
