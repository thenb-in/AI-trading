# Docker install (any OS)

Runs the server and the web client as Docker containers, with its own Postgres. The container is Linux
whatever the host is, so the one
site bundle works on Windows, Linux or macOS. This install kit lives at
`deploy/docker/` **inside that bundle**; the **application is the bundle itself**
(V8 bytecode only — `.jsc` + loader stubs, no readable server source, mounted at
`/srv/app`), and the image is **environment-only** (a pinned Node matched to the
bytecode), built on this machine from the `Dockerfile` at the bundle root.

> Windows users have the `.bat`/`.ps1` helpers below. On Linux/macOS, copy
> `.env.example` to `.env`, edit it, and run `docker compose up -d --build` from
> this folder — everything else is identical.

## What you receive

The release is one bundle; this kit is its `deploy/docker/` folder. Alongside it
the bundle root holds the app (`app/`, `startup/`, `VERSION`) and the
`Dockerfile`. In this folder:

| File                                | What it is                                          |
| ----------------------------------- | --------------------------------------------------- |
| `docker-compose.yml`                | Both services — `db` and `app`; builds the root `Dockerfile`, mounts the bundle at `/srv/app`. |
| `.env.example`                      | Copy to `.env` and edit (install.ps1 writes it on Windows). |
| `install.bat`                       | One-shot Windows installer. Self-elevates.          |
| `update.bat`                        | Recreates the containers after the bundle is replaced. Asks nothing. |
| `start.bat` / `status.bat` / `logs.bat` / `uninstall.bat` | Day-to-day operation (Windows). |
| `backup.bat`                        | Database dump into `docker_data\backups\`. Runs nightly. |
| `install.ps1` / `start.ps1` / `host-fingerprint.ps1` | Helpers the .bat files call.       |

## Prerequisites

- Windows 10 / 11 or Server 2019+, 64-bit, with virtualisation enabled in BIOS.
- **Docker Desktop** with the WSL 2 backend —
  <https://docs.docker.com/desktop/install/windows-install/>. Install it, start
  it once, and let it finish initialising.
  - In Docker Desktop → *Settings* → *General*, tick **Start Docker Desktop when
    you log in**. The engine only runs inside a logged-on session, which is why
    the installer registers a *logon* task rather than a boot service.
  - On a headless server box, also enable Windows auto-logon so a reboot brings
    the engine (and therefore the app) back without someone at the keyboard.
- ~10 GB free disk.
- **Internet at install time** — the first build pulls the Node base image and
  installs the bundle's dependencies. After that, restarts and updates are
  offline unless a dependency or the Node version changed.

## Install

1. Extract the release bundle to the server (e.g. `C:\myapp\`) and open
   its `deploy\docker\` folder.
2. Double-click **`install.bat`** and accept the UAC prompt. It will:
   - check Docker is up,
   - build the environment image from the `Dockerfile` (first time only),
   - ask for the **server IP/host name**, **HTTP port** (default 80) and
     **time zone** (default `Asia/Kolkata` — timestamps are stamped in it),
     and on a first install the **app name** (default `myapp`),
   - write `.env` and create `docker_data\`,
   - stamp this machine's identity into `docker_data\config\host_machine.json`,
   - start both containers and register the start-on-logon task.
3. Wait for `status.bat` to show `(healthy)`. First boot creates the database
   schema, so give it a minute.
4. **Create the first company and admin user** — a fresh database has neither,
   and nobody can log in until this is done:

   ```cmd
   docker compose exec app npm run create-new-company
   ```

   It prompts for the company details and the `sadmin` login, then seeds the
   roles, permissions and starting data.
5. Browse to the URL it printed in step 2. Staff use the same URL.

## License

The license binds to *this* machine. A container can't see the host's NICs or
machine-id, so `host-fingerprint.ps1` writes them into
`docker_data\config\host_machine.json` and the server reads its fingerprint from there —
which means a token issued for a bare-metal install of the same box still
verifies here. The file is re-stamped on every start, so carrying this folder to
another machine rebinds it (and fails verification) instead of carrying the
license along.

```cmd
docker compose exec app npm run license:machine     :: fingerprint — send it to us
docker compose exec app npm run license:install     :: paste the token we return
docker compose exec app npm run license:status      :: verify
```

The installed token lives in `docker_data\config\secret\`.

**Before the first `license:install`, the wallet's public key has to be on the
box** — the image ships no baked-in key, and without one every token is
unverifiable (`license:status` reports `no_pinned_keys` and the API stays
locked). Copy the PEM into `docker_data\config\secret\` on the host, then:

```cmd
docker compose exec app npm run license:add-public-key -- --pem-file /srv/config/secret/wallet_public_key.pem
```

(`docker_data\config\` is `/srv/config` inside the container.) Run without `--pem-file` to
paste the key instead. The same key can be supplied as
`LICENSE_WALLET_PUBLIC_KEYS` in `docker_data\config\.env` if you would rather inject it as
a JSON array of PEM strings.

## Configuration

Two files, and they are not the same thing:

- **`.env`** (next to `docker-compose.yml`) — how the *containers* are wired:
  stack name, image tag, published port, database password, time zone. Change it, then run
  `start.bat`.
- **`docker_data\config\.env`** — the *server's* own configuration, seeded from
  `.env.example` on first boot and yours from then on (mail, wallet URL, sync
  windows, …). Change it, then run `start.bat`.

`docker_data\config\.env` wins for anything both could set, which is why the compose file
passes seed values under `SEED_*` names rather than the real ones.

## State and backups

Everything that must survive an update is in **one folder** on the Windows disk,
`docker_data\`, created next to `docker-compose.yml` by the installer. Back up
that folder and you have the install:

```
docker_data\
  config\.env               app configuration
  config\host_machine.json  host identity the license binds to
  config\secret\            installed license + pinned wallet keys
  uploads\                  uploaded files
  logs\                     winston logs
  backups\                  nightly database dumps
