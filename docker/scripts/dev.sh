#!/bin/bash

# =============================================================================
# Dev Script - Omnify Tunnel Version
# Starts development environment with tunnel for public access
# =============================================================================

set -e

# =============================================================================
# Colors for output
# =============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# =============================================================================
# Tunnel Server Configuration
# =============================================================================
TUNNEL_SERVER="dev.omnify.jp"
TUNNEL_PORT=7000
FRP_TOKEN="65565cab2397330948c3374416a829dc1d0c25ad25055dd8d712b6d6555c9f36"

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
# Get dev name from .omnify-dev file or prompt if missing
# =============================================================================
get_dev_name() {
    local config_file=".omnify-dev"
    
    # Try to read from file
    if [ -f "$config_file" ]; then
        local saved_name=$(cat "$config_file" 2>/dev/null | tr -d '\n')
        if [ -n "$saved_name" ]; then
            # Validate alphanumeric only
            if ! validate_dev_name "$saved_name"; then
                echo -e "${RED}ERROR: Invalid developer name in .omnify-dev${NC}" >&2
                echo "" >&2
                echo "  Current value: '$saved_name'" >&2
                echo "  Developer name must contain only letters and numbers (a-z, A-Z, 0-9)." >&2
                echo "  Please delete .omnify-dev and try again." >&2
                echo "" >&2
                exit 1
            fi
            echo "$saved_name"
            return
        fi
    fi
    
    # Check if we're in an interactive terminal
    if [ ! -t 0 ]; then
        echo -e "${RED}ERROR: Developer name not configured${NC}" >&2
        echo "" >&2
        echo "  The file .omnify-dev is missing and this is a non-interactive shell." >&2
        echo "  Please run 'npm run dev' in an interactive terminal first." >&2
        echo "" >&2
        exit 1
    fi
    
    # Prompt user for input (interactive mode)
    echo "" >&2
    echo "==================================================" >&2
    echo " Developer Name Required" >&2
    echo "==================================================" >&2
    echo "" >&2
    echo "  This name will be used in your development URLs:" >&2
    echo "  https://project.YOUR_NAME.dev.omnify.jp" >&2
    echo "" >&2
    echo "  Rules:" >&2
    echo "    - Only letters and numbers (a-z, A-Z, 0-9)" >&2
    echo "    - No spaces, hyphens, or special characters" >&2
    echo "    - Example: satoshi, tanaka, john123" >&2
    echo "" >&2
    
    while true; do
        echo -n "  Enter your dev name: " >&2
        read dev_name
        
        # Check if empty
        if [ -z "$dev_name" ]; then
            echo -e "${RED}ERROR: Dev name cannot be empty${NC}" >&2
            continue
        fi
        
        # Convert to lowercase
        dev_name=$(echo "$dev_name" | tr '[:upper:]' '[:lower:]')
        
        # Validate
        if ! validate_dev_name "$dev_name"; then
            echo -e "${RED}ERROR: Invalid dev name: '$dev_name'${NC}" >&2
            echo "         Only letters and numbers are allowed" >&2
            continue
        fi
        
        # Save to file
        echo "$dev_name" > "$config_file"
        echo -e "${GREEN}✓${NC} Saved to .omnify-dev" >&2
        echo "" >&2
        
        echo "$dev_name"
        return
    done
}

# =============================================================================
# Get project name (from .env or folder name, no prompting)
# =============================================================================
get_project_name() {
    local env_file=".env"
    
    # Try to read from .env file
    if [ -f "$env_file" ]; then
        local saved_name=$(grep "^OMNIFY_PROJECT_NAME=" "$env_file" 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        if [ -n "$saved_name" ]; then
            echo "$saved_name"
            return
        fi
    fi
    
    # Use folder name as default (convert to lowercase, remove non-alphanumeric)
    local project_name=$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]//g')
    
    # Validate
    if [ -z "$project_name" ]; then
        project_name="myproject"
    fi
    
    # Save to .env file
    if [ -f "$env_file" ]; then
        if grep -q "^OMNIFY_PROJECT_NAME=" "$env_file"; then
            sed -i.bak "s/^OMNIFY_PROJECT_NAME=.*/OMNIFY_PROJECT_NAME=$project_name/" "$env_file"
            rm -f "$env_file.bak"
        else
            echo "OMNIFY_PROJECT_NAME=$project_name" >> "$env_file"
        fi
    else
        echo "OMNIFY_PROJECT_NAME=$project_name" > "$env_file"
    fi
    
    echo "$project_name"
}

