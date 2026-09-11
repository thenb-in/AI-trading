#!/usr/bin/env bash
# Build the standalone biometric gateway runnables to V8 bytecode (bytenode)
# and stage them in the SOURCE-RELATIVE layout required at runtime:
#
#   _gateway_artifact/
#     nucleus/                         (compiled @nucleus)
#     biometric_gateway/
#       common/                       (compiled @biometric_interface/common)
#       shared/                       (compiled bootstrap: setupAliases, etc.)
#       package.json                  (_moduleAliases + deps for `npm install`)
#       <interface>/                  (compiled adms_server / biomax_server / …)
#
# Deployed ALONGSIDE app/server (shared node_modules) — pg + sequelize resolve
# from the colocated startup/app install via setupAliases.addPath, so they are
# intentionally not bundled here.
#
# Usage (from repo root):  build-gateways.sh <platform_id> <interfaces_csv>
#   e.g. build-gateways.sh linux_x64 "adms_server,biomax_server"
set -euo pipefail

PLATFORM_ID="${1:?platform id required}"
INTERFACES_CSV="${2:?interfaces csv required}"

BUILDER="startup/server/scripts/build-bytecode.js"
OUT="_gateway_artifact"

build() { # <src-dir>
  echo "  [build] $1"
  node "$BUILDER" --src "$1" --out-dir "$1/dist" >/dev/null
}
stage() { # <src-dist> <dest>
  mkdir -p "$2"
  cp -a "$1/." "$2/"
}

echo "== gateway build ($PLATFORM_ID) interfaces=$INTERFACES_CSV =="
rm -rf "$OUT"

# Shared layers every runnable needs.
build nucleus
build biometric_gateway/common
build biometric_gateway/shared

stage nucleus/dist                   "$OUT/nucleus"
stage biometric_gateway/common/dist "$OUT/biometric_gateway/common"
stage biometric_gateway/shared/dist "$OUT/biometric_gateway/shared"
# Copy the manifest, then add the one dependency the BUILD introduces. Every
# compiled interface entry is a bytenode stub — `require('bytenode')` followed
# by its .jsc — and plain Node resolution looks for that in
# biometric_gateway/node_modules, which is installed from THIS package.json. Ship
# it unpatched and every gateway dies at boot with "Cannot find module
# 'bytenode'" while the app beside it runs fine. build-bytecode.js does the same
# patch for app/server and startup/server, but it only ever touches the
# package.json of the directory it compiles; the interfaces share this one a
# level up, so nothing was adding it here.
node -e '
  const fs = require("fs");
  const pkg = JSON.parse(fs.readFileSync("biometric_gateway/package.json", "utf8"));
  pkg.dependencies = { ...(pkg.dependencies || {}), bytenode: "*" };
  fs.writeFileSync(process.argv[1], JSON.stringify(pkg, null, 2) + "\n");
' "$OUT/biometric_gateway/package.json"
[ -f biometric_gateway/package-lock.json ] && cp biometric_gateway/package-lock.json "$OUT/biometric_gateway/" || true

CLEAN_DIRS="nucleus/dist biometric_gateway/common/dist biometric_gateway/shared/dist"
IFS=',' read -ra IFACES <<< "$INTERFACES_CSV"
for iface in "${IFACES[@]}"; do
  iface="$(echo "$iface" | xargs)" # trim whitespace
  [ -z "$iface" ] && continue
  if [ ! -d "biometric_gateway/$iface" ]; then
    echo "  [skip] unknown interface: $iface"; continue
  fi
  build "biometric_gateway/$iface"
  stage "biometric_gateway/$iface/dist" "$OUT/biometric_gateway/$iface"
  CLEAN_DIRS="$CLEAN_DIRS biometric_gateway/$iface/dist"
done

# Remove the per-source dist dirs; the staged copy lives in $OUT.
# shellcheck disable=SC2086
rm -rf $CLEAN_DIRS

echo "== staged to $OUT =="
find "$OUT" -maxdepth 3 -type d | sort
