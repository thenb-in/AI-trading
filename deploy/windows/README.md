# SalaryMitra — Windows Service Install

Runs `app/server` as a Windows Service that starts on boot and auto-restarts on
crash. Uses **NSSM** (service manager) and a **pinned portable Node** whose
exact version matches the one used to build the `.jsc` files (bytenode is tied
to the precise V8/Node patch — any mismatch will fail to load the bundle).

> There is also a Docker install for Windows: [`docker/README.md`](docker/README.md).
> It runs the same bytecode inside a Linux container, so the Node version
> pinning below is handled by the image rather than by this script.

## Files

| File                     | Purpose                                                       |
| ------------------------ | ------------------------------------------------------------- |
| `install-service.bat`    | One-shot installer. Self-elevates to admin.                   |
| `uninstall-service.bat`  | Stops + removes the service. Self-elevates.                   |
| `status.bat`             | Double-click to see RUNNING / STOPPED / NOT INSTALLED.        |
| `ensure-prereqs.ps1`     | Helper. Pins Node + downloads NSSM. Invoked by install.bat.   |

Service name on the box: **`SalaryMitraServer`**.

## Prerequisites

- Windows 10 / Server 2016 or newer, 64-bit.
- Administrator account (UAC prompt appears automatically).
- Internet access on first install (for the Node zip + NSSM zip).
  - Behind a strict proxy? Pre-stage `nssm.exe` and the extracted
    `node-pinned\` folder next to the .bat — the script skips downloads if
    they already exist.
- Repo deployed at `C:\…\<app>\` with this folder at `<app>\deploy\windows\`
  and the bundle's `VERSION` file at the repo root (it is, if you deployed
  from the build artifact).

## Install

1. Open `deploy\windows\` in Explorer.
2. Double-click **`install-service.bat`**. A UAC prompt appears — accept.
3. Watch the elevated window. It will:
   - Read the required Node version from `VERSION` (e.g. `v22.19.0`).
   - Download `node-v22.19.0-win-x64.zip`, extract to `node-pinned\`.
   - Download `nssm-2.24.zip`, extract `nssm.exe` here.
   - Register service `SalaryMitraServer`, set it to auto-start, and start it.
4. When you see `Installed and started SalaryMitraServer`, you're done.

The service runs `<deploy\windows>\node-pinned\npm.cmd run dev` in
`app\server` with auto-restart on crash (5 s delay).

Logs land in `app\server\logs\service-stdout.log` and
`app\server\logs\service-stderr.log`, rotated at 10 MB.

## Check status

Double-click **`status.bat`**. Output is one of:

- `[ RUNNING ]   SalaryMitraServer is running.`
- `[ STOPPED ]   SalaryMitraServer is installed but NOT running.`
- `[ NOT INSTALLED ] …`

`status.bat` does not require admin.

You can also use the standard Windows tools:

```cmd
sc query SalaryMitraServer
services.msc                       :: GUI; look for "SalaryMitra Server"
```

## Uninstall

Double-click **`uninstall-service.bat`** and accept the UAC prompt. It stops
the service and removes the registration. The pinned Node folder and
`nssm.exe` are **left in place** so a future re-install is fast — delete
`node-pinned\` and `nssm.exe` manually if you want a clean slate.

## Updating after a new build

If a release uses a different Node patch (e.g. `v22.19.0` → `v22.20.0`), the
`VERSION` file changes and the pinned folder no longer matches:

1. Uninstall: `uninstall-service.bat`.
2. Delete `node-pinned\` (so the next install picks up the new version).
3. Install: `install-service.bat`.

If only the app code changed (same Node version), the running service picks
it up via nodemon — no reinstall needed.

## Troubleshooting

**`net session` says access denied / no UAC prompt appears.**
Right-click `install-service.bat` → *Run as administrator* manually.

**Download failures behind a corporate proxy.**
Pre-stage these files before running install:

- `deploy\windows\nssm.exe`
- `deploy\windows\node-pinned\node.exe` (and the rest of the extracted zip)

The script skips any prereq that is already present.

**Service installs but won't start.**
Check `app\server\logs\service-stderr.log` first. Common causes:

- Missing `.env` in `app\server\` — run `npm run setup-env` once first.
- Port 3000 already in use — `netstat -ano | findstr :3000`.

**Wrong Node version warning.**
The script prints `[VERSION] Requiring Node vX.Y.Z` at start. If that doesn't
match what `VERSION` says, you have a stale `VERSION` file — re-extract the
deploy bundle.

**Running from a source checkout (no `VERSION` file).**
You'll see `[DEV MODE] No VERSION file — using latest vNN from builds.yml`.
That's fine for testing the installer, but the resulting service will *not*
be bytenode-safe against a built bundle.

## How it works (one paragraph)

NSSM is a tiny binary that wraps any process as a Windows Service. We point
it at the pinned `npm.cmd`, give it `app\server` as cwd, and let it handle
auto-start and crash-restart. Pinning Node next to the script (rather than
installing system-wide) keeps the `.jsc` runtime exactly matched and avoids
clobbering any other Node app on the machine. The only state on the system
is the service registration itself (under `HKLM\SYSTEM\CurrentControlSet\Services\SalaryMitraServer`).