# =============================================================================
# frpc設定ファイル生成関数
# =============================================================================
generate_frpc_config() {
    local dev_name=$1
    local project_name=$2
    local frontend_port=$3
    
    mkdir -p ./docker/frpc
    
    # customDomainsを使用してフルドメインを指定
    cat > ./docker/frpc/frpc.toml << EOF
# Omnify Tunnel Client設定
# Auto-generated by dev.sh

serverAddr = "${TUNNEL_SERVER}"
serverPort = ${TUNNEL_PORT}

auth.method = "token"
auth.token = "${FRP_TOKEN}"

# Frontend
[[proxies]]
name = "${project_name}-${dev_name}-frontend"
type = "http"
localIP = "host.docker.internal"
localPort = ${frontend_port}
customDomains = ["${project_name}.${dev_name}.dev.omnify.jp"]

# Backend API (includes Horizon dashboard at /horizon)
[[proxies]]
name = "${project_name}-${dev_name}-api"
type = "http"
localIP = "backend"
localPort = 8000
customDomains = ["api.${project_name}.${dev_name}.dev.omnify.jp"]

# Laravel Reverb WebSocket
[[proxies]]
name = "${project_name}-${dev_name}-ws"
type = "http"
localIP = "reverb"
localPort = 8080
customDomains = ["ws.${project_name}.${dev_name}.dev.omnify.jp"]

# phpMyAdmin
[[proxies]]
name = "${project_name}-${dev_name}-phpmyadmin"
type = "http"
localIP = "phpmyadmin"
localPort = 80
customDomains = ["pma.${project_name}.${dev_name}.dev.omnify.jp"]

# Mailpit
[[proxies]]
name = "${project_name}-${dev_name}-mailpit"
type = "http"
localIP = "mailpit"
localPort = 8025
customDomains = ["mail.${project_name}.${dev_name}.dev.omnify.jp"]

# MinIO S3 API
[[proxies]]
name = "${project_name}-${dev_name}-minio"
type = "http"
localIP = "minio"
localPort = 9000
customDomains = ["s3.${project_name}.${dev_name}.dev.omnify.jp"]

# MinIO Console
[[proxies]]
name = "${project_name}-${dev_name}-minio-console"
type = "http"
localIP = "minio"
localPort = 9001
customDomains = ["minio.${project_name}.${dev_name}.dev.omnify.jp"]
EOF
}

# =============================================================================
# ポートを解放する関数
# =============================================================================
kill_port() {
    local port=$1
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
}

# =============================================================================
# メイン処理
# =============================================================================

# セットアップ確認
if [ ! -d "./backend" ] || [ ! -f "./frontend/package.json" ]; then
    echo " Setup required. Run 'npm run setup' first."
    exit 1
fi

echo ""
echo " Omnify Tunnel Development Environment"
echo ""
echo ""

# 開発者名とプロジェクト名を取得
DEV_NAME=$(get_dev_name)
PROJECT_NAME=$(get_project_name)

echo " Developer: ${DEV_NAME}"
echo " Project:   ${PROJECT_NAME}"
echo ""

# ポート3000を解放して使用
FRONTEND_PORT=3000
kill_port $FRONTEND_PORT

# =============================================================================
# Step 1: frpc設定ファイル生成
# =============================================================================
echo "  Generating frpc config..."
generate_frpc_config "$DEV_NAME" "$PROJECT_NAME" "$FRONTEND_PORT"
echo "    docker/frpc/frpc.toml"

# =============================================================================
# Step 2: docker-compose.ymlをコピー
# =============================================================================
echo "  Generating docker-compose.yml..."
cp ./docker/stubs/docker-compose.yml.stub ./docker-compose.yml
echo "    docker-compose.yml"

# =============================================================================
# Step 2b: CORS設定をコピー (supports *.console.omnify.jp for SSO)
# =============================================================================
if [ -f "./docker/stubs/cors.php.stub" ]; then
    echo "  Updating CORS config..."
    cp ./docker/stubs/cors.php.stub ./backend/config/cors.php
    echo "    backend/config/cors.php"
fi

# =============================================================================
# Step 3: Dockerサービスを起動
# =============================================================================
echo ""
echo " Starting Docker services..."
docker compose up -d mysql redis phpmyadmin mailpit minio backend horizon reverb frpc

