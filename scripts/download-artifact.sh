#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# download-artifact.sh — Shared helpers for the download-artifact flow AND
# for deploy app-name resolution (sourced by download_client_build.sh and the
# deploy/*.sh scripts).
#
# Usage (from a calling script):
#   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   source "$SCRIPT_DIR/scripts/download-artifact.sh"
#
#   init_repo_info                       # sets GITHUB_OWNER, GITHUB_REPO, REMOTE_URL
#   prompt_github_token                  # sets GITHUB_TOKEN
#   resolve_app_name [REMOTE_URL]        # sets DEPLOY_APP_NAME (URL optional —
#                                        # ask-app-name.js looks it up if omitted)
#   fetch_latest_artifact \
#       "Build and Upload Artifacts" \   # workflow name (matches .github/workflows/builds.yml `name:`)
#       "client-build-artifact"          # artifact name
#   # After return: ARTIFACT_URL, LATEST_RUN_ID, and metadata vars are set.
#   download_and_extract "$ARTIFACT_URL" "$dest_dir"
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Logging helpers ─────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log()         { echo -e "${CYAN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"; }
log_info()    { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"; }
log_success() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] OK:${NC} $1"; }
log_warning() { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"; }
error_exit()  { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2; exit 1; }

# ─── init_repo_info ─────────────────────────────────────────────────────────
# Parses REMOTE_URL from the current git repo and sets GITHUB_OWNER / GITHUB_REPO.
init_repo_info() {
    REMOTE_URL=$(git config --get remote.origin.url) \
        || error_exit "Failed to get Git remote URL."

    REMOTE_URL=${REMOTE_URL%.git}

    if [[ "$REMOTE_URL" =~ ^git@github\.com:(.+)/(.+)$ ]]; then
        GITHUB_OWNER="${BASH_REMATCH[1]}"
        GITHUB_REPO="${BASH_REMATCH[2]}"
    elif [[ "$REMOTE_URL" =~ ^https://github\.com/(.+)/(.+)$ ]]; then
        GITHUB_OWNER="${BASH_REMATCH[1]}"
        GITHUB_REPO="${BASH_REMATCH[2]}"
    else
        error_exit "Unsupported remote URL format: $REMOTE_URL"
    fi

    log_info "Repository: $GITHUB_OWNER/$GITHUB_REPO"
}

# ─── prompt_github_token ────────────────────────────────────────────────────
prompt_github_token() {
    read -p "Enter your GitHub Token for $GITHUB_OWNER/$GITHUB_REPO: " GITHUB_TOKEN
    echo ""
    if [[ -z "$GITHUB_TOKEN" ]]; then
        error_exit "GitHub token cannot be empty."
    fi
}

# ─── resolve_app_name ───────────────────────────────────────────────────────
# Uses scripts/ask-app-name.js to prompt for the deploy folder name.
# Pins the separator to "-" so the sanitized name matches the deploy pipeline
# (1build_deploy_files.sh / 2link_files_to_internal_system.sh use the same).
# Argument: $1 = REMOTE_URL (optional; ask-app-name.js looks it up internally if omitted)
resolve_app_name() {
    local remote_url="${1:-}"
    local root_dir
    root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

    DEPLOY_APP_NAME=$(node "$root_dir/scripts/ask-app-name.js" "-" "$remote_url") \
        || error_exit "Failed to resolve app name."
    log_info "Deploy app name: $DEPLOY_APP_NAME"
}

# ─── fetch_latest_artifact ──────────────────────────────────────────────────
# Finds the latest successful workflow run for a given workflow name,
# prints deployment metadata, and locates the artifact download URL.
#
# Arguments:
#   $1 = workflow display name  (e.g. "Build and Upload Artifacts")
#   $2 = artifact name          (e.g. "client-build-artifact")
#
# Sets:  ARTIFACT_URL, LATEST_RUN_ID, BUILT_AT, SHORT_SHA, HEAD_SHA,
#         HEAD_BRANCH, COMMIT_MSG, COMMIT_AUTHOR
fetch_latest_artifact() {
    local workflow_name="$1"
    local artifact_name="$2"

    log_info "Looking for latest successful run of \"$workflow_name\"..."

    LATEST_RUN_ID=$(
        curl -s -H "Authorization: token $GITHUB_TOKEN" \
            "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/actions/runs?status=success&branch=main&per_page=50" \
        | jq -r "(.workflow_runs // [])[] | select(.name==\"$workflow_name\") | .id" \
        | head -n1
    )

    if [[ -z "$LATEST_RUN_ID" || "$LATEST_RUN_ID" == "null" ]]; then
        error_exit "No successful workflow runs found for '$workflow_name' on branch main."
    fi

    # Fetch full run details
    local run_details
    run_details=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/actions/runs/$LATEST_RUN_ID")

    if echo "$run_details" | jq -e '.message == "Not Found"' >/dev/null 2>&1; then
        error_exit "Workflow run $LATEST_RUN_ID not found. Token may lack permissions."
    fi
    if echo "$run_details" | jq -e '.created_at == null' >/dev/null 2>&1; then
        error_exit "Invalid response from GitHub API for run $LATEST_RUN_ID."
    fi

    BUILT_AT=$(echo "$run_details" | jq -r '.created_at')
    HEAD_SHA=$(echo "$run_details" | jq -r '.head_sha')
    HEAD_BRANCH=$(echo "$run_details" | jq -r '.head_branch')
    COMMIT_MSG=$(echo "$run_details" | jq -r '.head_commit.message' | tr '\n' ' ' | sed 's/  */ /g')
    COMMIT_AUTHOR=$(echo "$run_details" | jq -r '.head_commit.author.name')
    SHORT_SHA="${HEAD_SHA:0:7}"

    echo ""
    echo "=============================================="
    echo "  Artifact deployment details"
    echo "=============================================="
    echo "  Workflow:         $workflow_name"
    echo "  Workflow run ID:  $LATEST_RUN_ID"
    echo "  Built at:         $BUILT_AT"
    echo "  Branch:           $HEAD_BRANCH"
    echo "  Commit:           $SHORT_SHA ($HEAD_SHA)"
    echo "  Commit message:   $COMMIT_MSG"
    echo "  Author:           $COMMIT_AUTHOR"
    echo "=============================================="
    echo ""

    # Find the specific artifact by name
    ARTIFACT_URL=$(
        curl -s -H "Authorization: token $GITHUB_TOKEN" \
            "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO/actions/runs/$LATEST_RUN_ID/artifacts" \
        | jq -r ".artifacts[] | select(.name==\"$artifact_name\") | .archive_download_url"
    )

    if [[ -z "$ARTIFACT_URL" || "$ARTIFACT_URL" == "null" ]]; then
        error_exit "Artifact '$artifact_name' not found in workflow run $LATEST_RUN_ID."
    fi

    log_success "Found artifact: $artifact_name"
}

# ─── download_and_extract ───────────────────────────────────────────────────
# Downloads a GitHub artifact zip and extracts it into $dest_dir.
# Cleans the destination first if it exists.
#
# Arguments:
#   $1 = artifact download URL
#   $2 = destination directory (will be created / cleaned)
download_and_extract() {
    local url="$1"
    local dest_dir="$2"
    local tmp_zip
    tmp_zip=$(mktemp /tmp/artifact-XXXXXX.zip)

    log_info "Downloading artifact..."
    curl -L -H "Authorization: token $GITHUB_TOKEN" -o "$tmp_zip" "$url"

    # Clean destination
    if [[ -d "$dest_dir" ]]; then
        log_info "Removing existing $dest_dir..."
        sudo rm -rf "$dest_dir"
    fi
    mkdir -p "$dest_dir"

    log_info "Extracting to $dest_dir..."
    unzip -q "$tmp_zip" -d "$dest_dir"
    rm -f "$tmp_zip"

    log_success "Extracted to $dest_dir"
}
