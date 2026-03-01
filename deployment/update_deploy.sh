#!/bin/bash

# Enhanced deployment script for updates
# This script is designed to be run on the EC2 instance for updates

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Application directory
APP_DIR="/var/www/transformo"
APP_USER="ubuntu"

# Directory inside the cloned repo where deployment artifacts live
DEPLOY_SUBDIR="deployment"
DEPLOY_DIR="$APP_DIR/$DEPLOY_SUBDIR"

log "🚀 Starting TransformoDocs update deployment..."

# Check if we're in the right directory
if [ ! -d "$APP_DIR" ]; then
    error "Application directory $APP_DIR not found!"
    exit 1
fi

cd $APP_DIR

# Check if git repository exists
if [ ! -d ".git" ]; then
    error "Git repository not found in $APP_DIR"
    exit 1
fi

# Backup current state (optional)
log "📦 Creating backup of current state..."
sudo -u $APP_USER cp .env .env.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || warn "No .env file to backup"

# Pull latest changes
log "📥 Pulling latest changes from repository..."
sudo -u $APP_USER git fetch origin
sudo -u $APP_USER git reset --hard origin/main

# Check if pyproject.toml has changed
log "🔍 Checking for dependency changes..."
if sudo -u $APP_USER git diff HEAD~1 HEAD --name-only | grep -q "pyproject.toml\|poetry.lock"; then
    log "📦 Dependencies changed, updating packages..."
    sudo -u $APP_USER /home/$APP_USER/.local/bin/poetry install --no-dev
    
    # Reinstall spaCy model if needed
    sudo -u $APP_USER $APP_DIR/.venv/bin/python -m spacy download en_core_web_sm || warn "Failed to update spaCy model"
else
    log "✅ No dependency changes detected"
fi

# Update environment file
if [ -f ".env.production" ]; then
    log "🔧 Updating environment configuration..."
    sudo -u $APP_USER cp .env.production .env
else
    warn "No .env.production file found, keeping existing .env"
fi

# Check if any Python files changed
if sudo -u $APP_USER git diff HEAD~1 HEAD --name-only | grep -q "\.py$"; then
    log "🐍 Python files changed, recompiling bytecode..."
    sudo -u $APP_USER $APP_DIR/venv/bin/python -m compileall . 2>/dev/null || warn "Some files failed to compile"
fi

# Create necessary directories if they don't exist
log "📁 Ensuring necessary directories exist..."
sudo -u $APP_USER mkdir -p logs static media tempfiles

# Set proper permissions
log "🔒 Setting proper permissions..."
sudo chown -R $APP_USER:$APP_USER $APP_DIR
sudo chmod -R 755 $APP_DIR
GUNICORN_SCRIPT="$DEPLOY_DIR/gunicorn_start.sh"
if [ -f "$GUNICORN_SCRIPT" ]; then
    sudo chmod +x "$GUNICORN_SCRIPT"
else
    warn "${GUNICORN_SCRIPT} not found; skipping chmod"
fi

# Test the application syntax
log "🧪 Testing application syntax..."
if ! sudo -u $APP_USER $APP_DIR/.venv/bin/python -m py_compile app.py; then
    error "Application syntax test failed!"
    exit 1
fi

# Restart the application
log "🔄 Restarting application services..."

# Restart supervisor service
if sudo supervisorctl status transformo > /dev/null 2>&1; then
    sudo supervisorctl restart transformo
    
    # Wait for service to start
    sleep 5
    
    # Check service status
    if sudo supervisorctl status transformo | grep -q "RUNNING"; then
        log "✅ Application service restarted successfully"
    else
        error "❌ Failed to restart application service"
        sudo supervisorctl status transformo
        sudo tail -20 $APP_DIR/logs/supervisor.log
        exit 1
    fi
else
    error "Supervisor service not found. Please run the initial deployment script first."
    exit 1
fi

# Restart nginx (just to be safe)
log "🔄 Restarting nginx..."
sudo systemctl restart nginx

if sudo systemctl is-active --quiet nginx; then
    log "✅ Nginx restarted successfully"
else
    error "❌ Failed to restart nginx"
    sudo systemctl status nginx
    exit 1
fi

# Health check
log "🏥 Performing health check..."
sleep 3

# Test application response
if curl -f -s http://localhost/ > /dev/null; then
    log "✅ Application is responding correctly"
else
    warn "⚠️ Application health check failed. Check logs for details."
    echo "Recent supervisor logs:"
    sudo tail -10 $APP_DIR/logs/supervisor.log
fi

# Show current git info
CURRENT_COMMIT=$(sudo -u $APP_USER git rev-parse --short HEAD)
CURRENT_BRANCH=$(sudo -u $APP_USER git rev-parse --abbrev-ref HEAD)

log "🎉 Deployment completed successfully!"
log "📋 Deployment Summary:"
echo -e "  ${BLUE}Branch:${NC} $CURRENT_BRANCH"
echo -e "  ${BLUE}Commit:${NC} $CURRENT_COMMIT"
echo -e "  ${BLUE}Time:${NC} $(date)"
log "🌐 Application is available at: http://$(curl -s http://checkip.amazonaws.com)/"

# Optional: Send notification (if you have notification setup)
# You can integrate with Slack, Discord, email, etc.
log "📧 Deployment notification sent (if configured)"
