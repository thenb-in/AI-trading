#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# update.sh — Update an installed site bundle from a new bundle zip.
#
# Lives in the install directory (copied there on prior install/update). Takes
# a bundle .zip (or an already-extracted bundle directory) and uses git to
# atomically diff-and-apply the change:
#
#   1. The bundle (NEW) is turned into a one-commit git repo.
#   2. The install dir (INSTALL) is a git working tree (initialized on first run).
#   3. `git fetch NEW; git reset --hard FETCH_HEAD` overlays NEW's tree onto
#      INSTALL — tracked files updated, added, and deleted to match NEW;
#      untracked files (anything matching any .gitignore — .env, secret/,
#      uploads/, logs/, node_modules/, generated $APP_NAME.{conf,service},
#      etc.) are preserved automatically by git.
#
# Adding a new local-state file? Just gitignore it. update.sh has zero
# hardcoded preserve lists.
#
# The script re-execs from the NEW bundle's update.sh before doing the swap,
# so bug fixes to update.sh itself take effect on the *same* run.
#
# Usage (from the install dir):
#   ./update.sh /path/to/<app>-site-vX.Y.Z-sha.zip
#   ./update.sh /path/to/already-extracted-bundle-dir
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

log() { echo -e "\033[0;36m[$(date '+%H:%M:%S')]\033[0m $*"; }
die() { echo -e "\033[0;31m[ERROR]\033[0m $*" >&2; exit 1; }

# Run git with a per-invocation identity so we don't touch the user's global
# git config (which we shouldn't, and the system's git may not have one set).
git_local() { git -c user.email="update.sh@$(hostname)" -c user.name="update.sh" "$@"; }

BUNDLE_ARG="${1:-}"
[[ -n "$BUNDLE_ARG" ]] || {
    echo "Usage: bash update.sh <bundle.zip-or-extracted-dir>" >&2
    echo "  Examples:" >&2
    echo "    ./update.sh ~/Downloads/<app>-site-v1.2.3-abc1234.zip" >&2
    echo "    ./update.sh /tmp/site-update-extracted" >&2
    exit 1
}

# INSTALL defaults to the script's own directory (the install itself). On
# re-exec from /tmp, it's passed explicitly as arg 2.
INSTALL="${2:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
INSTALL="$(cd "$INSTALL" 2>/dev/null && pwd)" || die "Install dir not found: ${2:-<self>}"

# ─── Resolve bundle: zip → extract to temp; dir → use as-is ─────────────────
if [[ -f "$BUNDLE_ARG" && "$BUNDLE_ARG" == *.zip ]]; then
    command -v unzip >/dev/null 2>&1 || die "unzip not in PATH — install it first."
    NEW="$(mktemp -d /tmp/site-update-XXXXXX)"
    log "Extracting $(basename "$BUNDLE_ARG") → $NEW..."
    unzip -q "$BUNDLE_ARG" -d "$NEW"
elif [[ -d "$BUNDLE_ARG" ]]; then
    NEW="$(cd "$BUNDLE_ARG" && pwd)"
else
    die "Bundle not found (expected a .zip or extracted directory): $BUNDLE_ARG"
fi

# Capture absolute path to the original bundle (file or dir) so we can offer
# to delete it at the end. Resolve once — the re-exec inherits via env so the
# path survives even after cwd changes.
if [[ -z "${ORIG_BUNDLE:-}" ]]; then
    ORIG_BUNDLE="$(cd "$(dirname "$BUNDLE_ARG")" && pwd)/$(basename "$BUNDLE_ARG")"
    export ORIG_BUNDLE
fi

