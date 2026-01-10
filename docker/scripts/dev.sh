#!/bin/bash

# =============================================================================
# Dev Script
# Starts Docker services and frontend dev server
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

# Check if setup is needed
if [ ! -d "./backend" ] || [ ! -f "./frontend/package.json" ]; then
    echo "❌ Setup required. Run 'npm run setup' first."
    exit 1
fi

echo "🚀 Starting development environment for: ${PROJECT_NAME}"
echo ""

# =============================================================================
# Step 1: Generate nginx.conf with current port
# =============================================================================
echo "⚙️  Generating nginx.conf..."
export DOMAIN API_DOMAIN FRONTEND_PORT
envsubst '${DOMAIN} ${API_DOMAIN} ${FRONTEND_PORT}' \
    < ./docker/stubs/nginx.conf.stub \
    > ./docker/nginx/nginx.conf
echo "   ✅ nginx.conf generated (port: ${FRONTEND_PORT})"

# =============================================================================
# Step 2: macOS loopback alias (required for Docker)
# =============================================================================
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! ifconfig lo0 | grep -q "127.0.0.2"; then
        echo "🔧 Creating loopback alias 127.0.0.2..."
        sudo ifconfig lo0 alias 127.0.0.2
    fi
fi

# =============================================================================
# Step 3: Start Docker services
# =============================================================================
echo ""
echo "🐳 Starting Docker services..."
docker compose up -d mysql phpmyadmin mailpit minio backend nginx

# =============================================================================
# Step 4: Update frontend .env.local
# =============================================================================
cat > ./frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=https://${API_DOMAIN}
EOF

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
echo "---------------------------------------------"
echo "🖥️  Starting frontend dev server..."
echo "---------------------------------------------"
echo ""

# Start frontend dev server (foreground)
cd frontend && npm run dev -- -p ${FRONTEND_PORT}
