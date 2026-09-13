@echo off
REM Start the app. Safe to double-click any time - it waits for Docker,
REM re-stamps the host identity the license binds to, and brings the stack up.

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
if errorlevel 1 (
    echo.
    echo Start failed. Check that Docker Desktop is running, then try again.
)
pause
