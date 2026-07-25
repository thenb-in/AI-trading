#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# download_client_build.sh
#
# Downloads the latest client production build artifact from GitHub Actions
# and deploys it to /app/<app_name>/ where nginx serves it.
#
# Usage:  bash download_client_build.sh
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/scripts/download-artifact.sh"

# ─── Setup ───────────────────────────────────────────────────────────────────
init_repo_info
prompt_github_token
resolve_app_name "$REMOTE_URL"

# ─── Fetch artifact ─────────────────────────────────────────────────────────
fetch_latest_artifact "Build and Upload Artifacts" "client-build-artifact"

# ─── Download and deploy ────────────────────────────────────────────────────
APP_DIR="/app/$DEPLOY_APP_NAME"

# if DEPLOY_APP_NAME is not set, exit with an error
if [[ -z "$DEPLOY_APP_NAME" ]]; then
    log_error "DEPLOY_APP_NAME is not set. Exiting."
    exit 1
fi

# Download and extract directly to a temp dir, then move into place
STAGING_DIR=$(mktemp -d /tmp/client-build-XXXXXX)
download_and_extract "$ARTIFACT_URL" "$STAGING_DIR"


# Clean existing app directory
if [[ -d "$APP_DIR" ]]; then
    log_info "Removing existing app directory..."
    rm -rf "$APP_DIR"
fi
mkdir -p "$APP_DIR"


mv "$STAGING_DIR"/* "$APP_DIR/"
rm -rf "$STAGING_DIR"

sudo systemctl restart nginx.service

echo ""
log_success "Client deployment complete."
log "  Deployed to: $APP_DIR"
log "  Built at:    $BUILT_AT"
log "  Commit:      $SHORT_SHA"
