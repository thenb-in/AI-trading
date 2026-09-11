# SalaryMitra — Linux Install

Installs the app as a **systemd service** behind **nginx**, on Ubuntu / Debian
or Amazon Linux / RHEL. The `app/server` runs under `npm start` (using the
exact Node version baked into the build — see `VERSION` at the bundle root,
matching the `.jsc` bytenode artifacts).

> Docker installs (Windows, or any OS) run the same bytecode inside a Linux
> container — documented separately in [`docker/README.md`](docker/README.md).

## Files (shipped in the bundle)

| File                                  | Purpose                                                      |
| ------------------------------------- | ------------------------------------------------------------ |
| `deploy/0setup_ubuntu.sh`             | Provisions a **bare** Ubuntu/Debian box (deploy user, ssh, localsend, netbird, PostgreSQL 16). Run once, before everything else. |
| `deploy/base.conf`                    | nginx site template (placeholders).                          |
| `deploy/base.service`                 | systemd unit template (placeholders).                        |
| `deploy/1build_deploy_files.sh`       | Renders `base.*` → `<app>.conf` + `<app>.service`.           |
| `deploy/2link_files_to_internal_system.sh` | Symlinks the rendered files into nginx + systemd.       |
| `update.sh` (bundle root)             | Applies a new bundle on top of an existing install (git-diff). |
| `VERSION` (bundle root)               | Pins the exact Node/V8/ABI used to build the bytenode files. |

Service name on the box: **`<app_name>.service`** (resolved from
`scripts/ask-app-name.js`, or whatever you pass via `APP_NAME`).

## Prerequisites

