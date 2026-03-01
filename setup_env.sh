#!/bin/bash

# SIH 25080 Environment Setup Script
# This script helps set up the development environment consistently

set -e  # Exit on any error

echo "🚀 Setting up SIH 25080 Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Python 3.11 is installed
echo "🔍 Checking Python version..."
if command -v python3.11 &> /dev/null; then
    PYTHON_VERSION=$(python3.11 --version)
    print_status "Found $PYTHON_VERSION"
    PYTHON_CMD="python3.11"
elif command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    if [[ $PYTHON_VERSION == *"3.11"* ]]; then
        print_status "Found $PYTHON_VERSION"
        PYTHON_CMD="python3"
    else
        print_error "Python 3.11 required, found $PYTHON_VERSION"
        echo "Please install Python 3.11 first:"
        echo "  brew install python@3.11"
        exit 1
    fi
else
    print_error "Python 3.11 not found!"
    echo "Please install Python 3.11 first:"
    echo "  brew install python@3.11"
    exit 1
fi

# Check if Poetry is installed
echo "🔍 Checking Poetry installation..."
if command -v poetry &> /dev/null; then
    POETRY_VERSION=$(poetry --version)
    print_status "Found $POETRY_VERSION"
else
    print_error "Poetry not found!"
    echo "Installing Poetry..."
    curl -sSL https://install.python-poetry.org | python3 -
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
    export PATH="$HOME/.local/bin:$PATH"
    
    if command -v poetry &> /dev/null; then
        print_status "Poetry installed successfully"
    else
        print_error "Poetry installation failed. Please install manually:"
        echo "  curl -sSL https://install.python-poetry.org | python3 -"
        exit 1
    fi
fi

# Set up Poetry environment
echo "🔧 Setting up Poetry environment..."
poetry env use $PYTHON_CMD
print_status "Poetry environment configured"

# Install dependencies
echo "📦 Installing dependencies..."
poetry install
print_status "Dependencies installed"

# Download spaCy models
echo "🧠 Setting up spaCy models..."
if poetry run python setup.py; then
    print_status "spaCy models downloaded"
else
    print_warning "spaCy models download failed, but continuing..."
fi

# Check if MongoDB is running (optional)
echo "🗄️ Checking MongoDB..."
if command -v mongod &> /dev/null; then
    if pgrep mongod > /dev/null; then
        print_status "MongoDB is running"
    else
        print_warning "MongoDB is installed but not running"
        echo "  To start MongoDB: brew services start mongodb-community"
    fi
else
    print_warning "MongoDB not found"
    echo "  To install: brew tap mongodb/brew && brew install mongodb-community"
fi

# Check if Node.js is installed (for frontend)
echo "🌐 Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Found Node.js $NODE_VERSION"
else
    print_warning "Node.js not found (needed for frontend)"
    echo "  To install: brew install node"
fi

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "To start development:"
echo "  1. Backend: poetry run python app.py"
echo "  2. Frontend: cd frontend && npm install && npm run dev"
echo ""
echo "To activate the Poetry shell:"
echo "  poetry shell"
echo ""
