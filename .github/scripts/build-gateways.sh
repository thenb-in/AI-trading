#!/usr/bin/env bash
# Build the standalone biometric gateway runnables to V8 bytecode (bytenode)
# and stage them in the SOURCE-RELATIVE layout required at runtime:
#
#   _gateway_artifact/
#     nucleus/                         (compiled @nucleus)
#     biometric_gateway/
#       common/                       (compiled @biometric_interface/common)
#       bootstrap/                    (compiled bootstrap: setupAliases, etc.)
#       package.json                  (_moduleAliases + deps for `npm install`)
#       <interface>/                  (compiled adms_server / biomax_server / …)
#
# Deployed ALONGSIDE app/server (shared node_modules) — pg + sequelize resolve
# from the colocated startup/app install via setupAliases.addPath, so they are
# intentionally not bundled here.
#
# Usage (from repo root):  build-gateways.sh <platform_id> [interfaces_csv]
#   build-gateways.sh linux_x64                     # ALL interfaces (auto-discovered)
#   build-gateways.sh linux_x64 "adms_server,lan_zk" # an explicit SUBSET
#   build-gateways.sh auto                          # build for THIS host (local dev)
#
# The platform id must match the host: bytecode is not cross-compilable.
#
# Single source of truth for "which interfaces exist" is the FILESYSTEM: every
# biometric_gateway/<iface>/ carrying a build-bytecode.config.js is a shippable
# interface (common/bootstrap are the shared layers built below, never interfaces).
# Callers pass an explicit CSV ONLY to build a subset ("just what a client
# bought"); omitting it builds everything. This kills the old drift where the
# site build hardcoded its own list and silently dropped new drivers (e.g. cosec).
set -euo pipefail

PLATFORM_ID="${1:?platform id required}"
INTERFACES_CSV="${2:-}"

# The platform tag is NOT a cross-compile switch -- bytenode emits bytecode for
# whatever host runs this script, and a .jsc only loads on the OS+arch that
# produced it. So the tag is checked against reality instead of trusted: a
# linux-built artifact labelled windows_x64 would install cleanly and then fail
# at boot on every site. Pass "auto" to take the host platform as-is (handy
# locally); CI passes the target it intends and gets the guard.
HOST_PLATFORM="$(node -p '(process.platform === "win32" ? "windows" : process.platform) + "_" + process.arch')"
if [ "$PLATFORM_ID" = "auto" ]; then
  PLATFORM_ID="$HOST_PLATFORM"
elif [ "$PLATFORM_ID" != "$HOST_PLATFORM" ]; then
  echo "refusing to build: asked for '$PLATFORM_ID' but this host is '$HOST_PLATFORM'." >&2
  echo "bytenode locks each .jsc to the OS+arch that compiled it, so the result would not boot." >&2
  echo "run this on a '$PLATFORM_ID' machine, or pass 'auto' to build for this host." >&2
  exit 1
fi
if [ -z "$INTERFACES_CSV" ] || [ "$INTERFACES_CSV" = "all" ]; then
  INTERFACES_CSV="$(
    for cfg in biometric_gateway/*/build-bytecode.config.js; do
      [ -f "$cfg" ] || continue
      iface="$(basename "$(dirname "$cfg")")"
      # common/bootstrap are the shared layers built below, never interfaces.
      # Plain string tests, not `case`: the closing paren of a case pattern
      # inside a command substitution is a parse error on bash 3.2 (the macOS
      # default), which breaks local runs. Same reason this comment carries no
      # apostrophe -- bash 3.2 tries to quote-match inside the substitution.
      [ "$iface" = "common" ] && continue
      [ "$iface" = "bootstrap" ] && continue
      echo "$iface"
    done | sort | paste -sd, -
  )"
  [ -n "$INTERFACES_CSV" ] || { echo "no gateway interfaces discovered under biometric_gateway/*" >&2; exit 1; }
  echo "  [discover] interfaces: $INTERFACES_CSV"
fi

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
build biometric_gateway/bootstrap

stage nucleus/dist                   "$OUT/nucleus"
stage biometric_gateway/common/dist "$OUT/biometric_gateway/common"
stage biometric_gateway/bootstrap/dist "$OUT/biometric_gateway/bootstrap"
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

CLEAN_DIRS="nucleus/dist biometric_gateway/common/dist biometric_gateway/bootstrap/dist"
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
