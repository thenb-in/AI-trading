# wagemaster deploy unit

`wagemaster` is a standalone **ingest server** for the high-volume mobile WRITES
that used to land on the HR app process:

- `POST /api/v1/location/tracking/update` — GPS stream + start/stop attendance punches
- `POST /api/v1/callbuddy/sendCallLog`, `POST /api/v1/callbuddy/syncPaymentReminder`
- `POST /api/v1/callbuddy/report-app-version`, `POST /api/v1/callbuddy/report-unsynced-count`

(`GET /api/v1/callbuddy/sync-command` intentionally stays on the HR app — its flag
lives in an in-process store shared with the dashboard producer.)

It also runs the `fieldSales.archiveTracking` cron (the HR app no longer does — a
cron must run in exactly one process). The edge (nginx/vite) routes only the
sub-paths above here; everything else stays on the HR app.

Unlike the biometric gateways, wagemaster is **NOT code-decoupled**. It is a thin
launcher (`wagemaster/index.js`) over the framework's `buildApp()` that reuses the
app's controllers/services/models/auth via module aliases declared in
`wagemaster/package.json`. So it must be deployed **into the same install root**
as `app/server` + `startup/server` (it requires them through `@appServer`/`@startup`
and shares their `node_modules`).

## Layout in the install root

```
<install>/
  nucleus/
  startup/server/          (provides @startup, pg, sequelize, express, …)
  app/server/              (provides @appServer + the reused controllers/services/models)
  biometric_gateway/       (aliases referenced by app model registry)
  wagemaster/
    index.js  package.json  .env
```

Run `npm install` once in `wagemaster/` so its own deps (`module-alias`,
`nodemon`) are present; all heavy deps come from the shared `app/server` /
`startup/server` `node_modules`.

## Environment

Copy `wagemaster/.env.example` → `wagemaster/.env`. Easiest: copy the HR app's
`app/server/.env` and change `PORT` to `4005`. **`JWT_SECRET`,
`REFRESH_TOKEN_SECRET`, `DATABASE_URL`, and `UPLOADS_DIR` MUST match the HR app** —
wagemaster verifies HR-issued JWTs with the shared secret and writes into the
shared DB / uploads dir.

## Linux (systemd)

`base.wagemaster.service` is a template:

| placeholder       | value                                           |
|-------------------|-------------------------------------------------|
| `nbnext_app_name` | app/repo name (matches the app's unit)          |
| `server_path`     | absolute install root                           |
| `nvm_path`        | Node install prefix (dir containing `bin/node`) |
| `npm_path`        | absolute path to `npm`                           |
| `system_user`     | service account                                 |

```bash
sed -e "s#nbnext_app_name#etime#g" \
    -e "s#server_path#/opt/etime#g" \
    -e "s#nvm_path#/usr/local#g" \
    -e "s#npm_path#/usr/local/bin/npm#g" \
    -e "s#system_user#etime#g" \
    base.wagemaster.service > /etc/systemd/system/etime-wagemaster.service
systemctl daemon-reload && systemctl enable --now etime-wagemaster
```

wagemaster listens on `PORT=4005` from its `.env`.

## Windows (nssm)

```
nssm install etime-wagemaster "C:\Program Files\nodejs\node.exe" index.js
nssm set etime-wagemaster AppDirectory <install>\wagemaster
nssm set etime-wagemaster AppEnvironmentExtra NODE_ENV=production
nssm start etime-wagemaster
```

## nginx

Add the wagemaster upstream + the ingest `location` block to your site conf —
see `deploy/base.conf` (`upstream nbnext_wagemaster` + the
`location ~ ^/api/v1/(location/tracking/update|callbuddy/...)$` block).
