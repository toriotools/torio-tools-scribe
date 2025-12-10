# Torio Tools Scribe - Script de Desenvolvimento
# Reinicia todos os serviços automaticamente

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TORIO TOOLS SCRIBE - Dev Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "H:\dev\torio-tools-scribe"
$rendererPath = Join-Path $projectRoot "renderer"

# Parar processos anteriores
Write-Host "[1/4] Parando processos anteriores..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "python" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "electron" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "   Processos parados!" -ForegroundColor Green

# Verificar FFmpeg
Write-Host "[2/4] Verificando FFmpeg..." -ForegroundColor Yellow
$ffmpegPath = Join-Path $projectRoot "ffmpeg-win-x86_64-v7.1.exe"
if (Test-Path $ffmpegPath) {
    Write-Host "   FFmpeg encontrado: $ffmpegPath" -ForegroundColor Green
}
else {
    Write-Host "   AVISO: FFmpeg nao encontrado em $ffmpegPath" -ForegroundColor Red
}

# Verificar Logo
$logoPath = Join-Path $projectRoot "logo-torio-tools-scribe.png"
if (Test-Path $logoPath) {
    Write-Host "   Logo encontrada!" -ForegroundColor Green
    # Copiar para assets
    Copy-Item $logoPath -Destination (Join-Path $projectRoot "assets\icons\logo.png") -Force -ErrorAction SilentlyContinue
    Copy-Item $logoPath -Destination (Join-Path $projectRoot "renderer\public\logo.png") -Force -ErrorAction SilentlyContinue
}

# Iniciar Dev Server (Vite) em background
Write-Host "[3/4] Iniciando Dev Server (Vite)..." -ForegroundColor Yellow
$viteProcess = Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$rendererPath'; npm run dev" -PassThru -WindowStyle Normal
Write-Host "   Dev Server iniciado (PID: $($viteProcess.Id))" -ForegroundColor Green
Write-Host "   Aguardando servidor (10s)..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# Iniciar Electron + Python Engine
Write-Host "[4/4] Iniciando Electron + Engine..." -ForegroundColor Yellow
$electronProcess = Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$projectRoot'; npm start" -PassThru -WindowStyle Normal
Write-Host "   Electron iniciado (PID: $($electronProcess.Id))" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  TUDO PRONTO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Dev Server: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Engine API: http://127.0.0.1:5123" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se a tela abrir preta, aguarde alguns segundos..." -ForegroundColor Gray
Write-Host "O Electron agora tenta 10x conectar ao dev server." -ForegroundColor Gray
Write-Host ""
Write-Host "Pressione qualquer tecla para fechar este terminal..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
