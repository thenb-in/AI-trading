#!/bin/sh
# container-entrypoint.sh — pre-flight for the environment-only Docker image.
#
# The image (see the repo-root Dockerfile) is JUST the runtime: a pinned Node,
# the build toolchain, and a tiny bootstrap that calls this script. The actual
# application is the Linux native bundle — the same artifact Ubuntu deploys —
# bind-mounted at /srv/app by the compose file. This script makes that mounted
# bundle runnable, then hands off to the bundle's own seeding entrypoint
# (docker-entrypoint.sh), which writes .env into place and finally execs "$@"
# (node index.js).
#
# It runs on every boot, so each step is a no-op when there is nothing to do.
set -eu

APP_ROOT="${APP_ROOT:-/srv/app}"
APP_SERVER="$APP_ROOT/app/server"
STARTUP_SERVER="$APP_ROOT/startup/server"
VERSION_FILE="$APP_ROOT/VERSION"

read_version_key() {
  # VERSION is `key=value` lines. Prints the value for $1, or empty.
  [ -f "$VERSION_FILE" ] || return 0
  sed -n "s/^$1=//p" "$VERSION_FILE" | head -n 1
}

# ── 1. Is the bundle actually mounted? ──────────────────────────────────────
if [ ! -f "$APP_SERVER/index.js" ]; then
  echo "[entrypoint] no application at $APP_ROOT — bind-mount the linux_x64 site" \
       "bundle there (see deploy/docker/docker-compose.yml)."
  exit 1
fi

# ── 2. Node ABI guard ───────────────────────────────────────────────────────
# bytenode .jsc is locked to the exact V8 build it was compiled against, so a
# wrong runtime is a cryptic mid-require crash, not a clean error. The bundle
# records the V8 (and Node) it was built with in VERSION; refuse to boot on a
# mismatch and say exactly how to fix it.
BUNDLE_V8="$(read_version_key v8_version)"
RUNNING_V8="$(node -p process.versions.v8)"
BUNDLE_NODE="$(read_version_key node_version)"
RUNNING_NODE="$(node -v)"
if [ -n "$BUNDLE_V8" ] && [ "$BUNDLE_V8" != "$RUNNING_V8" ]; then
  echo "[entrypoint] V8/Node mismatch — the bundle's bytecode will not load:"
  echo "[entrypoint]   image runtime: Node $RUNNING_NODE (V8 $RUNNING_V8)"
  echo "[entrypoint]   bundle built:  Node ${BUNDLE_NODE:-unknown} (V8 $BUNDLE_V8)"
  echo "[entrypoint] Rebuild the image with --build-arg NODE_VERSION=${BUNDLE_NODE#v}."
  exit 1
fi
echo "[entrypoint] Node $RUNNING_NODE (V8 $RUNNING_V8) matches the bundle."

# ── 3. Dependencies — the bundle ships none, same as update.sh on Ubuntu. ────
# Install only when the bundle changed: the marker records the bundle commit the
# current node_modules was installed for, so a bundle swap (new short_sha)
# triggers a reinstall while an unchanged restart is a no-op. `npm install`, not
# `npm ci` — the build-bytecode step adds the bytenode dep to package.json
# without updating package-lock.json, so the lockfile is intentionally out of
# sync and `npm ci` would refuse.
BUNDLE_SHA="$(read_version_key short_sha)"
# app/server/package.json owns the server's full runtime install list — itself,
# the @startup framework, and @nucleus (which ships bytecode only, so without its
# winston the server dies at boot: app/server -> @startup logger -> @nucleus
# logger) — in its `deps` script. That script is the SINGLE source, reused by
# `npm run i` in dev, so a new shared dependency is added there and never here.
# Reinstall only on a bundle swap.
DEPS_MARKER="$APP_SERVER/node_modules/.bundle_sha"
if [ ! -d "$APP_SERVER/node_modules" ] || [ "$(cat "$DEPS_MARKER" 2>/dev/null || true)" != "$BUNDLE_SHA" ]; then
  echo "[entrypoint] installing server deps (app/server npm run deps)"
  (cd "$APP_SERVER" && npm run deps)
  echo "$BUNDLE_SHA" > "$DEPS_MARKER"
fi

# ── Hand off to the bundle's env-seeding entrypoint, from the boot dir. ──────
# docker-entrypoint.sh copies config/.env into ./ (cwd), so cwd must be the boot
# dir where dotenv reads it; it then execs "$@" (the image CMD).
cd "$APP_SERVER"
exec /bin/sh "$STARTUP_SERVER/scripts/docker-entrypoint.sh" "$@"
