# =============================================================================
# Dev Script for Windows (PowerShell) - Omnify Tunnel Version
# Starts development environment with tunnel for public access
# =============================================================================

$ErrorActionPreference = "Stop"

# =============================================================================
# Write File with UTF-8 (no BOM) and LF line endings
# =============================================================================
function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )
    # Convert CRLF to LF
    $Content = $Content -replace "`r`n", "`n"
    # Write UTF-8 without BOM
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
}

# =============================================================================
# Tunnel Server Configuration
# =============================================================================
$TUNNEL_SERVER = "dev.omnify.jp"
$TUNNEL_PORT = 7000
$FRP_TOKEN = "65565cab2397330948c3374416a829dc1d0c25ad25055dd8d712b6d6555c9f36"

# =============================================================================
# Validate dev name (alphanumeric only, for domain compatibility)
# =============================================================================
function Test-DevName {
    param([string]$Name)
    return $Name -match '^[a-zA-Z0-9]+$'
}

# =============================================================================
# Get dev name from .omnify-dev file or prompt if missing
# =============================================================================
function Get-DevName {
    $configFile = ".omnify-dev"
    
    # Try to read from file
    if (Test-Path $configFile) {
        $savedName = (Get-Content $configFile -Raw -ErrorAction SilentlyContinue)
        if ($savedName) {
            $savedName = $savedName.Trim()
            # Validate alphanumeric only
            if (-not (Test-DevName $savedName)) {
                Write-Host "ERROR: Invalid developer name in .omnify-dev" -ForegroundColor Red
                Write-Host ""
                Write-Host "  Current value: '$savedName'"
                Write-Host "  Developer name must contain only letters and numbers (a-z, A-Z, 0-9)."
                Write-Host "  Please delete .omnify-dev and try again."
                Write-Host ""
                exit 1
            }
            return $savedName
        }
    }
    
    # Prompt user for input
    Write-Host ""
    Write-Host "=================================================="
    Write-Host " Developer Name Required"
    Write-Host "=================================================="
    Write-Host ""
    Write-Host "  This name will be used in your development URLs:"
    Write-Host "  https://project.YOUR_NAME.dev.omnify.jp"
    Write-Host ""
    Write-Host "  Rules:"
    Write-Host "    - Only letters and numbers (a-z, A-Z, 0-9)"
    Write-Host "    - No spaces, hyphens, or special characters"
    Write-Host "    - Example: satoshi, tanaka, john123"
    Write-Host ""
    
    while ($true) {
        $devName = Read-Host "  Enter your dev name"
        
        # Check if empty
        if ([string]::IsNullOrWhiteSpace($devName)) {
            Write-Host "ERROR: Dev name cannot be empty" -ForegroundColor Red
            continue
        }
        
        # Convert to lowercase
        $devName = $devName.ToLower()
        
        # Validate
        if (-not (Test-DevName $devName)) {
            Write-Host "ERROR: Invalid dev name: '$devName'" -ForegroundColor Red
            Write-Host "         Only letters and numbers are allowed"
            continue
        }
        
        # Save to file
        $devName | Set-Content $configFile -NoNewline
        Write-Host "[OK] Saved to .omnify-dev" -ForegroundColor Green
        Write-Host ""
        
        return $devName
    }
}

# =============================================================================
# Get project name (from .env or folder name, no prompting)
# =============================================================================
function Get-ProjectName {
    $envFile = ".env"
    
    # Try to read from .env file
    if (Test-Path $envFile) {
        $content = Get-Content $envFile -Raw -ErrorAction SilentlyContinue
        if ($content -match "OMNIFY_PROJECT_NAME=([^\r\n]+)") {
            $savedName = $matches[1].Trim().Trim('"').Trim("'")
            if ($savedName) {
                return $savedName
            }
        }
    }
    
    # Use folder name as default (convert to lowercase, remove non-alphanumeric)
    $projectName = (Split-Path -Leaf (Get-Location)).ToLower() -replace '[^a-z0-9]', ''
    
    # Validate
    if ([string]::IsNullOrWhiteSpace($projectName)) {
        $projectName = "myproject"
    }
    
    # Save to .env file
    if (Test-Path $envFile) {
        $content = Get-Content $envFile -Raw
        if ($content -match "OMNIFY_PROJECT_NAME=") {
            $content = $content -replace "OMNIFY_PROJECT_NAME=[^\r\n]*", "OMNIFY_PROJECT_NAME=$projectName"
            $content | Set-Content $envFile -NoNewline
        } else {
            Add-Content $envFile "OMNIFY_PROJECT_NAME=$projectName"
        }
    } else {
        "OMNIFY_PROJECT_NAME=$projectName" | Set-Content $envFile
    }
    
    return $projectName
}

