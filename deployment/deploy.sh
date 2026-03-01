#!/bin/bash
set -euo pipefail

# Small, on-point deploy script for TransformoDocs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()   { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Ensure not run as root
if [[ "$EUID" -eq 0 ]]; then
  err "Do not run this script as root. Run as a normal user with sudo privileges."
  exit 1
fi

REPO_URL="https://github.com/AaronSequeira/SIH2025-25080.git"
APP_USER="ubuntu"
APP_DIR="/var/www/transformo"
VENV_PATH="$APP_DIR/venv"
GIT_BRANCH="main"

# Directory inside the cloned repo where deployment artifacts live
DEPLOY_SUBDIR="deployment"
DEPLOY_DIR="$APP_DIR/$DEPLOY_SUBDIR"

EC2_PUBLIC_IP="$(curl -s http://checkip.amazonaws.com || true)"
if [[ -z "$EC2_PUBLIC_IP" ]]; then
  EC2_PUBLIC_IP="127.0.0.1"
fi

log "Detected EC2 Public IP: $EC2_PUBLIC_IP"

# Update and install base packages (use system python3 packages for portability)
log "Updating system packages..."
sudo apt update -y
sudo apt upgrade -y

log "Installing required packages..."
# Install python3.11, poetry, and other packages
sudo apt install -y python3 python3-venv python3-dev python3-pip git nginx supervisor curl || {
  err "apt install failed. Check your apt sources and network connectivity."
  exit 1
}

# Install Poetry globally if not already installed
if ! command -v poetry >/dev/null 2>&1; then
  log "Installing Poetry..."
  curl -sSL https://install.python-poetry.org | python3 -
  # Add Poetry to PATH for this session
  export PATH="$HOME/.local/bin:$PATH"
  # Also install for the ubuntu user if different from current user
  if [[ "$USER" != "$APP_USER" ]]; then
    sudo -u "$APP_USER" curl -sSL https://install.python-poetry.org | sudo -u "$APP_USER" python3 -
  fi
else
  log "Poetry already installed, skipping installation..."
fi

# Create application user if missing
if id -u "$APP_USER" >/dev/null 2>&1; then
  warn "User $APP_USER already exists"
else
  log "Creating application user '$APP_USER'..."
  sudo useradd -m -s /bin/bash "$APP_USER"
fi

# Ensure app dir exists and is owned by ubuntu
log "Creating application directory..."
sudo mkdir -p "$APP_DIR"
sudo chown "$APP_USER":"$APP_USER" "$APP_DIR"

# Clone or pull repository as ubuntu
if [[ ! -d "$APP_DIR/.git" ]]; then
  log "Cloning repository into $APP_DIR..."
  cd /var/www
  sudo -u "$APP_USER" git clone --branch "$GIT_BRANCH" "$REPO_URL" transformo
else
  log "Repository already exists — pulling latest changes..."
  cd "$APP_DIR"
  sudo -u "$APP_USER" git fetch --all --prune
  sudo -u "$APP_USER" git reset --hard "origin/${GIT_BRANCH}"
fi

cd "$APP_DIR"

# Add Poetry to PATH for both root and app user
export PATH="$HOME/.local/bin:/home/$APP_USER/.local/bin:$PATH"

# Choose python binary: prefer python3.11 if present, else python3
PYTHON_BIN=""
if command -v python3.11 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3.11)"
  log "Using python binary: $PYTHON_BIN"
else
  PYTHON_BIN="$(command -v python3 || true)"
  if [[ -z "$PYTHON_BIN" ]]; then
    err "No python3 binary found on the system."
    exit 1
  fi
  warn "python3.11 not found; falling back to system python3: $PYTHON_BIN"
fi

# Configure Poetry to create virtual environment in project directory
log "Configuring Poetry..."
sudo -u "$APP_USER" /home/$APP_USER/.local/bin/poetry config virtualenvs.in-project true
# Removed invalid Poetry config option: virtualenvs.prefer-active-python (not available in Poetry 2.1.4)

# Install dependencies using Poetry
log "Installing dependencies using Poetry..."
sudo -u "$APP_USER" /home/$APP_USER/.local/bin/poetry install --only main

# Get the virtual environment path that Poetry created
VENV_PATH="$APP_DIR/.venv"
PY_VENV_PY="$VENV_PATH/bin/python"

