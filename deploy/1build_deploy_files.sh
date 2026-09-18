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
for file in "${files_to_replace[@]}"; do
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

    # Perform all replacements using bash parameter expansion.
    # NOTE: do NOT substitute `nbnext_app_path` here. base.conf uses it as
    # an nginx variable (`set $nbnext_app_path …; root $nbnext_app_path/;`)
    # and the path literal in `set …` is already produced by the
    # `nbnext_app_name -> $app_name` replacement above. Substituting it
    # would clobber the nginx variable name into garbage like
    # `$/app/<app>` and break `nginx -t`.
    replace_in_var "content" "nbnext_app_name" "$app_name"
    replace_in_var "content" "public_ip_address" "$ip_address"
    replace_in_var "content" "server_path" "$server_path"
    replace_in_var "content" "nvm_path" "$nvm_path"
    replace_in_var "content" "npm_path" "$npm_path"

    # Additional replacements for service file
    if [[ "$file" == "base.service" ]]; then
        log "  Applying service-specific replacements"
        replace_in_var "content" "system_user" "$system_user"
    fi

    # Loopback-IP nginx tweak: when deploying to localhost/127.0.0.1 (CI or
    # local-only dev), strip the deny-by-default block AND the basic_status
    # block, then promote the API server block to default_server. Without
    # this, the API block's templated `server_name 127.0.0.1` collides with
    # the basic_status block's `127.0.0.1 localhost` — nginx warns
    # "conflicting server name" and drops the API block's name, so /api/*
    # requests fall to the 404 block (or basic_status). Production keeps
    # both other blocks since it has a real public IP, basic_status is
    # useful for stub_status monitoring, and unknown-Host requests should
    # be rejected by the deny-by-default block.
    if [[ "$file" == "base.conf" && ( "$ip_address" == "localhost" || "$ip_address" == "127.0.0.1" ) ]]; then
        log "  Loopback IP detected — stripping default-404 + basic_status blocks and promoting API block to default_server"

        # Block 1 from base.conf, stripped together with the trailing blank
        # line so we don't leave a double newline behind. Heredoc keeps the
        # exact whitespace from the template — if base.conf is reformatted,
        # this string must be kept in sync.
        IFS= read -r -d '' block1_text <<'EOF' || true
server {
      # TODO: test if this is working correctly
      listen 80 default_server;
      location / {
            return 404;
      }
}

EOF
        replace_in_var "content" "$block1_text" ""

        # Block 2 (basic_status) — same heredoc pattern, same caveat about
        # keeping whitespace in sync with base.conf.
        IFS= read -r -d '' block2_text <<'EOF' || true
server {
      listen 80;
      server_name 127.0.0.1 localhost;

      location /basic_status {
            stub_status on;
            allow 127.0.0.1;   # Allow only local access
            deny all;          # Deny access to others
      }
}

EOF
        replace_in_var "content" "$block2_text" ""

        # Promote the API block's `listen 80;` to `listen 80 default_server;`.
        # Now that block 2 is gone the API block is the only remaining
        # `listen 80;` line, but anchoring on `set $nbnext_app_path` keeps
        # this robust if other server blocks are added later.
        api_listen_old=$'    listen 80;\n    server_name '"$ip_address"$';\n\n    set $nbnext_app_path'
        api_listen_new=$'    listen 80 default_server;\n    server_name '"$ip_address"$';\n\n    set $nbnext_app_path'
        replace_in_var "content" "$api_listen_old" "$api_listen_new"
    fi

    # Write the modified content directly to the target file
    log "  Writing $target_file"
    printf '%s' "$content" > "$target_file" || error_exit "Failed to write $target_file"

    log_success "Successfully created $target_file"
done

log_success "Deployment files generated successfully!"
log_info "You can now copy these files to your server for deployment."
