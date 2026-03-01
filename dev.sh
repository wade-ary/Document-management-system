#!/bin/bash

# Local development script for SIH2025 Backend
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛠️  SIH2025 Backend Local Development Setup${NC}"
echo "============================================="

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env file from .env.example${NC}"
        echo -e "${YELLOW}🔧 Please edit .env file with your actual values${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.example not found. Please create .env manually${NC}"
    fi
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker is not running. Please start Docker Desktop${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}⚠️  docker-compose not found. Using docker compose instead${NC}"
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Function to show options
show_menu() {
    echo ""
    echo -e "${BLUE}Choose an option:${NC}"
    echo "1) Start all services (backend + MongoDB)"
    echo "2) Start only backend (assumes MongoDB running elsewhere)"
    echo "3) Stop all services"
    echo "4) View logs"
    echo "5) Rebuild and restart"
    echo "6) Run development server (Poetry)"
    echo "7) Run tests"
    echo "8) Shell into backend container"
    echo "9) Clean up (remove containers and volumes)"
    echo "0) Exit"
}

# Function to start services
start_services() {
    echo -e "${BLUE}🚀 Starting all services...${NC}"
    $COMPOSE_CMD up -d
    echo -e "${GREEN}✅ Services started!${NC}"
    echo -e "${BLUE}Backend URL: http://localhost:5000${NC}"
    echo -e "${BLUE}MongoDB URL: mongodb://localhost:27017${NC}"
}

# Function to start only backend
start_backend_only() {
    echo -e "${BLUE}🚀 Starting only backend...${NC}"
    $COMPOSE_CMD up -d backend
    echo -e "${GREEN}✅ Backend started!${NC}"
    echo -e "${BLUE}Backend URL: http://localhost:5000${NC}"
}

# Function to stop services
stop_services() {
    echo -e "${BLUE}🛑 Stopping all services...${NC}"
    $COMPOSE_CMD down
    echo -e "${GREEN}✅ Services stopped!${NC}"
}

# Function to view logs
view_logs() {
    echo -e "${BLUE}📋 Viewing logs (Press Ctrl+C to exit)...${NC}"
    $COMPOSE_CMD logs -f
}

# Function to rebuild and restart
rebuild_restart() {
    echo -e "${BLUE}🔄 Rebuilding and restarting...${NC}"
    $COMPOSE_CMD down
    $COMPOSE_CMD build --no-cache
    $COMPOSE_CMD up -d
    echo -e "${GREEN}✅ Services rebuilt and restarted!${NC}"
}

# Function to run with Poetry
run_poetry() {
    echo -e "${BLUE}🐍 Starting with Poetry...${NC}"
    
    # Check if Poetry is installed
    if ! command -v poetry &> /dev/null; then
        echo -e "${YELLOW}⚠️  Poetry not installed. Installing...${NC}"
        curl -sSL https://install.python-poetry.org | python3 -
    fi
    
    # Install dependencies
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    poetry install
    
    # Start the app
    echo -e "${BLUE}🚀 Starting Flask app...${NC}"
    poetry run python app.py
}

# Function to run tests
run_tests() {
    echo -e "${BLUE}🧪 Running tests...${NC}"
    
    if [ -d "tests" ]; then
        if command -v poetry &> /dev/null; then
            poetry run python -m pytest tests/
        else
            python -m pytest tests/
        fi
    else
        echo -e "${YELLOW}⚠️  No tests directory found${NC}"
        echo -e "${BLUE}Running syntax check instead...${NC}"
        python -m py_compile app.py
        python -c "import app; print('✅ App imports successfully')"
    fi
}

# Function to shell into container
shell_container() {
    echo -e "${BLUE}🐚 Opening shell in backend container...${NC}"
    $COMPOSE_CMD exec backend /bin/bash
}

# Function to clean up
cleanup() {
    echo -e "${BLUE}🧹 Cleaning up containers and volumes...${NC}"
    $COMPOSE_CMD down -v --remove-orphans
    docker system prune -f
    echo -e "${GREEN}✅ Cleanup complete!${NC}"
}

# Main loop
while true; do
    show_menu
    read -p "Enter your choice: " choice
    
    case $choice in
        1) start_services ;;
        2) start_backend_only ;;
        3) stop_services ;;
        4) view_logs ;;
        5) rebuild_restart ;;
        6) run_poetry ;;
        7) run_tests ;;
        8) shell_container ;;
        9) cleanup ;;
        0) 
            echo -e "${GREEN}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${YELLOW}❌ Invalid option. Please try again.${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done