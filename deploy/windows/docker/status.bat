@echo off
REM Double-click to see whether SalaryMitra is running. No admin needed.
REM The STATUS column shows "(healthy)" once the server answers /api/healthz.

cd /d "%~dp0"

docker compose ps
if errorlevel 1 (
    echo.
    echo Could not talk to Docker — is Docker Desktop running?
    pause
    exit /b 1
)

echo.
for /f "tokens=1,* delims==" %%a in ('findstr /b "APP_URL" .env') do echo Browse to %%b
pause
