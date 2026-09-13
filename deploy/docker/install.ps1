param(
    [string]$ServerHost,
    [int]$AppPort,
    [string]$DbPassword,
    [string]$TimeZone,
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

# One-shot installer for the containerised app server on Windows.
# Builds the env-only image from the bundle-root Dockerfile (the app is the
# bundle this kit ships inside, bind-mounted by compose), writes the compose .env,
# stamps the host identity the license binds to, brings the stack up, and
# registers a logon task so it comes back with the machine. Re-running it is
# safe: existing answers in .env become the defaults, so an update is
# `update.bat` or just this script again.

$envPath = Join-Path $PSScriptRoot '.env'

# docker writes progress ("Container ... Started", image pull output) to stderr.
# Two things bite in Windows PowerShell: with $ErrorActionPreference='Stop' a
# stderr line is a terminating error, and even on 'Continue' each native-stderr
# line is wrapped in an ErrorRecord and rendered as a red error block (with an
# "At install.ps1:NN char" trace) that looks like a failure and buries any real
# one. So drop to 'Continue' AND coerce every merged item to its string form
# ("$_") so progress prints as plain text; judge real success by $LASTEXITCODE
# (untouched by the ForEach-Object), the only reliable signal from a native
# command anyway.
#
# No param() block on purpose: it would make PowerShell try to bind `-d`, `-i`
# and friends as parameters of this function instead of passing them to docker.
function Invoke-Docker {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & docker @args 2>&1 | ForEach-Object { "$_" } } finally { $ErrorActionPreference = $previous }
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

# -- Docker ------------------------------------------------------------------
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
    throw 'This Docker has no compose plugin - Docker Desktop 4.x or newer is required.'
}
Write-Host "      Docker engine $server."

# -- Bundle ------------------------------------------------------------------
# The env image is built from the bundle-root Dockerfile at [5/6] (docker compose
# up --build); the application is the bundle this kit sits inside (two levels up).
# Just check it is here and settle on the image tag - the compose default is used
# unless .env already pins one.
Write-Host '[2/6] Checking the application bundle...'
$image = if ($existing['APP_IMAGE']) { $existing['APP_IMAGE'] } else { 'myapp/server:local' }
# This kit lives in <bundle>\deploy\docker\; the app + Dockerfile are at the
# bundle root, two levels up.
if (-not (Test-Path (Join-Path $PSScriptRoot '..\..\app\server\index.js'))) {
    throw "No application bundle found. This install.bat must sit in <bundle>\deploy\docker\ inside the extracted release bundle (app\, startup\, Dockerfile at its root). Re-extract the release and run install.bat again."
}
# bytenode locks the .jsc to the exact Node/V8 it was built with; read that from
# the bundle's VERSION so the image is built with the SAME Node and boots.
$versionFile = Join-Path $PSScriptRoot '..\..\VERSION'
$nodeVersion = $existing['NODE_VERSION']
$nodeSource = 'from .env'
if (Test-Path $versionFile) {
    $nv = Select-String -Path $versionFile -Pattern '^node_version=' | Select-Object -First 1
    if ($nv) { $nodeVersion = ($nv.Line -replace '^node_version=v?', '').Trim(); $nodeSource = 'from VERSION' }
}
# No VERSION file (e.g. a source checkout rather than a built release bundle) and
# nothing carried over from a previous .env: ask, defaulting to the host's Node.
# Writing a blank NODE_VERSION makes the Dockerfile base image `node:-bookworm-slim`
# and the compose build fails on its `${NODE_VERSION:?...}` guard, so refuse to.
if ([string]::IsNullOrWhiteSpace($nodeVersion) -and -not $Quiet) {
    $hostNode = ''
    try { $hostNode = ((& node -v 2>$null) -replace '^v', '').Trim() } catch {}
    $nodeVersion = Ask 'Node version to build the image on (no bundle VERSION found - match the bytecode ABI)' $hostNode
    $nodeSource = 'entered'
}
if ([string]::IsNullOrWhiteSpace($nodeVersion)) {
    throw "NODE_VERSION is unknown - no 'node_version=' in $versionFile and none in .env. Set NODE_VERSION in .env to the bundle's Node version and run install.bat again."
}
Write-Host "      Bundle found; image $image will be built on Node $nodeVersion ($nodeSource)."

# -- Answers -----------------------------------------------------------------
Write-Host '[3/6] Configuration...'
$defaultHost = (Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway } |
                Select-Object -First 1).IPv4Address.IPAddress | Select-Object -First 1
