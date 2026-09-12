# Biometric gateway deploy units

Each biometric gateway is **one runnable = one service**. Every site bundle
carries all interfaces; enable only the services a client bought. To ship a
cut-down artifact instead, dispatch `builds.yml` (whole bundle) or
`gateway_builds.yml` (gateways only) with an `interfaces` subset.

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
    common/  bootstrap/  package.json   (from gateway artifact)
    adms_server/  biomax_server/  lan_cosec_centra/  lan_realtime/
    lan_zk/  realtime_server/  vyom_server/          (only those built)
```

Run `npm install --omit=dev` once in `biometric_gateway/` (and each interface
dir) so its own deps (express, axios, node-zklib, …) are present; `pg`/`sequelize`
come from the shared `startup`/`app` `node_modules`.

## Linux (systemd)

`base.gateway.service` is a template. For each interface, substitute and install:

| placeholder      | value                                            |
|------------------|--------------------------------------------------|
| `nbnext_app_name`| app/repo name (matches the app's unit)           |
| `gateway_name`   | `adms_server` \| `biomax_server` \| `lan_cosec_centra` \| `lan_realtime` \| `lan_zk` \| `realtime_server` \| `vyom_server` |
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

Each gateway reads a plain `PORT` from its own `.env` (defaults in each
`.env.example`): adms_server 8948, biomax_server 8949, vyom_server 8950,
lan_cosec_centra 11000, lan_realtime 11005, lan_zk 11048, realtime_server 7005
(RealSoft's cloud port — the device dials it).

## Windows

Native Windows is **not a supported target today**: bytenode locks each `.jsc`
to the platform + arch it was compiled on, and the build pipeline compiles
linux/x64 only. Windows sites run the same linux bundle under Docker — see
`deploy/docker/`, and the gateways come along inside it.

If a native Windows install is ever needed, the gateways must first be
recompiled on a Windows runner (`gateway_builds.yml` takes `runner` and
`platform_id` inputs for exactly that). Then, one nssm service per interface:

```
nssm install etime-adms_server "C:\Program Files\nodejs\node.exe" index.js
nssm set etime-adms_server AppDirectory <install>\biometric_gateway\adms_server
nssm set etime-adms_server AppEnvironmentExtra NODE_ENV=production
nssm start etime-adms_server
```