# Install spaCy model only if spacy installed
if sudo -u "$APP_USER" "$PY_VENV_PY" -c "import importlib, sys; exit(0 if importlib.util.find_spec('spacy') else 1)"; then
  log "Installing spaCy English model (en_core_web_sm)..."
  sudo -u "$APP_USER" "$PY_VENV_PY" -m spacy download en_core_web_sm || warn "spaCy model install failed — you can run it manually later."
else
  warn "spaCy not installed; skipping spaCy model installation."
fi

# Create logs/static/media dirs
log "Creating necessary application directories..."
sudo -u "$APP_USER" mkdir -p "$APP_DIR/logs" "$APP_DIR/static" "$APP_DIR/media"

# Copy environment file if present
if [[ -f ".env.production" ]]; then
  log "Setting up environment file..."
  sudo -u "$APP_USER" cp .env.production .env
else
  warn ".env.production not found — ensure .env is created and secrets set."
fi

# Ensure deployment scripts are executable (they are located in $DEPLOY_SUBDIR)
GUNICORN_SCRIPT="$DEPLOY_DIR/gunicorn_start.sh"
if [[ -f "$GUNICORN_SCRIPT" ]]; then
  log "Making $DEPLOY_SUBDIR/gunicorn_start.sh executable..."
  sudo chmod +x "$GUNICORN_SCRIPT"
else
  warn "$GUNICORN_SCRIPT not found; skipping chmod"
fi

# Ensure supervisor config dir exists then copy config
log "Configuring supervisor..."
sudo mkdir -p /etc/supervisor/conf.d
SUPERVISOR_SRC="$DEPLOY_DIR/supervisor.conf"
if [[ -f "$SUPERVISOR_SRC" ]]; then
  sudo cp "$SUPERVISOR_SRC" /etc/supervisor/conf.d/transformo.conf
else
  warn "$SUPERVISOR_SRC not found in repo — skipping copy. Add it to control process."
fi

# Ensure nginx site dirs exist and copy site config
log "Configuring nginx..."
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
NGINX_SRC="$DEPLOY_DIR/nginx.conf"
if [[ -f "$NGINX_SRC" ]]; then
  sudo cp "$NGINX_SRC" /etc/nginx/sites-available/transformo
  # Replace placeholder with detected IP (does nothing if placeholder absent)
  sudo sed -i "s/your_ec2_public_ip_or_domain/${EC2_PUBLIC_IP}/g" /etc/nginx/sites-available/transformo
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo ln -sf /etc/nginx/sites-available/transformo /etc/nginx/sites-enabled/transformo
else
  warn "$NGINX_SRC not found in repo — skipping nginx site setup."
fi

# Test nginx configuration and reload
if command -v nginx >/dev/null 2>&1; then
  log "Testing nginx configuration..."
  if sudo nginx -t; then
    log "Nginx config valid; reloading nginx"
    sudo systemctl restart nginx
  else
    err "Nginx configuration test failed. Check /etc/nginx/sites-available/transformo"
    exit 1
  fi
else
  err "nginx command not found. Ensure nginx is installed."
  exit 1
fi

# Reload supervisor and start process if config exists
if [[ -f /etc/supervisor/conf.d/transformo.conf ]]; then
  log "Reloading supervisor configuration..."
  sudo supervisorctl reread
  sudo supervisorctl update
  # Try to start the program named 'transformo' in supervisor; ignore failing start but show status
  sudo supervisorctl start transformo || warn "Supervisor start returned non-zero; check supervisorctl status transformo"
else
  warn "Supervisor config not present at /etc/supervisor/conf.d/transformo.conf — not starting process."
fi

# Give services a moment to start, then check statuses
sleep 3
if sudo systemctl is-active --quiet nginx; then
  log "✅ nginx is running"
else
  err "nginx is not running"
fi

if command -v supervisorctl >/dev/null 2>&1; then
  log "Supervisor status:"
  sudo supervisorctl status || warn "Could not retrieve supervisor status or no processes are configured."
fi

# Quick application check (through nginx)
log "Testing application endpoint (http://localhost)..."
if curl -sS --max-time 5 http://localhost | grep -q "Hello"; then
  log "Application responded through nginx"
else
  warn "Application did not respond with expected content. Check application logs and supervisor logs."
fi

echo
log "Deployment script finished. Access: http://${EC2_PUBLIC_IP}"
echo
log "Useful commands:"
echo "  Monitor logs: sudo tail -f $APP_DIR/logs/supervisor.log"
echo "  Restart app:  sudo supervisorctl restart transformo"
echo "  Check status:  sudo supervisorctl status"

exit 0