# =============================================================================
# Generate frpc config file
# =============================================================================
function New-FrpcConfig {
    param(
        [string]$DevName,
        [string]$ProjectName,
        [int]$FrontendPort
    )
    
    # Create directory
    New-Item -ItemType Directory -Force -Path "./docker/frpc" | Out-Null
    
    # Generate config content
    $config = @"
# Omnify Tunnel Client Config
# Auto-generated by dev.ps1

serverAddr = "$TUNNEL_SERVER"
serverPort = $TUNNEL_PORT

auth.method = "token"
auth.token = "$FRP_TOKEN"

# Frontend
[[proxies]]
name = "$ProjectName-$DevName-frontend"
type = "http"
localIP = "host.docker.internal"
localPort = $FrontendPort
customDomains = ["$ProjectName.$DevName.dev.omnify.jp"]

# Backend API (includes Horizon dashboard at /horizon)
[[proxies]]
name = "$ProjectName-$DevName-api"
type = "http"
localIP = "backend"
localPort = 8000
customDomains = ["api.$ProjectName.$DevName.dev.omnify.jp"]

# Laravel Reverb WebSocket
[[proxies]]
name = "$ProjectName-$DevName-ws"
type = "http"
localIP = "reverb"
localPort = 8080
customDomains = ["ws.$ProjectName.$DevName.dev.omnify.jp"]

# phpMyAdmin
[[proxies]]
name = "$ProjectName-$DevName-phpmyadmin"
type = "http"
localIP = "phpmyadmin"
localPort = 80
customDomains = ["pma.$ProjectName.$DevName.dev.omnify.jp"]

# Mailpit
[[proxies]]
name = "$ProjectName-$DevName-mailpit"
type = "http"
localIP = "mailpit"
localPort = 8025
customDomains = ["mail.$ProjectName.$DevName.dev.omnify.jp"]

# MinIO S3 API
[[proxies]]
name = "$ProjectName-$DevName-minio"
type = "http"
localIP = "minio"
localPort = 9000
customDomains = ["s3.$ProjectName.$DevName.dev.omnify.jp"]

# MinIO Console
[[proxies]]
name = "$ProjectName-$DevName-minio-console"
type = "http"
localIP = "minio"
localPort = 9001
customDomains = ["minio.$ProjectName.$DevName.dev.omnify.jp"]
"@
    
    Write-Utf8NoBom -Path "$PWD/docker/frpc/frpc.toml" -Content $config
}

