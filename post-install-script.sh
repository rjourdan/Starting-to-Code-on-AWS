#!/bin/bash

# Post-installation script for SSL configuration and frontend startup
# Run this after DNS is configured and propagated

set -e

# Check if domain is provided
if [ -z "$DOMAIN" ]; then
    read -p "Enter your domain name: " DOMAIN
fi

if [ -z "$EMAIL" ]; then
    read -p "Enter your email for SSL certificate: " EMAIL
fi

# Get the instance's public IP automatically
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

echo "Configure your DNS A record to point $DOMAIN to: $PUBLIC_IP"
echo "Press Enter after DNS is configured and propagated..."
read -p "Waiting for DNS configuration..."

# Verify DNS resolution before proceeding
echo "Verifying DNS propagation..."
while ! nslookup $DOMAIN | grep -q $PUBLIC_IP; do
    echo "DNS not yet propagated. Waiting 30 seconds..."
    sleep 30
done

echo "DNS verified! Configuring SSL certificate..."

# Use Bitnami's Let's Encrypt auto-configuration script
sudo /opt/bitnami/bncert-tool

# Copy SSL certificates to application directory
sudo mkdir -p /opt/bitnami/projects/remarket/ssl
sudo cp /opt/bitnami/apache/conf/bitnami/certs/server.crt /opt/bitnami/projects/remarket/ssl/
sudo cp /opt/bitnami/apache/conf/bitnami/certs/server.key /opt/bitnami/projects/remarket/ssl/
sudo chown -R bitnami:bitnami /opt/bitnami/projects/remarket/ssl

# Start the frontend application
cd /opt/bitnami/projects/remarket
npm start &

echo "SSL configured and frontend started successfully!"
echo "Your application should be available at https://$DOMAIN"
