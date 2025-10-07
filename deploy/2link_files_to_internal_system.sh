#!/bin/bash



# TOdo: move the boilerplate code to a separate file
# Enable error handling
set -e  # Exit on any error
set -u  # Exit on undefined variables
set -o pipefail  # Exit on pipe failures

# Function to log messages with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to log errors and exit
error_exit() {
    log "ERROR: $1" >&2
    exit 1
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

log "Starting deployment file generation..."

# Check required commands
if ! command_exists git; then
    error_exit "git is not installed or not in PATH"
fi

if ! command_exists npm; then
    error_exit "npm is not installed or not in PATH"
fi

# Get the GitHub remote URL (assumes "origin" remote)
log "Getting Git remote URL..."
REMOTE_URL=$(git config --get remote.origin.url) || error_exit "Failed to get Git remote URL. Make sure you're in a Git repository with an 'origin' remote."

if [ -z "$REMOTE_URL" ]; then
    error_exit "No Git remote URL found. Make sure you're in a Git repository with an 'origin' remote."
fi

# Replace nbnext_app_name with the name of the app
# app name is the github repository name
app_name=$(basename -s .git "$REMOTE_URL")
log "App name: $app_name"






# files are 1. nginx (app_name.conf) and 2. app_name.service
# link the files to the internal system
# nginx config file is in /etc/nginx/sites-available/
# app_name.service is in /etc/systemd/system/

# link the nginx config file from this file to the internal system
current_directory=$(realpath $0)
nginx_config_file=$(dirname $current_directory)/$app_name.conf
app_name_service_file=$(dirname $current_directory)/$app_name.service


# if files don't exist, error out
if [ ! -f $nginx_config_file ]; then
    error_exit "Nginx config file not found: $nginx_config_file"
fi

if [ ! -f $app_name_service_file ]; then
    error_exit "App name service file not found: $app_name_service_file"
fi


# link the nginx config file from this file to the internal system
ln -s $nginx_config_file /etc/nginx/sites-available/$app_name.conf
ln -s $app_name_service_file /etc/systemd/system/$app_name.service
