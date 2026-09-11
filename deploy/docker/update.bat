@echo off
REM Apply a new release: replace the extracted bundle with the new one, but keep
REM this deploy\docker\docker_data\ folder (your state), then double-click.
REM
REM install.ps1 rebuilds the image if the Dockerfile changed and recreates the
REM containers; the container reinstalls dependencies when the bundle's commit
REM changes. Configuration, license, uploads and the database are outside the
REM container (docker_data\ and the db-data volume) and are left alone - it
REM reuses the answers already in .env, so it does not ask anything again.

cd /d "%~dp0"

net session >nul 2>&1
if errorlevel 1 (
    echo Requesting administrator privileges...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" -Quiet
if errorlevel 1 (
    echo.
    echo Update failed - the previous version is still installed.
    pause
    exit /b 1
)

echo.
echo Updated. Old images can be reclaimed with: docker image prune -a
pause