if (-not $defaultHost) { $defaultHost = $env:COMPUTERNAME }

$project = if ($existing['COMPOSE_PROJECT_NAME']) { $existing['COMPOSE_PROJECT_NAME'] } else { Ask 'App name (names the stack, its database and the scheduled tasks)' 'myapp' }

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
if (-not $TimeZone)   { $TimeZone   = Ask 'Time zone (IANA name - timestamps are stamped in it)' $(if ($existing['TZ']) { $existing['TZ'] } else { 'Asia/Kolkata' }) }
if (-not $DbPassword) { $DbPassword = if ($existing['DB_PASSWORD']) { $existing['DB_PASSWORD'] } else { New-Password } }
$dbName = if ($existing['DB_NAME']) { $existing['DB_NAME'] } else { $project }

$appUrl = if ($AppPort -eq 80) { "http://$ServerHost" } else { "http://${ServerHost}:$AppPort" }

Write-TextFile $envPath @"
# Written by install.ps1 - re-run install.bat (or edit here and run start.bat)
# to change any of it. This file feeds docker-compose.yml only; the server's own
# configuration lives in config\.env.
COMPOSE_PROJECT_NAME=$project
APP_IMAGE=$image
NODE_VERSION=$nodeVersion
APP_PORT=$AppPort
APP_URL=$appUrl
SERVER_HOST=$ServerHost
DB_NAME=$dbName
DB_PASSWORD=$DbPassword
TZ=$TimeZone
"@
Write-Host "      $envPath written - the app will answer on $appUrl"

# -- Host state --------------------------------------------------------------
Write-Host '[4/6] Stamping this machine for the license...'
foreach ($d in @('config', 'config\secret', 'uploads', 'logs', 'backups')) {
    New-Item -ItemType Directory -Force -Path (Join-Path $stateDir $d) | Out-Null
}
& (Join-Path $PSScriptRoot 'host-fingerprint.ps1') -OutFile (Join-Path $stateDir 'config\host_machine.json')

# -- Up ----------------------------------------------------------------------
# --build builds the env image on first run and picks up any Dockerfile change
# on an update; an unchanged image is cached, so this is cheap on re-runs.
Write-Host '[5/6] Building the image and starting the stack...'
Invoke-Docker compose up -d --build
if ($LASTEXITCODE -ne 0) { throw 'docker compose up failed - see the output above.' }

# -- Scheduled tasks ---------------------------------------------------------
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
        # -ErrorAction Stop, or the CIM "Access is denied" this raises when the
        # install is not elevated stays non-terminating, skips the catch, and the
        # success line below prints anyway - telling the operator the logon task
        # is registered when it is not, so the stack silently never comes back
        # after a reboot.
        Register-ScheduledTask -TaskName $Name -Action $action -Trigger $Trigger -Principal $principal -Force -ErrorAction Stop | Out-Null
        Write-Host "      '$Name' registered for $env:USERDOMAIN\$env:USERNAME."
    } catch {
        Write-Warning "Could not register '$Name' ($($_.Exception.Message)). $OnFailure"
    }
}

Register-Task "$project Docker Start" 'powershell.exe' `
    "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$(Join-Path $PSScriptRoot 'start.ps1')`"" `
    (New-ScheduledTaskTrigger -AtLogOn) `
    'The stack still restarts with Docker; run start.bat after a reboot if it does not come up.'

# The database is the one piece of state Windows backup cannot copy safely
# while it is live. This drops a consistent dump into data\backups\ nightly,
# where the backup software finds it with everything else.
Register-Task "$project Database Backup" 'cmd.exe' `
    "/c `"$(Join-Path $PSScriptRoot 'backup.bat')`"" `
    (New-ScheduledTaskTrigger -Daily -At 1am) `
    'Run backup.bat by hand, or schedule it yourself - without it the database is not in your Windows backups.'

Write-Host ''
Write-Host "$project is up at $appUrl"
Write-Host ''
Write-Host '  status.bat   service state and health (both containers)'
Write-Host '  logs.bat     live server logs'
Write-Host '  backup.bat   database dump into data\backups\ (also runs nightly at 01:00)'
Write-Host ''
Write-Host 'Next, on a fresh install:'
Write-Host '  docker compose exec app npm run create-new-company     (company + sadmin login - nobody can log in until this is run)'
Write-Host '  docker compose exec app npm run license:machine        (fingerprint to send us)'
Write-Host '  docker compose exec app npm run license:install        (paste the token we return)'
