#!/bin/sh
# Boot glue for the containerised app server.
#
# The server reads its configuration from `.env` in the boot dir (dotenv-safe,
# keyed off `.env.example`). A container's filesystem is discarded on every
# update, so the real file lives in the mounted config dir and is copied into
# place on each boot. First boot seeds it from `.env.example`, substituting the
# values the installer passed in (SEED_*) and generating the JWT secrets.
#
# Seeding happens exactly once: regenerating the secrets on a later boot would
# invalidate every issued token, and after the first boot the file belongs to
# the operator — edit `config\.env` on the host and restart the container.
set -eu

CONFIG_DIR="${APP_CONFIG_DIR:-/srv/config}"
ENV_FILE="$CONFIG_DIR/.env"
BOOT_DIR="$(pwd)"
# app (default) or gateway — see container-entrypoint.sh. Seeding is the app's
# job alone: a gateway that seeded would stamp its OWN port (8948/8949) as the
# app's PORT and generate a second set of JWT secrets.
APP_ROLE="${APP_ROLE:-app}"

random_secret() {
  node -e 'process.stdout.write(require("crypto").randomBytes(48).toString("hex"))'
}

if [ ! -f "$ENV_FILE" ] && [ "$APP_ROLE" = "gateway" ]; then
  echo "[entrypoint] gateway: $ENV_FILE is not there yet — the app container writes it" \
       "on its first boot, so start the app and let it turn healthy first."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "[entrypoint] seeding $ENV_FILE from $BOOT_DIR/.env.example"
  mkdir -p "$CONFIG_DIR"
  # `|` as the sed delimiter — the substituted URLs are full of slashes.
  # REPORT_RUNNER_URL is blanked, not pointed somewhere: this stack has no
  # runner container, and .env.example's http://localhost:8945 resolves inside
  # the app container to nothing, so the socket client retries and logs a warn
  # every few seconds forever. Empty is the framework's supported "runner
  # disabled, fallback only" path (src/socket/appserver_runner). An operator
  # who does run a runner sets the URL in config/.env and restarts.
  sed -e "s|^NODE_ENV=.*|NODE_ENV=production|" \
      -e "s|^PORT=.*|PORT=${PORT:-3000}|" \
      -e "s|^SECURE_COOKIE.*|SECURE_COOKIE = false|" \
      -e "s|^DATABASE_URL=.*|DATABASE_URL=${SEED_DATABASE_URL:-}|" \
      -e "s|^FRONTEND_URL=.*|FRONTEND_URL=${SEED_APP_URL:-}|" \
      -e "s|^SERVER_URL=.*|SERVER_URL=${SEED_APP_URL:-}|" \
      -e "s|^REPORT_RUNNER_URL=.*|REPORT_RUNNER_URL=|" \
      -e "s|^JWT_SECRET=.*|JWT_SECRET=$(random_secret)|" \
      -e "s|^REFRESH_TOKEN_SECRET=.*|REFRESH_TOKEN_SECRET=$(random_secret)|" \
      "$BOOT_DIR/.env.example" > "$ENV_FILE"
fi

# SECURE_COOKIE stays off because this server also serves the SPA over plain
# HTTP on the LAN; put a TLS terminator in front and flip it in config\.env.
#
# A gateway boots in the app's directory (that is where dotenv finds this file)
# but the file is the app's, on a bind mount they share — so it only fills the
# gap, never overwrites what the running app is reading.
if [ "$APP_ROLE" != "gateway" ] || [ ! -f "$BOOT_DIR/.env" ]; then
  cp "$ENV_FILE" "$BOOT_DIR/.env"
fi

exec "$@"
