#!/bin/bash

# Fixed Launch script - runs during instance creation
# Installs dependencies and prepares the environment properly

set -e

# Update system and install PostgreSQL with development headers and nginx
sudo apt update -y
sudo apt install -y postgresql postgresql-contrib libpq-dev python3-dev build-essential python3.11-venv nginx

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

# Setup backend using Python 3.11 to avoid compatibility issues
echo "Starting the backend setup"
cd /opt/bitnami/projects/remarket/reMarket-BackEnd

# Create virtual environment with Python 3.11 and install dependencies directly
python3.11 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt

# Initialize database tables and data
echo "Setting up database..."
python db_bootstrap/create_db.py
python db_bootstrap/init_db.py

echo "Backend setup completed"

# Setup frontend dependencies while backend is setting up
echo "Setup frontend dependencies"
cd ../reMarket-FrontEnd

# Install and configure corepack for pnpm
sudo /opt/bitnami/node/bin/npm install -g --no-update-notifier corepack@latest
sudo /opt/bitnami/node/bin/corepack install
sudo /opt/bitnami/node/bin/corepack enable pnpm

# Install frontend dependencies
/opt/bitnami/node/bin/pnpm install

# Update API URL to use /api prefix for nginx proxy
sed -i "s|export const API_URL = 'http://localhost:8000';|export const API_URL = '/api';|" lib/constants.ts

# Build frontend with increased memory limit
echo "Build frontend"
NODE_OPTIONS='--max-old-space-size=1024' /opt/bitnami/node/bin/pnpm build

# Create a systemd service for the backend
sudo tee /etc/systemd/system/remarket-backend.service > /dev/null <<EOF
[Unit]
Description=ReMarket Backend API
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=bitnami
WorkingDirectory=/opt/bitnami/projects/remarket/reMarket-BackEnd
Environment=PATH=/opt/bitnami/projects/remarket/reMarket-BackEnd/.venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=DB_USER=postgres
Environment=DB_PASSWORD=${DB_PASSWORD}
Environment=DB_HOST=localhost
Environment=DB_PORT=5432
Environment=DB_NAME=remarketdb
ExecStart=/opt/bitnami/projects/remarket/reMarket-BackEnd/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Create a systemd service for the frontend
sudo tee /etc/systemd/system/remarket-frontend.service > /dev/null << 'EOF'
[Unit]
Description=ReMarket Frontend
After=network.target

[Service]
Type=simple
User=bitnami
WorkingDirectory=/opt/bitnami/projects/remarket/reMarket-FrontEnd
Environment=PATH=/opt/bitnami/node/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=NODE_ENV=production
Environment=NEXT_PUBLIC_API_URL=http://localhost:8000
ExecStart=/opt/bitnami/projects/remarket/reMarket-FrontEnd/node_modules/.bin/next start --port 3000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the services
sudo systemctl daemon-reload
sudo systemctl enable remarket-backend.service remarket-frontend.service
sudo systemctl start remarket-backend.service remarket-frontend.service

# Stop and disable Bitnami Apache
sudo /opt/bitnami/ctlscript.sh stop
sudo systemctl disable bitnami || echo "No bitnami systemd service"
sudo pkill -9 httpd || echo "No httpd processes"

# Configure nginx reverse proxy
sudo tee /etc/nginx/sites-available/remarket > /dev/null <<'NGINX_EOF'
server {
    listen 80;
    server_name _;

    # Frontend (Next.js) - proxy to port 3000
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API proxy - /api/* -> localhost:8000/*
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX_EOF

# Enable nginx site and start nginx
sudo ln -sf /etc/nginx/sites-available/remarket /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl enable nginx
sudo systemctl start nginx

# Download post-installation script
echo "Download post-installation script"
cd /opt/bitnami/projects/remarket
curl -o post-install-script.sh https://raw.githubusercontent.com/rjourdan/Starting-to-Code-on-AWS/step1-monolith-Lightsail/post-install-script.sh
chmod +x post-install-script.sh

echo "Setup complete!"
echo "Frontend is accessible at http://[instance-ip] (port 80)"
echo "Backend API is internal only at http://localhost:8000"
echo "API accessible via nginx proxy at http://[instance-ip]/api/"
echo "API documentation is available at http://[instance-ip]/api/docs"
echo "Backend service status: $(sudo systemctl is-active remarket-backend.service)"
echo "Frontend service status: $(sudo systemctl is-active remarket-frontend.service)"
echo "Nginx service status: $(sudo systemctl is-active nginx.service)"
echo ""
echo "Next steps:"
echo "1. Configure DNS A record to point your domain to this instance's IP"
echo "2. Run: cd /opt/bitnami/projects/remarket && ./post-install-script.sh"
