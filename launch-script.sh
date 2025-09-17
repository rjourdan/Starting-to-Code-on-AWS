#!/bin/bash

# Launch script - runs during instance creation
# Only installs dependencies and prepares the environment

set -e

# Update system and install PostgreSQL
sudo apt update -y
sudo apt install -y postgresql

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create remarketdb database
sudo -u postgres createdb remarketdb

# Clone repository to Bitnami projects directory
sudo mkdir -p /opt/bitnami/projects
cd /opt/bitnami/projects
sudo git clone -b step1-monolith-Lightsail https://github.com/rjourdan/Starting-to-Code-on-AWS.git remarket
sudo chown -R bitnami:bitnami /opt/bitnami/projects/remarket

# Setup backend as daemon
cd /opt/bitnami/projects/remarket/reMarket-BackEnd
chmod +x setup.sh
nohup ./setup.sh > setup.log 2>&1 < /dev/null &
SETUP_PID=$!

# Setup frontend dependencies
cd ../reMarket-FrontEnd
pnpm install

# Wait for backend setup to complete
wait $SETUP_PID

# Build frontend
pnpm build

# Download post-installation script
cd /opt/bitnami/projects/remarket
curl -o post-install-script.sh https://raw.githubusercontent.com/rjourdan/Starting-to-Code-on-AWS/step1-monolith-Lightsail/post-install-script.sh
chmod +x post-install-script.sh

echo "Initial setup complete!"
echo "Next steps:"
echo "1. Configure DNS A record to point your domain to this instance's IP"
echo "2. SSH into the instance and run: cd /opt/bitnami/projects/remarket && ./post-install-script.sh"