# ─── Validate ───────────────────────────────────────────────────────────────
# Layout mirrors the dev repo: app/client + app/server (boot wrapper) +
# startup/server (compiled framework).
[[ "$NEW" == "$INSTALL" ]] && die "Bundle dir and install dir are the same: $NEW"
[[ -f "$NEW/VERSION"            ]] || die "New bundle missing VERSION."
[[ -d "$NEW/app/client"         ]] || die "New bundle missing app/client/."
[[ -d "$NEW/app/server"         ]] || die "New bundle missing app/server/."
[[ -d "$NEW/startup/server"     ]] || die "New bundle missing startup/server/."
[[ -d "$NEW/deploy"             ]] || die "New bundle missing deploy/."
[[ -f "$NEW/update.sh"          ]] || die "New bundle missing update.sh."
[[ -f "$NEW/.gitignore"         ]] || die "New bundle missing root .gitignore — CI must ship it (see builds.yml)."
[[ -f "$INSTALL/VERSION"        ]] || die "Install dir missing VERSION — not a valid install."
[[ -d "$INSTALL/app/server"     ]] || die "Install dir has no app/server/."
[[ -d "$INSTALL/startup/server" ]] || die "Install dir has no startup/server/."
command -v git >/dev/null 2>&1 || die "git not in PATH — install it first."

# ─── Self-update: re-exec from the NEW update.sh ────────────────────────────
# Copy the new update.sh to /tmp and exec it so bug fixes to update.sh itself
# are in effect for the rest of THIS run. The new script accepts:
#   arg 1 = already-resolved bundle dir (not re-extracted)
#   arg 2 = install dir
#   env   = SELF_UPDATED=1 (signals "skip the re-exec, do the swap")
if [[ "${SELF_UPDATED:-0}" != "1" ]]; then
    TMP_UPDATE="/tmp/site-update-script.$$.sh"
    cp "$NEW/update.sh" "$TMP_UPDATE"
    chmod +x "$TMP_UPDATE"
    export SELF_UPDATED=1
    log "Handing off to bundled update.sh ($TMP_UPDATE)..."
    exec bash "$TMP_UPDATE" "$NEW" "$INSTALL"
fi

# ─── Everything below here runs only in the re-exec'd (new) update.sh ──────

# Read app_name from the existing install. Parse with grep instead of `source`
# — VERSION may contain unquoted free-form fields (e.g. commit_msg) that bash
# would mis-execute as commands.
APP_NAME=$(grep '^app_name=' "$INSTALL/VERSION" | cut -d= -f2-)
[[ -n "$APP_NAME" ]] || die "Install VERSION has no app_name."
SERVICE="$APP_NAME.service"
NGINX_SERVE_DIR="/app/$APP_NAME"

NEW_VER=$(grep '^startup_version=' "$NEW/VERSION" | cut -d= -f2)
OLD_VER=$(grep '^startup_version=' "$INSTALL/VERSION" | cut -d= -f2)
log "Updating $APP_NAME: v$OLD_VER → v$NEW_VER"

# ─── Node/V8 ABI guard ──────────────────────────────────────────────────────
# The bundle ships V8 bytecode (.jsc) locked to the exact V8 build it was
# compiled against; a mismatched Node on this host is a cryptic mid-require
# crash, not a clean error. Refuse the update BEFORE we stop the running
# service, and say exactly how to fix it — the native mirror of the Docker
# path's guard in startup/server/scripts/container-entrypoint.sh.
BUNDLE_V8=$(grep '^v8_version=' "$NEW/VERSION" | cut -d= -f2)
BUNDLE_NODE=$(grep '^node_version=' "$NEW/VERSION" | cut -d= -f2)
RUNNING_V8=$(node -p process.versions.v8 2>/dev/null || true)
RUNNING_NODE=$(node -v 2>/dev/null || true)
if [[ -n "$BUNDLE_V8" && -n "$RUNNING_V8" && "$BUNDLE_V8" != "$RUNNING_V8" ]]; then
    die "Node/V8 mismatch - the bundle's bytecode will not load on this host.
  host runtime: Node ${RUNNING_NODE:-unknown} (V8 $RUNNING_V8)
  bundle built: Node ${BUNDLE_NODE:-unknown} (V8 $BUNDLE_V8)
  Install Node ${BUNDLE_NODE:-<the bundle VERSION node_version>} on this host, then re-run ./update.sh."
