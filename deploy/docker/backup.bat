@echo off
REM Writes a restorable database dump onto the Windows disk, next to the rest of
REM the state, so ordinary Windows backup software picks it up:
REM
REM   docker_data\backups\<COMPOSE_PROJECT_NAME>-YYYYMMDD-HHmm.sql
REM
REM This is the supported way to back up the database. Copying the live Postgres
REM data directory with a file-level tool gives you a torn snapshot that will
REM not restore; pg_dump gives you a consistent one while the server keeps
REM running. install.bat registers this to run daily; run it by hand any time.
REM
REM Restore into an empty database with:
REM   docker compose exec -T db psql -U postgres <DB_NAME> < docker_data\backups\<file>.sql

cd /d "%~dp0"

REM Same database and stack name the compose file uses.
for /f "tokens=1,* delims==" %%a in ('findstr /b "DB_NAME" .env') do set DB_NAME=%%b
for /f "tokens=1,* delims==" %%a in ('findstr /b "COMPOSE_PROJECT_NAME" .env') do set COMPOSE_PROJECT_NAME=%%b

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmm"') do set STAMP=%%i

if not exist "docker_data\backups" mkdir "docker_data\backups"
set OUTFILE=docker_data\backups\%COMPOSE_PROJECT_NAME%-%STAMP%.sql

REM -T: no TTY, so the redirect below captures clean SQL.
docker compose exec -T db pg_dump -U postgres %DB_NAME% > "%OUTFILE%"
if errorlevel 1 (
    echo Backup FAILED - is the stack running? Try status.bat.
    REM A failed dump leaves a truncated file that looks like a good backup.
    del "%OUTFILE%" 2>nul
    exit /b 1
)

echo Wrote %OUTFILE%

REM Keep a fortnight. Older dumps are the backup software's problem, not ours.
forfiles /p "docker_data\backups" /m %COMPOSE_PROJECT_NAME%-*.sql /d -14 /c "cmd /c del @path" 2>nul

exit /b 0
