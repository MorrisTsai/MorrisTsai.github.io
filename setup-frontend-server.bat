@echo off
setlocal
cd /d "%~dp0"

echo.
echo Reward School frontend server setup
echo This is a one-time setup for Nginx routing.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-frontend-server.ps1"

echo.
echo Press any key to close this window.
pause >nul
