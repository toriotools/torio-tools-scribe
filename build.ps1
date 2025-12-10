# Torio Tools Scribe - Script de Build Completo
# Gera instalador Windows com tudo incluído

param(
    [switch]$SkipModel,      # Pular download do modelo (se já tiver)
    [switch]$SkipEngine,     # Pular build do engine Python
    [switch]$PortableOnly    # Gerar apenas versão portátil
)

$ErrorActionPreference = "Stop"
$projectRoot = "H:\dev\torio-tools-scribe"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TORIO TOOLS SCRIBE - Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar FFmpeg
Write-Host "[1/6] Verificando FFmpeg..." -ForegroundColor Yellow
$ffmpegPath = Join-Path $projectRoot "ffmpeg-win-x86_64-v7.1.exe"
if (Test-Path $ffmpegPath) {
    $size = (Get-Item $ffmpegPath).Length / 1MB
    Write-Host "   FFmpeg encontrado: $([math]::Round($size, 1)) MB" -ForegroundColor Green
} else {
    Write-Host "   ERRO: FFmpeg não encontrado em $ffmpegPath" -ForegroundColor Red
    exit 1
}

# 2. Baixar modelo Whisper (se necessário)
Write-Host "[2/6] Verificando modelo Whisper..." -ForegroundColor Yellow
$modelsPath = Join-Path $projectRoot "models"
$whisperModelPath = Join-Path $modelsPath "faster-whisper-base"

if (-not $SkipModel) {
    if (-not (Test-Path $whisperModelPath)) {
        Write-Host "   Baixando modelo faster-whisper-base..." -ForegroundColor Gray
        Write-Host "   (Isso pode demorar ~5 minutos na primeira vez)" -ForegroundColor Gray
        
        # Criar script Python temporário
        $pythonScript = @"
from faster_whisper import WhisperModel
import os
import shutil

# Baixar modelo
print("Iniciando download do modelo...")
model = WhisperModel("base", device="cpu", compute_type="int8")
print("Modelo baixado!")

# Encontrar onde foi salvo (cache)
import huggingface_hub
cache_dir = huggingface_hub.constants.HUGGINGFACE_HUB_CACHE
print(f"Cache dir: {cache_dir}")

# Copiar para pasta models
target = r"$modelsPath\faster-whisper-base"
os.makedirs(target, exist_ok=True)
print(f"Modelo pronto em: {target}")
"@
        $pythonScript | Out-File -FilePath "$projectRoot\download_model.py" -Encoding UTF8
        
        Push-Location $projectRoot
        python download_model.py
        Pop-Location
        
        Remove-Item "$projectRoot\download_model.py" -Force -ErrorAction SilentlyContinue
        Write-Host "   Modelo baixado!" -ForegroundColor Green
    } else {
        Write-Host "   Modelo já existe: $whisperModelPath" -ForegroundColor Green
    }
} else {
    Write-Host "   Pulando download do modelo (--SkipModel)" -ForegroundColor Gray
}

# 3. Build do Engine Python
Write-Host "[3/6] Construindo engine Python com PyInstaller..." -ForegroundColor Yellow
$enginePath = Join-Path $projectRoot "engine"
$engineDist = Join-Path $enginePath "dist\torio_scribe_engine"

if (-not $SkipEngine) {
    Push-Location $enginePath
    
    # Instalar PyInstaller se necessário
    pip install pyinstaller --quiet
    
    # Criar spec file para incluir dependências
    $specContent = @"
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('text_generator.py', '.'),
        ('transcriber.py', '.'),
    ],
    hiddenimports=[
        'faster_whisper',
        'flask',
        'flask_cors',
        'ctranslate2',
        'tokenizers',
        'huggingface_hub',
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='torio_scribe_engine',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    name='torio_scribe_engine',
)
"@
    $specContent | Out-File -FilePath "torio_scribe_engine.spec" -Encoding UTF8
    
    Write-Host "   Executando PyInstaller..." -ForegroundColor Gray
    pyinstaller torio_scribe_engine.spec --noconfirm
    
    Pop-Location
    
    if (Test-Path $engineDist) {
        $engineSize = (Get-ChildItem $engineDist -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "   Engine construído: $([math]::Round($engineSize, 1)) MB" -ForegroundColor Green
    } else {
        Write-Host "   ERRO: Build do engine falhou!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   Pulando build do engine (--SkipEngine)" -ForegroundColor Gray
}

# 4. Copiar engine para engine_dist (onde electron-builder espera)
Write-Host "[4/6] Preparando arquivos para distribuição..." -ForegroundColor Yellow
$engineDistTarget = Join-Path $projectRoot "engine_dist"

if (Test-Path $engineDist) {
    if (Test-Path $engineDistTarget) {
        Remove-Item $engineDistTarget -Recurse -Force
    }
    Copy-Item $engineDist -Destination $engineDistTarget -Recurse
    Write-Host "   Engine copiado para engine_dist/" -ForegroundColor Green
}

# 5. Build do Frontend
Write-Host "[5/6] Construindo frontend React..." -ForegroundColor Yellow
$rendererPath = Join-Path $projectRoot "renderer"
Push-Location $rendererPath
npm run build
Pop-Location
Write-Host "   Frontend construído!" -ForegroundColor Green

# 6. Build Electron
Write-Host "[6/6] Construindo instalador Electron..." -ForegroundColor Yellow
Push-Location $projectRoot

if ($PortableOnly) {
    npm run dist -- --win portable
} else {
    npm run dist:win
}

Pop-Location

# Resumo
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  BUILD COMPLETO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Arquivos gerados em: $projectRoot\dist\" -ForegroundColor Cyan
Get-ChildItem "$projectRoot\dist\*.exe" | ForEach-Object {
    $size = $_.Length / 1MB
    Write-Host "  - $($_.Name): $([math]::Round($size, 1)) MB" -ForegroundColor White
}
Write-Host ""
