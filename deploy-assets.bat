@echo off
setlocal
cd /d "%~dp0"

echo.
echo Reward School frontend asset deployment
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-assets.ps1"

echo.
echo Press any key to close this window.
pause >nul
