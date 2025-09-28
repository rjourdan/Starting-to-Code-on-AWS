# Starting-to-Code-on-AWS
You are a developer and you are starting to code on AWS, here is a pathway to guide your journey

## Deploying with AWS Lightsail

To deploy this application on AWS Lightsail with SSL certificates, follow these steps:

1. **Launch Instance**: Create a Bitnami Node.js instance in Lightsail. In the "Launch script" section, add:
   ```bash
   export DB_PASSWORD="postgres"
   curl -o launch-script.sh https://raw.githubusercontent.com/rjourdan/Starting-to-Code-on-AWS/step1-monolith-Lightsail/launch-script.sh
   chmod +x launch-script.sh
   ./launch-script.sh
   ```
   
   **Note**: The launch script creates a first-boot service and reboots the instance. The actual installation runs automatically after reboot to avoid cloud-init timeout issues.

2. **Monitor Installation**: After the instance reboots, you can monitor the installation progress by SSH'ing into the instance and running:
   ```bash
   sudo journalctl -u remarket-first-boot.service -f
   ```

3. **Configure DNS**: After installation completes, note the public IP address. In Route 53 (or your DNS provider), create an A record pointing your domain to your Lightsail instance's public IP address.

4. **Complete SSL Setup**: SSH into your instance and run the post-installation script:
   ```bash
   cd /opt/bitnami/projects/remarket
   export DOMAIN="yourdomain.com"
   export EMAIL="your-email@yourdomain.com"
   ./post-install-script.sh
   ```

5. **Open Ports**: In Lightsail networking, ensure ports 80 (HTTP), 443 (HTTPS), and 22 (SSH) are open.

## Architecture

The installation script creates a secure deployment with nginx reverse proxy:

- **Frontend**: Accessible on port 80 (public)
- **Backend API**: Internal only on localhost:8000 (secure)
- **Nginx Proxy**: Routes `/api/*` requests to backend
- **Database**: PostgreSQL on localhost (internal)

This architecture ensures the backend API is not directly exposed to the internet while maintaining full functionality through the nginx reverse proxy. The post-installation script handles DNS verification, SSL certificate generation via Bitnami's Let's Encrypt tool, and configures HTTPS.