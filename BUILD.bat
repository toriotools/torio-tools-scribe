@echo off
REM ==================================================
REM  TORIO TOOLS SCRIBE - Build Script
REM ==================================================
echo.
echo ========================================
echo   TORIO TOOLS SCRIBE - Build Script
echo ========================================
echo.

cd /d "%~dp0"

REM 1. Build do Backend Python
echo [1/3] Construindo Engine Python...
python build_engine.py
if errorlevel 1 (
    echo ERRO: Falha no build do engine Python
    pause
    exit /b 1
)

REM 2. Build do Frontend React
echo [2/3] Construindo Frontend React...
cd renderer
call npm run build
if errorlevel 1 (
    echo ERRO: Falha no build do React
    cd ..
    pause
    exit /b 1
)
cd ..

REM 3. Build do Electron + Instalador
echo [3/3] Construindo Instalador Electron...
call npx electron-builder --win nsis --config.directories.output=output

echo.
echo ========================================
echo   BUILD COMPLETO!
echo ========================================
echo.
echo Arquivos gerados em: output\
dir output\*.exe /b 2>nul
echo.
pause
