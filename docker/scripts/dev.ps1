# =============================================================================
# Dev Script for Windows (PowerShell) - Omnify Tunnel Version
# Exposes localhost to the internet via tunnel
# =============================================================================

$ErrorActionPreference = "Stop"

# =============================================================================
# Tunnel Server Configuration
# =============================================================================
$TUNNEL_SERVER = "dev.omnify.jp"
$TUNNEL_PORT = 7000
$FRP_TOKEN = "65565cab2397330948c3374416a829dc1d0c25ad25055dd8d712b6d6555c9f36"

# =============================================================================
# Get/Save Developer Name
# =============================================================================
function Get-DevName {
    $configFile = ".omnify-dev"
    
    # Try to read from file
    if (Test-Path $configFile) {
        $savedName = (Get-Content $configFile -Raw).Trim()
        if ($savedName) {
            return $savedName
        }
    }
    
    # Ask user for input
    Write-Host ""
    Write-Host "" -ForegroundColor Cyan
    Write-Host " Developer name required" -ForegroundColor Yellow
    Write-Host "   This will be saved to .omnify-dev"
    Write-Host "   Example: satoshi, tanaka, yamada"
    Write-Host "" -ForegroundColor Cyan
    $devName = Read-Host "   Enter your dev name"
    
    # Validate input
    if ([string]::IsNullOrWhiteSpace($devName)) {
        Write-Host " Dev name cannot be empty" -ForegroundColor Red
        exit 1
    }
    
    # Convert to lowercase and remove spaces
    $devName = $devName.ToLower().Replace(" ", "")
    
    # Save to file
    $devName | Set-Content $configFile -NoNewline
    Write-Host "    Saved to .omnify-dev" -ForegroundColor Green
    Write-Host ""
    
    return $devName
}

# =============================================================================
# Get/Save Project Name
# =============================================================================
function Get-ProjectName {
    $envFile = ".env"
    
    # Try to read from .env file
    if (Test-Path $envFile) {
        $content = Get-Content $envFile -Raw
        if ($content -match "OMNIFY_PROJECT_NAME=(.+)") {
            $savedName = $matches[1].Trim().Trim('"').Trim("'")
            if ($savedName) {
                return $savedName
            }
        }
    }
    
    # Default to folder name
    $defaultName = Split-Path -Leaf (Get-Location)
    
    # Ask user for input
    Write-Host ""
    Write-Host "" -ForegroundColor Cyan
    Write-Host " Project name required" -ForegroundColor Yellow
    Write-Host "   This will be saved to .env file."
    Write-Host "   Press Enter to use default: $defaultName"
    Write-Host "" -ForegroundColor Cyan
    $projectName = Read-Host "   Enter project name [$defaultName]"
    
    # Use default if empty
    if ([string]::IsNullOrWhiteSpace($projectName)) {
        $projectName = $defaultName
    }
    
    # Convert to lowercase and remove spaces
    $projectName = $projectName.ToLower().Replace(" ", "")
    
    # Save to .env file
    if (Test-Path $envFile) {
        $content = Get-Content $envFile -Raw
        if ($content -match "OMNIFY_PROJECT_NAME=") {
            $content = $content -replace "OMNIFY_PROJECT_NAME=.+", "OMNIFY_PROJECT_NAME=$projectName"
            $content | Set-Content $envFile -NoNewline
        } else {
            Add-Content $envFile "OMNIFY_PROJECT_NAME=$projectName"
        }
    } else {
        "OMNIFY_PROJECT_NAME=$projectName" | Set-Content $envFile
    }
    Write-Host "    Saved to .env" -ForegroundColor Green
    Write-Host ""
    
    return $projectName
}

# =============================================================================
# Generate frpc Config File
# =============================================================================
function New-FrpcConfig {
    param(
        [string]$DevName,
        [string]$ProjectName,
        [int]$FrontendPort
    )
    
    # Create directory
    New-Item -ItemType Directory -Force -Path "./docker/frpc" | Out-Null
    
    # Read stub and replace placeholders
    $config = Get-Content ".\docker\stubs\frpc.toml.stub" -Raw
    $config = $config -replace "__TUNNEL_SERVER__", $TUNNEL_SERVER
    $config = $config -replace "__TUNNEL_PORT__", $TUNNEL_PORT
    $config = $config -replace "__FRP_TOKEN__", $FRP_TOKEN
    $config = $config -replace "__PROJECT_NAME__", $ProjectName
    $config = $config -replace "__DEV_NAME__", $DevName
    $config = $config -replace "__FRONTEND_PORT__", $FrontendPort
    
    $config | Set-Content "./docker/frpc/frpc.toml" -Encoding UTF8
}