# frpcの接続を待つ
echo " Waiting for tunnel connection..."
sleep 3

# =============================================================================
# Step 4: 環境変数を設定
# =============================================================================
DOMAIN="${PROJECT_NAME}.${DEV_NAME}.dev.omnify.jp"
API_DOMAIN="api.${PROJECT_NAME}.${DEV_NAME}.dev.omnify.jp"
WS_DOMAIN="ws.${PROJECT_NAME}.${DEV_NAME}.dev.omnify.jp"

# Backend .env - セッションとSanctumの設定を更新
if [ -f ./backend/.env ]; then
    # SESSION_DOMAINを更新（cross-domain cookie用）
    if grep -q "^SESSION_DOMAIN=" ./backend/.env; then
        sed -i '' "s|^SESSION_DOMAIN=.*|SESSION_DOMAIN=.${DEV_NAME}.dev.omnify.jp|" ./backend/.env
    else
        echo "SESSION_DOMAIN=.${DEV_NAME}.dev.omnify.jp" >> ./backend/.env
    fi
    
    # SANCTUM_STATEFUL_DOMAINSを更新
    if grep -q "^SANCTUM_STATEFUL_DOMAINS=" ./backend/.env; then
        sed -i '' "s|^SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=${DOMAIN},${API_DOMAIN}|" ./backend/.env
    else
        echo "SANCTUM_STATEFUL_DOMAINS=${DOMAIN},${API_DOMAIN}" >> ./backend/.env
    fi
    
    # SESSION_SECURE_COOKIEを有効化（HTTPS用）
    if grep -q "^SESSION_SECURE_COOKIE=" ./backend/.env; then
        sed -i '' "s|^SESSION_SECURE_COOKIE=.*|SESSION_SECURE_COOKIE=true|" ./backend/.env
    else
        echo "SESSION_SECURE_COOKIE=true" >> ./backend/.env
    fi
    
    # SESSION_SAME_SITEをnoneに設定（cross-domain用）
    if grep -q "^SESSION_SAME_SITE=" ./backend/.env; then
        sed -i '' "s|^SESSION_SAME_SITE=.*|SESSION_SAME_SITE=none|" ./backend/.env
    else
        echo "SESSION_SAME_SITE=none" >> ./backend/.env
    fi
    
    echo "    Updated backend/.env for tunnel domain"
fi

# Frontend .env.local
cat > ./frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=https://${API_DOMAIN}
NEXT_PUBLIC_REVERB_HOST=${WS_DOMAIN}
NEXT_PUBLIC_REVERB_PORT=443
NEXT_PUBLIC_REVERB_SCHEME=https
NEXT_PUBLIC_REVERB_APP_KEY=omnify-reverb-key

# SSO Configuration (dev.console.omnify.jp)
NEXT_PUBLIC_SSO_CONSOLE_URL=https://dev.console.omnify.jp
NEXT_PUBLIC_SSO_SERVICE_SLUG=test-service
NEXT_PUBLIC_SSO_BASE_URL=https://${DOMAIN}
EOF

# =============================================================================
# 準備完了!
# =============================================================================
echo ""
echo ""
echo " Tunnel Development Environment Ready!"
echo ""
echo ""
echo "   Frontend:    https://${DOMAIN}"
echo "   API:         https://${API_DOMAIN}"
echo "   WebSocket:   wss://${WS_DOMAIN}"
echo "   Horizon:     https://${API_DOMAIN}/horizon"
echo "    phpMyAdmin:  https://pma.${PROJECT_NAME}.${DEV_NAME}.dev.omnify.jp"
echo "   Mailpit:     https://mail.${PROJECT_NAME}.${DEV_NAME}.dev.omnify.jp"
echo "   MinIO:       https://minio.${PROJECT_NAME}.${DEV_NAME}.dev.omnify.jp"
echo ""
echo "  Syncing SSO permissions..."
docker compose exec -T backend php artisan sso:sync-permissions 2>/dev/null || echo "    (skipped - command not available)"
echo ""
echo "  Starting frontend dev server..."
echo ""
echo ""

# クリーンアップ: Next.js lockファイル削除
rm -f ./frontend/.next/dev/lock 2>/dev/null || true

# Start frontend dev server (bind to 0.0.0.0 for tunnel access)
cd frontend && npm run dev -- -H 0.0.0.0 -p ${FRONTEND_PORT}