- A Linux server (Ubuntu/Debian or Amazon Linux 2023 / RHEL).
- **Node.js** matching `VERSION`'s `node_version` (e.g. `v22.19.0`),
  installed via [`nvm`](https://github.com/nvm-sh/nvm). The templating script
  uses `which npm` to discover the nvm path — `npm` must be on `PATH` when
  you run it.
- **nginx**, **unzip**, **git**, **sudo**.
- A user with sudo (the deploy runs as this user; the systemd unit also runs
  as this user unless you override `SYSTEM_USER`).

```bash
# Quick prereq install (Ubuntu/Debian)
sudo apt update && sudo apt install -y nginx unzip git
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 22.19.0 && nvm use 22.19.0
```

## Provision (bare server, once)

On a fresh Ubuntu/Debian machine, run the provisioning script first. It creates
the deploy user (default `nbnext`), installs openssh, localsend, netbird (remote
login) and PostgreSQL 16. It is idempotent — safe to re-run — and Debian-family
only (Windows uses the Docker path in [`docker/`](docker/README.md)).

```bash
sudo bash deploy/0setup_ubuntu.sh
# override the user, or skip pieces already present:
SETUP_USER=nbnext SKIP_LOCALSEND=1 sudo bash deploy/0setup_ubuntu.sh
```

Afterwards: `netbird up` to join your network, then create the app's Postgres
role + database and point `app/server/.env` at it. Then continue below.

## Install (first time)

1. **Extract the bundle** into the install location. Convention is `/app/<app_name>/`:
   ```bash
   sudo mkdir -p /app && sudo chown "$(whoami)":"$(whoami)" /app
   unzip <app>-site-vX.Y.Z-sha-linux_x64.zip -d /app/<app_name>
   cd /app/<app_name>
   ```
2. **Verify the Node version** matches `VERSION`:
   ```bash
   grep node_version VERSION       # e.g. node_version=v22.19.0
   node -v                         # must match exactly — bytenode is unforgiving
   ```
3. **Render the templates** (prompts for IP/domain, or set `IP_ADDRESS` env):
   ```bash
   APP_NAME=<app_name> IP_ADDRESS=<your.domain.or.ip> bash deploy/1build_deploy_files.sh
   ```
   Produces `deploy/<app_name>.conf` and `deploy/<app_name>.service`.
4. **Symlink into system locations** (auto-detects Debian vs RHEL layout):
   ```bash
   APP_NAME=<app_name> bash deploy/2link_files_to_internal_system.sh
   ```
   Creates `/etc/nginx/sites-enabled/<app_name>.conf` (or `/etc/nginx/conf.d/<app_name>.conf`
   on RHEL/Amazon Linux) and `/etc/systemd/system/<app_name>.service`.
5. **Activate**:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   sudo systemctl daemon-reload
   sudo systemctl enable --now <app_name>.service
   ```

Done. The service starts on boot and restarts on crash (5 s delay).

## Check status

```bash
sudo systemctl status <app_name>.service       # running / failed / etc.
sudo journalctl -u <app_name>.service -f       # live logs
sudo nginx -t                                  # nginx config sanity
curl -I http://localhost/                      # quick smoke test
```

## Update (new release)

`update.sh` (in the install dir, copied there on prior install) atomically
applies a new bundle by turning it into a one-commit git repo and resetting
the install tree onto it. `.gitignore` rules preserve local state
(`.env`, `secret/`, `uploads/`, generated `<app>.conf/.service`, etc).

```bash
cd /app/<app_name>
./update.sh ~/Downloads/<app>-site-vX.Y.Z-sha-linux_x64.zip
sudo systemctl restart <app_name>.service
sudo systemctl reload nginx                    # only if base.conf changed
```

If `VERSION`'s `node_version` changed between releases, install that exact
Node via nvm before restarting:

```bash
nvm install 22.20.0 && nvm use 22.20.0          # whatever the new VERSION says
# Re-render the service file so it points at the new nvm path:
APP_NAME=<app_name> IP_ADDRESS=<...> bash deploy/1build_deploy_files.sh
sudo systemctl daemon-reload
sudo systemctl restart <app_name>.service
```

## Uninstall

```bash
sudo systemctl disable --now <app_name>.service
sudo rm /etc/systemd/system/<app_name>.service
sudo systemctl daemon-reload

# Debian:
sudo rm -f /etc/nginx/sites-enabled/<app_name>.conf /etc/nginx/sites-available/<app_name>.conf
# RHEL / Amazon Linux:
sudo rm -f /etc/nginx/conf.d/<app_name>.conf

sudo nginx -t && sudo systemctl reload nginx
sudo rm -rf /app/<app_name>                    # only when you really mean it
```

## Troubleshooting

**`1build_deploy_files.sh` errors with "npm is not installed".**
You're running under a shell without nvm sourced. `source ~/.nvm/nvm.sh`
first, or run via a login shell.

**`nginx -t` reports duplicate `default_server`.**
The script removes the stock `sites-enabled/default` on Debian, but if you
have another custom site claiming `default_server`, drop `default_server`
from one of them.

**Service starts then fails immediately.**
`journalctl -u <app_name>.service -n 100 --no-pager`. Common causes:
- Missing `.env` in `app/server/` — run `npm run setup-env` once.
- Port collision — `sudo ss -ltnp | grep :3000`.
- Node version mismatch with bytenode — `node -v` must match
  `VERSION`'s `node_version` exactly. ABI/V8 differences cause `.jsc`
  loaders to throw `Invalid or incompatible cached data`.

**nvm path drift after a Node upgrade.**
The generated `<app>.service` hardcodes the nvm path at render time. If you
`nvm install` a new Node, re-run `1build_deploy_files.sh` and
`systemctl daemon-reload`.

**Permissions on `/app/<app_name>`.**
The link step `chown`s the install dir to the running user. If you later
switch the systemd `User=`, re-chown accordingly or override `SYSTEM_USER`
before re-rendering.

## How it works (one paragraph)

systemd supervises `npm start` in `app/server` as the deploy user, with
auto-restart on crash. nginx fronts it (TLS terminates here in production)
and proxies `/api/*` to the Node process; static client assets are served
straight from `app/client/dist`. The templating step (`1build_…sh`) injects
the app name, public IP/domain, install path, and nvm path so the same
`base.conf`/`base.service` work across machines; the symlink step
(`2link_…sh`) wires them into the nginx and systemd directories
appropriate to the distro family. `update.sh` is a git-overlay updater:
it never blindly copies, so any local-state file matching any `.gitignore`
survives untouched.
