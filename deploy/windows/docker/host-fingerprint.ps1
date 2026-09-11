param(
    [Parameter(Mandatory=$true)][string]$OutFile
)

$ErrorActionPreference = 'Stop'

# Stamps this machine's identity into a JSON file the container reads
# (HOST_MACHINE_FILE → startup/server/src/license/machineFingerprint.js). The
# license binds to the physical Windows box, not to a container that is thrown
# away on every update — and a token issued against a bare-metal install of the
# same machine keeps verifying after the move to Docker.
#
# Every adapter that currently holds an IP is reported, virtual ones included:
# the container-side filter decides what counts as physical, so this script
# over-reporting is harmless while under-reporting would change the
# fingerprint. That mirrors what Node's os.networkInterfaces() returns here.

$aliasesWithIp = Get-NetIPAddress | Select-Object -ExpandProperty InterfaceAlias -Unique

$interfaces = @(
    Get-NetAdapter |
        Where-Object { $_.MacAddress -and ($aliasesWithIp -contains $_.Name) } |
        ForEach-Object {
            [ordered]@{
                name = $_.Name
                mac  = $_.MacAddress.Replace('-', ':').ToLower()
            }
        }
)

if ($interfaces.Count -eq 0) {
    throw "No network adapter with an IP address found — the license cannot be bound to this machine."
}

$machineId = (Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Cryptography' -Name MachineGuid).MachineGuid.ToLower()

$json = [ordered]@{
    interfaces = $interfaces
    machineId  = $machineId
} | ConvertTo-Json -Depth 4

# WriteAllText, not Set-Content: Windows PowerShell writes a UTF-8 BOM that
# JSON.parse() on the container side refuses.
# Combine() returns $OutFile untouched when it is already absolute.
$full = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine((Get-Location).Path, $OutFile))
[System.IO.File]::WriteAllText($full, $json)

Write-Host "[fingerprint] $($interfaces.Count) adapter(s), machine-id $machineId -> $full"
