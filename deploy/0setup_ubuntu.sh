#!/bin/bash

# 0setup_ubuntu.sh — provision a bare Ubuntu/Debian box before deploying.
# Runs BEFORE 1build_deploy_files.sh and 2link_files_to_internal_system.sh.
# On-site Linux only; Windows/containers use the Docker path (deploy/docker).
#
# Provisions: a deploy user (default nbnext), openssh, localsend, netbird
# (remote login), and PostgreSQL 16. Every step is idempotent — safe to re-run.
#
# Overridable via env:
#   SETUP_USER   deploy user to create           (default: nbnext)
#   SKIP_LOCALSEND / SKIP_NETBIRD / SKIP_POSTGRES / SKIP_SSH  set to 1 to skip
#
# Boilerplate mirrors the sibling deploy scripts (1build/2link).

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

log() {
    echo -e "${CYAN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error_exit() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
    exit 1
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Run privileged commands with sudo, unless we are already root (bare-box installs
# are often done straight as root, where sudo may not even be installed).
SUDO="sudo"
if [ "$(id -u)" -eq 0 ]; then
    SUDO=""
fi

setup_user="${SETUP_USER:-nbnext}"

# Refuse anything that isn't Debian-family — this script only knows apt/snap.
if [ -f /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release
fi
case "${ID:-}${ID_LIKE:-}" in
    *ubuntu*|*debian*) : ;;
    *) error_exit "0setup_ubuntu.sh only supports Ubuntu/Debian (found ID='${ID:-unknown}'). For RHEL/Amazon Linux provision the equivalents by hand." ;;
esac

log_info "Starting bare-box provisioning for a Debian-family server..."

# --- refresh apt once up front ----------------------------------------------
log_info "Refreshing apt package index..."
export DEBIAN_FRONTEND=noninteractive
$SUDO apt-get update -y || error_exit "apt-get update failed"

# --- make the deploy user (default nbnext) ----------------------------------
if id "$setup_user" >/dev/null 2>&1; then
    log_warning "User $setup_user already exists, skipping create"
else
    log_info "Creating deploy user $setup_user (you'll be prompted for a password)..."
    $SUDO adduser --gecos "" "$setup_user" || error_exit "Failed to create user $setup_user"
    log_success "Created user $setup_user"
fi
# Idempotent: usermod -aG is a no-op if already a member.
$SUDO usermod -aG sudo "$setup_user" || error_exit "Failed to add $setup_user to sudo group"
log_success "$setup_user is in the sudo group"

# --- openssh ----------------------------------------------------------------
if [ "${SKIP_SSH:-0}" = "1" ]; then
    log_warning "SKIP_SSH=1, skipping openssh"
else
    log_info "Installing and enabling openssh-server..."
    $SUDO apt-get install -y openssh-server || error_exit "Failed to install openssh-server"
    $SUDO systemctl enable --now ssh || error_exit "Failed to enable ssh"
    log_success "openssh-server is enabled and running"
fi

# --- localsend (snap) -------------------------------------------------------
if [ "${SKIP_LOCALSEND:-0}" = "1" ]; then
    log_warning "SKIP_LOCALSEND=1, skipping localsend"
elif ! command_exists snap; then
    log_warning "snap not available on this box — skipping localsend (install snapd first if you need it)"
elif snap list localsend >/dev/null 2>&1; then
    log_warning "localsend already installed, skipping"
else
    log_info "Installing localsend via snap..."
    $SUDO snap install localsend || error_exit "Failed to install localsend"
    log_success "localsend installed"
fi

# --- netbird (remote login) -------------------------------------------------
if [ "${SKIP_NETBIRD:-0}" = "1" ]; then
    log_warning "SKIP_NETBIRD=1, skipping netbird"
elif command_exists netbird; then
    log_warning "netbird already installed, skipping"
else
    log_info "Installing netbird for remote login..."
    # try/catch: netbird is a third-party curl|sh — a flaky download shouldn't
    # abort the whole box provisioning, so warn and continue instead of exiting.
    if curl -fsSL https://pkgs.netbird.io/install.sh | sh; then
        log_success "netbird installed — run 'netbird up' to connect this box to your network"
    else
        log_warning "netbird install failed — continuing without it; install manually later from https://pkgs.netbird.io"
    fi
fi

# --- postgresql 16 ----------------------------------------------------------
if [ "${SKIP_POSTGRES:-0}" = "1" ]; then
    log_warning "SKIP_POSTGRES=1, skipping PostgreSQL"
elif command_exists psql && psql --version 2>/dev/null | grep -q ' 16'; then
    log_warning "PostgreSQL 16 already installed, skipping"
else
    log_info "Installing PostgreSQL 16 (adding the PGDG apt repo)..."
    $SUDO apt-get install -y postgresql-common curl ca-certificates || error_exit "Failed to install postgresql-common prerequisites"
    # The PGDG bootstrap prompts to confirm; -y answers it non-interactively.
    $SUDO /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y || error_exit "Failed to add the PGDG apt repository"
    $SUDO apt-get update -y || error_exit "apt-get update failed after adding PGDG repo"
    $SUDO apt-get install -y postgresql-16 postgresql-client-16 postgresql-contrib-16 || error_exit "Failed to install PostgreSQL 16"
    $SUDO systemctl enable --now postgresql || error_exit "Failed to enable postgresql"
    log_success "PostgreSQL 16 is installed and running"
fi

log_success "Bare-box provisioning complete for $setup_user!"
log_info "Next steps:"
log "  1. (netbird) Connect this box: netbird up"
log "  2. (postgres) Create the app role + database, then set DATABASE_URL in app/server/.env"
log "  3. Continue the deploy: bash deploy/1build_deploy_files.sh && bash deploy/2link_files_to_internal_system.sh"
