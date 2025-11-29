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

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

log_info "Starting file linking process..."

# Check required commands
if ! command_exists git; then
    error_exit "git is not installed or not in PATH"
fi

if ! command_exists npm; then
    error_exit "npm is not installed or not in PATH"
fi

# Get the GitHub remote URL (assumes "origin" remote)
log_info "Getting Git remote URL..."
REMOTE_URL=$(git config --get remote.origin.url) || error_exit "Failed to get Git remote URL. Make sure you're in a Git repository with an 'origin' remote."

if [ -z "$REMOTE_URL" ]; then
    error_exit "No Git remote URL found. Make sure you're in a Git repository with an 'origin' remote."
fi

# Replace nbnext_app_name with the name of the app
# app name is the github repository name
app_name=$(basename -s .git "$REMOTE_URL")
log_info "App name: $app_name"






# files are 1. nginx (app_name.conf) and 2. app_name.service
# link the files to the internal system
# nginx config file is in /etc/nginx/sites-available/
# app_name.service is in /etc/systemd/system/

# link the nginx config file from this file to the internal system
current_directory=$(realpath $0)
nginx_config_file=$(dirname $current_directory)/$app_name.conf
app_name_service_file=$(dirname $current_directory)/$app_name.service

log_info "Checking for required files..."

# if files don't exist, error out
if [ ! -f $nginx_config_file ]; then
    error_exit "Nginx config file not found: $nginx_config_file"
fi

if [ ! -f $app_name_service_file ]; then
    error_exit "App name service file not found: $app_name_service_file"
fi

log_success "All required files found"

# link the nginx config file from this file to the internal system
log_info "Linking nginx config file..."
sites_available_dir="/etc/nginx/sites-available"
sudo ln -s $nginx_config_file $sites_available_dir/$app_name.conf || error_exit "Failed to link nginx config file"
log_success "Nginx config linked to $sites_available_dir/$app_name.conf"

sites_enabled_dir="/etc/nginx/sites-enabled"
sudo ln -s $sites_available_dir/$app_name.conf $sites_enabled_dir/$app_name.conf || error_exit "Failed to link nginx config file to sites-enabled"
log_success "Nginx config linked to $sites_enabled_dir/$app_name.conf"

log_info "Linking systemd service file..."
sudo ln -s $app_name_service_file /etc/systemd/system/$app_name.service || error_exit "Failed to link systemd service file"
log_success "Systemd service linked to /etc/systemd/system/$app_name.service"

log_success "All files linked successfully!"
log_info "Next steps:"
log "  1. Enable nginx site: sudo ln -s /etc/nginx/sites-available/$app_name.conf /etc/nginx/sites-enabled/"
log "  2. Test nginx config: sudo nginx -t"
log "  3. Reload nginx: sudo systemctl reload nginx"
log "  4. Enable service: sudo systemctl enable $app_name.service"
log "  5. Start service: sudo systemctl start $app_name.service"
