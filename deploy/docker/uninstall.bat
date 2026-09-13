@echo off
REM Stop the app and remove its scheduled tasks.
REM
REM Nothing is deleted: the database volume and the whole docker_data\ folder
REM (config, license, uploads, logs, backups) stay. To wipe the database too, run afterwards:
REM     docker compose down -v
REM and delete this folder.

net session >nul 2>&1
if errorlevel 1 (
    echo Requesting administrator privileges...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo Stopping containers...
docker compose down

echo Removing the scheduled tasks...
for /f "tokens=1,* delims==" %%a in ('findstr /b "COMPOSE_PROJECT_NAME" .env') do set COMPOSE_PROJECT_NAME=%%b
schtasks /Delete /TN "%COMPOSE_PROJECT_NAME% Docker Start" /F >nul 2>&1
schtasks /Delete /TN "%COMPOSE_PROJECT_NAME% Database Backup" /F >nul 2>&1

echo.
echo Stopped. Data kept - run install.bat to bring it back.
pause