# =============================================================================
# Kill process on port
# =============================================================================
function Stop-ProcessOnPort {
    param([int]$Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connections) {
        $connections | ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

# =============================================================================
# Main process
# =============================================================================

# Check setup
if (-not (Test-Path ".\backend") -or -not (Test-Path ".\frontend\package.json")) {
    Write-Host " Setup required. Run 'npm run setup' first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host " Omnify Tunnel Development Environment"
Write-Host ""
Write-Host ""

# Get developer name and project name
$DEV_NAME = Get-DevName
$PROJECT_NAME = Get-ProjectName

Write-Host " Developer: $DEV_NAME"
Write-Host " Project:   $PROJECT_NAME"
Write-Host ""

# Free and use port 3000
$FRONTEND_PORT = 3000
Stop-ProcessOnPort -Port $FRONTEND_PORT

# =============================================================================
# Step 1: Generate frpc config file
# =============================================================================
Write-Host "  Generating frpc config..."
New-FrpcConfig -DevName $DEV_NAME -ProjectName $PROJECT_NAME -FrontendPort $FRONTEND_PORT
Write-Host "    docker/frpc/frpc.toml"

# =============================================================================
# Step 2: Copy docker-compose.yml
# =============================================================================
Write-Host "  Generating docker-compose.yml..."
Copy-Item ".\docker\stubs\docker-compose.yml.stub" ".\docker-compose.yml" -Force
Write-Host "    docker-compose.yml"

# =============================================================================
# Step 2b: Copy CORS config (supports *.console.omnify.jp for SSO)
# =============================================================================
if (Test-Path ".\docker\stubs\cors.php.stub") {
    Write-Host "  Updating CORS config..."
    Copy-Item ".\docker\stubs\cors.php.stub" ".\backend\config\cors.php" -Force
    Write-Host "    backend/config/cors.php"
}

# =============================================================================
# Step 3: Start Docker services
# =============================================================================
Write-Host ""
Write-Host " Starting Docker services..."
docker compose up -d mysql redis phpmyadmin mailpit minio backend horizon reverb frpc

# Wait for frpc connection
Write-Host " Waiting for tunnel connection..."
Start-Sleep -Seconds 3

# =============================================================================
# Step 4: Set environment variables
# =============================================================================
$DOMAIN = "$PROJECT_NAME.$DEV_NAME.dev.omnify.jp"
$API_DOMAIN = "api.$PROJECT_NAME.$DEV_NAME.dev.omnify.jp"
$WS_DOMAIN = "ws.$PROJECT_NAME.$DEV_NAME.dev.omnify.jp"

# Backend .env - Update session and Sanctum settings
if (Test-Path ".\backend\.env") {
    $envContent = Get-Content ".\backend\.env" -Raw
    
    # Update SESSION_DOMAIN for cross-domain cookies
    if ($envContent -match "SESSION_DOMAIN=") {
        $envContent = $envContent -replace "SESSION_DOMAIN=[^\r\n]*", "SESSION_DOMAIN=.$DEV_NAME.dev.omnify.jp"
    } else {
        $envContent += "`nSESSION_DOMAIN=.$DEV_NAME.dev.omnify.jp"
    }
    
    # Update SANCTUM_STATEFUL_DOMAINS
    if ($envContent -match "SANCTUM_STATEFUL_DOMAINS=") {
        $envContent = $envContent -replace "SANCTUM_STATEFUL_DOMAINS=[^\r\n]*", "SANCTUM_STATEFUL_DOMAINS=$DOMAIN,$API_DOMAIN"
    } else {
        $envContent += "`nSANCTUM_STATEFUL_DOMAINS=$DOMAIN,$API_DOMAIN"
    }
    
    # Enable SESSION_SECURE_COOKIE for HTTPS
    if ($envContent -match "SESSION_SECURE_COOKIE=") {
        $envContent = $envContent -replace "SESSION_SECURE_COOKIE=[^\r\n]*", "SESSION_SECURE_COOKIE=true"
    } else {
        $envContent += "`nSESSION_SECURE_COOKIE=true"
    }
    
    # Set SESSION_SAME_SITE to none for cross-domain
    if ($envContent -match "SESSION_SAME_SITE=") {
        $envContent = $envContent -replace "SESSION_SAME_SITE=[^\r\n]*", "SESSION_SAME_SITE=none"
    } else {
        $envContent += "`nSESSION_SAME_SITE=none"
    }
    
    Write-Utf8NoBom -Path "$PWD\backend\.env" -Content $envContent
    Write-Host "    Updated backend/.env for tunnel domain"
}

# Frontend .env.local
$frontendEnv = @"
NEXT_PUBLIC_API_URL=https://$API_DOMAIN
NEXT_PUBLIC_REVERB_HOST=$WS_DOMAIN
NEXT_PUBLIC_REVERB_PORT=443
NEXT_PUBLIC_REVERB_SCHEME=https
NEXT_PUBLIC_REVERB_APP_KEY=omnify-reverb-key

# SSO Configuration (dev.console.omnify.jp)
NEXT_PUBLIC_SSO_CONSOLE_URL=https://dev.console.omnify.jp
NEXT_PUBLIC_SSO_SERVICE_SLUG=test-service
NEXT_PUBLIC_SSO_BASE_URL=https://$DOMAIN
"@
Write-Utf8NoBom -Path "$PWD\frontend\.env.local" -Content $frontendEnv

# =============================================================================
# Ready!
# =============================================================================
Write-Host ""
Write-Host ""
Write-Host " Tunnel Development Environment Ready!"
Write-Host ""
Write-Host ""
Write-Host "   Frontend:    https://$DOMAIN" -ForegroundColor Cyan
Write-Host "   API:         https://$API_DOMAIN" -ForegroundColor Cyan
Write-Host "   WebSocket:   wss://$WS_DOMAIN" -ForegroundColor Cyan
Write-Host "   Horizon:     https://$API_DOMAIN/horizon" -ForegroundColor Cyan
Write-Host "   phpMyAdmin:  https://pma.$PROJECT_NAME.$DEV_NAME.dev.omnify.jp" -ForegroundColor Cyan
Write-Host "   Mailpit:     https://mail.$PROJECT_NAME.$DEV_NAME.dev.omnify.jp" -ForegroundColor Cyan
Write-Host "   MinIO:       https://minio.$PROJECT_NAME.$DEV_NAME.dev.omnify.jp" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Syncing SSO permissions..."
docker compose exec -T backend php artisan sso:sync-permissions 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "    (skipped - command not available)"
}
Write-Host ""
Write-Host "  Starting frontend dev server..."
Write-Host ""
Write-Host ""

# Cleanup: Remove Next.js lock file
Remove-Item -Path ".\frontend\.next\dev\lock" -Force -ErrorAction SilentlyContinue

# Start frontend dev server (bind to 0.0.0.0 for tunnel access)
Push-Location .\frontend
npm run dev -- -H 0.0.0.0 -p $FRONTEND_PORT
Pop-Location
