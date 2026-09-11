# Brings the stack up. Run by the logon task (hidden) and by start.bat.
#
# 'Continue' rather than 'Stop': every step here is a native docker call, and
# docker's normal progress output goes to stderr - which Windows PowerShell
# would turn into a terminating error. Exit codes are checked instead. A throw
# from host-fingerprint.ps1 still terminates this script.
$ErrorActionPreference = 'Continue'
Set-Location -Path $PSScriptRoot

# Docker Desktop's engine starts with the user session, so at logon this can
# easily run before the daemon is listening - wait for it rather than failing.
$deadline = (Get-Date).AddMinutes(5)
while ($true) {
    & docker version --format '{{.Server.Version}}' 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { break }
    if ((Get-Date) -gt $deadline) { throw 'Docker did not become available within 5 minutes.' }
    Start-Sleep -Seconds 10
}

# Re-stamp the host identity on every start: the hardware the license was issued
# against is what must be seen, and a copy of this folder on another machine
# should rebind (and fail verification) rather than carry the license along.
& (Join-Path $PSScriptRoot 'host-fingerprint.ps1') -OutFile (Join-Path $PSScriptRoot 'docker_data\config\host_machine.json')

& docker compose up -d
exit $LASTEXITCODE
