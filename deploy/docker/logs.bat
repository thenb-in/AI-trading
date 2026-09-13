@echo off
REM Live server logs. Ctrl+C to stop watching (the server keeps running).
REM Winston's own log files are in data\logs\ next to this script.

cd /d "%~dp0"
docker compose logs -f --tail 200 app
pause
