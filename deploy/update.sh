#!/bin/bash
# Launcher only. ALL update logic lives in update.js — one cross-OS
# implementation, never duplicated per platform. This file exists so existing
# installs, docs and muscle memory that call `./update.sh` keep working.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JS="$DIR/update.js"

# Migration path: an install still running the OLD bash updater copies the new
# bundle's update.sh alone to a temp dir and re-execs it there, so update.js is
# not beside us. It passes the resolved bundle dir as $1, which does have it.
if [ ! -f "$JS" ] && [ -n "${1:-}" ] && [ -f "$1/update.js" ]; then
  JS="$1/update.js"
fi

exec node "$JS" "$@"
