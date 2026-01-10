#!/bin/bash

# =============================================================================
# Development Script
# Supports both Herd (.test) and Docker nginx (.app) setups
# =============================================================================

set -e

# Default project name from folder
DEFAULT_NAME=$(basename "$(pwd)")
CONFIG_FILE=".env"

# Function to find available port
find_available_port() {
    local port=$1
    while lsof -i:$port >/dev/null 2>&1; do
        port=$((port + 1))
    done
    echo $port
}

# =============================================================================
# First time setup - ask for project name and ports
# =============================================================================
if [ ! -f "$CONFIG_FILE" ]; then
    echo "🔧 First time setup"
    echo ""
    read -p "Project name [${DEFAULT_NAME}]: " PROJECT_NAME
    PROJECT_NAME=${PROJECT_NAME:-$DEFAULT_NAME}
    
    # Find available ports
    echo "🔍 Finding available ports..."
    FRONTEND_PORT=$(find_available_port 3000)
    BACKEND_PORT=$(find_available_port 8000)
    PMA_PORT=$(find_available_port 8081)
    
    # Save config
    cat > "$CONFIG_FILE" << EOF
PROJECT_NAME=${PROJECT_NAME}
FRONTEND_PORT=${FRONTEND_PORT}
BACKEND_PORT=${BACKEND_PORT}
PMA_PORT=${PMA_PORT}
EOF
    echo "   ✅ Ports: Frontend=${FRONTEND_PORT}, Backend=${BACKEND_PORT}, PMA=${PMA_PORT}"
    echo ""
else
    source "$CONFIG_FILE"
fi

echo "🚀 Starting development environment for: ${PROJECT_NAME}"
echo ""

# =============================================================================
# Detect Herd
# =============================================================================
USE_HERD=false
if command -v herd &> /dev/null; then
    USE_HERD=true
    DOMAIN="${PROJECT_NAME}.test"
    API_DOMAIN="api.${PROJECT_NAME}.test"
    PMA_DOMAIN="pma.${PROJECT_NAME}.test"
    echo "🦁 Herd detected - using .test domains"
else
    DOMAIN="${PROJECT_NAME}.app"
    API_DOMAIN="api.${DOMAIN}"
    PMA_DOMAIN="pma.${DOMAIN}"
    CERTS_DIR="./docker/nginx/certs"
    echo "🐳 Herd not found - using Docker nginx with .app domains"
fi

echo ""

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
EOF
    echo "   ✅ backend/.env created"
    GENERATE_KEY=true
fi

# =============================================================================
# Setup based on environment
# =============================================================================
if [ "$USE_HERD" = true ]; then
    # Herd: Setup proxies
    echo "🔗 Setting up Herd proxies..."
    
    herd proxy "${PROJECT_NAME}" "http://127.0.0.1:${FRONTEND_PORT}" --secure 2>/dev/null || true
    herd proxy "api.${PROJECT_NAME}" "http://127.0.0.1:${BACKEND_PORT}" --secure 2>/dev/null || true
    herd proxy "pma.${PROJECT_NAME}" "http://127.0.0.1:${PMA_PORT}" --secure 2>/dev/null || true
    
    echo "   ✅ Herd proxies configured"
    
    # Start Docker services (without nginx)
    echo ""
    echo "🐳 Starting Docker services..."
    docker compose up -d mysql phpmyadmin backend
    
else
    # Docker nginx: Setup SSL and hosts
    
    # Step 1: Setup mkcert (if needed)
    if [ ! -f "${CERTS_DIR}/${DOMAIN}.pem" ]; then
        echo "📦 Checking mkcert..."

        if ! command -v mkcert &> /dev/null; then
            echo "   Installing mkcert..."
            
            if [[ "$OSTYPE" == "darwin"* ]]; then
                brew install mkcert nss
            elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
                sudo apt update && sudo apt install -y libnss3-tools
                curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
                chmod +x mkcert-v*-linux-amd64
                sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
            fi
        fi

        echo "   ✅ mkcert ready"

        # Install local CA
        echo ""
        echo "🔐 Installing local CA (may require password)..."
        mkcert -install
        echo "   ✅ Local CA installed"

        # Generate SSL certificates
        echo ""
        echo "📜 Generating SSL certificates..."
        mkdir -p "${CERTS_DIR}"

        mkcert -key-file "${CERTS_DIR}/${DOMAIN}-key.pem" \
               -cert-file "${CERTS_DIR}/${DOMAIN}.pem" \
               "${DOMAIN}" "*.${DOMAIN}" localhost 127.0.0.1 ::1

        echo "   ✅ Certificates generated"
    fi

    # Step 2: Update /etc/hosts (if needed)
    if ! grep -q "${DOMAIN}" /etc/hosts 2>/dev/null; then
        echo ""
        echo "🌐 Adding domains to /etc/hosts (requires sudo)..."
        
        HOSTS_ENTRY="127.0.0.1 ${DOMAIN} ${API_DOMAIN} ${PMA_DOMAIN}"
        echo "${HOSTS_ENTRY}" | sudo tee -a /etc/hosts > /dev/null
        echo "   ✅ Added: ${HOSTS_ENTRY}"
    fi

    # Step 3: Start Docker services (with nginx)
    echo ""
    echo "🐳 Starting Docker services..."
    docker compose up -d mysql phpmyadmin backend nginx
fi

echo ""
echo "⏳ Waiting for services..."
sleep 3

# Generate APP_KEY if needed
if [ "$GENERATE_KEY" = true ]; then
    echo "🔑 Generating APP_KEY..."
    docker compose exec -T backend php artisan key:generate
    echo "   ✅ APP_KEY generated"
fi

# =============================================================================
# Install frontend dependencies (if needed)
# =============================================================================
if [ ! -d "./frontend/node_modules" ]; then
    echo ""
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# =============================================================================
# Ready!
# =============================================================================
echo ""
echo "============================================="
echo "✅ Development environment ready!"
echo "============================================="
echo ""
echo "  🌐 Frontend:    https://${DOMAIN} (port ${FRONTEND_PORT})"
echo "  🔌 API:         https://${API_DOMAIN} (port ${BACKEND_PORT})"
echo "  🗄️  phpMyAdmin:  https://${PMA_DOMAIN} (port ${PMA_PORT})"
echo ""
echo "  Database: omnify / omnify / secret"
echo ""
echo "---------------------------------------------"
echo "🖥️  Starting frontend dev server on port ${FRONTEND_PORT}..."
echo "---------------------------------------------"
echo ""

# Start frontend dev server (foreground)
cd frontend && npm run dev -- -p ${FRONTEND_PORT}
