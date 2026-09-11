@echo off
REM Install SalaryMitra on this Windows machine, in Docker.
REM Self-elevates (needed to register the start-on-logon task), then hands over
REM to install.ps1 for the actual work.

net session >nul 2>&1
if errorlevel 1 (
    echo Requesting administrator privileges...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
if errorlevel 1 (
    echo.
    echo Install failed. Fix the error above and run install.bat again.
    pause
    exit /b 1
)
pause
exit /b 0
