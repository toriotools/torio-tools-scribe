# ============================================
# Torio Tools Scribe - Setup Script
# Prepara o ambiente para desenvolvimento
# ============================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "  TORIO TOOLS SCRIBE - SETUP" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Verificar Node.js
Write-Host "[1/5] Verificando Node.js..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "      Node.js $nodeVersion encontrado" -ForegroundColor Green
} catch {
    Write-Host "      ERRO: Node.js nao encontrado! Instale em https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Verificar Python
Write-Host "[2/5] Verificando Python..." -ForegroundColor Cyan
try {
    $pythonVersion = python --version
    Write-Host "      $pythonVersion encontrado" -ForegroundColor Green
} catch {
    Write-Host "      ERRO: Python nao encontrado! Instale em https://python.org" -ForegroundColor Red
    exit 1
}

# Instalar dependencias Electron (raiz)
Write-Host "[3/5] Instalando dependencias Electron..." -ForegroundColor Cyan
Set-Location $projectRoot
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ERRO ao instalar deps Electron" -ForegroundColor Red
    exit 1
}
Write-Host "      Dependencias Electron instaladas!" -ForegroundColor Green

# Instalar dependencias React (renderer)
Write-Host "[4/5] Instalando dependencias React..." -ForegroundColor Cyan
Set-Location "$projectRoot\renderer"
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ERRO ao instalar deps React" -ForegroundColor Red
    Set-Location $projectRoot
    exit 1
}
Write-Host "      Dependencias React instaladas!" -ForegroundColor Green

# Instalar dependencias Python (engine)
Write-Host "[5/5] Instalando dependencias Python..." -ForegroundColor Cyan
Set-Location "$projectRoot\engine"
pip install -r requirements.txt -q
if ($LASTEXITCODE -ne 0) {
    Write-Host "      AVISO: Erro ao instalar deps Python (pode funcionar ainda)" -ForegroundColor Yellow
} else {
    Write-Host "      Dependencias Python instaladas!" -ForegroundColor Green
}

Set-Location $projectRoot

Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "  SETUP COMPLETO!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Para testar a interface, execute:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  cd renderer" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Depois abra: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "(O Electron completo requer o Python engine rodando)" -ForegroundColor DarkGray
Write-Host ""
