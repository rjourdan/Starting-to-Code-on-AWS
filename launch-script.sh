#!/bin/bash

# Fixed Launch script - runs during instance creation
# Installs dependencies and prepares the environment properly

set -e

# TODO: Replace YOUR_DB_PASSWORD with your actual PostgreSQL password before running
DB_PASSWORD="YOUR_DB_PASSWORD"

# Validate that password has been set
if [ "$DB_PASSWORD" = "YOUR_DB_PASSWORD" ]; then
    echo "ERROR: Please replace YOUR_DB_PASSWORD with your actual database password in this script"
    echo "Edit this script and change the DB_PASSWORD variable on line 8"
    exit 1
fi

# Update system and install PostgreSQL with development headers
sudo apt update -y
sudo apt install -y postgresql postgresql-contrib libpq-dev python3-dev build-essential

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create remarketdb database and set up postgres user password
sudo -u postgres psql -c "ALTER USER postgres PASSWORD '$DB_PASSWORD';"
sudo -u postgres createdb remarketdb || echo "Database remarketdb already exists"

# Clone repository to Bitnami projects directory
sudo mkdir -p /opt/bitnami/projects
cd /opt/bitnami/projects
if [ ! -d "remarket" ]; then
    sudo git clone -b step1-monolith-Lightsail https://github.com/rjourdan/Starting-to-Code-on-AWS.git remarket
fi
sudo chown -R bitnami:bitnami /opt/bitnami/projects/remarket

# Setup backend environment variables for non-interactive setup
export DB_USER=postgres
export DB_PASSWORD="$DB_PASSWORD"
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=remarketdb

# Setup backend
echo "Starting the backend setup"
cd /opt/bitnami/projects/remarket/reMarket-BackEnd
chmod +x setup.sh

# Run setup in background and capture output
nohup ./setup.sh > setup.log 2>&1 &
SETUP_PID=$!
echo "Backend setup started with PID: $SETUP_PID"

# Setup frontend dependencies while backend is setting up
echo "Setup frontend dependencies"
cd ../reMarket-FrontEnd

# Install pnpm if not available
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
fi

pnpm install

# Wait for backend setup to complete
wait $SETUP_PID
echo "Backend setup completed"

# Build frontend
echo "Build frontend"
pnpm build

# Create a systemd service for the backend
sudo tee /etc/systemd/system/remarket-backend.service > /dev/null << EOF
[Unit]
Description=ReMarket Backend API
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=bitnami
WorkingDirectory=/opt/bitnami/projects/remarket/reMarket-BackEnd
Environment=PATH=/home/bitnami/.local/bin:/opt/bitnami/projects/remarket/reMarket-BackEnd/.venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=DB_USER=postgres
Environment=DB_PASSWORD=$DB_PASSWORD
Environment=DB_HOST=localhost
Environment=DB_PORT=5432
Environment=DB_NAME=remarketdb
ExecStart=/opt/bitnami/projects/remarket/reMarket-BackEnd/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the backend service
sudo systemctl daemon-reload
sudo systemctl enable remarket-backend.service
sudo systemctl start remarket-backend.service

# Download post-installation script
echo "Download post-installation script"
cd /opt/bitnami/projects/remarket
curl -o post-install-script.sh https://raw.githubusercontent.com/rjourdan/Starting-to-Code-on-AWS/step1-monolith-Lightsail/post-install-script.sh
chmod +x post-install-script.sh

echo "Setup complete!"
echo "Backend API is running at http://localhost:8000"
echo "API documentation is available at http://localhost:8000/docs"
echo "Backend service status: $(sudo systemctl is-active remarket-backend.service)"
echo ""
echo "Next steps:"
echo "1. Configure DNS A record to point your domain to this instance's IP"
echo "2. Run: cd /opt/bitnami/projects/remarket && ./post-install-script.sh"
