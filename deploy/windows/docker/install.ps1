param(
    [string]$ImageTar,
    [string]$ServerHost,
    [int]$AppPort,
    [string]$DbPassword,
    [string]$TimeZone,
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

# One-shot installer for the containerised SalaryMitra server on Windows.
# Loads the shipped image, writes the compose .env, stamps the host identity
# the license binds to, brings the stack up, and registers a logon task so it
# comes back with the machine. Re-running it is safe: existing answers in .env
# become the defaults, so an update is `update.bat` or just this script again.

$envPath = Join-Path $PSScriptRoot '.env'

# docker writes progress ("Container … Started", pull output) to stderr, which
# Windows PowerShell turns into a terminating error while $ErrorActionPreference
# is 'Stop'. Drop to 'Continue' for the call and judge the result by
# $LASTEXITCODE, the only reliable signal from a native command anyway.
#
# No param() block on purpose: it would make PowerShell try to bind `-d`, `-i`
# and friends as parameters of this function instead of passing them to docker.
function Invoke-Docker {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & docker @args 2>&1 } finally { $ErrorActionPreference = $previous }
}

function Write-TextFile([string]$Path, [string]$Content) {
    # Windows PowerShell's Set-Content adds a UTF-8 BOM, which docker compose
    # reads as part of the first variable name.
    [System.IO.File]::WriteAllText($Path, $Content)
}

function Read-EnvFile([string]$Path) {
    $map = @{}
    if (Test-Path $Path) {
        Get-Content $Path | ForEach-Object {
            if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$') { $map[$Matches[1]] = $Matches[2].Trim() }
        }
    }
    return $map
}

function Ask([string]$Question, [string]$Default) {
    $answer = Read-Host "$Question [$Default]"
    if ([string]::IsNullOrWhiteSpace($answer)) { return $Default }
    return $answer.Trim()
}

function New-Password() {
    $bytes = New-Object byte[] 18
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return ([Convert]::ToBase64String($bytes) -replace '[^A-Za-z0-9]', '')
}

# Every file this install owns lives in one folder next to docker-compose.yml.
# Not configurable on purpose: one fixed place to find, copy and back up.
$stateDir = Join-Path $PSScriptRoot 'docker_data'

# The answers from a previous run become this run's defaults.
$existing = Read-EnvFile $envPath

# ── Docker ──────────────────────────────────────────────────────────────────
Write-Host '[1/6] Checking Docker...'
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker is not installed. Install Docker Desktop (https://docs.docker.com/desktop/install/windows-install/), start it, then run install.bat again.'
}
$server = Invoke-Docker version --format '{{.Server.Version}}'
if ($LASTEXITCODE -ne 0) {
    throw 'Docker is installed but its engine is not running. Start Docker Desktop, wait for the whale icon to stop animating, then run install.bat again.'
}
Invoke-Docker compose version | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw 'This Docker has no compose plugin — Docker Desktop 4.x or newer is required.'
}
Write-Host "      Docker engine $server."

# ── Image ───────────────────────────────────────────────────────────────────
Write-Host '[2/6] Loading the application image...'
$image = $existing['APP_IMAGE']

if (-not $ImageTar) {
    $ImageTar = Get-ChildItem -Path $PSScriptRoot -Filter 'salarymitra-server-*.tar*' -ErrorAction SilentlyContinue |
                Sort-Object LastWriteTime | Select-Object -Last 1 -ExpandProperty FullName
}
if ($ImageTar) {
    Write-Host "      docker load -i $ImageTar (this takes a few minutes)"
    $loaded = Invoke-Docker load -i $ImageTar
    if ($LASTEXITCODE -ne 0) { throw "docker load failed for $ImageTar :`n$loaded" }
    $line = $loaded | Where-Object { $_ -match 'Loaded image[^:]*:\s*(\S+)' } | Select-Object -Last 1
    if ($line -and $line -match 'Loaded image[^:]*:\s*(\S+)') { $image = $Matches[1] }
    Write-Host "      Loaded $image."
} elseif ($image) {
    Write-Host "      No image tar next to this script — keeping $image."
} else {
    throw "No image found. Copy salarymitra-server-<version>.tar.gz into $PSScriptRoot (it ships with the release) and run install.bat again."
}

# ── Answers ─────────────────────────────────────────────────────────────────
Write-Host '[3/6] Configuration...'
$defaultHost = (Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway } |
                Select-Object -First 1).IPv4Address.IPAddress | Select-Object -First 1
if (-not $defaultHost) { $defaultHost = $env:COMPUTERNAME }

# -Quiet (how update.bat calls this) reuses every answer already on disk, so a
# release upgrade asks nothing. Anything still unanswered falls through to the
# prompts below.
if ($Quiet) {
    if (-not $ServerHost) { $ServerHost = $existing['SERVER_HOST'] }
    if (-not $AppPort)    { $AppPort    = $existing['APP_PORT'] }
    if (-not $TimeZone)   { $TimeZone   = $existing['TZ'] }
}

