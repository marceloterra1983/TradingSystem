# Setup Development Environment for TradingSystem
# This script prepares the local development environment

param(
    [switch]$SkipDependencies,
    [switch]$SkipDocker
)

Write-Host "🚀 TradingSystem - Development Environment Setup" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check Prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

# Check .NET SDK
try {
    $dotnetVersion = dotnet --version
    Write-Host "✅ .NET SDK: $dotnetVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ .NET SDK not found. Please install .NET 8.0 SDK" -ForegroundColor Red
    exit 1
}

# Check Python
try {
    $pythonVersion = python --version
    Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.11+" -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

# Check Docker (optional)
if (-not $SkipDocker) {
    try {
        $dockerVersion = docker --version
        Write-Host "✅ Docker: $dockerVersion" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Docker not found (optional for development)" -ForegroundColor Yellow
    }
}

Write-Host ""

# Setup .NET
if (-not $SkipDependencies) {
    Write-Host "📦 Restoring .NET dependencies..." -ForegroundColor Yellow
    dotnet restore "$PSScriptRoot\..\..\TradingSystem.sln"

    Write-Host "🔨 Building .NET solution (x64)..." -ForegroundColor Yellow
    dotnet build "$PSScriptRoot\..\..\TradingSystem.sln" -c Debug --arch x64

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ .NET build completed" -ForegroundColor Green
    } else {
        Write-Host "❌ .NET build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

# Setup Python - Analytics Pipeline
Write-Host "🐍 Setting up Analytics Pipeline (Python)..." -ForegroundColor Yellow
$analyticsPath = "$PSScriptRoot\..\..\src\Services\AnalyticsPipeline"

if (Test-Path "$analyticsPath\pyproject.toml") {
    Push-Location $analyticsPath

    # Check if Poetry is installed
    try {
        poetry --version | Out-Null
        poetry install
        Write-Host "✅ Analytics Pipeline dependencies installed" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Poetry not found. Installing with pip..." -ForegroundColor Yellow
        pip install -r requirements.txt 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Analytics Pipeline dependencies installed (pip)" -ForegroundColor Green
        }
    }

    Pop-Location
}
Write-Host ""

# Setup Python - API Gateway
Write-Host "🌐 Setting up API Gateway (Python)..." -ForegroundColor Yellow
$gatewayPath = "$PSScriptRoot\..\..\src\Services\APIGateway"

if (Test-Path "$gatewayPath\pyproject.toml") {
    Push-Location $gatewayPath

    try {
        poetry --version | Out-Null
        poetry install
        Write-Host "✅ API Gateway dependencies installed" -ForegroundColor Green
    } catch {
        pip install -r requirements.txt 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ API Gateway dependencies installed (pip)" -ForegroundColor Green
        }
    }

    Pop-Location
}
Write-Host ""

# Setup React Dashboard
Write-Host "⚛️  Setting up Dashboard (React)..." -ForegroundColor Yellow
$dashboardPath = "$PSScriptRoot\..\..\src\Services\Dashboard"

if (Test-Path "$dashboardPath\package.json") {
    Push-Location $dashboardPath

    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dashboard dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "❌ Dashboard npm install failed" -ForegroundColor Red
    }

    Pop-Location
}
Write-Host ""

# Create data directories
Write-Host "📁 Creating data directories..." -ForegroundColor Yellow
$dataPath = "$PSScriptRoot\..\..\data"

$directories = @(
    "$dataPath\parquet",
    "$dataPath\logs",
    "$dataPath\models",
    "$dataPath\backups"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  Created: $dir" -ForegroundColor Gray
    }
}
Write-Host "✅ Data directories ready" -ForegroundColor Green
Write-Host ""

# Setup environment config
Write-Host "⚙️  Setting up environment configuration..." -ForegroundColor Yellow
$envExample = "$PSScriptRoot\..\..\config\development\.env.example"
$envFile = "$PSScriptRoot\..\..\config\development\.env"

if (Test-Path $envExample) {
    if (-not (Test-Path $envFile)) {
        Copy-Item $envExample $envFile
        Write-Host "✅ Created .env file from template" -ForegroundColor Green
        Write-Host "⚠️  Please edit config/development/.env with your credentials" -ForegroundColor Yellow
    } else {
        Write-Host "✅ .env file already exists" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  .env.example not found" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "✨ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Edit config/development/.env with your ProfitDLL credentials" -ForegroundColor White
Write-Host "2. Run services:" -ForegroundColor White
Write-Host "   - Data Capture: cd src\Services\DataCapture\TradingSystem.DataCapture && dotnet run" -ForegroundColor Gray
Write-Host "   - Analytics: cd src\Services\AnalyticsPipeline && poetry run python src\main.py" -ForegroundColor Gray
Write-Host "   - Gateway: cd src\Services\APIGateway && poetry run uvicorn src.main:app --reload" -ForegroundColor Gray
Write-Host "   - Dashboard: cd src\Services\Dashboard && npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "OR use Docker:" -ForegroundColor White
Write-Host "   cd infrastructure\docker && docker-compose up -d" -ForegroundColor Gray
Write-Host ""
Write-Host "Access Dashboard: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Access API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
