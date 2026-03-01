#!/bin/bash

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Python 3.11 and pip
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Install other dependencies
sudo apt install -y git nginx supervisor

# Create application user
sudo useradd -m -s /bin/bash ubuntu

# Create application directory
sudo mkdir -p /var/www/transformo
sudo chown ubuntu:ubuntu /var/www/transformo

# Switch to app user
sudo su - ubuntu

# Clone the repository (you'll need to replace with your actual repo URL)
cd /var/www
git clone https://github.com/AaronSequeira/SIH2025-25080.git transformo
cd transformo

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Install spaCy model (if needed)
python -m spacy download en_core_web_sm

# Create logs directory
mkdir -p logs

# Set proper permissions
sudo chown -R ubuntu:ubuntu /var/www/transformo
sudo chmod -R 755 /var/www/transformo

echo "Setup completed!"
