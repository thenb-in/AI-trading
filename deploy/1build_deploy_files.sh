#!/bin/bash

replace_in_var() {
    local var_name="$1"
    local search="$2"
    local replace="$3"

    # Indirect expansion
    local value="${!var_name}"
    value="${value//$search/$replace}"
    printf -v "$var_name" '%s' "$value"
}


# Enable error handling
set -e  # Exit on any error
set -u  # Exit on undefined variables
set -o pipefail  # Exit on pipe failures

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to log messages with timestamp and color
log() {
    echo -e "${CYAN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Function to log info messages
log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Function to log success messages
log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

# Function to log warning messages
log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Function to log errors and exit
error_exit() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
    exit 1
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

log_info "Starting deployment file generation..."

# Check required commands
if ! command_exists npm; then
    error_exit "npm is not installed or not in PATH"
fi

# Resolve app name: prefer APP_NAME env (bundled installs without scripts/ dir);
# otherwise delegate to the shared resolve_app_name helper (handles git lookup internally).
if [ -n "${APP_NAME:-}" ]; then
    app_name="$APP_NAME"
    log_info "Using APP_NAME from environment: $app_name"
else
    repo_root=$(dirname "$(dirname "$(realpath "$0")")")
    # shellcheck disable=SC1091
    source "$repo_root/scripts/download-artifact.sh"
    resolve_app_name
    app_name="$DEPLOY_APP_NAME"
fi
log_info "App name: $app_name"

# Resolve IP/domain: prefer IP_ADDRESS env (non-interactive); fall back to prompt.
if [ -n "${IP_ADDRESS:-}" ]; then
    ip_address="$IP_ADDRESS"
    log_info "Using IP_ADDRESS from environment: $ip_address"
else
    read -p "Enter the domain name(s) or IP address(es) of the server: " ip_address
fi
[ -n "$ip_address" ] || error_exit "IP address cannot be empty"

# Replace /app/nbnext_app_name with the path of the app on the server
app_path="/app/$app_name"

# Replace /home/ubuntu/$app_name/server with the path of the app on the server
# server path is .. of directory of this script
server_path=$(dirname $(dirname $(realpath $0)))

# System user for the systemd service — env override, else current user.
system_user="${SYSTEM_USER:-$(whoami)}"

# Replace /home/ubuntu/.nvm/versions/node/v22.19.0/bin/npm start with the path of the app on the server
# nvm path to be found by which npm is installed
nvm_path=$(which npm) || error_exit "Failed to find npm executable"
nvm_path=$(dirname $(dirname $nvm_path))

# Replace /home/ubuntu/.nvm/versions/node/v22.19.0/bin/npm start with the path of the app on the server
npm_path="$nvm_path/bin/npm"

# console log the values
log_info "Configuration:"
log "  app_name: $app_name"
log "  ip_address: $ip_address"
log "  app_path: $app_path"
log "  server_path: $server_path"
log "  nvm_path: $nvm_path"
log "  npm_path: $npm_path"

# Get the directory where this script is located
script_dir=$(dirname $(realpath $0))

# make a array of the files to be replaced
files_to_replace=(
    "base.conf"
    "base.service"
)

# copy the files to app_name instead of base
for file in ${files_to_replace[@]}; do
    source_file="$script_dir/$file"

    # Check if source file exists
    if [ ! -f "$source_file" ]; then
        error_exit "Source file not found: $source_file"
    fi

    # Remove 'base.' prefix and replace with app_name
    target_filename="${file#base.}"
    target_file="$script_dir/$app_name.$target_filename"

    log_info "Processing $file -> $target_filename"

    # Read the file content and perform replacements in memory (no temp files)
    log "  Reading $source_file and replacing placeholders"

    # Read source file and perform all replacements using bash string substitution
    content=$(cat "$source_file")

    # Perform all replacements using bash parameter expansion
    replace_in_var "content" "nbnext_app_name" "$app_name"
    replace_in_var "content" "public_ip_address" "$ip_address"
    replace_in_var "content" "nbnext_app_name_path" "$app_path"
    replace_in_var "content" "server_path" "$server_path"
    replace_in_var "content" "nvm_path" "$nvm_path"
    replace_in_var "content" "npm_path" "$npm_path"

    # Additional replacements for service file
    if [[ "$file" == "base.service" ]]; then
        log "  Applying service-specific replacements"
        replace_in_var "content" "system_user" "$system_user"
    fi

    # Write the modified content directly to the target file
    log "  Writing $target_file"
    printf '%s' "$content" > "$target_file" || error_exit "Failed to write $target_file"

    log_success "Successfully created $target_file"
done

log_success "Deployment files generated successfully!"
log_info "You can now copy these files to your server for deployment."
