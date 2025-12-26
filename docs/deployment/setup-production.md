# Digital Ocean Production Setup Guide

This guide provides step-by-step instructions for setting up a Digital Ocean Droplet for BugRelay production deployment.

## Prerequisites

- Digital Ocean account with billing configured
- Domain name registered and accessible for DNS configuration
- SSH client installed on your local machine
- Basic knowledge of Linux system administration

## 1. Create Digital Ocean Droplet

### 1.1 Droplet Specifications

Log into Digital Ocean and create a new Droplet with the following specifications:

**Recommended Configuration:**
- **Image**: Ubuntu 22.04 LTS x64
- **Plan**: Basic or General Purpose
- **CPU**: 4 vCPUs (minimum 2 vCPUs)
- **RAM**: 8GB (minimum 4GB)
- **Storage**: 160GB SSD (minimum 80GB)
- **Datacenter Region**: Choose closest to your users
- **VPC Network**: Default VPC is fine
- **IPv6**: Enable (optional but recommended)
- **Monitoring**: Enable (free)
- **Backups**: Enable (recommended, additional cost)

### 1.2 Initial Droplet Configuration

**Authentication:**
- Add your SSH public key during droplet creation
- Or use password authentication initially (will disable later)

**Hostname:**
- Set hostname to: `bugrelay-production`

**Tags:**
- Add tags: `production`, `bugrelay`, `web-server`

### 1.3 Create Droplet

Click "Create Droplet" and wait for provisioning (usually 1-2 minutes).

Once created, note your droplet's IP address: `123.45.67.89`

## 2. Initial Server Access

### 2.1 First SSH Connection

```bash
# Connect as root (initial connection)
ssh root@123.45.67.89

# If using password, you'll be prompted to enter it
# If using SSH key, you should connect automatically
```

### 2.2 Update System Packages

```bash
# Update package lists
apt update

# Upgrade all packages
apt upgrade -y

# Install essential packages
apt install -y \
  curl \
  wget \
  git \
  vim \
  htop \
  ufw \
  fail2ban \
  unattended-upgrades \
  software-properties-common \
  apt-transport-https \
  ca-certificates \
  gnupg \
  lsb-release
```

## 3. Create Deployment User

### 3.1 Create User Account

```bash
# Create deploy user
adduser deploy

# You'll be prompted to set a password
# Enter a strong password and save it securely
# Press Enter to skip optional fields (Full Name, etc.)
```

### 3.2 Grant Sudo Privileges

```bash
# Add deploy user to sudo group
usermod -aG sudo deploy

# Verify user was added
groups deploy
# Output should include: deploy sudo
```

### 3.3 Configure Sudo Without Password (Optional)

For automated deployments, configure sudo without password:

```bash
# Edit sudoers file
visudo

# Add this line at the end:
deploy ALL=(ALL) NOPASSWD:ALL

# Save and exit (Ctrl+X, Y, Enter)
```

## 4. SSH Key Setup and Security

### 4.1 Generate SSH Key Pair (On Your Local Machine)

```bash
# Generate a new SSH key pair specifically for deployment
ssh-keygen -t ed25519 -C "deploy@bugrelay.com" -f ~/.ssh/bugrelay_deploy

# This creates:
# - Private key: ~/.ssh/bugrelay_deploy
# - Public key: ~/.ssh/bugrelay_deploy.pub

# Set proper permissions
chmod 600 ~/.ssh/bugrelay_deploy
chmod 644 ~/.ssh/bugrelay_deploy.pub
```

### 4.2 Copy Public Key to Server

```bash
# Method 1: Using ssh-copy-id (easiest)
ssh-copy-id -i ~/.ssh/bugrelay_deploy.pub deploy@123.45.67.89

# Method 2: Manual copy
# On your local machine, display the public key:
cat ~/.ssh/bugrelay_deploy.pub

# On the server (as root):
mkdir -p /home/deploy/.ssh
nano /home/deploy/.ssh/authorized_keys
# Paste the public key content, save and exit

# Set proper permissions
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### 4.3 Test SSH Key Authentication

```bash
# From your local machine
ssh -i ~/.ssh/bugrelay_deploy deploy@123.45.67.89

# You should connect without password prompt
```

### 4.4 Harden SSH Configuration

```bash
# On the server (as root or with sudo)
sudo nano /etc/ssh/sshd_config

