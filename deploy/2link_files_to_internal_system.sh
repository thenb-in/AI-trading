#!/bin/bash



# TOdo: move the boilerplate code to a separate file
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

# Create symlink under sudo; if destination already exists, log warning and succeed.
symlink_or_skip() {
    local src="$1"
    local dest="$2"
    if sudo test -L "$dest" || sudo test -e "$dest"; then
        log_warning "Already exists, skipping symlink: $dest"
        return 0
    fi
    sudo ln -s "$src" "$dest" || error_exit "Failed to create symlink: $dest"
    log_success "Created symlink: $dest"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

log_info "Starting file linking process..."

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




# files are 1. nginx (app_name.conf) and 2. app_name.service
# nginx: Ubuntu/Debian -> sites-available + sites-enabled; Amazon Linux -> /etc/nginx/conf.d
# systemd: /etc/systemd/system/$app_name.service

current_directory=$(realpath "$0")
nginx_config_file="$(dirname "$current_directory")/$app_name.conf"
app_name_service_file="$(dirname "$current_directory")/$app_name.service"

log_info "Checking for required files..."

if [ ! -f "$nginx_config_file" ]; then
    error_exit "Nginx config file not found: $nginx_config_file"
fi

if [ ! -f "$app_name_service_file" ]; then
    error_exit "App name service file not found: $app_name_service_file"
fi

log_success "All required files found"

# Nginx layout: Debian/Ubuntu uses sites-available + sites-enabled; Amazon Linux 2023 uses conf.d (RHEL-style).
NGINX_LAYOUT=""
if [ -f /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release
fi

case "${ID:-}" in
    amzn)
        NGINX_LAYOUT="rpm"
        log_info "Detected Amazon Linux: using /etc/nginx/conf.d for nginx site config."
        ;;
    ubuntu|debian|linuxmint|pop)
        NGINX_LAYOUT="deb"
        log_info "Detected Debian-family OS: using sites-available and sites-enabled."
        ;;
    *)
        if [ -d /etc/nginx/sites-available ] && [ -d /etc/nginx/sites-enabled ]; then
            NGINX_LAYOUT="deb"
            log_info "Using Debian-style nginx layout (sites-available/sites-enabled)."
        elif [ -d /etc/nginx/conf.d ]; then
            NGINX_LAYOUT="rpm"
            log_info "Using RHEL-style nginx layout (conf.d)."
        else
            error_exit "Could not determine nginx config layout: neither sites-available/sites-enabled nor conf.d found under /etc/nginx. Install nginx or adjust paths."
        fi
        ;;
esac

log_info "Linking nginx config file..."
if [ "$NGINX_LAYOUT" = "deb" ]; then
    sites_available_dir="/etc/nginx/sites-available"
    sites_enabled_dir="/etc/nginx/sites-enabled"
    if [ ! -d "$sites_available_dir" ] || [ ! -d "$sites_enabled_dir" ]; then
        error_exit "Expected nginx directories missing: $sites_available_dir and/or $sites_enabled_dir"
    fi
    symlink_or_skip "$nginx_config_file" "$sites_available_dir/$app_name.conf"
    symlink_or_skip "$sites_available_dir/$app_name.conf" "$sites_enabled_dir/$app_name.conf"
elif [ "$NGINX_LAYOUT" = "rpm" ]; then
    conf_d_dir="/etc/nginx/conf.d"
    if [ ! -d "$conf_d_dir" ]; then
        error_exit "Nginx conf.d directory not found: $conf_d_dir (install nginx or create the directory)"
    fi
    symlink_or_skip "$nginx_config_file" "$conf_d_dir/$app_name.conf"
else
    error_exit "Internal error: unknown NGINX_LAYOUT value: ${NGINX_LAYOUT:-empty}"
fi

log_info "Linking systemd service file..."
symlink_or_skip "$app_name_service_file" "/etc/systemd/system/$app_name.service"

log_success "All files linked successfully!"
log_info "Next steps:"
if [ "$NGINX_LAYOUT" = "deb" ]; then
    log "  1. (If not already linked) Enable nginx site: sudo ln -s /etc/nginx/sites-available/$app_name.conf /etc/nginx/sites-enabled/"
    log "  2. Test nginx config: sudo nginx -t"
    log "  3. Reload nginx: sudo systemctl reload nginx"
else
    log "  1. Test nginx config: sudo nginx -t"
    log "  2. Reload nginx: sudo systemctl reload nginx"
fi
log "  - Reload systemd (after linking the unit): sudo systemctl daemon-reload"
log "  - Enable service: sudo systemctl enable $app_name.service"
log "  - Start service: sudo systemctl start $app_name.service"

# Deploy user: same as the account running this script (e.g. ec2-user)
system_user=$(whoami)

# Ensure /app exists and is writable by deploy user. If /app already existed as root-only,
# chown fixes it; mkdir -p is idempotent.
log_info "Ensuring /app exists with correct ownership for $system_user..."
sudo mkdir -p /app
sudo chown "$system_user:$system_user" /app
sudo chmod 755 /app
log_success "/app is ready (owned by $system_user)"

log_info "Ensuring /app/$app_name directory exists with correct permissions..."
sudo mkdir -p "/app/$app_name"
sudo chown -R "$system_user:$system_user" "/app/$app_name"
sudo chmod -R 755 "/app/$app_name"
log_success "/app/$app_name is ready"