fi

# ─── Stop service ───────────────────────────────────────────────────────────
running=0
if systemctl is-active --quiet "$SERVICE"; then
    log "Stopping $SERVICE..."
    sudo systemctl stop "$SERVICE"
    running=1
fi

# ─── Turn NEW into a git source ─────────────────────────────────────────────
# `git add -A` automatically respects any .gitignore files in the bundle, so
# if the bundle accidentally contains a local-state file, it's not committed
# and therefore never propagates to install.
log "Preparing bundle as git source..."
git_local -C "$NEW" init -q
git_local -C "$NEW" add -A
git_local -C "$NEW" commit -q -m "bundle v$NEW_VER" --allow-empty

# ─── First-time bootstrap: turn INSTALL into a git working tree ─────────────
# `git reset --hard` needs INSTALL to be a git repo so it knows what's
# currently tracked vs. local state. We seed it with NEW's .gitignore files
# first so the baseline commit doesn't slurp up .env / secret/credentials.json /
# node_modules / etc. (anything that should be untracked).
if [[ ! -d "$INSTALL/.git" ]]; then
    log "First run: bootstrapping git working tree on install dir..."
    # Mirror NEW's .gitignore set into INSTALL (authoritative — if INSTALL has
    # an older copy from a manual setup, replace it). The reset below would
    # overwrite them anyway, but they need to be in place BEFORE `git add -A`
    # so the baseline commit doesn't slurp up local state.
    while IFS= read -r gi; do
        rel="${gi#./}"
        mkdir -p "$INSTALL/$(dirname "$rel")"
        cp -f "$NEW/$rel" "$INSTALL/$rel"
    done < <(cd "$NEW" && find . -name .gitignore -type f ! -path '*/node_modules/*' ! -path './.git/*')
    git_local -C "$INSTALL" init -q
    git_local -C "$INSTALL" add -A
    git_local -C "$INSTALL" commit -q -m "baseline v$OLD_VER" --allow-empty
fi

# ─── Apply: fetch NEW's tree and reset INSTALL to it ───────────────────────
# Native semantics:
#   - tracked files in INSTALL → reset to NEW's content (modified files updated)
#   - tracked files in INSTALL but absent in NEW → DELETED (upstream removals)
#   - tracked files in NEW but absent in INSTALL → ADDED
#   - untracked files in INSTALL (matching any .gitignore) → UNTOUCHED
#
# This is the entire diff-and-apply step in two commands. No filename lists,
# no rsync filter, no per-directory staging gymnastics.
log "Fetching new tree from bundle..."
git_local -C "$INSTALL" fetch -q "$NEW" HEAD

# Show the operator exactly what's about to change. A/M/D is per-file status:
#   A = added, M = modified, D = deleted, R = renamed, T = type change.
log "Changes to apply (A=added, M=modified, D=deleted):"
if git_local -C "$INSTALL" diff --quiet HEAD FETCH_HEAD; then
    echo "  (no tracked-file changes — install already matches bundle tree)"
else
    git_local -C "$INSTALL" diff --name-status HEAD FETCH_HEAD | sed 's/^/  /'
    echo
    git_local -C "$INSTALL" diff --shortstat HEAD FETCH_HEAD | sed 's/^/  /'
fi

log "Resetting install to bundle tree..."
git_local -C "$INSTALL" reset --hard FETCH_HEAD

# Periodic gc to keep the install .git directory from ballooning over many
# updates. `--auto` does it only when git's own heuristics say it's worth it.
git_local -C "$INSTALL" gc --auto --quiet || true

