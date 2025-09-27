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

2. **Configure DNS**: After instance creation, note the public IP address. In Route 53 (or your DNS provider), create an A record pointing your domain to your Lightsail instance's public IP address.

3. **Complete SSL Setup**: SSH into your instance and run the post-installation script:
   ```bash
   cd /opt/bitnami/projects/remarket
   export DOMAIN="yourdomain.com"
   export EMAIL="your-email@yourdomain.com"
   ./post-install-script.sh
   ```

4. **Open Ports**: In Lightsail networking, ensure ports 80 (HTTP), 443 (HTTPS), and 22 (SSH) are open.

The launch script installs PostgreSQL, sets up both backend and frontend services, and prepares the application. The post-installation script handles DNS verification, SSL certificate generation via Bitnami's Let's Encrypt tool, and configures HTTPS.