```

The location is fixed, not configurable — one place to find, copy and back up.

### Windows path ↔ container path

The container is Linux whatever the host is, so every path inside it is a Linux
path. This is the whole translation table — useful when a log line or a `docker
compose exec` command names a path you cannot find in Explorer:

| On this machine          | Inside the container         |
| ------------------------ | ---------------------------- |
| `docker_data\config\`    | `/srv/config`                |
| `docker_data\config\secret\` | `/srv/config/secret`     |
| `docker_data\uploads\`   | `/srv/data/uploads`          |
| `docker_data\logs\`      | `/srv/app/app/server/logs`   |
| the bundle root (`..\..`) | `/srv/app` — the application |

The live database is the one exception: it stays in the Docker volume
`<COMPOSE_PROJECT_NAME>_db-data`, and `backup.bat` puts a restorable copy of it into
`docker_data\backups\` instead. The installer schedules that daily at 01:00;
run it by hand any time. Dumps older than a fortnight are pruned.

```cmd
backup.bat                                                       :: dump now
docker compose exec -T db psql -U postgres <DB_NAME> < docker_data\backups\<file>.sql
```

**Why the database is not a folder under `docker_data\`.** Two reasons, and the
second applies even if you get past the first:

1. Docker Desktop mounts Windows paths into the container as root, so Postgres
   cannot `chmod` its own data directory and refuses to initialise.
2. Copying a *running* Postgres data directory file-by-file gives you a torn
   snapshot that will not restore. Backup software cannot pause the writes. A
   `pg_dump` is consistent, and it is a single file your backup already covers.

So: back up this whole folder on whatever schedule you like, and the nightly
dump is what you restore from.

`docker compose down` stops everything and keeps the volume. `docker compose
down -v` **destroys the database** — only use it when you mean to start over.

## Update

Replace the whole extracted bundle with the new release (keep this
`deploy\docker\docker_data\` folder — that is your state), then double-click
**`update.bat`**. It rebuilds the image if the `Dockerfile` changed and recreates
the containers; the container reinstalls dependencies when the bundle's commit
changes. Config, license, uploads and database are untouched. Old images can be
reclaimed afterwards with `docker image prune -a`.

## Troubleshooting

**`install.bat` says Docker is not running.**
Start Docker Desktop, wait for the whale icon to stop animating, run it again.

**Port 80 already in use.** IIS or another web server has it. Either stop that
service, or re-run `install.bat` and give a different port (e.g. `8080`) — the
URL then includes the port.

**Containers start, browser shows nothing.** `logs.bat`. Almost always the
database URL or a missing value in `docker_data\config\.env`.

**"license verification failed" after moving the machine to new hardware.**
Expected — the NICs or the Windows machine-id changed. Send us the new
`npm run license:machine` output and install the re-issued token.

**Everything is slow on first launch.** The first boot creates the schema
(`SYNC_DB`) and Docker's file cache is cold. Give it a couple of minutes.

## How it works (one paragraph)

`docker-compose.yml` runs two containers: `db` (stock Postgres, data in a named
volume) and `app` (the environment-only image built from the root `Dockerfile`).
The application is the bundle root (two levels up from this kit), bind-mounted at
`/srv/app`: the framework, app server and nucleus compiled to `.jsc`, plus the
built client bundle at `app/client/` — Express serves the API and the
SPA on one port, so there is no nginx and nothing else to configure. On boot the
container matches its Node/V8 to the bundle's `VERSION` (refusing to start on a
mismatch), installs the bundle's dependencies if its commit changed, then copies
`docker_data\config\.env` into the boot dir (seeding it on the very first start)
— which keeps configuration on the host while the container itself stays
disposable. `restart: unless-stopped` handles crashes and engine restarts; the
logon task handles reboots and re-stamps the host identity each time.
