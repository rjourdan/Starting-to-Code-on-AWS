#!/bin/bash

# Minimal launch script for Lightsail console - creates first-boot service
# This avoids cloud-init timeout issues

# Create first-boot service to run installation automatically
sudo tee /etc/systemd/system/remarket-first-boot.service > /dev/null <<'EOF'
[Unit]
Description=ReMarket First Boot Setup
After=network-online.target
Wants=network-online.target
ConditionPathExists=!/var/lib/remarket-setup-complete

[Service]
Type=oneshot
User=root
Environment=DB_PASSWORD=postgres
Environment=PATH=/opt/bitnami/node/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/bin/bash -c 'sudo mkdir -p /opt/bitnami/projects && cd /opt/bitnami/projects && curl -o install-script.sh https://raw.githubusercontent.com/rjourdan/Starting-to-Code-on-AWS/step1-monolith-Lightsail/install-script.sh && chmod +x install-script.sh && ./install-script.sh && touch /var/lib/remarket-setup-complete'
RemainAfterExit=yes
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
sudo systemctl enable remarket-first-boot.service

# Reboot to trigger the service
sudo reboot