# Make the following changes:
```

Add or modify these lines:

```
# Disable root login
PermitRootLogin no

# Disable password authentication
PasswordAuthentication no
PubkeyAuthentication yes

# Disable empty passwords
PermitEmptyPasswords no

# Disable X11 forwarding
X11Forwarding no

# Allow only specific user
AllowUsers deploy

# Change default SSH port (optional but recommended)
# Port 2222

# Use strong ciphers
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512,hmac-sha2-256
```

Save and restart SSH:

```bash
# Test configuration
sudo sshd -t

# If no errors, restart SSH
sudo systemctl restart sshd

# IMPORTANT: Keep your current SSH session open
# Open a NEW terminal and test connection before closing this one
ssh -i ~/.ssh/bugrelay_deploy deploy@123.45.67.89
```

## 5. Firewall Configuration

### 5.1 Configure UFW (Uncomplicated Firewall)

```bash
# Check UFW status
sudo ufw status

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (use your SSH port if you changed it)
sudo ufw allow 22/tcp
# Or if you changed SSH port to 2222:
# sudo ufw allow 2222/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow monitoring (optional, for external monitoring)
# sudo ufw allow from trusted_ip to any port 9090 proto tcp

# Enable firewall
sudo ufw enable

# Verify rules
sudo ufw status verbose
```

### 5.2 Configure Fail2Ban

```bash
# Install fail2ban (if not already installed)
sudo apt install -y fail2ban

# Create local configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit configuration
sudo nano /etc/fail2ban/jail.local
```

Configure SSH protection:

```ini
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
```

Start and enable fail2ban:

```bash
# Start fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

## 6. Install Docker and Docker Compose

### 6.1 Install Docker

```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up stable repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 6.2 Configure Docker for Deploy User

```bash
# Add deploy user to docker group
sudo usermod -aG docker deploy

# Verify
groups deploy

# Log out and log back in for group changes to take effect
exit
ssh -i ~/.ssh/bugrelay_deploy deploy@123.45.67.89

# Test Docker without sudo
docker ps
```

### 6.3 Configure Docker Daemon

```bash
# Create daemon configuration
sudo nano /etc/docker/daemon.json
```

Add the following configuration:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "userland-proxy": false
}
```

Restart Docker:

```bash
sudo systemctl restart docker
sudo systemctl enable docker
```

## 7. Install Nginx

### 7.1 Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify installation
nginx -v
sudo systemctl status nginx
```

### 7.2 Configure Nginx

```bash
# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Create directory for SSL certificates
sudo mkdir -p /etc/nginx/ssl

# Create directory for site configurations
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled
```

### 7.3 Test Nginx

```bash
# Test configuration
sudo nginx -t

# If successful, reload Nginx
sudo systemctl reload nginx

# Visit http://your-droplet-ip in browser
# You should see Nginx welcome page
```

## 8. SSL Certificate Setup (Let's Encrypt)

### 8.1 Install Certbot

```bash
# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx
```

### 8.2 Configure DNS Records

Before obtaining SSL certificates, configure your DNS:

**A Records:**
```
bugrelay.com                → 123.45.67.89
www.bugrelay.com            → 123.45.67.89
monitoring.bugrelay.com     → 123.45.67.89
docs.bugrelay.com           → 123.45.67.89
```

Wait for DNS propagation (can take up to 48 hours, usually much faster).

Verify DNS:
```bash
# Check DNS resolution
dig bugrelay.com +short
dig monitoring.bugrelay.com +short
```

### 8.3 Obtain SSL Certificates

```bash
# Stop Nginx temporarily
sudo systemctl stop nginx

# Obtain certificates for all domains
sudo certbot certonly --standalone \
  -d bugrelay.com \
  -d www.bugrelay.com \
  -d monitoring.bugrelay.com \
  -d docs.bugrelay.com \
  --email admin@bugrelay.com \
  --agree-tos \
  --non-interactive

# Start Nginx
sudo systemctl start nginx
```

Certificates will be stored in:
- `/etc/letsencrypt/live/bugrelay.com/fullchain.pem`
- `/etc/letsencrypt/live/bugrelay.com/privkey.pem`

### 8.4 Configure Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Enable automatic renewal (already enabled by default)
sudo systemctl status certbot.timer

# Manually enable if needed
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## 9. Install PostgreSQL

### 9.1 Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
sudo systemctl status postgresql
```

