@echo off
REM Live server logs. Ctrl+C to stop watching (the server keeps running).
REM Winston's own log files are in data\logs\ next to this script.
REM
REM This follows the app. For a biometric terminal that is not punching, the
REM gateway it pushes to is the one to watch instead:
REM   docker compose logs -f --tail 200 adms biomax

cd /d "%~dp0"
echo Following the app. For device traffic: docker compose logs -f adms biomax
echo.
docker compose logs -f --tail 200 app
pause