# Belt-and-braces: ensure scripts are executable. git preserves the +x bit in
# its tree, but if a bundle was ever zipped/unzipped on a system that dropped
# permissions, this catches it.
chmod +x "$INSTALL/update.sh"
chmod +x "$INSTALL/deploy/"*.sh 2>/dev/null || true
[[ -d "$INSTALL/scripts" ]] && chmod +x "$INSTALL/scripts/"*.sh 2>/dev/null || true

# ─── Install deps + redeploy client ─────────────────────────────────────────
# Install in startup/server (framework — bytenode runtime + framework deps)
# and app/server (thin boot wrapper, may have app-specific deps). Both keep
# devDependencies so nodemon/eslint/jest work for on-site debugging.
# app/server/package.json owns the server's runtime install list — itself, the
# @startup framework, and @nucleus (bytecode only; without its winston the server
# dies at boot) — in its `deps` script, the same list `npm run i` uses in dev.
# Reuse it so the shared-dep list lives in one place, not duplicated here. Keeps
# devDependencies (npm install) for on-site debugging.
log "Installing server deps (app/server npm run deps: self + framework + nucleus)..."
(cd "$INSTALL/app/server" && npm run deps 2>&1 | tail -5)

# biometric_gateway ships its own deps (sequelize, node-zklib, …); the server's
# @adms/@biomax/@zkteco imports resolve against them. Present only when the
# build staged it (it always does now), so guard for older bundles.
if [[ -f "$INSTALL/biometric_gateway/package.json" ]]; then
  log "Installing biometric_gateway (shared device libs) dependencies..."
  (cd "$INSTALL/biometric_gateway" && npm install 2>&1 | tail -3)
fi

log "Deploying client to $NGINX_SERVE_DIR..."
sudo mkdir -p "$NGINX_SERVE_DIR"
sudo rm -rf "$NGINX_SERVE_DIR"/*
sudo cp -a "$INSTALL/app/client/." "$NGINX_SERVE_DIR/"

# ─── Restart ────────────────────────────────────────────────────────────────
log "Reloading nginx..."
sudo nginx -t || die "nginx config test failed — service NOT restarted."
sudo systemctl reload nginx

if [[ "$running" == "1" ]]; then
    log "Starting $SERVICE..."
    sudo systemctl start "$SERVICE"
    sleep 2
    systemctl is-active --quiet "$SERVICE" \
        || die "$SERVICE failed to start. Check: journalctl -u $SERVICE -n 50"
fi

# ─── Cleanup temp dirs ──────────────────────────────────────────────────────
# If we extracted the zip into /tmp/site-update-*, remove it. The re-exec
# script copy at /tmp/site-update-script.*.sh is left behind (we're still
# executing it) — it's a few KB and /tmp is cleared on reboot.
[[ "$NEW" == /tmp/site-update-* ]] && rm -rf "$NEW"

log "Update complete: v$OLD_VER → v$NEW_VER"
log "If deploy/base.conf or deploy/base.service changed, re-run ./deploy/1build_deploy_files.sh manually."

# ─── Prompt to delete original bundle ──────────────────────────────────────
# Offer to remove the zip/dir the operator passed in. Default Y — once the
# update succeeded, the bundle is just a stale installer artifact. Skips
# silently if non-interactive (cron, CI) or if the path is already gone
# (e.g. user passed an already-extracted temp dir that got auto-cleaned).
if [[ -e "${ORIG_BUNDLE:-}" ]]; then
    if [[ -t 0 ]]; then
        read -r -p "Delete original bundle '$ORIG_BUNDLE'? [Y/n] " reply
        reply="${reply:-Y}"
        if [[ "$reply" =~ ^[Yy]$ ]]; then
            log "Removing $ORIG_BUNDLE..."
            rm -rf "$ORIG_BUNDLE"
        else
            log "Keeping $ORIG_BUNDLE."
        fi
    else
        log "Non-interactive shell; keeping $ORIG_BUNDLE."
    fi
fi
