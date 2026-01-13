#!/bin/bash

# =============================================================================
# Dev Script
# Starts Docker services and frontend dev server
# =============================================================================

set -e

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
# Step 1: Generate config files
# =============================================================================
echo "⚙️  Generating config files..."
export DOMAIN API_DOMAIN FRONTEND_PORT PROJECT_IP

# Generate docker-compose.yml
envsubst '${PROJECT_IP}' \
    < ./docker/stubs/docker-compose.yml.stub \
    > ./docker-compose.yml
echo "   ✅ docker-compose.yml (IP: ${PROJECT_IP})"

# Generate nginx.conf
envsubst '${DOMAIN} ${API_DOMAIN} ${FRONTEND_PORT}' \
    < ./docker/stubs/nginx.conf.stub \
    > ./docker/nginx/nginx.conf
echo "   ✅ nginx.conf (port: ${FRONTEND_PORT})"

# =============================================================================
# Step 2: macOS loopback alias (required for Docker)
# =============================================================================
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! ifconfig lo0 | grep -q "${PROJECT_IP}"; then
        echo "🔧 Creating loopback alias ${PROJECT_IP}..."
        sudo ifconfig lo0 alias ${PROJECT_IP}
    fi
fi

# =============================================================================
# Step 3: Start Docker services
# =============================================================================
echo ""
echo "🐳 Starting Docker services..."
docker compose up -d mysql phpmyadmin mailpit minio backend nginx

# Restart nginx to pick up new config (port may have changed)
docker compose restart nginx >/dev/null 2>&1 || true

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

# Cleanup: Kill any existing Next.js dev server and remove lock file
echo "🧹 Cleaning up..."
pkill -f "next dev" 2>/dev/null || true
rm -f ./frontend/.next/dev/lock 2>/dev/null || true
sleep 1

# Start frontend dev server (foreground)
cd frontend && npm run dev -- -p ${FRONTEND_PORT}
