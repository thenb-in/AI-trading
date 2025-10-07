#!/bin/bash

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

# Replace 3.110.76.178 with the IP address of the server
# ask as input from user
read -p "Enter the domain name(s) or IP address(es) of the server: " ip_address

if [ -z "$ip_address" ]; then
    error_exit "IP address cannot be empty"
fi

# Replace /app/nbnext_app_name with the path of the app on the server
app_path="/app/$app_name"

# Replace /home/ubuntu/etime-payroll/server with the path of the app on the server
# server path is .. of directory of this script
server_path=$(dirname $(dirname $(realpath $0)))

# Replace /home/ubuntu/.nvm/versions/node/v22.19.0/bin/npm start with the path of the app on the server
# nvm path to be found by which npm is installed
nvm_path=$(which npm) || error_exit "Failed to find npm executable"
nvm_path=$(dirname $(dirname $nvm_path))

# Replace /home/ubuntu/.nvm/versions/node/v22.19.0/bin/npm start with the path of the app on the server
npm_path="$nvm_path/bin/npm"

# console log the values
log "Configuration:"
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

# Create the target directory if it doesn't exist
log "Creating target directory: $app_name/deploy"
mkdir -p "$app_name/deploy" || error_exit "Failed to create directory $app_name/deploy"

# copy the files to app_name instead of base
for file in ${files_to_replace[@]}; do
    source_file="$script_dir/$file"
    
    # Check if source file exists
    if [ ! -f "$source_file" ]; then
        error_exit "Source file not found: $source_file"
    fi
    
    # Remove 'base.' prefix and replace with app_name
    target_filename="${file#base.}"
    target_file="$app_name.$target_filename"
    
    log "Processing $file -> $target_filename"
    log "  Copying $source_file to $target_file"
    
    # Copy the file
    cp "$source_file" "$target_file" || error_exit "Failed to copy $source_file to $target_file"
    
    # Use proper sed syntax for macOS (BSD sed)
    log "  Replacing placeholders in $target_file"
    
    sed -i '' "s/nbnext_app_name/$app_name/g" "$target_file" || error_exit "Failed to replace nbnext_app_name in $target_file"
    sed -i '' "s/public_ip_address/$ip_address/g" "$target_file" || error_exit "Failed to replace public_ip_address in $target_file"
    sed -i '' "s|nbnext_app_name_path|$app_path|g" "$target_file" || error_exit "Failed to replace nbnext_app_name_path in $target_file"
    sed -i '' "s|server_path|$server_path|g" "$target_file" || error_exit "Failed to replace server_path in $target_file"
    sed -i '' "s|nvm_path|$nvm_path|g" "$target_file" || error_exit "Failed to replace nvm_path in $target_file"
    sed -i '' "s|npm_path|$npm_path|g" "$target_file" || error_exit "Failed to replace npm_path in $target_file"
    
    # Additional replacements for service file
    if [[ "$file" == "base.service" ]]; then
        log "  Applying service-specific replacements"
        sed -i '' "s|/home/ubuntu/etime-payroll/server|$server_path|g" "$target_file" || error_exit "Failed to replace etime-payroll path in $target_file"
        sed -i '' "s|/home/ubuntu/.nvm/versions/node/v22.19.0|$nvm_path|g" "$target_file" || error_exit "Failed to replace nvm path in $target_file"
    fi
    
    log "  ✓ Successfully processed $target_file"
done

log "✓ Deployment files generated successfully!"
log "Generated files:"
for file in ${files_to_replace[@]}; do
    target_filename="${file#base.}"
    target_file="$app_name.$target_filename"
    log "  - $target_file"
done

log "You can now copy these files to your server for deployment."