if (-not $ServerHost) { $ServerHost = Ask 'Server IP address or host name staff will browse to' $(if ($existing['SERVER_HOST']) { $existing['SERVER_HOST'] } else { $defaultHost }) }
if (-not $AppPort)    { $AppPort    = [int](Ask 'HTTP port to publish' $(if ($existing['APP_PORT']) { $existing['APP_PORT'] } else { '80' })) }
if (-not $TimeZone)   { $TimeZone   = Ask 'Time zone (IANA name — attendance and payroll are stamped in it)' $(if ($existing['TZ']) { $existing['TZ'] } else { 'Asia/Kolkata' }) }
if (-not $DbPassword) { $DbPassword = if ($existing['DB_PASSWORD']) { $existing['DB_PASSWORD'] } else { New-Password } }

$appUrl = if ($AppPort -eq 80) { "http://$ServerHost" } else { "http://${ServerHost}:$AppPort" }

Write-TextFile $envPath @"
# Written by install.ps1 — re-run install.bat (or edit here and run start.bat)
# to change any of it. This file feeds docker-compose.yml only; the server's own
# configuration lives in config\.env.
APP_IMAGE=$image
APP_PORT=$AppPort
APP_URL=$appUrl
SERVER_HOST=$ServerHost
DB_NAME=etime
DB_PASSWORD=$DbPassword
TZ=$TimeZone
"@
Write-Host "      $envPath written — the app will answer on $appUrl"

# ── Host state ──────────────────────────────────────────────────────────────
Write-Host '[4/6] Stamping this machine for the license...'
foreach ($d in @('config', 'config\secret', 'uploads', 'logs', 'backups')) {
    New-Item -ItemType Directory -Force -Path (Join-Path $stateDir $d) | Out-Null
}
& (Join-Path $PSScriptRoot 'host-fingerprint.ps1') -OutFile (Join-Path $stateDir 'config\host_machine.json')

# ── Up ──────────────────────────────────────────────────────────────────────
Write-Host '[5/6] Starting the stack...'
Invoke-Docker compose up -d
if ($LASTEXITCODE -ne 0) { throw 'docker compose up failed — see the output above.' }

# ── Scheduled tasks ─────────────────────────────────────────────────────────
# Docker Desktop's engine only runs inside a logged-on user session, so the
# start task is a logon task rather than a boot service; `restart:
# unless-stopped` in the compose file covers crashes and engine restarts in
# between. It re-stamps the host identity every time, so a copy of this folder
# carried to another machine rebinds to that machine and fails license
# verification there.
Write-Host '[6/6] Registering scheduled tasks...'

# Interactive: runs in the logged-on session (where the Docker engine is) and
# needs no stored password.
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest

function Register-Task([string]$Name, [string]$Execute, [string]$Argument, $Trigger, [string]$OnFailure) {
    try {
        $action = New-ScheduledTaskAction -Execute $Execute -Argument $Argument -WorkingDirectory $PSScriptRoot
        Register-ScheduledTask -TaskName $Name -Action $action -Trigger $Trigger -Principal $principal -Force | Out-Null
        Write-Host "      '$Name' registered for $env:USERDOMAIN\$env:USERNAME."
    } catch {
        Write-Warning "Could not register '$Name' ($($_.Exception.Message)). $OnFailure"
    }
}

Register-Task 'SalaryMitra Docker Start' 'powershell.exe' `
    "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$(Join-Path $PSScriptRoot 'start.ps1')`"" `
    (New-ScheduledTaskTrigger -AtLogOn) `
    'The stack still restarts with Docker; run start.bat after a reboot if it does not come up.'

# The database is the one piece of state Windows backup cannot copy safely
# while it is live. This drops a consistent dump into data\backups\ nightly,
# where the backup software finds it with everything else.
Register-Task 'SalaryMitra Database Backup' 'cmd.exe' `
    "/c `"$(Join-Path $PSScriptRoot 'backup.bat')`"" `
    (New-ScheduledTaskTrigger -Daily -At 1am) `
    'Run backup.bat by hand, or schedule it yourself — without it the database is not in your Windows backups.'

Write-Host ''
Write-Host "SalaryMitra is up at $appUrl"
Write-Host '  status.bat   service state and health'
Write-Host '  logs.bat     live server logs'
Write-Host '  backup.bat   database dump into data\backups\ (also runs nightly at 01:00)'
Write-Host ''
Write-Host 'Next, on a fresh install:'
Write-Host '  docker compose exec app npm run create-new-company     (company + sadmin login — nobody can log in until this is run)'
Write-Host '  docker compose exec app npm run license:machine        (fingerprint to send us)'
Write-Host '  docker compose exec app npm run license:install        (paste the token we return)'