### 9.2 Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
```

```sql
-- Create database
CREATE DATABASE bugrelay_production;

-- Create user
CREATE USER bugrelay_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE bugrelay_production TO bugrelay_user;

-- Exit
\q
```

### 9.3 Configure PostgreSQL for Local Connections

```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add this line for local connections:
# local   bugrelay_production   bugrelay_user   md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 9.4 Test Database Connection

```bash
# Test connection
psql -U bugrelay_user -d bugrelay_production -h localhost

# Enter password when prompted
# If successful, you'll see PostgreSQL prompt
# Exit with \q
```

## 10. Install Redis

### 10.1 Install Redis

```bash
# Install Redis
sudo apt install -y redis-server

# Start and enable Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify installation
redis-cli --version
sudo systemctl status redis-server
```

### 10.2 Configure Redis

```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf
```

Make these changes:

```
# Set password
requirepass your_secure_redis_password

# Bind to localhost only
bind 127.0.0.1 ::1

# Set max memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Enable persistence
save 900 1
save 300 10
save 60 10000
```

Restart Redis:

```bash
sudo systemctl restart redis-server
```

### 10.3 Test Redis Connection

```bash
# Test connection
redis-cli

# Authenticate
AUTH your_secure_redis_password

# Test command
PING
# Should return: PONG

# Exit
exit
```

## 11. Setup Application Directory

### 11.1 Create Directory Structure

```bash
# Create application directory
sudo mkdir -p /opt/bugrelay
sudo chown deploy:deploy /opt/bugrelay

# Create subdirectories
cd /opt/bugrelay
mkdir -p backups logs ssl

# Set permissions
chmod 755 /opt/bugrelay
chmod 700 /opt/bugrelay/backups
chmod 755 /opt/bugrelay/logs
chmod 700 /opt/bugrelay/ssl
```

### 11.2 Clone Repository

```bash
# Switch to deploy user
su - deploy

# Navigate to application directory
cd /opt/bugrelay

# Clone repository (you'll need to set up deploy keys in GitHub)
git clone git@github.com:your-org/bugrelay.git .

# Or use HTTPS with personal access token
git clone https://github.com/your-org/bugrelay.git .
```

## 12. Configure Environment Variables

### 12.1 Create Environment File

```bash
# Copy example environment file
cp .env.example .env

# Edit environment file
nano .env
```

### 12.2 Set Production Values

```bash
# Application
NODE_ENV=production
GO_ENV=production
BACKEND_PORT=8080
FRONTEND_PORT=3000

# Domain
DOMAIN=bugrelay.com
API_URL=https://bugrelay.com/api/v1
FRONTEND_URL=https://bugrelay.com

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bugrelay_production
DB_USER=bugrelay_user
DB_PASSWORD=your_secure_database_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password

# Security
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters
LOGS_API_KEY=your_secure_logs_api_key

# Monitoring
GRAFANA_ADMIN_PASSWORD=your_secure_grafana_password
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
```

### 12.3 Secure Environment File

```bash
# Set proper permissions
chmod 600 .env
chown deploy:deploy .env
```

## 13. Configure Systemd Services

### 13.1 Create Backend Service

```bash
sudo nano /etc/systemd/system/bugrelay-backend.service
```

Add:

```ini
[Unit]
Description=BugRelay Backend API
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/opt/bugrelay/backend
EnvironmentFile=/opt/bugrelay/.env
ExecStart=/opt/bugrelay/backend/bugrelay-api
Restart=always
RestartSec=10
StandardOutput=append:/opt/bugrelay/logs/backend.log
StandardError=append:/opt/bugrelay/logs/backend-error.log

[Install]
WantedBy=multi-user.target
```

### 13.2 Create Frontend Service

```bash
sudo nano /etc/systemd/system/bugrelay-frontend.service
```

Add:

```ini
[Unit]
Description=BugRelay Frontend
After=network.target bugrelay-backend.service
Wants=bugrelay-backend.service

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/opt/bugrelay/frontend
EnvironmentFile=/opt/bugrelay/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=append:/opt/bugrelay/logs/frontend.log
StandardError=append:/opt/bugrelay/logs/frontend-error.log

[Install]
WantedBy=multi-user.target
```

