# Biometric gateway deploy units

Each biometric gateway is **one runnable = one service**. Deploy only the
interfaces a client bought (the `gateway_builds.yml` workflow lets you pick).

The gateways are CODE-decoupled from the app (zero `@startup`/`@appServer`
requires) but run **alongside** the app install, sharing its `node_modules` for
heavy deps (`pg`, `sequelize`) via `setupAliases.addPath`. So deploy the
gateway artifact into the same install root as `app/server` + `startup/server`.

## Layout in the install root

```
<install>/
  nucleus/                       (from gateway artifact)
  startup/server/               (from the app/site bundle — provides pg, sequelize)
  app/server/                   (from the app/site bundle — provides @appServer, @biometric)
  biometric_gateway/
    common/  shared/  package.json   (from gateway artifact)
    adms_server/  biomax_server/  zkteco_tcp_server/   (only those built)
```

Run `npm install --omit=dev` once in `biometric_gateway/` (and each interface
dir) so its own deps (express, axios, node-zklib, …) are present; `pg`/`sequelize`
come from the shared `startup`/`app` `node_modules`.

## Linux (systemd)

`base.gateway.service` is a template. For each interface, substitute and install:

| placeholder      | value                                            |
|------------------|--------------------------------------------------|
| `nbnext_app_name`| app/repo name (matches the app's unit)           |
| `gateway_name`   | `adms_server` \| `biomax_server` \| `zkteco_tcp_server` |
| `server_path`    | absolute install root                            |
| `nvm_path`       | Node install prefix (dir containing `bin/node`)  |
| `npm_path`       | absolute path to `npm`                            |
| `system_user`    | service account                                  |

```bash
sed -e "s#nbnext_app_name#etime#g" \
    -e "s#gateway_name#adms_server#g" \
    -e "s#server_path#/opt/etime#g" \
    -e "s#nvm_path#/usr/local#g" \
    -e "s#npm_path#/usr/local/bin/npm#g" \
    -e "s#system_user#etime#g" \
    base.gateway.service > /etc/systemd/system/etime-adms_server.service
systemctl daemon-reload && systemctl enable --now etime-adms_server
```

Each gateway listens on its own port (`ADMS_SERVER_PORT=4002`,
`BIOMAX_SERVER_PORT=4003`, `ZKTECO_TCP_SERVER_PORT=4004`) from its `.env`.

## Windows (nssm)

Mirror the app's `deploy/windows` nssm pattern, one service per interface:

```
nssm install etime-adms_server "C:\Program Files\nodejs\node.exe" index.js
nssm set etime-adms_server AppDirectory <install>\biometric_gateway\adms_server
nssm set etime-adms_server AppEnvironmentExtra NODE_ENV=production
nssm start etime-adms_server
```
