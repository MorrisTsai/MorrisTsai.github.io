@echo off
setlocal
cd /d "%~dp0"

echo.
echo Reward School frontend code deployment
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-code.ps1"

echo.
echo Press any key to close this window.
pause >nul