### 13.3 Reload Systemd

```bash
# Reload systemd
sudo systemctl daemon-reload

# Services will be started by deployment scripts
```

## 14. Configure Nginx for BugRelay

### 14.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/bugrelay.conf
```

Add basic configuration (will be updated by deployment):

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name bugrelay.com www.bugrelay.com;
    return 301 https://$server_name$request_uri;
}

# Main application
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name bugrelay.com www.bugrelay.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/bugrelay.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bugrelay.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 14.2 Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/bugrelay.conf /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## 15. Setup Monitoring Stack

### 15.1 Deploy Monitoring with Docker Compose

```bash
# Navigate to monitoring directory
cd /opt/bugrelay/monitoring

# Start monitoring stack
docker compose up -d

# Verify services
docker compose ps
```

### 15.2 Configure Monitoring Access

```bash
sudo nano /etc/nginx/sites-available/monitoring.conf
```

Add:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name monitoring.bugrelay.com;

    ssl_certificate /etc/letsencrypt/live/bugrelay.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bugrelay.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/monitoring.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 16. Setup Automated Backups

### 16.1 Create Backup Script

```bash
nano /opt/bugrelay/scripts/backup.sh
```

Add backup script (will be created in later tasks).

### 16.2 Configure Cron Job

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/bugrelay/scripts/backup.sh >> /opt/bugrelay/logs/backup.log 2>&1
```

## 17. Final Security Hardening

### 17.1 Configure Automatic Security Updates

```bash
# Configure unattended upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# Edit configuration
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

Ensure these lines are uncommented:

```
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::Automatic-Reboot "false";
```

### 17.2 Configure System Limits

```bash
# Edit limits
sudo nano /etc/security/limits.conf

# Add:
deploy soft nofile 65536
deploy hard nofile 65536
```

### 17.3 Disable Unnecessary Services

```bash
# List all services
systemctl list-unit-files --type=service

# Disable unnecessary services (example)
sudo systemctl disable bluetooth.service
sudo systemctl disable cups.service
```

## 18. Verification Checklist

Run through this checklist to verify setup:

```bash
# System
[ ] Ubuntu 24.04 LTS installed
[ ] System packages updated
[ ] Firewall configured and enabled
[ ] Fail2ban configured and running

# Users and SSH
[ ] Deploy user created with sudo access
[ ] SSH key authentication working
[ ] Password authentication disabled
[ ] Root login disabled

# Software
[ ] Docker installed and running
[ ] Docker Compose installed
[ ] Nginx installed and running
[ ] PostgreSQL installed and running
[ ] Redis installed and running

# SSL
[ ] Lets Encrypt certificates obtained
[ ] Auto-renewal configured
[ ] HTTPS working for all domains

# Application
[ ] Application directory created
[ ] Repository cloned
[ ] Environment variables configured
[ ] Systemd services created

# Monitoring
[ ] Monitoring stack deployed
[ ] Grafana accessible
[ ] Prometheus collecting metrics

# Security
[ ] Firewall rules configured
[ ] SSH hardened
[ ] Automatic updates enabled
[ ] Backups configured
```

## 19. Next Steps

Your Digital Ocean Droplet is now ready for deployment!

Next steps:
1. Configure GitHub Secrets for CI/CD
2. Set up GitHub Actions workflows
3. Perform initial deployment
4. Configure monitoring dashboards
5. Test rollback procedures

See [CI/CD Workflows Guide](ci-cd-workflows.md) for next steps.

## Troubleshooting

### Cannot Connect via SSH

```bash
# Check SSH service
sudo systemctl status sshd

# Check firewall
sudo ufw status

# Check SSH logs
sudo tail -f /var/log/auth.log
```

### Docker Permission Denied

```bash
# Add user to docker group
sudo usermod -aG docker deploy

# Log out and back in
exit
ssh -i ~/.ssh/bugrelay_deploy deploy@123.45.67.89
```

### Nginx Configuration Error

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

### Database Connection Failed

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Test connection
psql -U bugrelay_user -d bugrelay_production -h localhost
```

## Support

For issues with this setup guide, please:
1. Check the [Troubleshooting Guide](troubleshooting.md)
2. Review Digital Ocean documentation
3. Contact the DevOps team

---

**Last Updated**: December 2024  
**Maintained By**: DevOps Team