# =============================================================================
# Find Available Port
# =============================================================================
function Find-AvailablePort {
    param([int]$StartPort)
    $port = $StartPort
    while (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue) {
        $port++
    }
    return $port
}

# =============================================================================
# Main Process
# =============================================================================

# Check setup
if (-not (Test-Path ".\backend") -or -not (Test-Path ".\frontend\package.json")) {
    Write-Host " Setup required. Run 'npm run setup' first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host " Omnify Tunnel Development Environment" -ForegroundColor Cyan
Write-Host "" -ForegroundColor DarkGray
Write-Host ""

# Get developer name and project name
$DEV_NAME = Get-DevName
$PROJECT_NAME = Get-ProjectName

Write-Host " Developer: $DEV_NAME" -ForegroundColor White
Write-Host " Project:   $PROJECT_NAME" -ForegroundColor White
Write-Host ""

# Find available port for frontend
$FRONTEND_PORT = Find-AvailablePort -StartPort 3000

# =============================================================================
# Step 1: Generate frpc config
# =============================================================================
Write-Host "  Generating frpc config..." -ForegroundColor Yellow
New-FrpcConfig -DevName $DEV_NAME -ProjectName $PROJECT_NAME -FrontendPort $FRONTEND_PORT
Write-Host "    docker/frpc/frpc.toml" -ForegroundColor Green

# =============================================================================
# Step 2: Copy docker-compose.yml
# =============================================================================
Write-Host "  Generating docker-compose.yml..." -ForegroundColor Yellow
Copy-Item ".\docker\stubs\docker-compose.yml.stub" ".\docker-compose.yml" -Force
Write-Host "    docker-compose.yml" -ForegroundColor Green

# =============================================================================
# Step 3: Start Docker services
# =============================================================================
Write-Host ""
Write-Host " Starting Docker services..." -ForegroundColor Yellow
docker compose up -d mysql redis phpmyadmin mailpit minio backend reverb horizon frpc

# Wait for frpc connection
Write-Host " Waiting for tunnel connection..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# =============================================================================
# Step 4: Update frontend .env.local
# =============================================================================
$DOMAIN = "$PROJECT_NAME.$DEV_NAME.dev.omnify.jp"
$API_DOMAIN = "api.$PROJECT_NAME.$DEV_NAME.dev.omnify.jp"
$WS_DOMAIN = "ws.$PROJECT_NAME.$DEV_NAME.dev.omnify.jp"

# Read stub and replace placeholders
$envContent = Get-Content ".\docker\stubs\frontend.env.local.stub" -Raw
$envContent = $envContent -replace "__DOMAIN__", $DOMAIN
$envContent = $envContent -replace "__API_DOMAIN__", $API_DOMAIN
$envContent = $envContent -replace "__WS_DOMAIN__", $WS_DOMAIN
$envContent | Set-Content ".\frontend\.env.local" -Encoding UTF8

# =============================================================================
# Ready!
# =============================================================================
Write-Host ""
Write-Host "" -ForegroundColor Green
Write-Host " Tunnel Development Environment Ready!" -ForegroundColor Green
Write-Host "" -ForegroundColor Green
Write-Host ""
Write-Host "   Frontend:    https://$DOMAIN" -ForegroundColor Cyan
Write-Host "   API:         https://$API_DOMAIN" -ForegroundColor Cyan
Write-Host "   Horizon:     https://horizon.$PROJECT_NAME.$DEV_NAME.dev.omnify.jp" -ForegroundColor Cyan
Write-Host "   Telescope:   https://$API_DOMAIN/telescope" -ForegroundColor Cyan
Write-Host "   Pulse:       https://$API_DOMAIN/pulse" -ForegroundColor Cyan
Write-Host "   WebSocket:   wss://ws.$PROJECT_NAME.$DEV_NAME.dev.omnify.jp" -ForegroundColor Cyan
Write-Host "   phpMyAdmin:  https://pma.$PROJECT_NAME.$DEV_NAME.dev.omnify.jp" -ForegroundColor Cyan
Write-Host "   Mailpit:     https://mail.$PROJECT_NAME.$DEV_NAME.dev.omnify.jp" -ForegroundColor Cyan
Write-Host "   MinIO:       https://minio.$PROJECT_NAME.$DEV_NAME.dev.omnify.jp" -ForegroundColor Cyan
Write-Host ""
Write-Host "" -ForegroundColor DarkGray
Write-Host "  Starting frontend dev server..." -ForegroundColor Yellow
Write-Host "" -ForegroundColor DarkGray
Write-Host ""

# Cleanup: Remove lock file
Remove-Item -Path ".\frontend\.next\dev\lock" -Force -ErrorAction SilentlyContinue

# Start frontend dev server
Push-Location .\frontend
npm run dev -- -p $FRONTEND_PORT
Pop-Location
